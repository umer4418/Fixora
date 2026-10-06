import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
  inMemoryPersistence,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

/**
 * Fixora Firebase Configuration
 * Connected to project: "Fixora" (majeedumer50@gmail.com)
 * 
 * Supports environment variables via EXPO_PUBLIC_FIREBASE_* as well as
 * custom runtime credentials saved via the Firebase Setup screen.
 */
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const FIREBASE_CONFIG_STORAGE_KEY = '@fixora_custom_firebase_config';

export async function getStoredFirebaseConfig() {
  try {
    const raw = await AsyncStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed reading stored firebase config', err);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export async function saveStoredFirebaseConfig(config: typeof DEFAULT_FIREBASE_CONFIG) {
  await AsyncStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  initFirebase(config);
}

let activeConfig = DEFAULT_FIREBASE_CONFIG;
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;

export function isRealFirebaseKey(key?: string): boolean {
  if (!key) return false;
  if (key.includes('Demo')) return false;
  return key.startsWith('AIza') && key.length >= 25;
}

export function isFirebaseConfigured(): boolean {
  return isRealFirebaseKey(activeConfig.apiKey) && firebaseAuth !== null && firestoreDb !== null;
}

export function initFirebase(customConfig?: typeof DEFAULT_FIREBASE_CONFIG) {
  try {
    const configToUse = customConfig || DEFAULT_FIREBASE_CONFIG;
    activeConfig = configToUse;

    if (!isRealFirebaseKey(configToUse.apiKey)) {
      console.log('ℹ️ Fixora running in Offline/Demo mode. Add your real Firebase credentials in .env to connect to live Firestore & Auth.');
      return { app: null, auth: null, db: null };
    }

    if (!getApps().length) {
      firebaseApp = initializeApp(configToUse);
    } else {
      firebaseApp = getApp();
    }

    try {
      firebaseAuth = initializeAuth(firebaseApp, {
        persistence: inMemoryPersistence,
      });
    } catch {
      firebaseAuth = getAuth(firebaseApp);
    }

    firestoreDb = getFirestore(firebaseApp);

    return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb };
  } catch (error) {
    console.warn('Firebase initialization notice:', error);
    try {
      if (getApps().length > 0) {
        firebaseApp = getApp();
        firebaseAuth = getAuth(firebaseApp);
        firestoreDb = getFirestore(firebaseApp);
        return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb };
      }
    } catch (e) {
      console.warn('Fallback Firebase retrieval error', e);
    }
    return { app: null, auth: null, db: null };
  }
}

// Initial bootstrap
const initResult = initFirebase();
export const app = initResult.app;
export const auth = initResult.auth;
export const db = initResult.db;
