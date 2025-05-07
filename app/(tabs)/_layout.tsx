import { Tabs } from 'expo-router';
import { Home, SquareCheck as CheckSquare, Calendar, Bell, FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/utils/AuthContext';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function TabLayout() {
  const { t } = useTranslation();
  const { user, authInitialized } = useAuth();
  
  // Protect this route - redirect to login if not authenticated
  useEffect(() => {
    if (authInitialized && !user) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/(auth)/login');
    }
  }, [user, authInitialized]);
  
  // Don't render the tabs if not authenticated
  if (authInitialized && !user) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarBackground: () => (
            <LinearGradient
              colors={['#1a1a1a', '#2a1a2a']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          ),
          tabBarStyle: {
            borderTopColor: 'rgba(42, 26, 42, 0.8)',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 100 : 70,
            paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          },
          tabBarActiveTintColor: '#9333ea',
          tabBarInactiveTintColor: '#666666',
          tabBarItemStyle: {
            paddingVertical: Platform.OS === 'ios' ? 8 : 5,
          },
          tabBarLabelStyle: { 
            fontSize: 10,
            marginTop: 3,
            marginBottom: 0,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarLabel: t('navigation.home'),
            tabBarIcon: ({ color }) => <Home size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            tabBarLabel: t('navigation.tasks'),
            tabBarIcon: ({ color }) => <CheckSquare size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="appointments"
          options={{
            tabBarLabel: t('navigation.appointments'),
            tabBarIcon: ({ color }) => <Calendar size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reminders"
          options={{
            tabBarLabel: t('navigation.reminders'),
            tabBarIcon: ({ color }) => <Bell size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            tabBarLabel: t('navigation.notes'),
            tabBarIcon: ({ color }) => <FileText size={20} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
});