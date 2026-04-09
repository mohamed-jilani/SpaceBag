import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, role: UserRole, acceptedCgu?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (firebaseUser: FirebaseUser) => {
    const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (profileDoc.exists()) {
      setProfile(profileDoc.data() as UserProfile);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    acceptedCgu = false
  ) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, pass);

    const newProfile: UserProfile = {
      uid: firebaseUser.uid,
      email,
      displayName: name,
      role,
      createdAt: Date.now(),
      kycStatus: 'not_submitted',
      ...(acceptedCgu ? { acceptedCguAt: Date.now() } : {}),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
    setProfile(newProfile);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const updatedProfile = { ...profile, ...updates };
    await setDoc(doc(db, 'users', user.uid), updatedProfile);
    setProfile(updatedProfile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signUp, updateProfile, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
