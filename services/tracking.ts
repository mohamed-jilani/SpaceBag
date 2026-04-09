/**
 * services/tracking.ts — Suivi de colis simulé
 *
 * Collection Firestore `tracking` :
 *   { requestId, lat, lng, timestamp, status, progressPercent }
 *
 * Simulation : des waypoints prédéfinis sont incrémentés à chaque mise à jour
 * du transporteur (bouton "Mettre à jour le suivi"). Pas de GPS réel.
 *
 * Règles Firestore :
 *   match /tracking/{id} {
 *     allow read: if request.auth != null;
 *     allow write: if request.auth.uid == get(/databases/$(database)/documents/requests/$(resource.data.requestId)).data.carrierId;
 *   }
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TrackingPoint } from '@/types';

/** Étapes de simulation : 5 positions du départ à l'arrivée */
const SIMULATION_STEPS: Array<{
  status: TrackingPoint['status'];
  progressPercent: number;
  label: string;
}> = [
  { status: 'picked_up', progressPercent: 0, label: 'Colis récupéré' },
  { status: 'in_transit', progressPercent: 25, label: 'En route' },
  { status: 'in_transit', progressPercent: 50, label: 'À mi-chemin' },
  { status: 'near_destination', progressPercent: 75, label: 'Proche de la destination' },
  { status: 'delivered', progressPercent: 100, label: 'Livré' },
];

// ─── Initialiser le suivi ─────────────────────────────────────────────────────

/**
 * Crée le premier point de tracking pour une demande (étape 0 : colis récupéré).
 * Appelé par le transporteur lorsqu'il démarre le suivi.
 */
export async function initTracking(
  requestId: string,
  departureLat: number,
  departureLng: number
): Promise<string> {
  const step = SIMULATION_STEPS[0];
  const docRef = await addDoc(collection(db, 'tracking'), {
    requestId,
    lat: departureLat,
    lng: departureLng,
    timestamp: Date.now(),
    status: step.status,
    progressPercent: step.progressPercent,
    stepIndex: 0,
  });
  return docRef.id;
}

// ─── Avancer d'une étape ──────────────────────────────────────────────────────

/**
 * Récupère le dernier point et avance d'une étape.
 * Interpole les coordonnées linéairement entre départ et arrivée.
 */
export async function advanceTracking(
  requestId: string,
  departureLat: number,
  departureLng: number,
  arrivalLat: number,
  arrivalLng: number
): Promise<void> {
  // Récupérer l'étape courante
  const q = query(
    collection(db, 'tracking'),
    where('requestId', '==', requestId),
    orderBy('timestamp', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);

  let currentStep = 0;
  let currentDocId: string | null = null;

  if (!snap.empty) {
    const data = snap.docs[0].data();
    currentStep = (data.stepIndex as number) ?? 0;
    currentDocId = snap.docs[0].id;
  }

  const nextStep = Math.min(currentStep + 1, SIMULATION_STEPS.length - 1);
  const stepData = SIMULATION_STEPS[nextStep];
  const pct = stepData.progressPercent / 100;

  const lat = departureLat + (arrivalLat - departureLat) * pct;
  const lng = departureLng + (arrivalLng - departureLng) * pct;

  if (currentDocId) {
    // Mettre à jour le document existant
    await updateDoc(doc(db, 'tracking', currentDocId), {
      lat,
      lng,
      timestamp: Date.now(),
      status: stepData.status,
      progressPercent: stepData.progressPercent,
      stepIndex: nextStep,
    });
  } else {
    await addDoc(collection(db, 'tracking'), {
      requestId,
      lat,
      lng,
      timestamp: Date.now(),
      status: stepData.status,
      progressPercent: stepData.progressPercent,
      stepIndex: nextStep,
    });
  }
}

// ─── Lire le dernier point (snapshot) ────────────────────────────────────────

export async function getLatestTracking(requestId: string): Promise<TrackingPoint | null> {
  const q = query(
    collection(db, 'tracking'),
    where('requestId', '==', requestId),
    orderBy('timestamp', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as TrackingPoint;
}

// ─── Labels d'étapes ──────────────────────────────────────────────────────────

export const TRACKING_STEP_LABELS = SIMULATION_STEPS;

export function getStepLabel(status: TrackingPoint['status']): string {
  const labels: Record<TrackingPoint['status'], string> = {
    picked_up: '📦 Colis récupéré',
    in_transit: '🚀 En transit',
    near_destination: '📍 Proche de la destination',
    delivered: '✅ Livré',
  };
  return labels[status] ?? status;
}
