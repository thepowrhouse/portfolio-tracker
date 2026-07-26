import { Tabs } from 'expo-router';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#111',
        },
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#333',
        },
        tabBarActiveTintColor: '#3b82f6',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="holdings"
        options={{
          title: 'Holdings',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
