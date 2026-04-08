import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trip, Request } from '@/types';

export function useTrips(carrierId?: string) {
  const queryClient = useQueryClient();

  // ─── Liste des trajets ───────────────────────────────────────────────────────
  const tripsQuery = useQuery({
    queryKey: ['trips', carrierId],
    queryFn: async () => {
      // Pour le transporteur : ses propres trajets (actifs + complets)
      // Pour le membre : uniquement les trajets actifs (qui acceptent encore des demandes)
      const statuses = carrierId ? ['active', 'full'] : ['active'];

      const allTrips: Trip[] = [];

      for (const status of statuses) {
        let q;
        if (carrierId) {
          q = query(
            collection(db, 'trips'),
            where('status', '==', status),
            where('carrierId', '==', carrierId)
          );
        } else {
          q = query(collection(db, 'trips'), where('status', '==', status));
        }
        const snap = await getDocs(q);
        snap.docs.forEach(d => allTrips.push({ id: d.id, ...d.data() } as Trip));
      }

      // Tri côté client (évite les index composites Firestore)
      return allTrips.sort((a, b) => (a.date > b.date ? 1 : -1));
    },
  });

  // ─── Création d'un trajet ────────────────────────────────────────────────────
  const createTripMutation = useMutation({
    mutationFn: async (newTrip: Omit<Trip, 'id' | 'createdAt' | 'status' | 'remainingWeight' | 'remainingParcels'>) => {
      const docRef = await addDoc(collection(db, 'trips'), {
        ...newTrip,
        status: 'active',
        // Initialiser la capacité restante = capacité totale
        remainingWeight: newTrip.maxWeight,
        remainingParcels: newTrip.maxParcels,
        createdAt: Date.now(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  // ─── Récupérer un trajet par ID ──────────────────────────────────────────────
  const getTrip = async (id: string): Promise<Trip | null> => {
    const tripDoc = await getDoc(doc(db, 'trips', id));
    if (tripDoc.exists()) {
      return { id: tripDoc.id, ...tripDoc.data() } as Trip;
    }
    return null;
  };

  // ─── Vérifier si un membre a déjà une demande active sur un trajet ──────────
  /**
   * Retourne la demande existante (pending/accepted/paid/in_transit) du membre
   * pour ce trajet, ou null s'il n'en a pas.
   */
  const getExistingRequest = async (
    tripId: string,
    memberId: string
  ): Promise<Request | null> => {
    // Statuts qui bloquent une nouvelle demande
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
  };

  return {
    tripsQuery,
    getTrip,
    getExistingRequest,
    createTripMutation,
  };
}
