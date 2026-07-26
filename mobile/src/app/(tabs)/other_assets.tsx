import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPortfolio, PortfolioState, OtherAsset } from '../../api/client';
import { Feather } from '@expo/vector-icons';

export default function OtherAssetsScreen() {
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

  const getIconForCategory = (category: string) => {
    switch (category.toLowerCase()) {
      case 'mutual_funds': return <Feather name="pie-chart" color="#8b5cf6" size={24} />;
    case 'savings_bank': return <Feather name="briefcase" color="#10b981" size={24} />;
    case 'ppf':
    case 'epf':
    case 'nps': return <Feather name="shield" color="#64748b" size={24} />;
    default: return <Feather name="dollar-sign" color="#38bdf8" size={24} />;
    }
  };

  const renderItem = ({ item }: { item: OtherAsset }) => {
    return (
      <View className="bg-[#0f172a] p-5 mb-4 rounded-2xl flex-row items-center border border-[#ffffff0a] mx-4 shadow-lg">
        <View className="w-12 h-12 rounded-2xl bg-[#1e293b] items-center justify-center mr-4">
          {getIconForCategory(item.category)}
        </View>
        
        <View className="flex-1">
          <Text className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mb-1">{item.category.replace('_', ' ')}</Text>
          <Text className="text-white font-bold text-lg">{item.name}</Text>
        </View>

        <View className="items-end">
          <Text className="text-white font-bold text-lg">
            {item.currency === "USD" ? "$" : "₹"}{item.value.toLocaleString(item.currency === "USD" ? "en-US" : "en-IN", { maximumFractionDigits: 0 })}
          </Text>
          {item.pnl_absolute && item.pnl_percent && (
             <Text className={`text-xs font-semibold mt-1 ${item.pnl_absolute >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
               {item.pnl_absolute >= 0 ? '+' : ''}
               {item.currency === "USD" ? "$" : "₹"}{item.pnl_absolute.toLocaleString(item.currency === "USD" ? "en-US" : "en-IN", { maximumFractionDigits: 0 })} ({item.pnl_percent.toFixed(2)}%)
             </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <FlatList
        data={data?.other_assets || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <View className="p-8 items-center justify-center mt-20">
            <Feather name="credit-card" color="#334155" size={48} />
            <Text className="text-[#64748b] font-medium text-lg mt-4">No other assets found.</Text>
            <Text className="text-[#475569] text-sm text-center mt-2">Go to the web dashboard to add them.</Text>
          </View>
        }
      />
    </View>
  );
}
