import { getAuth, onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const setupAuthDebug = () => {
  const auth = getAuth();
  
  // Monitor all auth state changes
  onAuthStateChanged(auth, async (user) => {
    const timestamp = new Date().toISOString();
    const platform = Platform.OS;
    
    const authState = {
      timestamp,
      platform,
      isAuthenticated: !!user,
      userId: user?.uid || null,
      email: user?.email || null,
      emailVerified: user?.emailVerified || false,
      providerId: user?.providerId || null,
      lastLoginAt: user?.metadata?.lastSignInTime || null,
      createdAt: user?.metadata?.creationTime || null,
    };
    
    console.log('🔐 Auth State Change:', JSON.stringify(authState, null, 2));
    
    // Save auth state to AsyncStorage for debugging
    try {
      // Keep a log of the last 5 auth states
      const previousStates = await AsyncStorage.getItem('auth_debug_log');
      const log = previousStates ? JSON.parse(previousStates) : [];
      log.unshift(authState); // Add newest state at beginning
      
      // Keep only last 5 states
      const trimmedLog = log.slice(0, 5);
      await AsyncStorage.setItem('auth_debug_log', JSON.stringify(trimmedLog));
    } catch (error) {
      console.error('Error saving auth debug log:', error);
    }
  });
};

export const getAuthDebugLog = async () => {
  try {
    const log = await AsyncStorage.getItem('auth_debug_log');
    return log ? JSON.parse(log) : [];
  } catch (error) {
    console.error('Error reading auth debug log:', error);
    return [];
  }
};

export const dumpAuthDebugInfo = async () => {
  try {
    // Get current auth object state
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    // Get AsyncStorage auth debug log
    const log = await getAuthDebugLog();
    
    // Check if we have tokens in AsyncStorage
    let firebaseTokens = null;
    try {
      // Look for Firebase auth persistence data
      const keys = await AsyncStorage.getAllKeys();
      const firebaseKeys = keys.filter(key => key.includes('firebase') || key.includes('auth'));
      if (firebaseKeys.length > 0) {
        const firebaseItems = await AsyncStorage.multiGet(firebaseKeys);
        firebaseTokens = Object.fromEntries(firebaseItems);
      }
    } catch (e) {
      console.error('Error checking AsyncStorage for tokens:', e);
    }
    
    // Return all debug info
    return {
      currentAuthState: {
        isAuthenticated: !!currentUser,
        userId: currentUser?.uid || null,
        email: currentUser?.email || null,
        emailVerified: currentUser?.emailVerified || false,
        providerId: currentUser?.providerId || null,
        refreshToken: currentUser?.refreshToken || null,
      },
      authStateChangeLog: log,
      firebasePersistenceData: firebaseTokens,
      platform: Platform.OS,
      version: Platform.Version,
    };
  } catch (error: any) {
    console.error('Error dumping auth debug info:', error);
    return { error: error.message };
  }
}; 