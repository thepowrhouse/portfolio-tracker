"use client";

import { usePortfolio } from "@/store/PortfolioContext";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

export function NetWorthCard() {
  const { portfolio } = usePortfolio();

  const usdRate = portfolio?.usd_to_inr || 83.5;

  // Calculate actual total P&L
  let stocksNetWorth = 0;
  let totalInvestment = 0;
  let totalPnl = 0;
  let weightedXirrSum = 0;
  let investedWithXirr = 0;
  let totalDayChange = 0;
  let totalPrevCloseValue = 0;
  
  portfolio?.holdings.forEach((h) => {
    const multiplier = h.asset_class === "us_equity" ? usdRate : 1;
    const invested = h.avg_price * h.quantity * multiplier;
    const currentVal = (h.current_price || h.avg_price) * h.quantity * multiplier;
    
    totalInvestment += invested;
    stocksNetWorth += currentVal;
    
    if (h.day_change_absolute != null) {
      totalDayChange += (h.day_change_absolute * multiplier);
      totalPrevCloseValue += (currentVal - (h.day_change_absolute * multiplier));
    }
    
    if (h.xirr != null) {
      weightedXirrSum += (h.xirr * invested);
      investedWithXirr += invested;
    }
  });
  
  totalPnl = stocksNetWorth - totalInvestment;
  const totalPnlPercent = totalInvestment > 0 ? (totalPnl / totalInvestment) * 100 : 0;
  const portfolioXirr = investedWithXirr > 0 ? (weightedXirrSum / investedWithXirr) : null;
  const totalDayChangePercent = totalPrevCloseValue > 0 ? (totalDayChange / totalPrevCloseValue) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1 group">
      {/* Dynamic Background Glow based on P&L */}
      <div className={`absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-20 transition-colors duration-700 ${totalPnl >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-blue-500 blur-3xl opacity-10 transition-colors duration-700 group-hover:opacity-20" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <Wallet className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Stocks Net Worth
            </h3>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500 bg-slate-950/50 px-2 py-1 rounded-full border border-slate-800/50">
            USD/INR: {usdRate.toFixed(2)}
          </span>
        </div>
        
        <div className="mb-4">
          <span className="text-4xl font-extrabold tracking-tight tabular-nums text-white drop-shadow-sm">
            ₹{stocksNetWorth.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex flex-col gap-2 mb-5 bg-slate-950/30 p-3 rounded-xl border border-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Invested:</span>
            <span className="tabular-nums font-semibold text-slate-200">
              ₹{Math.round(totalInvestment).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Total P&L:</span>
            <div className={`flex items-center gap-1 font-bold ${
              totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {totalPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="tabular-nums">
                {totalPnl >= 0 ? "+" : ""}₹{Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs bg-slate-950/50 px-1.5 py-0.5 rounded ml-1 opacity-90">
                {totalPnl >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">1D Change:</span>
            <span className={`tabular-nums font-semibold ${totalDayChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalDayChange >= 0 ? "+" : ""}₹{Math.abs(Math.round(totalDayChange)).toLocaleString("en-IN")} 
              <span className="text-xs opacity-80 ml-1">({totalDayChange >= 0 ? "+" : ""}{totalDayChangePercent.toFixed(2)}%)</span>
            </span>
          </div>
          
          {portfolioXirr !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Overall XIRR:</span>
              <span className={`tabular-nums font-bold ${portfolioXirr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {portfolioXirr >= 0 ? "+" : ""}{portfolioXirr.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {portfolio && portfolio.holdings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center justify-between">
              <span>P&L by Broker</span>
              <div className="h-px bg-slate-800/80 flex-1 ml-3 rounded-full"></div>
            </div>
            <div className="space-y-3">
              {Object.entries(
                portfolio.holdings.reduce((acc, h) => {
                  const broker = h.broker || 'unknown';
                  if (!acc[broker]) acc[broker] = { invested: 0, pnl: 0, weightedXirrSum: 0, investedWithXirr: 0, dayChange: 0, prevCloseValue: 0, currentValue: 0 };
                  
                  const multiplier = h.asset_class === "us_equity" ? usdRate : 1;
                  const invested = h.avg_price * h.quantity * multiplier;
                  const currentVal = (h.current_price || h.avg_price) * h.quantity * multiplier;
                  
                  acc[broker].invested += invested;
                  acc[broker].currentValue += currentVal;
                  acc[broker].pnl += (currentVal - invested);
                  
                  if (h.day_change_absolute != null) {
                    acc[broker].dayChange += (h.day_change_absolute * multiplier);
                    acc[broker].prevCloseValue += (currentVal - (h.day_change_absolute * multiplier));
                  }
                  
                  if (h.xirr != null) {
                    acc[broker].weightedXirrSum += (h.xirr * invested);
                    acc[broker].investedWithXirr += invested;
                  }
                  return acc;
                }, {} as Record<string, { invested: number, pnl: number, weightedXirrSum: number, investedWithXirr: number, dayChange: number, prevCloseValue: number, currentValue: number }>)
              ).map(([broker, data]) => {
                const pnlPercent = data.invested > 0 ? (data.pnl / data.invested) * 100 : 0;
                const brokerXirr = data.investedWithXirr > 0 ? (data.weightedXirrSum / data.investedWithXirr) : null;
                const dayChangePercent = data.prevCloseValue > 0 ? (data.dayChange / data.prevCloseValue) * 100 : 0;
                return (
                <div key={broker} className="flex flex-col gap-1 border-b border-slate-800/30 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-semibold text-slate-300">{broker === "rsu" ? "RSU" : broker}</span>
                    <div className="flex items-center gap-2 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/50">
                      <span className={`tabular-nums font-bold ${data.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {data.pnl >= 0 ? "+" : ""}₹{Math.abs(data.pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                      <span className={`tabular-nums text-xs font-medium ${data.pnl >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}>
                        ({data.pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start justify-between text-xs text-slate-400 mt-2 bg-slate-900/30 p-2 rounded-lg">
                    <div className="flex flex-col gap-1.5">
                      <span className="flex justify-between w-32"><span>Invested:</span> <span className="font-medium text-slate-300">₹{Math.round(data.invested).toLocaleString("en-IN")}</span></span>
                      <span className="flex justify-between w-32"><span>Current:</span> <span className="font-bold text-white drop-shadow-sm">₹{Math.round(data.currentValue).toLocaleString("en-IN")}</span></span>
                      <span className="flex justify-between w-32 border-t border-slate-800/50 pt-1 mt-0.5">
                        <span>1D:</span>
                        <span className={`font-medium ${data.dayChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {data.dayChange >= 0 ? "+" : ""}₹{Math.abs(Math.round(data.dayChange)).toLocaleString("en-IN")}
                        </span>
                      </span>
                    </div>
                    {brokerXirr !== null && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">XIRR</span>
                        <span className={`font-bold text-sm bg-slate-950 px-2 py-1 rounded border border-slate-800/80 ${brokerXirr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {brokerXirr >= 0 ? "+" : ""}{brokerXirr.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}