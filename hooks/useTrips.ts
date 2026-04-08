import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc,
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trip } from '@/types';

export function useTrips(carrierId?: string) {
  const queryClient = useQueryClient();

  const tripsQuery = useQuery({
    queryKey: ['trips', carrierId],
    queryFn: async () => {
      let q;
      if (carrierId) {
        q = query(
          collection(db, 'trips'), 
          where('status', '==', 'active'),
          where('carrierId', '==', carrierId),
          orderBy('date', 'asc')
        );
      } else {
        q = query(
          collection(db, 'trips'), 
          where('status', '==', 'active'),
          orderBy('date', 'asc')
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Trip[];
    }
  });

  const createTripMutation = useMutation({
    mutationFn: async (newTrip: Omit<Trip, 'id' | 'createdAt' | 'status'>) => {
      const docRef = await addDoc(collection(db, 'trips'), {
        ...newTrip,
        status: 'active',
        createdAt: Date.now()
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    }
  });

  return {
    tripsQuery,
    getTrip: async (id: string) => {
      const tripDoc = await getDoc(doc(db, 'trips', id));
      if (tripDoc.exists()) {
        return { id: tripDoc.id, ...tripDoc.data() } as Trip;
      }
      return null;
    },
    createTripMutation
  };
}