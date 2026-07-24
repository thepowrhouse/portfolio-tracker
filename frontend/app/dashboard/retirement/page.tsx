"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Palmtree, Target, TrendingUp, AlertCircle, CheckCircle2, ShieldCheck, WalletCards, Settings2 } from "lucide-react";
import { usePortfolio } from "@/store/PortfolioContext";

interface WithdrawalBucket {
  bucket_name: string;
  priority: number;
  description: string;
  assets: { name: string; category: string; value: number }[];
}

interface RetirementPlan {
  total_corpus: number;
  target_corpus: number;
  estimated_monthly_passive_income: number;
  withdrawal_strategy: WithdrawalBucket[];
  recommendations: string[];
}

export default function RetirementPage() {
  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [targetCorpus, setTargetCorpus] = useState(100000000.0);
  const [realEstateYield, setRealEstateYield] = useState(0.03);
  const [debtYield, setDebtYield] = useState(0.07);
  const [equityYield, setEquityYield] = useState(0.015);
  const [showSettings, setShowSettings] = useState(false);
  
  const { portfolio, setRefreshAction } = usePortfolio();

  useEffect(() => {
    const saved = localStorage.getItem("retirementSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTargetCorpus(parsed.targetCorpus ?? 100000000.0);
        setRealEstateYield(parsed.realEstateYield ?? 0.03);
        setDebtYield(parsed.debtYield ?? 0.07);
        setEquityYield(parsed.equityYield ?? 0.015);
      } catch (e) {}
    }
  }, []);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const data = await api.get<RetirementPlan>(
        `/retirement/plan?target_corpus=${targetCorpus}&real_estate_yield=${realEstateYield}&debt_yield=${debtYield}&equity_yield=${equityYield}`
      );
      setPlan(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portfolio) {
      fetchPlan();
    }
  }, [portfolio, targetCorpus, realEstateYield, debtYield, equityYield]);

  useEffect(() => {
    setRefreshAction(() => async () => {
      // Only refresh the retirement plan
      await fetchPlan();
    });
    return () => setRefreshAction(null);
  }, [setRefreshAction, targetCorpus, realEstateYield, debtYield, equityYield]);

  if (loading || !plan) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Palmtree className="h-10 w-10 text-emerald-500/50" />
          <p className="text-slate-400">Computing Retirement Strategy...</p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min((plan.total_corpus / plan.target_corpus) * 100, 100);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Palmtree className="h-6 w-6 text-emerald-400" />
              Retirement Planner
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              A comprehensive strategy for withdrawing your assets efficiently and tracking your corpus.
            </p>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            Assumptions
          </button>
        </div>

        {showSettings && (
          <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Configuration & Assumptions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Target Corpus (₹)</label>
                <input 
                  type="number" 
                  value={targetCorpus}
                  onChange={(e) => {
                     const v = Number(e.target.value);
                     setTargetCorpus(v);
                     localStorage.setItem("retirementSettings", JSON.stringify({ targetCorpus: v, realEstateYield, debtYield, equityYield }));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Real Estate Yield (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={Number((realEstateYield * 100).toFixed(1))}
                  onChange={(e) => {
                     const v = Number(e.target.value) / 100;
                     setRealEstateYield(v);
                     localStorage.setItem("retirementSettings", JSON.stringify({ targetCorpus, realEstateYield: v, debtYield, equityYield }));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fixed Income Yield (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={Number((debtYield * 100).toFixed(1))}
                  onChange={(e) => {
                     const v = Number(e.target.value) / 100;
                     setDebtYield(v);
                     localStorage.setItem("retirementSettings", JSON.stringify({ targetCorpus, realEstateYield, debtYield: v, equityYield }));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Equity Dividend Yield (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={Number((equityYield * 100).toFixed(1))}
                  onChange={(e) => {
                     const v = Number(e.target.value) / 100;
                     setEquityYield(v);
                     localStorage.setItem("retirementSettings", JSON.stringify({ targetCorpus, realEstateYield, debtYield, equityYield: v }));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Corpus Progress */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-center min-h-[200px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Target Corpus</h3>
                <p className="text-xs text-slate-500">How close are you to financial freedom?</p>
              </div>
            </div>
            
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="text-xs text-slate-500 mb-1">Current Corpus</div>
                <div className="text-3xl font-bold tabular-nums text-slate-100">
                  ₹{plan.total_corpus.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Target</div>
                <div className="text-xl font-semibold tabular-nums text-slate-300">
                  ₹{plan.target_corpus.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 text-right text-xs font-medium text-emerald-400">
              {progressPercent.toFixed(1)}% Completed
            </div>
          </div>

          {/* Passive Income */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-center min-h-[200px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Monthly Passive Income</h3>
                <p className="text-xs text-slate-500">Estimated yields from Real Estate, FD, and Dividends</p>
              </div>
            </div>
            
            <div className="mt-2">
              <span className="text-4xl font-bold tabular-nums text-emerald-400">
                ₹{plan.estimated_monthly_passive_income.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
              <span className="text-slate-500 ml-2">/ month</span>
            </div>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed border-t border-slate-800/50 pt-4">
              This estimate assumes a ~{(realEstateYield*100).toFixed(1)}% rental yield for Real Estate, ~{(debtYield*100).toFixed(1)}% interest for Fixed Income/Bonds, and a ~{(equityYield*100).toFixed(1)}% average dividend yield for Equities.
            </p>
          </div>
        </div>

        {/* Actionable Advice */}
        {plan.recommendations.length > 0 && (
          <div className="mb-8 rounded-xl border border-amber-900/30 bg-amber-950/10 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500/80 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Strategic Recommendations
            </h3>
            <ul className="space-y-3">
              {plan.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Withdrawal Strategy */}
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Withdrawal Strategy</h2>
          <p className="text-sm text-slate-400 mb-6">
            A bucketed approach to liquidating assets during retirement, optimizing for taxes and liquidity.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plan.withdrawal_strategy.map((bucket) => (
              <div key={bucket.priority} className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden flex flex-col min-h-[300px]">
                <div className={`p-4 border-b border-slate-800/50 flex flex-col gap-1 ${
                  bucket.priority === 1 ? "bg-red-950/20" :
                  bucket.priority === 2 ? "bg-blue-950/20" :
                  bucket.priority === 3 ? "bg-emerald-950/20" :
                  "bg-amber-950/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">BUCKET {bucket.priority}</span>
                    {bucket.priority === 1 ? <WalletCards className="h-4 w-4 text-red-400/70" /> :
                     bucket.priority === 2 ? <TrendingUp className="h-4 w-4 text-blue-400/70" /> :
                     bucket.priority === 3 ? <ShieldCheck className="h-4 w-4 text-emerald-400/70" /> :
                     <CheckCircle2 className="h-4 w-4 text-amber-400/70" />}
                  </div>
                  <h3 className="font-semibold text-slate-200 leading-snug">{bucket.bucket_name}</h3>
                  <p className="text-xs text-slate-400 mt-2">{bucket.description}</p>
                </div>
                
                <div className="p-4 flex-1 flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {bucket.assets.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <span className="text-xs text-slate-600 italic">No assets in this bucket</span>
                    </div>
                  ) : (
                    bucket.assets.map((a, i) => (
                      <div key={i} className="flex flex-col gap-1 bg-slate-800/20 p-3 rounded border border-slate-800/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-300 truncate pr-2" title={a.name}>{a.name}</span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-500">{a.category}</span>
                        </div>
                        <span className="text-sm font-mono text-slate-400">
                          ₹{Math.round(a.value).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
