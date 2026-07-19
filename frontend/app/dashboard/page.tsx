"use client";

import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { AssetAllocation } from "@/components/dashboard/AssetAllocation";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { HoldingsTable } from "@/components/holdings/HoldingsTable";
import { SectorPerformanceTable } from "@/components/sectors/SectorPerformanceTable";
import { usePortfolio } from "@/store/PortfolioContext";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { portfolio, lastUpdated, refreshPortfolio } = usePortfolio();
  const [activeView, setActiveView] = useState<"Holdings" | "Sectors">("Holdings");
  const [activeHorizon, setActiveHorizon] = useState<"short" | "mid" | "long">("mid");
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (status === "loading") {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        {/* Left Side - Image/Branding */}
        <div className="relative hidden w-1/2 flex-col bg-slate-900 lg:flex">
          <div className="absolute inset-0">
            <img
              src="/login-bg.jpg"
              alt="Wealth Management Abstract"
              className="h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
          
          <div className="relative z-10 mt-auto p-12">
            <h2 className="mb-4 text-4xl font-bold tracking-tight text-white">
              Smarter Wealth <br /> Management.
            </h2>
            <p className="max-w-md text-lg text-slate-300">
              Track all your brokerage accounts in one unified dashboard. Get AI-powered insights, deep technical analysis, and personalized portfolio recommendations.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex w-full flex-col items-center justify-center p-8 lg:w-1/2">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-white">Portfolio Tracker</h1>
              <p className="mt-2 text-sm text-slate-400">
                Welcome back. Please sign in to your account.
              </p>
            </div>

            <div className="mt-8">
              {error === "access_denied" && (
                <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                  <p className="text-sm text-red-400 text-center">
                    Access Denied. You are not on the approved users list, or you have been blacklisted.
                  </p>
                </div>
              )}
              <button
                onClick={() => signIn("google")}
                className="group relative flex w-full justify-center rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              >
                <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                </span>
                Continue with Google
              </button>
            </div>
          </div>
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
