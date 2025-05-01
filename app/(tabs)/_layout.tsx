import { Tabs } from 'expo-router';
import { Home, SquareCheck as CheckSquare, Calendar, Bell, FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AdBanner from '@/components/AdBanner';

export default function TabLayout() {
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      {/* Ad Banner at the top */}
      <AdBanner />
      
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
            height: Platform.OS === 'ios' ? 90 : 60,
            paddingBottom: Platform.OS === 'ios' ? 30 : 5,
          },
          tabBarActiveTintColor: '#9333ea',
          tabBarInactiveTintColor: '#666666',
          tabBarItemStyle: {
            paddingVertical: Platform.OS === 'ios' ? 8 : 5,
          },
          tabBarLabelStyle: { 
            fontSize: 10,
            marginBottom: Platform.OS === 'ios' ? 5 : 0,
            paddingBottom: Platform.OS === 'ios' ? 2 : 0,
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