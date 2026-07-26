import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPortfolio, PortfolioState, Holding } from '../../api/client';

export default function HoldingsScreen() {
  const [data, setData] = useState<PortfolioState | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const renderItem = ({ item }: { item: Holding }) => {
    const isPositive = item.pnl_absolute >= 0;
    
    return (
      <View className="bg-[#1A1A1A] p-4 mb-2 rounded-2xl flex-row justify-between items-center border border-white/5 mx-4">
        <View className="flex-1">
          <Text className="text-white font-bold text-base" numberOfLines={1}>{item.ticker}</Text>
          <Text className="text-white/60 text-xs mt-1" numberOfLines={1}>{item.company_name}</Text>
          <View className="flex-row items-center mt-2">
            <Text className="text-white/40 text-xs mr-2">{item.broker}</Text>
            <Text className="text-white/40 text-xs px-2 py-0.5 bg-white/5 rounded-full">{item.asset_class}</Text>
          </View>
        </View>

        <View className="items-end pl-2">
          <Text className="text-white font-semibold">
            ₹{(item.current_price * item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text className={`text-xs mt-1 font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}₹{item.pnl_absolute.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({item.pnl_percent.toFixed(2)}%)
          </Text>
          <Text className="text-white/40 text-xs mt-1">
            {item.quantity} @ ₹{item.avg_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#111]">
      <FlatList
        data={data?.holdings || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <View className="p-8 items-center justify-center">
            <Text className="text-white/60">No holdings found.</Text>
          </View>
        }
      />
    </View>
  );
}
