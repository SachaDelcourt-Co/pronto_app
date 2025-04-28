import { Redirect } from 'expo-router';
import { useAuth } from '../utils/AuthContext';

export default function Index() {
  const { user, authInitialized } = useAuth();
  
  // If auth isn't initialized yet, don't redirect (could show a loading screen here)
  if (!authInitialized) {
    return null;
  }
  
  // Redirect based on auth status
  if (user) {
    return <Redirect href="/(tabs)/home" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
} 