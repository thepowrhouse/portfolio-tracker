import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, ScrollView, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPortfolio, PortfolioState, Holding, fetchRecommendations, StockRecommendation } from '../../api/client';
import { Feather } from '@expo/vector-icons';

export default function HoldingsScreen() {
  const [data, setData] = useState<PortfolioState | null>(null);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('All');
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  const loadData = async () => {
    try {
      const email = await AsyncStorage.getItem('user_email');
      if (email) {
        const portfolio = await fetchPortfolio(email);
        setData(portfolio);
        
        try {
          const recs = await fetchRecommendations();
          setRecommendations(recs);
        } catch (rErr) {
          console.warn('Failed to fetch recommendations', rErr);
        }
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

  const usdToInr = data?.usd_to_inr || 1;

  const renderItem = ({ item }: { item: Holding }) => {
    let pnlAbsolute = item.pnl_absolute || 0;
    let currentPrice = item.current_price;
    if (item.asset_class === 'us_equity') {
      pnlAbsolute *= usdToInr;
      currentPrice *= usdToInr;
    }
    
    const isPositive = pnlAbsolute >= 0;
    const isDayPositive = item.day_change_percent >= 0;
    const rec = recommendations.find(r => r.ticker === item.ticker);
    const action = rec?.horizons?.['mid']?.recommendation;
    const oneDayReturn = rec?.technical?.return_1d;
    
    return (
      <TouchableOpacity 
        onPress={() => setSelectedHolding(item)}
        className="bg-[#0f172a] p-4 mb-3 rounded-2xl flex-row justify-between items-center border border-[#ffffff0a] mx-4"
      >
        <View className="flex-row items-center flex-1">
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isDayPositive ? 'bg-[#10b981]/10' : 'bg-[#ef4444]/10'}`}>
            <Feather name="briefcase" color={isDayPositive ? '#34d399' : '#f87171'} size={20} />
          </View>
          <View className="flex-1 pr-2">
            <View className="flex-row items-center">
              <Text className="text-white font-bold text-base tracking-tight" numberOfLines={1}>{item.ticker}</Text>
              {action && (
                <View className={`ml-2 px-1.5 py-0.5 rounded ${action === 'BUY' ? 'bg-[#10b981]/20' : action === 'SELL' ? 'bg-[#ef4444]/20' : 'bg-[#f59e0b]/20'}`}>
                  <Text className={`text-[9px] font-bold ${action === 'BUY' ? 'text-[#34d399]' : action === 'SELL' ? 'text-[#f87171]' : 'text-[#fbbf24]'}`}>{action}</Text>
                </View>
              )}
            </View>
            <Text className="text-[#64748b] text-xs mt-0.5 font-medium" numberOfLines={1}>{item.company_name}</Text>
            
            <View className="flex-row mt-1.5 gap-3">
              {item.xirr != null && (
                <Text className="text-white/40 text-[10px] font-medium uppercase">XIRR <Text className={item.xirr >= 0 ? "text-emerald-400/80" : "text-red-400/80"}>{item.xirr.toFixed(1)}%</Text></Text>
              )}
              {oneDayReturn != null && (
                <Text className="text-white/40 text-[10px] font-medium uppercase">1D <Text className={oneDayReturn >= 0 ? "text-emerald-400/80" : "text-red-400/80"}>{oneDayReturn.toFixed(1)}%</Text></Text>
              )}
            </View>
          </View>
        </View>

        <View className="items-end pl-2">
          <Text className="text-white font-bold tracking-tight">
            ₹{(currentPrice * item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Feather name={isPositive ? "trending-up" : "trending-down"} color={isPositive ? "#34d399" : "#f87171"} size={12} />
            <Text className={`text-xs ml-1 font-semibold ${isPositive ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
              {isPositive ? '+' : ''}₹{pnlAbsolute.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({item.pnl_percent.toFixed(2)}%)
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderActionSheet = () => {
    if (!selectedHolding) return null;
    const rec = recommendations.find(r => r.ticker === selectedHolding.ticker);
    
    return (
      <Modal transparent visible={!!selectedHolding} animationType="slide" onRequestClose={() => setSelectedHolding(null)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#0f172a] rounded-t-3xl border-t border-[#ffffff10] p-6 max-h-[80%]">
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-white text-2xl font-bold">{selectedHolding.ticker}</Text>
                <Text className="text-[#64748b] text-sm mt-1">{selectedHolding.company_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedHolding(null)} className="p-2 bg-[#1e293b] rounded-full">
                <Feather name="x" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {rec ? (
              <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                <View className="bg-[#1e293b] p-4 rounded-2xl border border-[#ffffff0a] mb-4">
                  <Text className="text-[#94a3b8] text-xs font-bold uppercase mb-2">AI Verdict (Mid Term)</Text>
                  <Text className={`text-xl font-black mb-2 ${rec.horizons['mid']?.recommendation === 'BUY' ? 'text-[#34d399]' : rec.horizons['mid']?.recommendation === 'SELL' ? 'text-[#f87171]' : 'text-[#fbbf24]'}`}>
                    {rec.horizons['mid']?.recommendation || 'HOLD'} 
                    <Text className="text-sm font-medium text-[#64748b]"> • {rec.horizons['mid']?.confidence_score}% Confidence</Text>
                  </Text>
                  <Text className="text-white/80 text-sm leading-relaxed">{rec.horizons['mid']?.overall_summary}</Text>
                </View>

                {rec.horizons['mid']?.rationale?.map((r, i) => (
                  <View key={i} className="mb-4">
                    <Text className="text-[#64748b] text-xs font-bold uppercase mb-2">{r.pillar} Rationale</Text>
                    {r.points.map((pt, j) => (
                      <View key={j} className="flex-row items-start mb-2 pr-4">
                        <View className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] mt-1.5 mr-2" />
                        <Text className="text-white/80 text-sm">{pt}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View className="py-10 items-center justify-center">
                <Text className="text-[#64748b]">No analysis available for this asset yet.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
      
      {renderActionSheet()}
    </View>
  );
}
