"use client";

import { useEffect, useState } from "react";

interface QuantMetrics {
  portfolio_beta: number;
  portfolio_alpha: number;
  portfolio_sharpe: number;
  portfolio_sortino: number;
  holdings_analyzed: number;
}

export function QuantCard() {
  const [metrics, setMetrics] = useState<QuantMetrics | null>(null);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      }
    };
    fetchQuant();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full animate-pulse flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
        <div className="h-6 w-32 rounded bg-slate-800/80 mb-8" />
        <div className="space-y-4">
          <div className="h-10 w-full rounded bg-slate-800/50" />
          <div className="h-10 w-full rounded bg-slate-800/50" />
        </div>
      </div>
    );
  }

  if (!metrics || metrics.holdings_analyzed === 0) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white">Risk Metrics</h3>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          Upload holdings to calculate risk metrics
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur transition-all hover:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Risk Metrics</h3>
        <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
          Quant AI
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 h-full">
        <div className="flex flex-col justify-center rounded-xl bg-slate-950/50 p-4 border border-slate-800/50">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Beta</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metrics.portfolio_beta > 1.2 ? 'text-amber-400' : 'text-slate-200'}`}>
              {metrics.portfolio_beta.toFixed(2)}
            </span>
          </div>
          <span className="mt-1 text-[10px] text-slate-500">
            {metrics.portfolio_beta > 1 ? "More volatile than index" : "Less volatile than index"}
          </span>
        </div>

        <div className="flex flex-col justify-center rounded-xl bg-slate-950/50 p-4 border border-slate-800/50">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Alpha</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metrics.portfolio_alpha > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {metrics.portfolio_alpha > 0 ? '+' : ''}{(metrics.portfolio_alpha * 100).toFixed(2)}%
            </span>
          </div>
          <span className="mt-1 text-[10px] text-slate-500">Excess return vs benchmark</span>
        </div>

        <div className="flex flex-col justify-center rounded-xl bg-slate-950/50 p-4 border border-slate-800/50">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Sharpe Ratio</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metrics.portfolio_sharpe > 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {metrics.portfolio_sharpe.toFixed(2)}
            </span>
          </div>
          <span className="mt-1 text-[10px] text-slate-500">Risk-adjusted return</span>
        </div>

        <div className="flex flex-col justify-center rounded-xl bg-slate-950/50 p-4 border border-slate-800/50">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Sortino</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metrics.portfolio_sortino > 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {metrics.portfolio_sortino.toFixed(2)}
            </span>
          </div>
          <span className="mt-1 text-[10px] text-slate-500">Downside risk protection</span>
        </div>
      </div>
    </div>
  );
}
