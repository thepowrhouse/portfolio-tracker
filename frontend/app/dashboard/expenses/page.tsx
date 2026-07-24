"use client";

import { ReceiptText, CreditCard, PieChart, Wallet, Sparkles } from "lucide-react";

export default function ExpensesPage() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500 blur-[100px] opacity-20" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500 blur-[100px] opacity-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/50 border border-slate-800 backdrop-blur-sm mb-4">
                <ReceiptText className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-300">Cashflow Intelligence</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Expense Tracking</h1>
              <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                Monitor your cash flow, analyze spending patterns, and manage budgets in real-time.
              </p>
            </div>
            
            <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/50 border border-blue-500/50 text-white rounded-xl text-sm font-semibold backdrop-blur-sm shadow-lg opacity-50 cursor-not-allowed">
              <Wallet className="h-4 w-4" />
              Connect Bank Account
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 transition-opacity">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-500 blur-3xl opacity-10" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 shadow-inner mb-4">
                <Wallet className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Income</h3>
              <p className="text-3xl font-extrabold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 drop-shadow-sm">—</p>
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 transition-opacity">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-red-500 blur-3xl opacity-10" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 shadow-inner mb-4">
                <CreditCard className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Spend</h3>
              <p className="text-3xl font-extrabold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-300 drop-shadow-sm">—</p>
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 transition-opacity">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-blue-500 blur-3xl opacity-10" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 shadow-inner mb-4">
                <PieChart className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Savings Rate</h3>
              <p className="text-3xl font-extrabold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 drop-shadow-sm">—</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-b from-slate-800 to-slate-900 p-12 shadow-2xl flex flex-col items-center justify-center text-center group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-500 blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
          
          <div className="relative z-10">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-950/50 border border-slate-700 shadow-inner mb-6 mx-auto backdrop-blur-sm">
              <Sparkles className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">AI-Powered Cashflow Intelligence</h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-10 leading-relaxed">
              We are building direct integrations with major banks and credit cards to automatically categorize and track your expenses against your investments, giving you a holistic view of your wealth journey.
            </p>
            <div className="inline-flex items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 px-6 py-3 shadow-[0_0_15px_rgba(59,130,246,0.2)] backdrop-blur-sm">
              <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">Feature Coming Soon</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
