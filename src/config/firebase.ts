import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Hardcoded Firebase configuration to bypass Vercel env var issues
const firebaseConfig = {
  apiKey: "AIzaSyA_RFbi1wK9-rZYEbAt1H-VIpZsH21j3Uc",
  authDomain: "data-storeing.firebaseapp.com",
  projectId: "data-storeing",
  storageBucket: "data-storeing.firebasestorage.app",
  messagingSenderId: "72410661880",
  appId: "1:72410661880:web:47ddaf2a6f0a23c6ab8c0d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
