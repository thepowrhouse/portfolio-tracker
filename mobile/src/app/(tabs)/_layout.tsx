import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0a0a0a',
          borderBottomWidth: 1,
          borderBottomColor: '#ffffff10',
        },
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#ffffff10',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#34d399', // Emerald 400
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="holdings"
        options={{
          title: 'Holdings',
          tabBarIcon: ({ color, size }) => <Feather name="briefcase" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="other_assets"
        options={{
          title: 'Other Assets',
          tabBarIcon: ({ color, size }) => <Feather name="credit-card" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Feather name="menu" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
