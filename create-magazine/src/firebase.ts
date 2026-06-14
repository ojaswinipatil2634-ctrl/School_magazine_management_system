import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, orderBy, getDocFromServer, serverTimestamp, writeBatch, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
console.log('Firebase initialized with Project ID:', firebaseConfig.projectId);

// Initialize Firestore with default database if not specified
export const db = firebaseConfig.firestoreDatabaseId && 
                  firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Second Firestore instance for publishing
// In this environment, we use the same provisioned database for both
export const publishDb = db;

console.log('Firestore initialized');
export const auth = getAuth(app);
export const storage = getStorage(app);
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported or blocked
  });
}
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connected successfully');
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("Firebase connection failed: The client is offline. This often means the Project ID or API Key is incorrect, or Firestore is not enabled for this project.");
    } else {
      console.warn("Firebase connection test warning:", error.message);
    }
  }
}
testConnection();

export { 
  collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, orderBy, 
  ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject,
  signInWithPopup, signOut, onAuthStateChanged, serverTimestamp, writeBatch, onSnapshot
};
