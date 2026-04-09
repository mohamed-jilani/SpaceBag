/**
 * services/kyc.ts — Gestion des demandes KYC
 *
 * Collection Firestore `users/{uid}` :
 *   kycStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected'
 *   kycDocuments: { idPhotoUrl, selfieUrl, addressProofUrl }
 *   kycRejectionReason: string (si rejeté)
 *
 * Règles Firestore à configurer :
 *   match /users/{uid} {
 *     allow update: if request.auth.uid == uid
 *                   && request.resource.data.kycStatus == 'pending';
 *     // L'admin utilise un compte avec role == 'admin'
 *   }
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, KycDocuments } from '@/types';

// ─── Soumettre une demande KYC ────────────────────────────────────────────────

export async function submitKyc(
  uid: string,
  documents: KycDocuments
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    kycStatus: 'pending',
    kycDocuments: documents,
    kycSubmittedAt: Date.now(),
  });
}

// ─── Récupérer les demandes KYC en attente (admin) ───────────────────────────

export async function getPendingKycRequests(): Promise<UserProfile[]> {
  const q = query(
    collection(db, 'users'),
    where('kycStatus', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as UserProfile);
}

// ─── Approuver un KYC (admin) ─────────────────────────────────────────────────

export async function approveKyc(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    kycStatus: 'verified',
    kycVerified: true,
    kycVerifiedAt: Date.now(),
    kycRejectionReason: null,
  });
}

// ─── Rejeter un KYC (admin) ───────────────────────────────────────────────────

export async function rejectKyc(uid: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    kycStatus: 'rejected',
    kycVerified: false,
    kycRejectionReason: reason,
    kycRejectedAt: Date.now(),
  });
}

// ─── Lire le profil complet d'un utilisateur (admin) ─────────────────────────

export async function getUserById(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
