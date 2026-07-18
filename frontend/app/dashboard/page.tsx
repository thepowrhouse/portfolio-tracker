"use client";

import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { AssetAllocation } from "@/components/dashboard/AssetAllocation";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { HoldingsTable } from "@/components/holdings/HoldingsTable";
import { SectorPerformanceTable } from "@/components/sectors/SectorPerformanceTable";
import { usePortfolio } from "@/store/PortfolioContext";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { portfolio, lastUpdated, refreshPortfolio } = usePortfolio();
  const [activeView, setActiveView] = useState<"Holdings" | "Sectors">("Holdings");
  const [activeHorizon, setActiveHorizon] = useState<"short" | "mid" | "long">("mid");

  if (status === "loading") {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center backdrop-blur">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Welcome to Portfolio Tracker</h1>
          <p className="text-sm text-slate-400 mb-8">Sign in with your Google account to manage your portfolio.</p>
          <button
            onClick={() => signIn("google")}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100">Portfolio Tracker</h1>
              <p className="text-xs text-slate-500">Multi-broker investment advisor</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">
                Holdings: {portfolio?.holdings?.length || 0}
              </span>
              <button
                onClick={() => refreshPortfolio()}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Refresh
              </button>
              <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
                {session?.user?.image && (
                  <img src={session.user.image} alt="Avatar" className="h-8 w-8 rounded-full" />
                )}
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-slate-200">{session?.user?.name}</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-slate-400 hover:text-slate-200 ml-2"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <NetWorthCard />
          <AssetAllocation activeHorizon={activeHorizon} />
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
            <HoldingsTable activeHorizon={activeHorizon} setActiveHorizon={setActiveHorizon} />
          ) : (
            <SectorPerformanceTable />
          )}
        </div>
      </main>
    </div>
  );
}
