import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { View } from 'react-native';
import { initI18n } from '@/utils/i18n';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { AuthContext } from '../utils/AuthContext';
import { User } from 'firebase/auth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from '@/utils/ErrorBoundary';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Ignore error */
});

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    const init = async () => {
      try {
        await initI18n();
      } catch (error) {
        console.error('Error initializing i18n:', error);
      }
      
      if (fontsLoaded || fontError) {
        await SplashScreen.hideAsync();
      }
    };

    init();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    try {
      const auth = getAuth();
      
      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.log("Auth state changed:", currentUser ? `User: ${currentUser.uid}` : "No user");
        setUser(currentUser);
        setAuthInitialized(true);
      }, (error) => {
        console.error("Auth state change error:", error);
        setAuthInitialized(true);
      });

      // Clean up subscription on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error("Auth setup error:", error);
      setAuthInitialized(true);
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthContext.Provider value={{ user, authInitialized }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="light" />
        </AuthContext.Provider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}