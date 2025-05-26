import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../utils/AuthContext';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { user, authInitialized } = useAuth();

  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const alreadyAsked = await AsyncStorage.getItem('notificationPermissionAsked');
        if (alreadyAsked === 'true') return;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            const token = (await Notifications.getExpoPushTokenAsync()).data;
            console.log('Expo Push Token:', token);
          }
        }

        await AsyncStorage.setItem('notificationPermissionAsked', 'true');
      } catch (error) {
        console.error('Failed to request notification permission:', error);
      }
    };

    requestNotificationPermission();
  }, []);

  // Wait for auth to initialize before redirecting
  if (!authInitialized) {
    return null; // Optionally show splash/loading here
  }

  // Redirect based on authentication status
  return <Redirect href={user ? "/(tabs)/home" : "/(auth)/login"} />;
}
