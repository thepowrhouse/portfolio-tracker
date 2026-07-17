"use client";

import { usePortfolio } from "@/store/PortfolioContext";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

export function NetWorthCard() {
  const { portfolio } = usePortfolio();

  const netWorth = portfolio?.net_worth_inr || 0;
  const usdRate = portfolio?.usd_to_inr || 83.5;

  // Calculate actual total P&L
  let totalInvestment = 0;
  let totalPnl = 0;
  let weightedXirrSum = 0;
  let investedWithXirr = 0;
  
  portfolio?.holdings.forEach((h) => {
    const multiplier = h.asset_class === "us_equity" || h.asset_class === "US_EQUITY" ? usdRate : 1;
    const invested = h.avg_price * h.quantity * multiplier;
    totalInvestment += invested;
    if (h.xirr != null) {
      weightedXirrSum += (h.xirr * invested);
      investedWithXirr += invested;
    }
  });
  
  totalPnl = netWorth - totalInvestment;
  const totalPnlPercent = totalInvestment > 0 ? (totalPnl / totalInvestment) * 100 : 0;
  const portfolioXirr = investedWithXirr > 0 ? (weightedXirrSum / investedWithXirr) : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Net Worth
          </h3>
        </div>
        <span className="text-xs text-slate-500">USD/INR: {usdRate.toFixed(2)}</span>
      </div>
      
      <div className="mb-2">
        <span className="text-3xl font-bold tabular-nums text-slate-100">
          ₹{netWorth.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      
      <div className="flex flex-col gap-1 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Invested:</span>
          <span className="tabular-nums font-medium text-slate-300">
            ₹{Math.round(totalInvestment).toLocaleString("en-IN")}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
        }`}>
          {totalPnl >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span className="tabular-nums">
            {totalPnl >= 0 ? "+" : ""}₹{Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
          <span className="text-slate-500">
            ({totalPnl >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%)
          </span>
        </div>
        
        {portfolioXirr !== null && (
          <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
            <span>Portfolio XIRR:</span>
            <span className={`tabular-nums font-medium ${portfolioXirr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {portfolioXirr >= 0 ? "+" : ""}{portfolioXirr.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {portfolio && portfolio.holdings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">P&L by Broker</div>
          <div className="space-y-2">
            {Object.entries(
              portfolio.holdings.reduce((acc, h) => {
                const broker = h.broker || 'unknown';
                if (!acc[broker]) acc[broker] = { invested: 0, pnl: 0, weightedXirrSum: 0, investedWithXirr: 0 };
                
                const multiplier = h.asset_class === "us_equity" || h.asset_class === "US_EQUITY" ? usdRate : 1;
                const invested = h.avg_price * h.quantity * multiplier;
                
                acc[broker].invested += invested;
                acc[broker].pnl += ((h.current_price || h.avg_price) - h.avg_price) * h.quantity * multiplier;
                if (h.xirr != null) {
                  acc[broker].weightedXirrSum += (h.xirr * invested);
                  acc[broker].investedWithXirr += invested;
                }
                return acc;
              }, {} as Record<string, { invested: number, pnl: number, weightedXirrSum: number, investedWithXirr: number }>)
            ).map(([broker, data]) => {
              const pnlPercent = data.invested > 0 ? (data.pnl / data.invested) * 100 : 0;
              const brokerXirr = data.investedWithXirr > 0 ? (data.weightedXirrSum / data.investedWithXirr) : null;
              return (
              <div key={broker} className="flex flex-col gap-1 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-400">{broker}</span>
                  <div className="flex items-center gap-2">
                    <span className={`tabular-nums font-medium ${data.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {data.pnl >= 0 ? "+" : ""}₹{Math.abs(data.pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`tabular-nums text-xs ${data.pnl >= 0 ? "text-emerald-500/70" : "text-red-500/70"}`}>
                      ({data.pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex flex-col gap-1">
                    <span>Invested: ₹{Math.round(data.invested).toLocaleString("en-IN")}</span>
                  </div>
                  {brokerXirr !== null && (
                    <span>XIRR: <span className={`${brokerXirr >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}>
                      {brokerXirr >= 0 ? "+" : ""}{brokerXirr.toFixed(2)}%
                    </span></span>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
    </div>
  );
}