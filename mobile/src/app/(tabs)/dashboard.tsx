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
  
  const usdToInr = data?.usd_to_inr || 1;

  const totalPnl = data?.total_pnl ?? data?.holdings?.reduce((sum, h) => {
    let pnl = h.pnl_absolute || 0;
    if (h.asset_class === 'us_equity') pnl *= usdToInr;
    return sum + pnl;
  }, 0) ?? 0;

  const dayChange = data?.day_change ?? data?.holdings?.reduce((sum, h) => {
    let dc = h.day_change_absolute || 0;
    if (h.asset_class === 'us_equity') dc *= usdToInr;
    return sum + dc;
  }, 0) ?? 0;
  
  const prevNetWorth = netWorth - dayChange;
  const dayChangePercent = data?.day_change_percent ?? (prevNetWorth > 0 ? (dayChange / prevNetWorth) * 100 : 0);

  let weightedXirrSum = 0;
  let investedWithXirr = 0;

  data?.holdings?.forEach(h => {
    let invested = h.avg_price * h.quantity;
    if (h.asset_class === 'us_equity') invested *= usdToInr;

    if (h.xirr != null) {
      weightedXirrSum += h.xirr * invested;
      investedWithXirr += invested;
    }
  });

  data?.other_assets?.forEach(a => {
    let invested = a.invested_value || 0;
    if (a.currency === 'USD') invested *= usdToInr;

    if (a.xirr != null && invested > 0) {
      weightedXirrSum += a.xirr * invested;
      investedWithXirr += invested;
    }
  });

  const portfolioXirr = investedWithXirr > 0 ? (weightedXirrSum / investedWithXirr) : null;

  // Calculate Asset Allocation
  const allocation = data?.holdings?.reduce((acc: Record<string, number>, h) => {
    let value = h.current_price * h.quantity;
    if (h.asset_class === 'us_equity') value *= usdToInr;
    acc[h.asset_class] = (acc[h.asset_class] || 0) + value;
    return acc;
  }, {}) || {};

  // Calculate Broker Performance
  const brokerPerformance = data?.holdings?.reduce((acc: Record<string, { invested: number, pnl: number, currentValue: number, xirrSum: number, investedWithXirr: number }>, h) => {
    const broker = h.broker || 'unknown';
    if (!acc[broker]) acc[broker] = { invested: 0, pnl: 0, currentValue: 0, xirrSum: 0, investedWithXirr: 0 };
    
    let multiplier = h.asset_class === 'us_equity' ? usdToInr : 1;
    let invested = h.avg_price * h.quantity * multiplier;
    let currentVal = (h.current_price || h.avg_price) * h.quantity * multiplier;
    
    acc[broker].invested += invested;
    acc[broker].currentValue += currentVal;
    acc[broker].pnl += (currentVal - invested);
    
    if (h.xirr != null) {
      acc[broker].xirrSum += h.xirr * invested;
      acc[broker].investedWithXirr += invested;
    }
    
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
            
            {portfolioXirr !== null && (
              <View className="ml-auto flex-row items-center bg-[#1e293b] px-2 py-1 rounded-md border border-[#ffffff10]">
                <Text className={`font-bold ${portfolioXirr >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                  {portfolioXirr >= 0 ? '+' : ''}{portfolioXirr.toFixed(2)}%
                </Text>
                <Text className="text-[#64748b] text-[10px] ml-1 uppercase font-bold">XIRR</Text>
              </View>
            )}
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

        {/* Performance by Broker */}
        {Object.keys(brokerPerformance).length > 0 && (
          <View className="mt-2">
            <Text className="text-white font-semibold text-lg mb-3">P&L by Broker</Text>
            <View className="bg-[#0f172a] rounded-2xl border border-[#ffffff0a] p-4">
              {Object.entries(brokerPerformance).map(([broker, stats], idx, arr) => {
                const pnlPercent = stats.invested > 0 ? (stats.pnl / stats.invested) * 100 : 0;
                const brokerXirr = stats.investedWithXirr > 0 ? (stats.xirrSum / stats.investedWithXirr) : null;
                return (
                  <View key={broker} className={`py-3 flex-col gap-2 ${idx !== arr.length - 1 ? 'border-b border-[#ffffff0a]' : ''}`}>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-white font-bold capitalize">{broker === 'rsu' ? 'RSU' : broker}</Text>
                      <View className="flex-row items-center gap-1.5 bg-[#1e293b] px-2 py-1 rounded-md border border-[#ffffff0a]">
                        <Text className={`font-bold ${stats.pnl >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                          {stats.pnl >= 0 ? '+' : ''}₹{Math.abs(stats.pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                        <Text className={`text-[10px] font-medium ${stats.pnl >= 0 ? 'text-[#34d399]/80' : 'text-[#f87171]/80'}`}>
                          ({stats.pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </Text>
                      </View>
                    </View>
                    
                    <View className="flex-row justify-between items-center bg-[#0a0a0a]/50 p-2.5 rounded-lg">
                      <View>
                        <Text className="text-[#64748b] text-[10px] uppercase font-bold mb-0.5">Invested</Text>
                        <Text className="text-slate-300 font-medium">₹{Math.round(stats.invested).toLocaleString('en-IN')}</Text>
                      </View>
                      <View>
                        <Text className="text-[#64748b] text-[10px] uppercase font-bold mb-0.5">Current</Text>
                        <Text className="text-white font-bold">₹{Math.round(stats.currentValue).toLocaleString('en-IN')}</Text>
                      </View>
                      {brokerXirr !== null && (
                        <View className="items-end">
                          <Text className="text-[#64748b] text-[10px] uppercase font-bold mb-0.5">XIRR</Text>
                          <Text className={`font-bold ${brokerXirr >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                            {brokerXirr >= 0 ? '+' : ''}{brokerXirr.toFixed(2)}%
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
                  <Text className="text-white font-medium">₹{(h.current_price * (h.asset_class === 'us_equity' ? usdToInr : 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
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
