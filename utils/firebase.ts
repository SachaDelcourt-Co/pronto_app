import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAKkIPGwO3vPfvUI2EbBCjscJezqb71Tco",
  authDomain: "pronto-e2f19.firebaseapp.com",
  projectId: "pronto-e2f19",
  storageBucket: "pronto-e2f19.firebasestorage.app",
  messagingSenderId: "75187203169",
  appId: "1:75187203169:web:381b301ff31deeba1fce20",
  measurementId: "G-XTP7GGCPKH"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };