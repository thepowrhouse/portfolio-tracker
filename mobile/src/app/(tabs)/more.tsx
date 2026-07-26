import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../api/client';
import { LogOut, Calendar, PieChart, Settings, User } from 'lucide-react-native';

export default function MoreScreen() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user_email').then((e) => setEmail(e || ''));
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user_email');
    router.replace('/');
  };

  const SectionButton = ({ icon, title, subtitle, onPress }: { icon: React.ReactNode, title: string, subtitle: string, onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress} className="bg-[#0f172a] p-4 mb-3 rounded-2xl flex-row items-center border border-[#ffffff0a]">
      <View className="w-12 h-12 rounded-xl bg-[#1e293b] items-center justify-center mr-4">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-base">{title}</Text>
        <Text className="text-[#64748b] text-xs mt-0.5">{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-[#0a0a0a]">
      <View className="p-4 space-y-6 pt-6">
        
        {/* Profile Card */}
        <View className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] rounded-3xl p-6 border border-[#ffffff10] items-center">
          <View className="w-20 h-20 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/30 items-center justify-center mb-3">
            <User color="#60a5fa" size={40} />
          </View>
          <Text className="text-white text-xl font-bold">{email || 'User'}</Text>
          <Text className="text-[#94a3b8] text-sm mt-1">Portfolio Tracker Premium</Text>
        </View>

        {/* Features */}
        <View className="mt-6">
          <Text className="text-white font-semibold text-lg mb-3 px-1">Insights</Text>
          <SectionButton 
            icon={<PieChart color="#a855f7" size={24} />} 
            title="Sector Performance" 
            subtitle="View portfolio breakdown by sector (Coming Soon)" 
          />
          <SectionButton 
            icon={<Calendar color="#fb923c" size={24} />} 
            title="Event Calendar" 
            subtitle="Upcoming earnings and macro events (Coming Soon)" 
          />
        </View>

        {/* Settings */}
        <View className="mt-4">
          <Text className="text-white font-semibold text-lg mb-3 px-1">Preferences</Text>
          <View className="bg-[#0f172a] p-4 rounded-2xl border border-[#ffffff0a] mb-4">
            <View className="flex-row items-center mb-2">
              <Settings color="#94a3b8" size={18} />
              <Text className="text-white font-bold ml-2">API Connection</Text>
            </View>
            <Text className="text-[#64748b] text-xs mb-1">Current Endpoint</Text>
            <Text className="text-white text-sm bg-[#1e293b] p-2 rounded-lg border border-[#ffffff0a]">{API_BASE_URL}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleLogout}
            className="bg-[#7f1d1d]/30 border border-[#ef4444]/30 rounded-2xl py-4 items-center justify-center flex-row"
          >
            <LogOut color="#f87171" size={20} className="mr-2" />
            <Text className="text-[#f87171] font-semibold text-base ml-2">Sign Out</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}
