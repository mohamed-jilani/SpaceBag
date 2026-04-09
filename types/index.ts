export type UserRole = 'carrier' | 'member' | 'admin';

export type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

export interface KycDocuments {
  idPhotoUrl?: string;
  selfieUrl?: string;
  addressProofUrl?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
  photoURL?: string;
  createdAt: number;
  /** Vérification d'identité (KYC) */
  kycVerified?: boolean;
  kycIdPhotoUrl?: string;
  /** Statut KYC détaillé */
  kycStatus?: KycStatus;
  /** Documents soumis pour le KYC */
  kycDocuments?: KycDocuments;
  /** Motif de rejet KYC */
  kycRejectionReason?: string;
  /** Date d'acceptation des CGU (timestamp) */
  acceptedCguAt?: number;
}

export interface Trip {
  id: string;
  departure: string;
  arrival: string;
  date: string;
  price: number;
  maxWeight: number;
  maxParcels: number;
  /** Poids restant (décrémenté à chaque acceptation) */
  remainingWeight: number;
  /** Nombre de colis restants (décrémenté à chaque acceptation) */
  remainingParcels: number;
  description: string;
  carrierId: string;
  /** active = disponible, full = complet, completed | cancelled = terminé */
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
  /** Code à 6 chiffres généré par le transporteur — visible du membre */
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

export interface Review {
  id: string;
  requestId: string;
  fromUserId: string;
  toUserId: string;
  /** Note de 1 à 5 */
  rating: number;
  comment?: string;
  createdAt: number;
}

/** Suivi de colis (simulation GPS) */
export interface TrackingPoint {
  id: string;
  requestId: string;
  lat: number;
  lng: number;
  timestamp: number;
  /** Étape du trajet */
  status: 'picked_up' | 'in_transit' | 'near_destination' | 'delivered';
  /** Progression 0-100 */
  progressPercent: number;
}
