"use client";

import { useState, useEffect, useMemo } from "react";
import { usePortfolio } from "@/store/PortfolioContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const BROKER_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7"];
const INDUSTRY_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#a855f7", "#f59e0b", "#ec4899",
  "#06b6d4", "#8b5cf6", "#f97316", "#14b8a6", "#6366f1", "#f43f5e"
];

interface AssetAllocationProps {
  activeHorizon?: "short" | "mid" | "long";
}

interface QuantMetrics {
  portfolio_beta: number;
  portfolio_alpha: number;
  portfolio_sharpe: number;
  portfolio_sortino: number;
  holdings_analyzed: number;
}

export function AssetAllocation({ activeHorizon = "mid" }: AssetAllocationProps) {
  const { portfolio, recommendations, lastUpdated } = usePortfolio();
  const [view, setView] = useState<"broker" | "industry" | "performance" | "action" | "risk">("broker");
  const [metrics, setMetrics] = useState<QuantMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    const fetchQuant = async () => {
      try {
        const res = await fetch("/api/backend/portfolio/quant");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch quant metrics", err);
      } finally {
        setMetricsLoading(false);
      }
    };
    fetchQuant();
  }, [lastUpdated]);

  const data = useMemo(() => {
    if (!portfolio) return [];

    if (view === "broker") {
      const brokerMap = {
        zerodha: { name: "Zerodha", value: 0, color: BROKER_COLORS[0] },
        groww: { name: "Groww", value: 0, color: BROKER_COLORS[1] },
        indmoney: { name: "INDmoney", value: 0, color: BROKER_COLORS[2] },
        angelone: { name: "AngelOne", value: 0, color: BROKER_COLORS[3] },
        other: { name: "Other", value: 0, color: BROKER_COLORS[4] },
      };

      portfolio.holdings.forEach((h) => {
        let value = (h.current_price || h.avg_price) * h.quantity;
        if (h.asset_class === "us_equity") {
          value *= (portfolio.usd_to_inr || 1);
        }
        
        if (h.broker === "zerodha") brokerMap.zerodha.value += value;
        else if (h.broker === "groww") brokerMap.groww.value += value;
        else if (h.broker === "indmoney") brokerMap.indmoney.value += value;
        else if (h.broker === "angelone") brokerMap.angelone.value += value;
        else brokerMap.other.value += value;
      });

      return Object.values(brokerMap).filter(d => d.value > 0);
    } else if (view === "industry") {
      const indMap: Record<string, { name: string; value: number }> = {};
      
      portfolio.holdings.forEach((h) => {
        let value = (h.current_price || h.avg_price) * h.quantity;
        if (h.asset_class === "us_equity") {
          value *= (portfolio.usd_to_inr || 1);
        }
        
        const rec = recommendations?.find(r => r.ticker === h.ticker);
        const industry = rec?.fundamental?.industry || "Other";
        
        if (!indMap[industry]) {
          indMap[industry] = { name: industry, value: 0 };
        }
        indMap[industry].value += value;
      });

      return Object.values(indMap)
        .sort((a, b) => b.value - a.value)
        .map((item, index) => ({
          ...item,
          color: INDUSTRY_COLORS[index % INDUSTRY_COLORS.length]
        }));
    } else if (view === "performance") {
      let profitCount = 0;
      let lossCount = 0;
      let neutralCount = 0;
      
      portfolio.holdings.forEach(h => {
        const pnl = h.pnl_absolute || 0;
        if (pnl > 0) profitCount++;
        else if (pnl < 0) lossCount++;
        else neutralCount++;
      });
      
      const res = [];
      if (profitCount > 0) res.push({ name: "In Profit", value: profitCount, color: "#22c55e" });
      if (lossCount > 0) res.push({ name: "In Loss", value: lossCount, color: "#ef4444" });
      if (neutralCount > 0) res.push({ name: "Neutral", value: neutralCount, color: "#94a3b8" });
      return res;
    } else if (view === "action") {
      let buyCount = 0;
      let holdCount = 0;
      let sellCount = 0;
      
      portfolio.holdings.forEach(h => {
        const rec = recommendations?.find(r => r.ticker === h.ticker);
        const action = rec?.horizons?.[activeHorizon]?.recommendation;
        
        if (action === "BUY") buyCount++;
        else if (action === "SELL") sellCount++;
        else if (action === "HOLD") holdCount++;
      });
      
      const res = [];
      if (buyCount > 0) res.push({ name: "BUY", value: buyCount, color: "#10b981" }); // emerald-500
      if (holdCount > 0) res.push({ name: "HOLD", value: holdCount, color: "#f59e0b" }); // amber-500
      if (sellCount > 0) res.push({ name: "SELL", value: sellCount, color: "#ef4444" }); // red-500
      return res;
    }
    return [];
  }, [portfolio, recommendations, view, activeHorizon]);

  const performanceStats = useMemo(() => {
    if (!portfolio || view !== "performance") return null;
    let totalProfit = 0;
    let totalLoss = 0;
    portfolio.holdings.forEach(h => {
      let pnl = h.pnl_absolute || 0;
      if (h.asset_class === "us_equity") {
        pnl *= (portfolio.usd_to_inr || 1);
      }
      if (pnl > 0) totalProfit += pnl;
      else if (pnl < 0) totalLoss += pnl;
    });
    return { totalProfit, totalLoss };
  }, [portfolio, view]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 h-full flex flex-col shadow-xl transition-all hover:shadow-2xl">
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-indigo-500 blur-3xl opacity-10" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-4 flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 shrink-0 flex items-center gap-2">
            Portfolio Analytics
            {view === "risk" && (
              <span className="inline-flex items-center rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                Quant AI
              </span>
            )}
          </h3>
          <div className="flex flex-wrap bg-slate-950/40 rounded-xl p-1 gap-1 border border-slate-800/50 backdrop-blur-sm">
            <button
              onClick={() => setView("broker")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                view === "broker" ? "bg-blue-600/20 text-blue-400 shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Broker
            </button>
            <button
              onClick={() => setView("industry")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                view === "industry" ? "bg-blue-600/20 text-blue-400 shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Industry
            </button>
            <button
              onClick={() => setView("performance")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                view === "performance" ? "bg-blue-600/20 text-blue-400 shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => setView("action")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                view === "action" ? "bg-blue-600/20 text-blue-400 shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Action
            </button>
            <button
              onClick={() => setView("risk")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                view === "risk" ? "bg-indigo-600/20 text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Risk
            </button>
          </div>
        </div>
        
        {view === "risk" ? (
          <div className="flex-1 flex flex-col pt-2 min-h-[160px]">
             {metricsLoading ? (
                <div className="flex-1 animate-pulse space-y-4 pt-4">
                   <div className="h-10 w-full rounded bg-slate-800/50" />
                   <div className="h-10 w-full rounded bg-slate-800/50" />
                </div>
             ) : (!metrics || metrics.holdings_analyzed === 0) ? (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                  Upload holdings to calculate risk metrics
                </div>
             ) : (
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col justify-center rounded-xl bg-slate-950/30 p-4 border border-slate-800/50 backdrop-blur-sm transition-all hover:bg-slate-900/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Beta</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-extrabold ${metrics.portfolio_beta > 1.2 ? 'text-amber-400' : 'text-slate-100'}`}>
                        {metrics.portfolio_beta.toFixed(2)}
                      </span>
                    </div>
                    <span className="mt-1 text-[10px] text-slate-400">Volatility vs index</span>
                  </div>
                  <div className="flex flex-col justify-center rounded-xl bg-slate-950/30 p-4 border border-slate-800/50 backdrop-blur-sm transition-all hover:bg-slate-900/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alpha</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-extrabold ${metrics.portfolio_alpha > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {metrics.portfolio_alpha > 0 ? '+' : ''}{(metrics.portfolio_alpha * 100).toFixed(2)}%
                      </span>
                    </div>
                    <span className="mt-1 text-[10px] text-slate-400">Excess return</span>
                  </div>
                  <div className="flex flex-col justify-center rounded-xl bg-slate-950/30 p-4 border border-slate-800/50 backdrop-blur-sm transition-all hover:bg-slate-900/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sharpe</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-extrabold ${metrics.portfolio_sharpe > 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {metrics.portfolio_sharpe.toFixed(2)}
                      </span>
                    </div>
                    <span className="mt-1 text-[10px] text-slate-400">Risk-adjusted return</span>
                  </div>
                  <div className="flex flex-col justify-center rounded-xl bg-slate-950/30 p-4 border border-slate-800/50 backdrop-blur-sm transition-all hover:bg-slate-900/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sortino</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-extrabold ${metrics.portfolio_sortino > 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {metrics.portfolio_sortino.toFixed(2)}
                      </span>
                    </div>
                    <span className="mt-1 text-[10px] text-slate-400">Downside protection</span>
                  </div>
                </div>
             )}
          </div>
        ) : (
        <div className="flex items-center gap-6 flex-1 min-h-[160px]">
          <div className="h-40 w-40 flex-shrink-0 drop-shadow-xl">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.8)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#f8fafc",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                  }}
                  itemStyle={{ color: "#f8fafc", fontWeight: 600 }}
                  formatter={(value: number) => 
                    view === "performance" || view === "action" ? [value, "Count"] : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex-1 space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {data.map((item) => {
              const percent = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={item.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3 truncate pr-2">
                    <div className="h-3 w-3 flex-shrink-0 rounded-full shadow-sm" style={{ background: item.color }} />
                    <span className="text-sm font-medium text-slate-300 truncate group-hover:text-white transition-colors" title={item.name}>{item.name}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-slate-400 group-hover:text-slate-300 transition-colors">
                    {percent.toFixed(1)}%
                  </span>
                </div>
              );
            })}
            
            {view === "performance" && performanceStats && (
              <div className="pt-3 mt-3 border-t border-slate-800/80 bg-slate-950/30 p-2 rounded-lg backdrop-blur-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Profit</span>
                  <span className="text-sm font-bold text-emerald-400">
                    +₹{performanceStats.totalProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Loss</span>
                  <span className="text-sm font-bold text-red-400">
                    -₹{Math.abs(performanceStats.totalLoss).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}