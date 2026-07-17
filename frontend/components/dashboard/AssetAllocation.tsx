"use client";

import { useState, useMemo } from "react";
import { usePortfolio } from "@/store/PortfolioContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const BROKER_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#a855f7"];
const INDUSTRY_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#a855f7", "#f59e0b", "#ec4899",
  "#06b6d4", "#8b5cf6", "#f97316", "#14b8a6", "#6366f1", "#f43f5e"
];

interface AssetAllocationProps {
  activeHorizon?: "short" | "mid" | "long";
}

export function AssetAllocation({ activeHorizon = "mid" }: AssetAllocationProps) {
  const { portfolio, recommendations } = usePortfolio();
  const [view, setView] = useState<"broker" | "industry" | "performance" | "action">("broker");

  const data = useMemo(() => {
    if (!portfolio) return [];

    if (view === "broker") {
      const brokerMap = {
        zerodha: { name: "Zerodha", value: 0, color: BROKER_COLORS[0] },
        groww: { name: "Groww", value: 0, color: BROKER_COLORS[1] },
        indmoney: { name: "INDmoney", value: 0, color: BROKER_COLORS[2] },
        other: { name: "Other", value: 0, color: BROKER_COLORS[3] },
      };

      portfolio.holdings.forEach((h) => {
        let value = (h.current_price || h.avg_price) * h.quantity;
        if (h.asset_class === "us_equity") {
          value *= (portfolio.usd_to_inr || 1);
        }
        
        if (h.broker === "zerodha") brokerMap.zerodha.value += value;
        else if (h.broker === "groww") brokerMap.groww.value += value;
        else if (h.broker === "indmoney") brokerMap.indmoney.value += value;
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 h-full flex flex-col">
      <div className="mb-4 flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 shrink-0">
          Portfolio Breakdown
        </h3>
        <div className="flex flex-wrap bg-slate-800/50 rounded-lg p-1 gap-1">
          <button
            onClick={() => setView("broker")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === "broker" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Broker
          </button>
          <button
            onClick={() => setView("industry")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === "industry" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Industry
          </button>
          <button
            onClick={() => setView("performance")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === "performance" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setView("action")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === "action" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Action
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-6 flex-1">
        <div className="h-40 w-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#e2e8f0",
                }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={(value: number) => 
                  view === "performance" || view === "action" ? [value, "Count"] : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex-1 space-y-3 max-h-40 overflow-y-auto pr-2">
          {data.map((item) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate pr-2">
                  <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="text-sm text-slate-300 truncate" title={item.name}>{item.name}</span>
                </div>
                <span className="text-sm font-medium tabular-nums text-slate-400">
                  {percent.toFixed(1)}%
                </span>
              </div>
            );
          })}
          
          {view === "performance" && performanceStats && (
            <div className="pt-3 mt-3 border-t border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500">Total Profit</span>
                <span className="text-sm font-medium text-emerald-400">
                  +₹{performanceStats.totalProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Total Loss</span>
                <span className="text-sm font-medium text-red-400">
                  -₹{Math.abs(performanceStats.totalLoss).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}