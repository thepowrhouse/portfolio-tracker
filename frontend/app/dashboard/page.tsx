"use client";

import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { AssetAllocation } from "@/components/dashboard/AssetAllocation";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { HoldingsTable } from "@/components/holdings/HoldingsTable";
import { SectorPerformanceTable } from "@/components/sectors/SectorPerformanceTable";
import { EventCalendar } from "@/components/dashboard/EventCalendar";
import { usePortfolio } from "@/store/PortfolioContext";
import { useState, useEffect } from "react";
import { Suspense } from "react";

function DashboardContent() {
  const { portfolio, setRefreshAction, refreshPortfolio } = usePortfolio();
  const [activeView, setActiveView] = useState<"Holdings" | "Sectors" | "Calendar" | "OtherAssets">("Holdings");
  const [activeHorizon, setActiveHorizon] = useState<"short" | "mid" | "long">("mid");

  useEffect(() => {
    setRefreshAction(() => async () => {
      // Force refresh portfolio (live stock prices)
      await refreshPortfolio(true);
    });
    return () => setRefreshAction(null);
  }, [setRefreshAction, refreshPortfolio]);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <NetWorthCard />
          <AssetAllocation activeHorizon={activeHorizon} />
          <CSVUploader />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-2">
            <div className="flex overflow-x-auto p-1 space-x-1 bg-slate-900/50 backdrop-blur rounded-xl border border-slate-800 custom-scrollbar">
              <button
                onClick={() => setActiveView("Holdings")}
                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                  activeView === "Holdings" ? "bg-blue-600/20 text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                Holdings
              </button>
              <button
                onClick={() => setActiveView("OtherAssets")}
                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                  activeView === "OtherAssets" ? "bg-blue-600/20 text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                Other Assets
              </button>
              <button
                onClick={() => setActiveView("Sectors")}
                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                  activeView === "Sectors" ? "bg-blue-600/20 text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                Sector Performance
              </button>
              <button
                onClick={() => setActiveView("Calendar")}
                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                  activeView === "Calendar" ? "bg-blue-600/20 text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                Calendar
              </button>
            </div>
            
            {activeView === "Holdings" && portfolio?.holdings && portfolio.holdings.length > 0 && (
              <span className="text-xs text-slate-500">
                {portfolio.holdings.length} stocks
              </span>
            )}
          </div>
          
          {activeView === "Holdings" ? (
            <HoldingsTable activeHorizon={activeHorizon} setActiveHorizon={setActiveHorizon} />
          ) : activeView === "OtherAssets" ? (
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6">
              {portfolio?.other_assets && portfolio.other_assets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {portfolio.other_assets.map(asset => (
                    <div key={asset.id} className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-1">{asset.category.replace('_', ' ')}</div>
                      <div className="text-sm font-semibold text-slate-200 mb-2">{asset.name}</div>
                      <div className="text-lg font-bold text-white">
                        {asset.currency === "USD" ? "$" : "₹"}{asset.value.toLocaleString(asset.currency === "USD" ? "en-US" : "en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8 text-sm">
                  No other assets found. Go to the Other Assets page to add them.
                </div>
              )}
            </div>
          ) : activeView === "Sectors" ? (
            <SectorPerformanceTable />
          ) : (
            <EventCalendar />
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-400">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
