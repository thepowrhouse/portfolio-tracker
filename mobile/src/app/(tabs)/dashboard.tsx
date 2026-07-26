import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPortfolio, PortfolioState } from '../../api/client';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const [data, setData] = useState<PortfolioState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const email = await AsyncStorage.getItem('user_email');
      if (!email) {
        router.replace('/');
        return;
      }
      const portfolio = await fetchPortfolio(email);
      setData(portfolio);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (error) {
    return (
      <View className="flex-1 bg-[#111] items-center justify-center p-6">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-[#111]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <View className="p-4 space-y-4">
        {/* Net Worth Card */}
        <View className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl p-6 shadow-lg border border-white/10">
          <Text className="text-white/70 text-sm font-medium mb-1">Total Net Worth</Text>
          <Text className="text-white text-4xl font-bold tracking-tight">
            ₹{data?.net_worth?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'}
          </Text>
          
          <View className="flex-row items-center mt-4">
            <View className={`px-2 py-1 rounded-full ${data?.day_change && data.day_change >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <Text className={`font-semibold ${data?.day_change && data.day_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data?.day_change && data.day_change >= 0 ? '+' : ''}
                ₹{data?.day_change?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'} (
                {data?.day_change_percent?.toFixed(2) || '0'}%)
              </Text>
            </View>
            <Text className="text-white/60 text-xs ml-2">Today</Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View className="flex-row justify-between gap-4 mt-2">
          <View className="flex-1 bg-[#1A1A1A] rounded-2xl p-4 border border-white/5">
            <Text className="text-white/60 text-xs mb-1">Total Returns</Text>
            <Text className={`text-lg font-bold ${data?.total_pnl && data.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data?.total_pnl && data.total_pnl >= 0 ? '+' : ''}
              ₹{data?.total_pnl?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'}
            </Text>
          </View>
          
          <View className="flex-1 bg-[#1A1A1A] rounded-2xl p-4 border border-white/5">
            <Text className="text-white/60 text-xs mb-1">Total Holdings</Text>
            <Text className="text-white text-lg font-bold">
              {data?.holdings?.length || 0} Assets
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
