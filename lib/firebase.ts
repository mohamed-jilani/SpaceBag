import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence, 
  browserLocalPersistence,
  getAuth 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyD-...", // This should ideally be a secret, but I'll use the one from the prompt for now
  authDomain: "spacebag-b73c8.firebaseapp.com",
  projectId: "spacebag-b73c8",
  storageBucket: "spacebag-b73c8.appspot.com",
  messagingSenderId: "1037056580750095",
  appId: "1:1037056580750095:web:6cbeeef584de1984c7de33cc5e31187a"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence based on platform
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' 
    ? browserLocalPersistence 
    : getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);

export default app;
