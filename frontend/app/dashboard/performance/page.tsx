"use client";

import { Wallet, TrendingUp, TrendingDown, LineChart, Coins, Building, Shield, Car, Diamond, BarChart3 } from "lucide-react";
import { usePortfolio } from "@/store/PortfolioContext";
import React, { useEffect } from "react";

export default function PerformancePage() {
  const { portfolio, setRefreshAction, refreshPortfolio } = usePortfolio();
  const netWorth = portfolio?.net_worth_inr || 0;
  const usdRate = portfolio?.usd_to_inr || 83.5;

  let totalInvestment = 0;
  let totalPnl = 0;
  let weightedXirrSum = 0;
  let investedWithXirr = 0;
  let totalDayChange = 0;
  let totalPrevCloseValue = 0;

  // Process Stocks
  const stocksData = { invested: 0, pnl: 0, weightedXirrSum: 0, investedWithXirr: 0, dayChange: 0, prevCloseValue: 0, currentValue: 0 };
  portfolio?.holdings.forEach((h) => {
    const multiplier = h.asset_class === "us_equity" ? usdRate : 1;
    const invested = h.avg_price * h.quantity * multiplier;
    const currentVal = (h.current_price || h.avg_price) * h.quantity * multiplier;
    
    totalInvestment += invested;
    stocksData.invested += invested;
    stocksData.currentValue += currentVal;
    stocksData.pnl += (currentVal - invested);
    
    if (h.day_change_absolute != null) {
      totalDayChange += (h.day_change_absolute * multiplier);
      totalPrevCloseValue += (currentVal - (h.day_change_absolute * multiplier));
      stocksData.dayChange += (h.day_change_absolute * multiplier);
      stocksData.prevCloseValue += (currentVal - (h.day_change_absolute * multiplier));
    }
    
    if (h.xirr != null) {
      weightedXirrSum += (h.xirr * invested);
      investedWithXirr += invested;
      stocksData.weightedXirrSum += (h.xirr * invested);
      stocksData.investedWithXirr += invested;
    }
  });

  // Process Other Assets
  const otherAssetsData: Record<string, { invested: number, pnl: number, weightedXirrSum: number, investedWithXirr: number, currentValue: number }> = {};
  portfolio?.other_assets.forEach((a) => {
    const category = a.category.replace('_', ' ');
    if (!otherAssetsData[category]) {
      otherAssetsData[category] = { invested: 0, pnl: 0, weightedXirrSum: 0, investedWithXirr: 0, currentValue: 0 };
    }
    
    const multiplier = a.currency === "USD" ? usdRate : 1;
    const invested = (a.invested_value || a.value) * multiplier;
    const currentVal = a.value * multiplier;
    
    totalInvestment += invested;
    otherAssetsData[category].invested += invested;
    otherAssetsData[category].currentValue += currentVal;
    otherAssetsData[category].pnl += (currentVal - invested);
    
    if (a.xirr != null && a.invested_value) {
      const realInvested = a.invested_value * multiplier;
      weightedXirrSum += (a.xirr * realInvested);
      investedWithXirr += realInvested;
      otherAssetsData[category].weightedXirrSum += (a.xirr * realInvested);
      otherAssetsData[category].investedWithXirr += realInvested;
    }
  });

  totalPnl = netWorth - totalInvestment;
  const totalPnlPercent = totalInvestment > 0 ? (totalPnl / totalInvestment) * 100 : 0;
  const portfolioXirr = investedWithXirr > 0 ? (weightedXirrSum / investedWithXirr) : null;

  useEffect(() => {
    setRefreshAction(() => async () => {
      await refreshPortfolio(true);
    });
    return () => setRefreshAction(null);
  }, [setRefreshAction, refreshPortfolio]);

  // Build Unified Asset Classes Array for the Grid
  const availableColors = ["blue", "emerald", "amber", "indigo", "rose", "purple", "cyan"];
  let colorIndex = 0;
  const getNextColor = () => availableColors[colorIndex++ % availableColors.length];
  
  const getIconForCategory = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes("stock") || lower.includes("equity")) return LineChart;
    if (lower.includes("real estate") || lower.includes("property")) return Building;
    if (lower.includes("gold") || lower.includes("silver")) return Coins;
    if (lower.includes("savings") || lower.includes("ppf") || lower.includes("bond")) return Shield;
    if (lower.includes("vehicle") || lower.includes("car")) return Car;
    return Diamond;
  };

  const assetClasses = [];
  
  if (stocksData.currentValue > 0) {
    assetClasses.push({
      id: "stocks",
      name: "Stocks & Equities",
      colorName: "blue",
      icon: LineChart,
      data: stocksData
    });
  }

  Object.entries(otherAssetsData).forEach(([cat, data]) => {
    if (data.currentValue > 0) {
      // Assign deterministic colors to common categories, fallback to generic
      let colorName = "cyan";
      const lower = cat.toLowerCase();
      if (lower.includes("real estate")) colorName = "emerald";
      else if (lower.includes("gold")) colorName = "amber";
      else if (lower.includes("savings") || lower.includes("ppf")) colorName = "indigo";
      else if (lower.includes("vehicle")) colorName = "rose";
      else colorName = getNextColor();

      assetClasses.push({
        id: cat,
        name: cat.replace(/\b\w/g, l => l.toUpperCase()),
        colorName,
        icon: getIconForCategory(cat),
        data: data
      });
    }
  });

  // Sort by current value descending
  assetClasses.sort((a, b) => b.data.currentValue - a.data.currentValue);

  // Styling maps
  const bgMap: Record<string, string> = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    indigo: "bg-indigo-500",
    rose: "bg-rose-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500"
  };
  
  const textMap: Record<string, string> = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    indigo: "text-indigo-400",
    rose: "text-rose-400",
    purple: "text-purple-400",
    cyan: "text-cyan-400"
  };

  const gradientMap: Record<string, string> = {
    blue: "from-blue-900/40 to-blue-950/20 border-blue-800/30",
    emerald: "from-emerald-900/40 to-emerald-950/20 border-emerald-800/30",
    amber: "from-amber-900/40 to-amber-950/20 border-amber-800/30",
    indigo: "from-indigo-900/40 to-indigo-950/20 border-indigo-800/30",
    rose: "from-rose-900/40 to-rose-950/20 border-rose-800/30",
    purple: "from-purple-900/40 to-purple-950/20 border-purple-800/30",
    cyan: "from-cyan-900/40 to-cyan-950/20 border-cyan-800/30"
  };

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-emerald-400" />
            Performance
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Track historical returns, asset allocation, and absolute performance over time.
          </p>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl mb-10">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                    Total Portfolio Worth
                  </h3>
                </div>
                <div className="text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  ₹{netWorth.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total P&L</span>
                  <div className={`flex items-center gap-2 text-xl font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {totalPnl >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    <span>{totalPnl >= 0 ? "+" : ""}₹{Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    <span className="text-sm font-medium opacity-80 bg-slate-900/50 px-2 py-0.5 rounded-full">
                      {totalPnl >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {portfolioXirr !== null && (
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Overall XIRR</span>
                    <div className={`flex items-center gap-1 text-xl font-bold ${portfolioXirr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {portfolioXirr >= 0 ? "+" : ""}{portfolioXirr.toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Asset Allocation Bar */}
            {netWorth > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>Asset Allocation</span>
                  <span className="text-slate-500 text-[10px]">Invested: ₹{Math.round(totalInvestment).toLocaleString("en-IN")}</span>
                </div>
                <div className="h-3 w-full flex rounded-full overflow-hidden shadow-inner bg-slate-950/50">
                  {assetClasses.map((ac) => {
                    const pct = (ac.data.currentValue / netWorth) * 100;
                    return (
                      <div 
                        key={ac.id} 
                        style={{ width: `${pct}%` }} 
                        className={`h-full ${bgMap[ac.colorName]} transition-all duration-1000 group relative`}
                        title={`${ac.name}: ${pct.toFixed(1)}%`}
                      >
                        <div className="absolute inset-0 bg-white/0 hover:bg-white/20 transition-colors cursor-crosshair" />
                      </div>
                    );
                  })}
                </div>
                
                {/* Allocation Legend */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4">
                  {assetClasses.map((ac) => {
                    const pct = (ac.data.currentValue / netWorth) * 100;
                    return (
                      <div key={ac.id} className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${bgMap[ac.colorName]}`} />
                        <span className="text-xs text-slate-300 font-medium">{ac.name}</span>
                        <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Asset Class Grid */}
        <h2 className="text-lg font-bold text-slate-200 mb-4">Portfolio Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assetClasses.map((ac) => {
            const isPositive = ac.data.pnl >= 0;
            const catXirr = ac.data.investedWithXirr > 0 ? (ac.data.weightedXirrSum / ac.data.investedWithXirr) : null;
            const Icon = ac.icon;

            return (
              <div 
                key={ac.id} 
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-${ac.colorName}-900/20 ${gradientMap[ac.colorName]}`}
              >
                {/* Background Icon Watermark */}
                <Icon className={`absolute -bottom-4 -right-4 h-32 w-32 opacity-5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 ${textMap[ac.colorName]}`} />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/40 border border-slate-800/50 ${textMap[ac.colorName]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">{ac.name}</h3>
                    </div>
                    {catXirr !== null && (
                      <div className={`flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full bg-slate-950/40 border border-slate-800/50 ${catXirr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {catXirr >= 0 ? "+" : ""}{catXirr.toFixed(2)}%
                        <span className="text-[10px] text-slate-500 uppercase font-medium ml-0.5">XIRR</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Current Value</div>
                    <div className="text-2xl font-bold tabular-nums text-white">
                      ₹{Math.round(ac.data.currentValue).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Invested</div>
                      <div className="text-sm font-medium tabular-nums text-slate-300">
                        ₹{Math.round(ac.data.invested).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">P&L Returns</div>
                      <div className={`text-sm font-bold tabular-nums flex items-center gap-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {isPositive ? "+" : ""}₹{Math.abs(Math.round(ac.data.pnl)).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
