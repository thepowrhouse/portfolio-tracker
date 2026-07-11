"use client";

import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { AssetAllocation } from "@/components/dashboard/AssetAllocation";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { HoldingsTable } from "@/components/holdings/HoldingsTable";
import { SectorPerformanceTable } from "@/components/sectors/SectorPerformanceTable";
import { usePortfolio } from "@/store/PortfolioContext";
import { useState } from "react";

export default function DashboardPage() {
  const { portfolio, lastUpdated, refreshPortfolio } = usePortfolio();
  const [activeView, setActiveView] = useState<"Holdings" | "Sectors">("Holdings");

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100">Portfolio Tracker</h1>
              <p className="text-xs text-slate-500">Multi-broker investment advisor</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Holdings: {portfolio?.holdings?.length || 0}
              </span>
              <button
                onClick={() => refreshPortfolio()}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <NetWorthCard />
          <AssetAllocation />
          <CSVUploader />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveView("Holdings")}
                className={`text-sm font-semibold uppercase tracking-wider transition-colors ${
                  activeView === "Holdings" ? "text-blue-400 border-b-2 border-blue-400 pb-2 -mb-[9px]" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Holdings
              </button>
              <button
                onClick={() => setActiveView("Sectors")}
                className={`text-sm font-semibold uppercase tracking-wider transition-colors ${
                  activeView === "Sectors" ? "text-blue-400 border-b-2 border-blue-400 pb-2 -mb-[9px]" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Sector Performance
              </button>
            </div>
            
            {activeView === "Holdings" && portfolio?.holdings && portfolio.holdings.length > 0 && (
              <span className="text-xs text-slate-500">
                {portfolio.holdings.length} stocks
              </span>
            )}
          </div>
          
          {activeView === "Holdings" ? (
            <HoldingsTable />
          ) : (
            <SectorPerformanceTable />
          )}
        </div>
      </main>
    </div>
  );
}
