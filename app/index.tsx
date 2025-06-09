import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '../utils/AuthContext';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { user, authInitialized } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  // Ask for push notification permissions
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

  // Perform navigation after layout is ready and auth is initialized
  useEffect(() => {
    if (!rootNavigationState?.key || !authInitialized) return;

    if (user) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, authInitialized, rootNavigationState]);

  // Show loading spinner while waiting
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
