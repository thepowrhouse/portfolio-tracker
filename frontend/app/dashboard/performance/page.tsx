"use client";

import { Activity, TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react";

export default function PerformancePage() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Portfolio Performance</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track historical returns, alpha generation, and risk metrics over time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Historical Returns Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col lg:col-span-2 min-h-[300px]">
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
