/**
 * useTracking — Suivi en temps réel d'une demande via Firestore onSnapshot
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TrackingPoint } from '@/types';
import { advanceTracking, initTracking } from '@/services/tracking';

// Coordonnées prédéfinies pour quelques villes courantes (simulation)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  paris: { lat: 48.8566, lng: 2.3522 },
  lyon: { lat: 45.7640, lng: 4.8357 },
  marseille: { lat: 43.2965, lng: 5.3698 },
  bordeaux: { lat: 44.8378, lng: -0.5792 },
  toulouse: { lat: 43.6047, lng: 1.4442 },
  nice: { lat: 43.7102, lng: 7.2620 },
  london: { lat: 51.5074, lng: -0.1278 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  barcelona: { lat: 41.3851, lng: 2.1734 },
  berlin: { lat: 52.5200, lng: 13.4050 },
  rome: { lat: 41.9028, lng: 12.4964 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  dakar: { lat: 14.7167, lng: -17.4677 },
  alger: { lat: 36.7538, lng: 3.0588 },
  tunis: { lat: 36.8190, lng: 10.1658 },
};

function getCityCoords(city: string) {
  const key = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CITY_COORDS[key] ?? { lat: 48.8566, lng: 2.3522 }; // Paris par défaut
}

export function useTracking(requestId: string, departure?: string, arrival?: string) {
  const [tracking, setTracking] = useState<TrackingPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const departureLat = getCityCoords(departure ?? '').lat;
  const departureLng = getCityCoords(departure ?? '').lng;
  const arrivalLat = getCityCoords(arrival ?? '').lat;
  const arrivalLng = getCityCoords(arrival ?? '').lng;

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'tracking'),
      where('requestId', '==', requestId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      snap => {
        if (snap.empty) {
          setTracking(null);
        } else {
          setTracking({ id: snap.docs[0].id, ...snap.docs[0].data() } as TrackingPoint);
        }
        setLoading(false);
      },
      err => {
        console.error('useTracking onSnapshot:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [requestId]);

  const startTracking = async () => {
    setIsUpdating(true);
    try {
      await initTracking(requestId, departureLat, departureLng);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateTracking = async () => {
    setIsUpdating(true);
    try {
      await advanceTracking(
        requestId,
        departureLat,
        departureLng,
        arrivalLat,
        arrivalLng
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return { tracking, loading, isUpdating, startTracking, updateTracking };
}
