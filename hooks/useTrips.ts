/**
 * useTrips — trajets en temps réel via Firestore onSnapshot
 *
 * - Remplace useQuery par useEffect + onSnapshot : les listes se mettent à jour
 *   instantanément sans pull-to-refresh.
 * - Lecture : onSnapshot (temps réel)
 * - Écriture : fonctions async ordinaires
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trip, Request } from '@/types';

// ─── Filtres de recherche ────────────────────────────────────────────────────

export interface TripFilters {
  departure?: string;
  arrival?: string;
  date?: string;       // YYYY-MM-DD minimum
  maxPrice?: number;
  minWeight?: number;  // poids minimum acceptable par le trajet
}

function applyFilters(trips: Trip[], filters: TripFilters): Trip[] {
  return trips.filter(t => {
    if (filters.departure) {
      const dep = t.departure.toLowerCase();
      const search = filters.departure!.toLowerCase();
      if (!dep.includes(search)) return false;
    }
    if (filters.arrival) {
      const arr = t.arrival.toLowerCase();
      const search = filters.arrival!.toLowerCase();
      if (!arr.includes(search)) return false;
    }
    if (filters.date && t.date < filters.date) return false;
    if (filters.maxPrice !== undefined && t.price > filters.maxPrice) return false;
    if (filters.minWeight !== undefined && (t.remainingWeight ?? t.maxWeight) < filters.minWeight) return false;
    return true;
  });
}

// ─── Hook principal ──────────────────────────────────────────────────────────

export function useTrips(carrierId?: string) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribers: (() => void)[] = [];

    if (carrierId) {
      // Transporteur : ses propres trajets (actifs + complets + terminés)
      const q = query(
        collection(db, 'trips'),
        where('carrierId', '==', carrierId)
      );
      const unsub = onSnapshot(
        q,
        snap => {
          const list = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Trip))
            .sort((a, b) => (a.date > b.date ? 1 : -1));
          setTrips(list);
          setLoading(false);
        },
        err => {
          console.error('useTrips (carrier):', err);
          setError(err.message);
          setLoading(false);
        }
      );
      unsubscribers = [unsub];
    } else {
      // Membre : uniquement les trajets actifs (qui acceptent des demandes)
      const q = query(
        collection(db, 'trips'),
        where('status', '==', 'active')
      );
      const unsub = onSnapshot(
        q,
        snap => {
          const list = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Trip))
            .sort((a, b) => (a.date > b.date ? 1 : -1));
          setTrips(list);
          setLoading(false);
        },
        err => {
          console.error('useTrips (member):', err);
          setError(err.message);
          setLoading(false);
        }
      );
      unsubscribers = [unsub];
    }

    return () => unsubscribers.forEach(fn => fn());
  }, [carrierId]);

  // ─── Créer un trajet ───────────────────────────────────────────────────────
  const createTrip = useCallback(
    async (newTrip: Omit<Trip, 'id' | 'createdAt' | 'status' | 'remainingWeight' | 'remainingParcels'>) => {
      setIsCreating(true);
      try {
        const docRef = await addDoc(collection(db, 'trips'), {
          ...newTrip,
          status: 'active',
          remainingWeight: newTrip.maxWeight,
          remainingParcels: newTrip.maxParcels,
          createdAt: Date.now(),
        });
        return docRef.id;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  // ─── Récupérer un trajet par ID (ponctuel) ─────────────────────────────────
  const getTrip = useCallback(async (id: string): Promise<Trip | null> => {
    const snap = await getDoc(doc(db, 'trips', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Trip) : null;
  }, []);

  // ─── Vérifier doublon de demande ───────────────────────────────────────────
  /**
   * Retourne la demande active existante du membre pour ce trajet,
   * ou null s'il n'en a pas.
   */
  const getExistingRequest = useCallback(
    async (tripId: string, memberId: string): Promise<Request | null> => {
      const activeStatuses = ['pending', 'accepted', 'paid', 'in_transit'];
      for (const status of activeStatuses) {
        const q = query(
          collection(db, 'requests'),
          where('tripId', '==', tripId),
          where('memberId', '==', memberId),
          where('status', '==', status),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          return { id: snap.docs[0].id, ...snap.docs[0].data() } as Request;
        }
      }
      return null;
    },
    []
  );

  return {
    trips,
    loading,
    error,
    isCreating,
    createTrip,
    getTrip,
    getExistingRequest,
    applyFilters,
  };
}
