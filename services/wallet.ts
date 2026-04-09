/**
 * services/wallet.ts — Portefeuille simulé
 *
 * Stockage : Firestore `wallets/{uid}`
 * Structure :
 *   balance: number           solde disponible (en €)
 *   cards: WalletCard[]       cartes enregistrées
 *   transactions: WalletTx[]  historique
 *
 * Toutes les opérations financières sont des SIMULATIONS (aucun vrai débit).
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletCard {
  id: string;
  last4: string;
  brand: string;     // 'Visa' | 'Mastercard' | 'Amex' | …
  expiry: string;    // 'MM/AA'
  holder: string;
}

export type TxType = 'payment' | 'earning' | 'withdrawal' | 'topup';

export interface WalletTx {
  id: string;
  type: TxType;
  amount: number;   // positif = crédit, négatif = débit
  description: string;
  date: number;     // timestamp
  requestId?: string;
}

export interface Wallet {
  uid: string;
  balance: number;
  cards: WalletCard[];
  transactions: WalletTx[];
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function brandFromNumber(cardNumber: string): string {
  const n = cardNumber.replace(/\s/g, '');
  if (n.startsWith('4')) return 'Visa';
  if (n.startsWith('5') || (n.startsWith('2') && n.length === 16)) return 'Mastercard';
  if (n.startsWith('34') || n.startsWith('37')) return 'Amex';
  return 'Carte';
}

const emptyWallet = (uid: string): Wallet => ({
  uid,
  balance: 50, // solde initial de démonstration
  cards: [],
  transactions: [],
});

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getWallet(uid: string): Promise<Wallet> {
  const snap = await getDoc(doc(db, 'wallets', uid));
  if (!snap.exists()) {
    const w = emptyWallet(uid);
    await setDoc(doc(db, 'wallets', uid), w);
    return w;
  }
  return snap.data() as Wallet;
}

/** Écoute le portefeuille en temps réel */
export function subscribeWallet(uid: string, cb: (w: Wallet) => void): Unsubscribe {
  return onSnapshot(doc(db, 'wallets', uid), snap => {
    if (snap.exists()) {
      cb(snap.data() as Wallet);
    } else {
      cb(emptyWallet(uid));
    }
  });
}

// ─── Cartes ───────────────────────────────────────────────────────────────────

export async function addCard(
  uid: string,
  cardNumber: string,
  holder: string,
  expiry: string
): Promise<WalletCard> {
  const digits = cardNumber.replace(/\s/g, '');
  const card: WalletCard = {
    id: `card_${Date.now()}`,
    last4: digits.slice(-4),
    brand: brandFromNumber(digits),
    expiry,
    holder,
  };

  const walletRef = doc(db, 'wallets', uid);
  const snap = await getDoc(walletRef);
  if (!snap.exists()) {
    await setDoc(walletRef, { ...emptyWallet(uid), cards: [card] });
  } else {
    await updateDoc(walletRef, { cards: arrayUnion(card) });
  }
  return card;
}

export async function removeCard(uid: string, cardId: string): Promise<void> {
  const walletRef = doc(db, 'wallets', uid);
  const snap = await getDoc(walletRef);
  if (!snap.exists()) return;
  const wallet = snap.data() as Wallet;
  await updateDoc(walletRef, {
    cards: wallet.cards.filter(c => c.id !== cardId),
  });
}

// ─── Paiement (membre → transporteur) ────────────────────────────────────────

export async function payForRequest(
  memberUid: string,
  carrierUid: string,
  amount: number,
  requestId: string,
  description: string
): Promise<void> {
  // Déduire du membre
  const memberRef = doc(db, 'wallets', memberUid);
  const memberSnap = await getDoc(memberRef);
  const memberWallet: Wallet = memberSnap.exists()
    ? (memberSnap.data() as Wallet)
    : emptyWallet(memberUid);

  if (memberWallet.balance < amount) {
    throw new Error('Solde insuffisant. Veuillez recharger votre portefeuille.');
  }

  const debitTx: WalletTx = {
    id: `tx_${Date.now()}_m`,
    type: 'payment',
    amount: -amount,
    description,
    date: Date.now(),
    requestId,
  };
  await setDoc(memberRef, {
    ...memberWallet,
    balance: memberWallet.balance - amount,
    transactions: [debitTx, ...memberWallet.transactions],
  });

  // Créditer le transporteur
  const carrierRef = doc(db, 'wallets', carrierUid);
  const carrierSnap = await getDoc(carrierRef);
  const carrierWallet: Wallet = carrierSnap.exists()
    ? (carrierSnap.data() as Wallet)
    : emptyWallet(carrierUid);

  const creditTx: WalletTx = {
    id: `tx_${Date.now()}_c`,
    type: 'earning',
    amount: +amount,
    description: `Livraison — ${description}`,
    date: Date.now(),
    requestId,
  };
  await setDoc(carrierRef, {
    ...carrierWallet,
    balance: carrierWallet.balance + amount,
    transactions: [creditTx, ...carrierWallet.transactions],
  });
}

// ─── Recharge ─────────────────────────────────────────────────────────────────

export async function topUpWallet(uid: string, amount: number): Promise<void> {
  const walletRef = doc(db, 'wallets', uid);
  const snap = await getDoc(walletRef);
  const wallet: Wallet = snap.exists() ? (snap.data() as Wallet) : emptyWallet(uid);

  const tx: WalletTx = {
    id: `tx_${Date.now()}`,
    type: 'topup',
    amount: +amount,
    description: 'Rechargement du portefeuille (simulation)',
    date: Date.now(),
  };
  await setDoc(walletRef, {
    ...wallet,
    balance: wallet.balance + amount,
    transactions: [tx, ...wallet.transactions],
  });
}

// ─── Retrait (transporteur) ───────────────────────────────────────────────────

export async function withdrawFunds(uid: string, amount: number): Promise<void> {
  const walletRef = doc(db, 'wallets', uid);
  const snap = await getDoc(walletRef);
  const wallet: Wallet = snap.exists() ? (snap.data() as Wallet) : emptyWallet(uid);

  if (wallet.balance < amount) {
    throw new Error('Solde insuffisant pour effectuer ce retrait.');
  }

  const tx: WalletTx = {
    id: `tx_${Date.now()}`,
    type: 'withdrawal',
    amount: -amount,
    description: 'Retrait vers compte bancaire (simulation)',
    date: Date.now(),
  };
  await setDoc(walletRef, {
    ...wallet,
    balance: wallet.balance - amount,
    transactions: [tx, ...wallet.transactions],
  });
}
