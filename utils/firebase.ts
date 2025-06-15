import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAKkIPGwO3vPfvUI2EbBCjscJezqb71Tco",
  authDomain: "pronto-e2f19.firebaseapp.com",
  projectId: "pronto-e2f19",
  storageBucket: "pronto-e2f19.firebasestorage.app",
  messagingSenderId: "75187203169",
  appId: "1:75187203169:web:381b301ff31deeba1fce20",
  measurementId: "G-XTP7GGCPKH"
};

// Init function
function initializeFirebase() {
  try {
    if (getApps().length > 0) {
      console.log("Firebase app already initialized");
      const app = getApp();
      return {
        app,
        db: getFirestore(app),
        auth: initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        }),
      };
    }

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

    console.log("Firebase initialized successfully");
    return { app, db, auth };
  } catch (error) {
    console.error("Fatal error initializing Firebase:", error);
    throw new Error("Could not initialize Firebase: " + error.message);
  }
}

// Execute
const { app, db, auth } = initializeFirebase();

export { app, db, auth };
