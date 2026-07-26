import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPortfolio, PortfolioState, Holding } from '../../api/client';
import { TrendingUp, TrendingDown, Building2 } from 'lucide-react-native';

export default function HoldingsScreen() {
  const [data, setData] = useState<PortfolioState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('All');

  const loadData = async () => {
    try {
      const email = await AsyncStorage.getItem('user_email');
      if (email) {
        const portfolio = await fetchPortfolio(email);
        setData(portfolio);
      }
    } catch (err) {
      console.error(err);
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

  const assetClasses = useMemo(() => {
    const classes = new Set(data?.holdings?.map(h => h.asset_class) || []);
    return ['All', ...Array.from(classes)];
  }, [data]);

  const filteredHoldings = useMemo(() => {
    if (filter === 'All') return data?.holdings || [];
    return (data?.holdings || []).filter(h => h.asset_class === filter);
  }, [data, filter]);

  const renderItem = ({ item }: { item: Holding }) => {
    const isPositive = item.pnl_absolute >= 0;
    const isDayPositive = item.day_change_percent >= 0;
    
    return (
      <View className="bg-[#0f172a] p-4 mb-3 rounded-2xl flex-row justify-between items-center border border-[#ffffff0a] mx-4">
        <View className="flex-row items-center flex-1">
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isDayPositive ? 'bg-[#10b981]/10' : 'bg-[#ef4444]/10'}`}>
            <Building2 color={isDayPositive ? '#34d399' : '#f87171'} size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-base tracking-tight" numberOfLines={1}>{item.ticker}</Text>
            <Text className="text-[#64748b] text-xs mt-0.5 font-medium" numberOfLines={1}>{item.company_name}</Text>
          </View>
        </View>

        <View className="items-end pl-2">
          <Text className="text-white font-bold tracking-tight">
            ₹{(item.current_price * item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {isPositive ? <TrendingUp color="#34d399" size={12} /> : <TrendingDown color="#f87171" size={12} />}
            <Text className={`text-xs ml-1 font-semibold ${isPositive ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
              {isPositive ? '+' : ''}₹{item.pnl_absolute.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({item.pnl_percent.toFixed(2)}%)
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <View className="pt-4 pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
          {assetClasses.map(ac => (
            <TouchableOpacity 
              key={ac} 
              onPress={() => setFilter(ac)}
              className={`mr-2 px-4 py-2 rounded-full border ${filter === ac ? 'bg-[#3b82f6]/20 border-[#3b82f6]' : 'bg-[#1e293b] border-[#ffffff0a]'}`}
            >
              <Text className={`font-semibold ${filter === ac ? 'text-[#60a5fa]' : 'text-[#94a3b8]'}`}>
                {ac.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredHoldings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <View className="p-8 items-center justify-center mt-10">
            <Text className="text-[#64748b] font-medium">No holdings found for {filter}.</Text>
          </View>
        }
      />
    </View>
  );
}
