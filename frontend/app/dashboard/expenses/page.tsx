"use client";

import { ReceiptText, CreditCard, PieChart, Wallet } from "lucide-react";

export default function ExpensesPage() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Expense Tracking</h1>
            <p className="mt-1 text-sm text-slate-400">
              Monitor your cash flow, analyze spending patterns, and manage budgets.
            </p>
          </div>
          <button disabled className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed">
            Connect Bank Account
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center opacity-50">
            <Wallet className="h-8 w-8 text-emerald-400 mb-3" />
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Monthly Income</h3>
            <p className="text-2xl font-bold text-slate-200 mt-1">—</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center opacity-50">
            <CreditCard className="h-8 w-8 text-red-400 mb-3" />
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Monthly Spend</h3>
            <p className="text-2xl font-bold text-slate-200 mt-1">—</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center opacity-50">
            <PieChart className="h-8 w-8 text-blue-400 mb-3" />
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Savings Rate</h3>
            <p className="text-2xl font-bold text-slate-200 mt-1">—</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 mb-6">
            <ReceiptText className="h-8 w-8 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">Cashflow Intelligence</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8">
            We are building direct integrations with major banks and credit cards to automatically categorize and track your expenses against your investments.
          </p>
          <div className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-800/50 px-6 py-2">
            <span className="text-sm font-medium text-slate-300">Feature Coming Soon</span>
          </div>
        </div>

      </div>
    </div>
  );
}
