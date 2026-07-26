import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../api/client';

export default function SettingsScreen() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user_email').then((e) => setEmail(e || ''));
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user_email');
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-[#111] p-4">
      <View className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/5 mb-6">
        <Text className="text-white/60 text-xs mb-1">Logged in as</Text>
        <Text className="text-white text-lg font-medium">{email}</Text>
      </View>

      <View className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/5 mb-6">
        <Text className="text-white/60 text-xs mb-1">API Endpoint</Text>
        <Text className="text-white text-sm">{API_BASE_URL}</Text>
        <Text className="text-white/40 text-xs mt-2">
          Update src/api/client.ts if you need to connect to a different ngrok URL.
        </Text>
      </View>

      <TouchableOpacity 
        onPress={handleLogout}
        className="bg-red-900/40 border border-red-500/20 rounded-xl py-4 items-center justify-center"
      >
        <Text className="text-red-400 font-semibold text-lg">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
