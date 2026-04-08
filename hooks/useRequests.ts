import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Request, RequestStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useRequests() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ['requests', user?.uid, profile?.role],
    queryFn: async () => {
      if (!user || !profile) return [];
      
      const requestsRef = collection(db, 'requests');
      let q;
      
      if (profile.role === 'carrier') {
        q = query(
          requestsRef, 
          where('carrierId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          requestsRef, 
          where('memberId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Request[];

      // Fetch related trip data for each request
      const enrichedRequests = await Promise.all(
        requests.map(async (req) => {
          const tripDoc = await getDoc(doc(db, 'trips', req.tripId));
          return {
            ...req,
            trip: tripDoc.exists() ? { id: tripDoc.id, ...tripDoc.data() } : null
          };
        })
      );

      return enrichedRequests;
    },
    enabled: !!user && !!profile,
  });

  const createRequestMutation = useMutation({
    mutationFn: async (newRequest: Omit<Request, 'id' | 'status' | 'createdAt'>) => {
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

  const updateRequestStatusMutation = useMutation({
    mutationFn: async ({ id, status, verificationCode }: { id: string, status: RequestStatus, verificationCode?: string }) => {
      const data: any = { status };
      if (verificationCode) {
        data.verificationCode = verificationCode;
      }
      await updateDoc(doc(db, 'requests', id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  return {
    requestsQuery,
    createRequest: createRequestMutation.mutateAsync,
    isCreating: createRequestMutation.isPending,
    updateRequestStatus: updateRequestStatusMutation.mutateAsync,
    isUpdating: updateRequestStatusMutation.isPending,
    generateCode,
  };
}
