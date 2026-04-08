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
  limit,
  Timestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chat, Message } from '@/types';

export const useChats = (userId: string) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { chats, loading };
};

export const useMessages = (chatId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now()
      })) as Message[];
      setMessages(msgList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (senderId: string, text: string) => {
    if (!text.trim() || !chatId) return;

    const messageData = {
      chatId,
      senderId,
      text,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'messages'), messageData);
    
    // Update chat last message
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: text,
      updatedAt: Date.now()
    });
  };

  return { messages, loading, sendMessage };
};

export const getOrCreateChat = async (requestId: string, memberId: string, carrierId: string) => {
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('requestId', '==', requestId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  const newChatRef = doc(collection(db, 'chats'));
  const chatData: Chat = {
    id: newChatRef.id,
    requestId,
    memberId,
    carrierId,
    participants: [memberId, carrierId],
    updatedAt: Date.now(),
    lastMessage: ''
  };

  await setDoc(newChatRef, chatData);
  return newChatRef.id;
};
