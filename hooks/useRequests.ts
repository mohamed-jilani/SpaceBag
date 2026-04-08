/**
 * useRequests — demandes de livraison en temps réel via Firestore onSnapshot
 *
 * - Remplace useQuery par useEffect + onSnapshot : mises à jour instantanées.
 * - Les données du trajet sont chargées une seule fois lors du premier snap,
 *   puis enrichies à chaque changement (avec un cache local pour éviter les
 *   lectures redondantes).
 *
 * Flux statut : pending → accepted → paid → in_transit → delivered
 *
 * Règles Firestore :
 *   match /requests/{id} {
 *     allow read, write: if request.auth.uid == resource.data.memberId
 *                        || request.auth.uid == resource.data.carrierId;
 *   }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Request, RequestStatus, Trip } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { notifyCarrierNewRequest, notifyMemberStatusChange } from '@/services/notifications';

type EnrichedRequest = Request & { trip: Trip | null };

export function useRequests() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Cache local des trajets pour éviter les re-lectures à chaque snap
  const tripCache = useRef<Record<string, Trip | null>>({});

  const enrichWithTrip = useCallback(async (req: Request): Promise<EnrichedRequest> => {
    if (tripCache.current[req.tripId] !== undefined) {
      return { ...req, trip: tripCache.current[req.tripId] };
    }
    try {
      const tripSnap = await getDoc(doc(db, 'trips', req.tripId));
      const trip = tripSnap.exists()
        ? ({ id: tripSnap.id, ...tripSnap.data() } as Trip)
        : null;
      tripCache.current[req.tripId] = trip;
      return { ...req, trip };
    } catch {
      return { ...req, trip: null };
    }
  }, []);

  // ─── Abonnement Firestore temps réel ───────────────────────────────────────
  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const field = profile.role === 'carrier' ? 'carrierId' : 'memberId';
    const q = query(
      collection(db, 'requests'),
      where(field, '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async snapshot => {
        const raw = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Request))
          .sort((a, b) => b.createdAt - a.createdAt);

        // Invalider le cache pour les docs modifiés
        snapshot.docChanges().forEach(change => {
          const req = change.doc.data() as Request;
          if (change.type === 'modified') {
            delete tripCache.current[req.tripId];
          }
        });

        const enriched = await Promise.all(raw.map(enrichWithTrip));
        setRequests(enriched);
        setLoading(false);
      },
      err => {
        console.error('useRequests onSnapshot:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, profile?.role, enrichWithTrip]);

  // ─── Créer une demande ─────────────────────────────────────────────────────
  const createRequest = useCallback(
    async (newRequest: Omit<Request, 'id' | 'status' | 'createdAt'>) => {
      setIsCreating(true);
      try {
        const docRef = await addDoc(collection(db, 'requests'), {
          ...newRequest,
          status: 'pending',
          createdAt: Date.now(),
        });
        // Notification simulée au transporteur
        await notifyCarrierNewRequest(newRequest.carrierId, newRequest.memberDisplayName);
        return docRef.id;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  // ─── Mettre à jour le statut ───────────────────────────────────────────────
  const updateRequestStatus = useCallback(
    async ({
      id,
      status,
      verificationCode,
    }: {
      id: string;
      status: RequestStatus;
      verificationCode?: string;
    }) => {
      setIsUpdating(true);
      try {
        const requestRef = doc(db, 'requests', id);
        const requestSnap = await getDoc(requestRef);
        if (!requestSnap.exists()) throw new Error('Demande introuvable');
        const requestData = requestSnap.data() as Request;

        const updateData: Record<string, unknown> = { status };
        if (verificationCode) updateData.verificationCode = verificationCode;

        // ── Acceptation : créer le chat + décrémenter la capacité ────────────
        if (status === 'accepted') {
          if (!requestData.chatId) {
            const chatRef = await addDoc(collection(db, 'chats'), {
              requestId: id,
              participants: [requestData.memberId, requestData.carrierId],
              memberId: requestData.memberId,
              carrierId: requestData.carrierId,
              lastMessage: '',
              updatedAt: Date.now(),
            });
            updateData.chatId = chatRef.id;
          }

          // Transaction atomique : décrémenter la capacité du trajet
          const tripRef = doc(db, 'trips', requestData.tripId);
          await runTransaction(db, async tx => {
            const tripSnap = await tx.get(tripRef);
            if (!tripSnap.exists()) return;
            const trip = tripSnap.data() as Trip;
            const newRemainingWeight = Math.max(
              0,
              (trip.remainingWeight ?? trip.maxWeight) - requestData.weight
            );
            const newRemainingParcels = Math.max(
              0,
              (trip.remainingParcels ?? trip.maxParcels) - 1
            );
            const newStatus =
              newRemainingParcels <= 0 || newRemainingWeight <= 0
                ? 'full'
                : trip.status;
            tx.update(tripRef, {
              remainingWeight: newRemainingWeight,
              remainingParcels: newRemainingParcels,
              status: newStatus,
            });
          });

          // Invalider le cache du trajet concerné
          delete tripCache.current[requestData.tripId];

          await notifyMemberStatusChange(requestData.memberId, 'accepted');
        }

        if (status === 'refused') {
          await notifyMemberStatusChange(requestData.memberId, 'refused');
        }

        if (verificationCode) {
          await notifyMemberStatusChange(requestData.memberId, 'code_generated');
        }

        await updateDoc(requestRef, updateData);
        return updateData.chatId as string | undefined;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  // ─── Code de vérification (6 chiffres) ────────────────────────────────────
  const generateCode = useCallback(
    (): string => Math.floor(100000 + Math.random() * 900000).toString(),
    []
  );

  return {
    requests,
    loading,
    error,
    isCreating,
    isUpdating,
    createRequest,
    updateRequestStatus,
    generateCode,
  };
}
