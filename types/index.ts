export type UserRole = 'carrier' | 'member';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
  photoURL?: string;
  createdAt: number;
}

export interface Trip {
  id: string;
  departure: string;
  arrival: string;
  date: string;
  price: number;
  maxWeight: number;
  maxParcels: number;
  /** Poids restant disponible (décrémenté à chaque acceptation) */
  remainingWeight: number;
  /** Nombre de colis restants (décrémenté à chaque acceptation) */
  remainingParcels: number;
  description: string;
  carrierId: string;
  /** 'active' = accepte des demandes, 'full' = complet, 'completed' | 'cancelled' = terminé */
  status: 'active' | 'full' | 'completed' | 'cancelled';
  createdAt: number;
}

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'refused'
  | 'paid'
  | 'in_transit'
  | 'delivered';

export interface Request {
  id: string;
  tripId: string;
  memberId: string;
  carrierId: string;
  memberDisplayName?: string;
  weight: number;
  dimensions?: string;
  description?: string;
  photoUrl?: string;
  status: RequestStatus;
  createdAt: number;
  /** Code généré par le transporteur, stocké en Firestore, visible du membre */
  verificationCode?: string;
  chatId?: string;
  price?: number;
}

export interface Chat {
  id: string;
  requestId: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: number;
  memberId: string;
  carrierId: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: number;
}
