import { Tabs } from 'expo-router';
import { Home, SquareCheck as CheckSquare, Calendar, Bell, FileText } from 'lucide-react-native';

export default function TabLayout() {
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
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Home size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarLabel: "Tasks",
          tabBarIcon: ({ color }) => <CheckSquare size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          tabBarLabel: "Appt",
          tabBarIcon: ({ color }) => <Calendar size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          tabBarLabel: "Remind",
          tabBarIcon: ({ color }) => <Bell size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          tabBarLabel: "Notes",
          tabBarIcon: ({ color }) => <FileText size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}