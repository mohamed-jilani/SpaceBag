/**
 * useChat — messagerie temps réel
 *
 * Architecture Firestore :
 *   chats/{chatId}                       — métadonnées de la conversation
 *   chats/{chatId}/messages/{msgId}      — messages (sous-collection)
 *
 * Firestore security rules :
 *   match /chats/{chatId} {
 *     allow read, write: if request.auth.uid in resource.data.participants;
 *     match /messages/{msgId} {
 *       allow read, write: if request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
 *     }
 *   }
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chat, Message } from '@/types';

// ─── Liste des conversations de l'utilisateur ────────────────────────────────

export const useChats = (userId: string) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Pas d'orderBy ici pour éviter l'index composite (participants + updatedAt)
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const chatList = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
        })) as Chat[];
        // Tri côté client : conversations les plus récentes en premier
        chatList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setChats(chatList);
        setLoading(false);
      },
      error => {
        console.error('useChats error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { chats, loading };
};

// ─── Messages d'une conversation (sous-collection) ───────────────────────────

export const useMessages = (chatId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      return;
    }

    // Sous-collection : index simple sur createdAt, pas de composite
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const msgList = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          // Convertir Firestore Timestamp → number (ms)
          createdAt: d.data().createdAt?.toMillis?.() ?? d.data().createdAt ?? Date.now(),
        })) as Message[];
        setMessages(msgList);
        setLoading(false);
      },
      error => {
        console.error('useMessages error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (senderId: string, text: string) => {
    if (!text.trim() || !chatId) return;

    // Écrire le message dans la sous-collection
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      chatId,
      senderId,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });

    // Mettre à jour le dernier message sur le document parent
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: text.trim(),
      updatedAt: Date.now(),
    });
  };

  return { messages, loading, sendMessage };
};

// ─── Récupérer ou créer une conversation ─────────────────────────────────────

export const getOrCreateChat = async (
  requestId: string,
  memberId: string,
  carrierId: string
): Promise<string> => {
  const chatsRef = collection(db, 'chats');

  // Chercher une conversation existante pour cette demande
  const q = query(chatsRef, where('requestId', '==', requestId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  // Créer une nouvelle conversation
  const newChatRef = doc(collection(db, 'chats'));
  await setDoc(newChatRef, {
    id: newChatRef.id,
    requestId,
    memberId,
    carrierId,
    participants: [memberId, carrierId],
    updatedAt: Date.now(),
    lastMessage: '',
  } satisfies Chat);

  return newChatRef.id;
};
