/**
 * useRequests — gestion des demandes de livraison
 *
 * Flux complet :
 *   pending → accepted → paid → in_transit → (verificationCode généré) → delivered
 *
 * Règles de sécurité Firestore (à configurer dans la console) :
 *   match /requests/{id} {
 *     allow read, write: if request.auth.uid == resource.data.memberId
 *                        || request.auth.uid == resource.data.carrierId;
 *   }
 *   match /chats/{id} {
 *     allow read, write: if request.auth.uid in resource.data.participants;
 *   }
 *   match /trips/{id} {
 *     allow read: if request.auth != null;
 *     allow write: if request.auth.uid == resource.data.carrierId;
 *   }
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Request, RequestStatus, Trip } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useRequests() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // ─── Lecture des demandes ────────────────────────────────────────────────────
  const requestsQuery = useQuery({
    queryKey: ['requests', user?.uid, profile?.role],
    queryFn: async () => {
      if (!user || !profile) return [];

      const requestsRef = collection(db, 'requests');
      const field = profile.role === 'carrier' ? 'carrierId' : 'memberId';
      const q = query(requestsRef, where(field, '==', user.uid));

      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Request[];

      // Tri côté client — évite l'index composite Firestore
      requests.sort((a, b) => b.createdAt - a.createdAt);

      // Enrichir avec les données du trajet associé
      const enriched = await Promise.all(
        requests.map(async req => {
          const tripSnap = await getDoc(doc(db, 'trips', req.tripId));
          return {
            ...req,
            trip: tripSnap.exists() ? { id: tripSnap.id, ...tripSnap.data() } : null,
          };
        })
      );

      return enriched;
    },
    enabled: !!user && !!profile,
  });

  // ─── Création d'une demande ──────────────────────────────────────────────────
  const createRequestMutation = useMutation({
    mutationFn: async (
      newRequest: Omit<Request, 'id' | 'status' | 'createdAt'>
    ) => {
      const docRef = await addDoc(collection(db, 'requests'), {
        ...newRequest,
        status: 'pending',
        createdAt: Date.now(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  // ─── Mise à jour du statut ───────────────────────────────────────────────────
  const updateRequestStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      verificationCode,
    }: {
      id: string;
      status: RequestStatus;
      verificationCode?: string;
    }) => {
      const requestRef = doc(db, 'requests', id);
      const requestSnap = await getDoc(requestRef);
      if (!requestSnap.exists()) throw new Error('Demande introuvable');
      const requestData = requestSnap.data() as Request;

      const updateData: Record<string, unknown> = { status };
      if (verificationCode) {
        updateData.verificationCode = verificationCode;
      }

      // ── Acceptation : créer le chat + décrémenter la capacité du trajet ───
      if (status === 'accepted') {
        // Créer le chat s'il n'existe pas déjà
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

        // Décrémenter la capacité restante du trajet (transaction atomique)
        const tripRef = doc(db, 'trips', requestData.tripId);
        await runTransaction(db, async tx => {
          const tripSnap = await tx.get(tripRef);
          if (!tripSnap.exists()) return;

          const trip = tripSnap.data() as Trip;
          const newRemainingWeight = Math.max(0, (trip.remainingWeight ?? trip.maxWeight) - requestData.weight);
          const newRemainingParcels = Math.max(0, (trip.remainingParcels ?? trip.maxParcels) - 1);

          // Si plus de capacité → trajet complet
          const newStatus =
            newRemainingParcels <= 0 || newRemainingWeight <= 0 ? 'full' : trip.status;

          tx.update(tripRef, {
            remainingWeight: newRemainingWeight,
            remainingParcels: newRemainingParcels,
            status: newStatus,
          });
        });
      }

      // ── Génération du code de livraison (transporteur) ─────────────────────
      // Le transporteur génère le code APRÈS avoir marqué le colis récupéré
      // (status reste in_transit, le verificationCode est ajouté)
      // Le membre VOIT ce code dans son interface et le DONNE au transporteur lors
      // de la remise physique. Puis le membre VALIDE dans l'app.
      // → Pas de changement de status ici, géré côté UI

      await updateDoc(requestRef, updateData);
      return updateData.chatId as string | undefined;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  // ─── Génération du code de vérification (6 chiffres) ────────────────────────
  const generateCode = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

  return {
    requestsQuery,
    createRequest: createRequestMutation.mutateAsync,
    isCreating: createRequestMutation.isPending,
    updateRequestStatus: updateRequestStatusMutation.mutateAsync,
    isUpdating: updateRequestStatusMutation.isPending,
    generateCode,
  };
}
