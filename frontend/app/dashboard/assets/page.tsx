"use client";

import { WalletCards, Building2, Coins, Landmark } from "lucide-react";

export default function OtherAssetsPage() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Other Assets</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track and manage your holistic net worth across all asset classes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Mutual Funds Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Landmark className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">Mutual Funds</h3>
            <p className="mt-2 text-sm text-slate-400 flex-1">
              Track your SIPs and mutual fund holdings across different AMCs.
            </p>
            <button disabled className="mt-6 rounded-lg bg-slate-800 py-2 px-4 text-sm font-medium text-slate-400 cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          {/* Real Estate Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <Building2 className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">Real Estate</h3>
            <p className="mt-2 text-sm text-slate-400 flex-1">
              Log your properties, estimate current market values, and track rental yields.
            </p>
            <button disabled className="mt-6 rounded-lg bg-slate-800 py-2 px-4 text-sm font-medium text-slate-400 cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          {/* Crypto Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <Coins className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">Crypto</h3>
            <p className="mt-2 text-sm text-slate-400 flex-1">
              Monitor your Bitcoin, Ethereum, and other digital assets in real-time.
            </p>
            <button disabled className="mt-6 rounded-lg bg-slate-800 py-2 px-4 text-sm font-medium text-slate-400 cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          {/* Gold / Precious Metals Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <WalletCards className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">Gold & Metals</h3>
            <p className="mt-2 text-sm text-slate-400 flex-1">
              Track physical gold, SGBs, and other precious metal investments.
            </p>
            <button disabled className="mt-6 rounded-lg bg-slate-800 py-2 px-4 text-sm font-medium text-slate-400 cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
