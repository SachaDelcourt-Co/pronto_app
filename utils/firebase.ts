import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKkIPGwO3vPfvUI2EbBCjscJezqb71Tco",
  authDomain: "pronto-e2f19.firebaseapp.com",
  projectId: "pronto-e2f19",
  storageBucket: "pronto-e2f19.firebasestorage.app",
  messagingSenderId: "75187203169",
  appId: "1:75187203169:web:381b301ff31deeba1fce20",
  measurementId: "G-XTP7GGCPKH"
};

// Initialize Firebase app - safer implementation
function initializeFirebase() {
  try {
    // Check if Firebase app is already initialized
    if (getApps().length > 0) {
      console.log("Firebase app already initialized, returning existing app");
      return { 
        app: getApp(), 
        db: getFirestore(getApp()), 
        auth: getAuth(getApp()) 
      };
    }
    
    // Initialize new Firebase app
    console.log("Initializing new Firebase app");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    
    // Log success
    console.log("Firebase initialized successfully with config:", Object.keys(firebaseConfig).join(", "));
    
    return { app, db, auth };
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    
    // Attempt to reinitialize in case of error
    try {
      console.log("Attempting to reinitialize Firebase");
      const app = initializeApp(firebaseConfig, "secondary");
      const db = getFirestore(app);
      const auth = getAuth(app);
      console.log("Firebase reinitialized successfully");
      return { app, db, auth };
    } catch (retryError: any) {
      console.error("Fatal error reinitializing Firebase:", retryError);
      throw new Error("Could not initialize Firebase: " + retryError.message);
    }
  }
}

// Execute initialization
const { app, db, auth } = initializeFirebase();

// Ensure auth is always properly initialized
const ensureAuth = () => {
  if (!auth || !auth.app) {
    console.warn("Auth not initialized, reinitializing");
    const newAuth = getAuth(app);
    return newAuth;
  }
  return auth;
};

export { app, db, auth, ensureAuth };