import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../api/client';
import { Feather } from '@expo/vector-icons';


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
    <TouchableOpacity onPress={onPress} className="bg-slate-900/40 p-4 mb-3 rounded-2xl flex-row items-center border border-slate-700/30 shadow-lg">
      <View className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 items-center justify-center mr-4 shadow-sm">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-base tracking-wide">{title}</Text>
        <Text className="text-slate-400 text-xs mt-1 font-medium">{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-slate-950">
      {/* Global Glowing Orbs */}
      <View className="absolute top-[-100] left-[-100] h-[350] w-[350] rounded-full bg-blue-500/15" />
      <View className="absolute top-[200] right-[-100] h-[300] w-[300] rounded-full bg-purple-500/15" />
      <View className="absolute bottom-[-100] left-[50] h-[300] w-[300] rounded-full bg-emerald-500/10" />

      <ScrollView className="flex-1 z-10">
        <View className="p-4 space-y-6 pt-6">
          
          {/* Profile Card */}
          <View className="rounded-3xl p-6 border border-slate-700/40 items-center shadow-2xl overflow-hidden relative">
            <View className="absolute inset-0 bg-slate-900/40" />
            <View className="absolute -top-20 -left-20 h-48 w-48 rounded-full bg-blue-500/10" />
          
          <View className="w-20 h-20 rounded-full bg-blue-500/20 border border-blue-400/30 items-center justify-center mb-3 z-10 shadow-lg">
            <Feather name="user" color="#60a5fa" size={40} />
          </View>
          <Text className="text-white text-xl font-extrabold tracking-tight z-10">{email || 'User'}</Text>
          <Text className="text-slate-400 text-sm mt-1 font-semibold tracking-wide uppercase z-10">Portfolio Tracker Premium</Text>
        </View>

        {/* Features */}
        <View className="mt-6">
          <Text className="text-white font-bold text-lg mb-3 px-1 tracking-wide">Insights</Text>
          <SectionButton 
            icon={<Feather name="pie-chart" color="#a855f7" size={24} />} 
            title="Sector Performance" 
            subtitle="View portfolio breakdown by sector (Coming Soon)" 
          />
          <SectionButton 
            icon={<Feather name="calendar" color="#fb923c" size={24} />} 
            title="Event Calendar" 
            subtitle="Upcoming earnings and macro events (Coming Soon)" 
          />
        </View>

        {/* Settings */}
        <View className="mt-4 mb-8">
          <Text className="text-white font-bold text-lg mb-3 px-1 tracking-wide">Preferences</Text>
          <View className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30 mb-4 shadow-lg">
            <View className="flex-row items-center mb-3">
              <Feather name="settings" color="#94a3b8" size={18} />
              <Text className="text-white font-bold ml-2 tracking-wide">API Connection</Text>
            </View>
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Current Endpoint</Text>
            <Text className="text-slate-300 text-sm bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50 font-medium">{API_BASE_URL}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleLogout}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl py-4 items-center justify-center flex-row shadow-sm"
          >
            <Feather name="log-out" color="#f87171" size={20} />
            <Text className="text-red-400 font-bold text-base ml-2 tracking-wide">Sign Out</Text>
          </TouchableOpacity>
        </View>

        </View>
      </ScrollView>
    </View>
  );
}
