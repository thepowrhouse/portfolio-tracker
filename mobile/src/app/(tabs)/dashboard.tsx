import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPortfolio, PortfolioState } from '../../api/client';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
  const brokerPerformance = data?.holdings?.reduce((acc: Record<string, { invested: number, pnl: number, currentValue: number, xirrSum: number, investedWithXirr: number, dayChange: number, prevCloseValue: number }>, h) => {
    const broker = h.broker || 'unknown';
    if (!acc[broker]) acc[broker] = { invested: 0, pnl: 0, currentValue: 0, xirrSum: 0, investedWithXirr: 0, dayChange: 0, prevCloseValue: 0 };
    
    let multiplier = h.asset_class === 'us_equity' ? usdToInr : 1;
    let invested = h.avg_price * h.quantity * multiplier;
    let currentVal = (h.current_price || h.avg_price) * h.quantity * multiplier;
    
    acc[broker].invested += invested;
    acc[broker].currentValue += currentVal;
    acc[broker].pnl += (currentVal - invested);
    
    if (h.day_change_absolute != null) {
      acc[broker].dayChange += (h.day_change_absolute * multiplier);
      acc[broker].prevCloseValue += (currentVal - (h.day_change_absolute * multiplier));
    }
    
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
      className="flex-1 bg-slate-950"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <View className="p-4 space-y-6">
        {/* Net Worth Card */}
        <View className="rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden relative">
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute inset-0"
          />
          {/* Glowing Orbs */}
          <View className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/10" />
          <View className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500/10" />
          
          <View className="p-6 relative z-10">
          <Text className="text-slate-400 text-sm font-semibold mb-1 tracking-wider uppercase">Total Net Worth</Text>
          <Text className="text-white text-4xl font-extrabold tracking-tight drop-shadow-sm">
            ₹{netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          
          <View className="flex-row items-center mt-5">
            <View className={`px-2.5 py-1.5 rounded-lg border ${dayChange >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <Text className={`font-bold ${dayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {dayChange >= 0 ? '+' : ''}
                ₹{dayChange.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (
                {dayChangePercent.toFixed(2)}%)
              </Text>
            </View>
            <Text className="text-slate-400 text-xs ml-2 font-semibold tracking-wide uppercase">Today</Text>
            
            {portfolioXirr !== null && (
              <View className="ml-auto flex-row items-center bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
                <Text className={`font-bold ${portfolioXirr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolioXirr >= 0 ? '+' : ''}{portfolioXirr.toFixed(2)}%
                </Text>
                <Text className="text-slate-500 text-[10px] ml-1 uppercase font-bold tracking-widest">XIRR</Text>
              </View>
            )}
          </View>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View className="flex-row justify-between gap-4 mt-2">
          <View className="flex-1 bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80 shadow-lg">
            <Text className="text-slate-400 text-xs mb-1 font-semibold tracking-wide uppercase">Total Returns</Text>
            <Text className={`text-lg font-bold tracking-tight drop-shadow-sm ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}
              ₹{totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          
          <View className="flex-1 bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80 shadow-lg">
            <Text className="text-slate-400 text-xs mb-1 font-semibold tracking-wide uppercase">Total Holdings</Text>
            <Text className="text-white text-lg font-bold tracking-tight drop-shadow-sm">
              {data?.holdings?.length || 0} Assets
            </Text>
          </View>
        </View>

        {/* Asset Allocation */}
        <View className="mt-4">
          <Text className="text-white font-bold text-lg mb-3 px-1">Asset Allocation</Text>
          <View className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4 flex-row flex-wrap gap-2 shadow-lg">
            {Object.entries(allocation).map(([key, val]) => (
              <View key={key} className="bg-slate-800/50 px-4 py-3 rounded-xl flex-1 min-w-[45%] border border-slate-700/30">
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{key.replace('_', ' ')}</Text>
                <Text className="text-white font-bold mt-1.5 text-base drop-shadow-sm">₹{Math.round(val as number).toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance by Broker */}
        {Object.keys(brokerPerformance).length > 0 && (
          <View className="mt-4">
            <Text className="text-white font-bold text-lg mb-3 px-1">P&L by Broker</Text>
            <View className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4 shadow-lg">
              {Object.entries(brokerPerformance).map(([broker, stats], idx, arr) => {
                const pnlPercent = stats.invested > 0 ? (stats.pnl / stats.invested) * 100 : 0;
                const brokerXirr = stats.investedWithXirr > 0 ? (stats.xirrSum / stats.investedWithXirr) : null;
                const dayChangePercent = stats.prevCloseValue > 0 ? (stats.dayChange / stats.prevCloseValue) * 100 : 0;
                return (
                  <View key={broker} className={`py-4 flex-col gap-3 ${idx !== arr.length - 1 ? 'border-b border-slate-800/50' : ''}`}>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-slate-200 font-bold capitalize text-base tracking-wide">{broker === 'rsu' ? 'RSU' : broker}</Text>
                      <View className="flex-row items-center gap-1.5 bg-slate-950/40 px-2.5 py-1 rounded-md border border-slate-800/50">
                        <Text className={`font-bold ${stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {stats.pnl >= 0 ? '+' : ''}₹{Math.abs(stats.pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                        <Text className={`text-[10px] font-semibold ${stats.pnl >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                          ({stats.pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </Text>
                      </View>
                    </View>
                    
                    <View className="bg-slate-950/30 p-3.5 rounded-xl gap-2 mt-1 border border-slate-800/30">
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                          <Text className="text-slate-500 text-[10px] uppercase font-bold mb-1 tracking-widest">Invested</Text>
                          <Text className="text-slate-300 font-medium">₹{Math.round(stats.invested).toLocaleString('en-IN')}</Text>
                        </View>
                        <View className="flex-1 items-center">
                          <Text className="text-slate-500 text-[10px] uppercase font-bold mb-1 tracking-widest">Current</Text>
                          <Text className="text-white font-bold drop-shadow-sm">₹{Math.round(stats.currentValue).toLocaleString('en-IN')}</Text>
                        </View>
                        {brokerXirr !== null && (
                          <View className="flex-1 items-end">
                            <Text className="text-slate-500 text-[10px] uppercase font-bold mb-1 tracking-widest">XIRR</Text>
                            <Text className={`font-bold ${brokerXirr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {brokerXirr >= 0 ? '+' : ''}{brokerXirr.toFixed(2)}%
                            </Text>
                          </View>
                        )}
                      </View>
                      <View className="border-t border-slate-800/50 pt-2.5 flex-row justify-between items-center">
                        <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">1D Change</Text>
                        <Text className={`font-semibold ${stats.dayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {stats.dayChange >= 0 ? '+' : ''}₹{Math.abs(Math.round(stats.dayChange)).toLocaleString('en-IN')}
                          <Text className="text-[10px] opacity-80"> ({stats.dayChange >= 0 ? '+' : ''}{dayChangePercent.toFixed(2)}%)</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Movers */}
        <View className="mt-4 mb-8">
          <Text className="text-white font-bold text-lg mb-3 px-1">Top Movers</Text>
          <View className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4 shadow-lg">
            {topGainers.map((h, i) => (
              <View key={h.id} className={`flex-row justify-between items-center py-3.5 ${i !== topGainers.length - 1 ? 'border-b border-slate-800/50' : ''}`}>
                <View>
                  <Text className="text-white font-bold text-base tracking-wide">{h.ticker}</Text>
                  <Text className="text-slate-400 text-xs font-medium mt-0.5">{h.company_name.substring(0, 25)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-white font-bold tabular-nums drop-shadow-sm">₹{(h.current_price * (h.asset_class === 'us_equity' ? usdToInr : 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                  <Text className="text-emerald-400 text-xs font-bold mt-0.5">+{h.day_change_percent.toFixed(2)}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
