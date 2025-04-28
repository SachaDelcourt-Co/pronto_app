import { Tabs } from 'expo-router';
import { Home, SquareCheck as CheckSquare, Calendar, Bell, FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#2a1a2a',
          height: 60,
        },
        tabBarActiveTintColor: '#9333ea',
        tabBarInactiveTintColor: '#666666',
        tabBarItemStyle: {
          paddingVertical: 5,
        },
        tabBarLabelStyle: { 
          fontSize: 10,
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
  );
}