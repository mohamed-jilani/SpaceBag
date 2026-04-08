/**
 * services/reviews.ts — CRUD pour les avis post-livraison
 *
 * Collection Firestore : `reviews`
 * Document : { requestId, fromUserId, toUserId, rating, comment, createdAt }
 *
 * Règles de sécurité Firestore (à configurer) :
 *   match /reviews/{id} {
 *     allow read: if request.auth != null;
 *     allow create: if request.auth.uid == request.resource.data.fromUserId;
 *     allow update, delete: if false;  // immuable
 *   }
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Review } from '@/types';

// ─── Créer un avis ────────────────────────────────────────────────────────────

/**
 * Soumettre un avis après livraison.
 * Vérifie qu'aucun avis n'a déjà été déposé par `fromUserId` pour cette demande.
 */
export async function createReview(
  review: Omit<Review, 'id' | 'createdAt'>
): Promise<string> {
  // Vérifier doublon
  const existing = await hasUserReviewed(review.requestId, review.fromUserId);
  if (existing) throw new Error('Vous avez déjà évalué cette livraison.');

  const docRef = await addDoc(collection(db, 'reviews'), {
    ...review,
    createdAt: Date.now(),
  });
  return docRef.id;
}

// ─── Vérifier si un avis existe déjà ─────────────────────────────────────────

export async function hasUserReviewed(
  requestId: string,
  fromUserId: string
): Promise<boolean> {
  const q = query(
    collection(db, 'reviews'),
    where('requestId', '==', requestId),
    where('fromUserId', '==', fromUserId),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── Note moyenne d'un utilisateur ───────────────────────────────────────────

/**
 * Calcule la note moyenne reçue par un utilisateur.
 * Retourne null si aucun avis.
 */
export async function getAverageRating(
  userId: string
): Promise<{ average: number; count: number } | null> {
  const q = query(
    collection(db, 'reviews'),
    where('toUserId', '==', userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const total = snap.docs.reduce((sum, d) => sum + (d.data().rating as number), 0);
  return {
    average: Math.round((total / snap.docs.length) * 10) / 10,
    count: snap.docs.length,
  };
}

// ─── Récupérer les avis reçus par un utilisateur ──────────────────────────────

export async function getUserReviews(userId: string): Promise<Review[]> {
  const q = query(
    collection(db, 'reviews'),
    where('toUserId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Review))
    .sort((a, b) => b.createdAt - a.createdAt);
}
