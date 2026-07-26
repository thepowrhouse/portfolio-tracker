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

  const netWorth = data?.net_worth_inr ?? data?.net_worth ?? 0;
  
  const totalPnl = data?.total_pnl ?? data?.holdings?.reduce((sum, h) => sum + (h.pnl_absolute || 0), 0) ?? 0;
  const dayChange = data?.day_change ?? data?.holdings?.reduce((sum, h) => sum + (h.day_change_absolute || 0), 0) ?? 0;
  
  const prevNetWorth = netWorth - dayChange;
  const dayChangePercent = data?.day_change_percent ?? (prevNetWorth > 0 ? (dayChange / prevNetWorth) * 100 : 0);

  // Calculate Asset Allocation
  const allocation = data?.holdings?.reduce((acc: Record<string, number>, h) => {
    const value = h.current_price * h.quantity;
    acc[h.asset_class] = (acc[h.asset_class] || 0) + value;
    return acc;
  }, {}) || {};

  // Sort top movers
  const topGainers = [...(data?.holdings || [])]
    .filter(h => h.day_change_percent > 0)
    .sort((a, b) => b.day_change_percent - a.day_change_percent)
    .slice(0, 3);

  const topLosers = [...(data?.holdings || [])]
    .filter(h => h.day_change_percent < 0)
    .sort((a, b) => a.day_change_percent - b.day_change_percent)
    .slice(0, 3);

  return (
    <ScrollView 
      className="flex-1 bg-[#0a0a0a]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <View className="p-4 space-y-6">
        {/* Net Worth Card */}
        <View className="bg-[#0f172a] rounded-3xl p-6 border border-[#ffffff10] shadow-2xl">
          <Text className="text-[#94a3b8] text-sm font-medium mb-1 tracking-wide uppercase">Total Net Worth</Text>
          <Text className="text-white text-4xl font-bold tracking-tight">
            ₹{netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          
          <View className="flex-row items-center mt-4">
            <View className={`px-2 py-1 rounded-md ${dayChange >= 0 ? 'bg-[#10b981]/20' : 'bg-[#ef4444]/20'}`}>
              <Text className={`font-semibold ${dayChange >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                {dayChange >= 0 ? '+' : ''}
                ₹{dayChange.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (
                {dayChangePercent.toFixed(2)}%)
              </Text>
            </View>
            <Text className="text-[#64748b] text-xs ml-2 font-medium">Today</Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View className="flex-row justify-between gap-4 mt-2">
          <View className="flex-1 bg-[#0f172a] rounded-2xl p-4 border border-[#ffffff0a]">
            <Text className="text-[#64748b] text-xs mb-1 font-medium">Total Returns</Text>
            <Text className={`text-lg font-bold tracking-tight ${totalPnl >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
              {totalPnl >= 0 ? '+' : ''}
              ₹{totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          
          <View className="flex-1 bg-[#0f172a] rounded-2xl p-4 border border-[#ffffff0a]">
            <Text className="text-[#64748b] text-xs mb-1 font-medium">Total Holdings</Text>
            <Text className="text-white text-lg font-bold tracking-tight">
              {data?.holdings?.length || 0} Assets
            </Text>
          </View>
        </View>

        {/* Asset Allocation */}
        <View className="mt-2">
          <Text className="text-white font-semibold text-lg mb-3">Asset Allocation</Text>
          <View className="bg-[#0f172a] rounded-2xl border border-[#ffffff0a] p-4 flex-row flex-wrap gap-2">
            {Object.entries(allocation).map(([key, val]) => (
              <View key={key} className="bg-[#1e293b] px-3 py-2 rounded-xl flex-1 min-w-[45%]">
                <Text className="text-[#94a3b8] text-xs font-medium uppercase">{key.replace('_', ' ')}</Text>
                <Text className="text-white font-bold mt-1">₹{Math.round(val as number).toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Movers */}
        <View className="mt-2 mb-6">
          <Text className="text-white font-semibold text-lg mb-3">Top Movers</Text>
          <View className="bg-[#0f172a] rounded-2xl border border-[#ffffff0a] p-4">
            {topGainers.map((h, i) => (
              <View key={h.id} className={`flex-row justify-between items-center py-3 ${i !== topGainers.length - 1 ? 'border-b border-[#ffffff0a]' : ''}`}>
                <View>
                  <Text className="text-white font-semibold">{h.ticker}</Text>
                  <Text className="text-[#64748b] text-xs">{h.company_name.substring(0, 20)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-white font-medium">₹{h.current_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                  <Text className="text-[#34d399] text-xs font-semibold">+{h.day_change_percent.toFixed(2)}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
