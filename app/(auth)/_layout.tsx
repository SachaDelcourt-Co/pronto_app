import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen 
        name="privacy-policy" 
        options={{
          presentation: 'modal',
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="terms" 
        options={{
          presentation: 'modal',
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="onboarding"
        options={{
          presentation: 'modal',
          animation: 'fade',
        }}
      />
    </Stack>
  );
}