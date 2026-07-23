"use client";

import { Activity, TrendingUp, AlertTriangle, ArrowUpRight, Wallet } from "lucide-react";
import { usePortfolio } from "@/store/PortfolioContext";

export default function PerformancePage() {
  const { portfolio } = usePortfolio();
  const netWorth = portfolio?.net_worth_inr || 0;
  const usdRate = portfolio?.usd_to_inr || 83.5;
  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Portfolio Performance</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track historical returns, alpha generation, and risk metrics over time for your entire portfolio.
          </p>
        </div>

        <div className="mb-6">
          {/* Total Portfolio Worth Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Total Portfolio Worth
                </h3>
              </div>
              <span className="text-xs text-slate-500">USD/INR: {usdRate.toFixed(2)}</span>
            </div>
            
            <div className="mb-6">
              <span className="text-3xl font-bold tabular-nums text-slate-100">
                ₹{netWorth.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {portfolio && portfolio.other_assets.length > 0 && (
              <div className="mt-auto pt-4 border-t border-slate-800">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">P&L by Other Assets</div>
                <div className="space-y-2">
                  {Object.entries(
                    portfolio.other_assets.reduce((acc, a) => {
                      const category = a.category.replace('_', ' ');
                      if (!acc[category]) acc[category] = { invested: 0, pnl: 0, weightedXirrSum: 0, investedWithXirr: 0, currentValue: 0 };
                      
                      const multiplier = a.currency === "USD" ? usdRate : 1;
                      const invested = (a.invested_value || a.value) * multiplier;
                      const currentVal = a.value * multiplier;
                      
                      acc[category].invested += invested;
                      acc[category].currentValue += currentVal;
                      acc[category].pnl += (currentVal - invested);
                      
                      if (a.xirr != null && a.invested_value) {
                        const realInvested = a.invested_value * multiplier;
                        acc[category].weightedXirrSum += (a.xirr * realInvested);
                        acc[category].investedWithXirr += realInvested;
                      }
                      return acc;
                    }, {} as Record<string, { invested: number, pnl: number, weightedXirrSum: number, investedWithXirr: number, currentValue: number }>)
                  ).map(([category, data]) => {
                    const pnlPercent = data.invested > 0 ? (data.pnl / data.invested) * 100 : 0;
                    const catXirr = data.investedWithXirr > 0 ? (data.weightedXirrSum / data.investedWithXirr) : null;
                    return (
                    <div key={category} className="flex flex-col gap-1 border-b border-slate-800/50 pb-3 pt-1 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize text-slate-400">{category}</span>
                        <div className="flex items-center gap-2">
                          <span className={`tabular-nums font-medium ${data.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {data.pnl >= 0 ? "+" : ""}₹{Math.abs(data.pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </span>
                          <span className={`tabular-nums text-xs ${data.pnl >= 0 ? "text-emerald-500/70" : "text-red-500/70"}`}>
                            ({data.pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start justify-between text-xs text-slate-500 mt-1">
                        <div className="flex flex-col gap-1.5">
                          <span>Invested: ₹{Math.round(data.invested).toLocaleString("en-IN")}</span>
                          <span>Current: <span className="text-slate-300">₹{Math.round(data.currentValue).toLocaleString("en-IN")}</span></span>
                        </div>
                        {catXirr !== null && (
                          <span>XIRR: <span className={`${catXirr >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}>
                            {catXirr >= 0 ? "+" : ""}{catXirr.toFixed(2)}%
                          </span></span>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Historical Returns Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col min-h-[300px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200">Historical Returns</h3>
                <p className="text-xs text-slate-400">Time-weighted vs Money-weighted (XIRR)</p>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Activity className="h-12 w-12 text-slate-700 mb-4" />
              <p className="text-sm font-medium text-slate-400">Performance charting coming soon</p>
              <p className="text-xs text-slate-500 mt-2 max-w-sm">
                We're building advanced visualizations to compare your portfolio against benchmarks like NIFTY 50 and S&P 500.
              </p>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200">Risk Analysis</h3>
                <p className="text-xs text-slate-400">Volatility & Drawdowns</p>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700/50 flex justify-between items-center opacity-50">
                <span className="text-sm font-medium text-slate-300">Beta</span>
                <span className="text-sm font-mono text-slate-400">—</span>
              </div>
              <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700/50 flex justify-between items-center opacity-50">
                <span className="text-sm font-medium text-slate-300">Sharpe Ratio</span>
                <span className="text-sm font-mono text-slate-400">—</span>
              </div>
              <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700/50 flex justify-between items-center opacity-50">
                <span className="text-sm font-medium text-slate-300">Max Drawdown</span>
                <span className="text-sm font-mono text-slate-400">—</span>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
                In Development
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
