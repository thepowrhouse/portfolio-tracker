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
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500 blur-[100px] opacity-20" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-teal-500 blur-[100px] opacity-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/50 border border-slate-800 backdrop-blur-sm mb-4">
                <Palmtree className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-300">Financial Independence</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Retirement Planner</h1>
              <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                A comprehensive strategy for withdrawing your assets efficiently and tracking your corpus. Plan your journey to financial freedom.
              </p>
            </div>
            
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-950/50 hover:bg-slate-800 border border-slate-700/50 text-slate-200 rounded-xl text-sm font-semibold transition-all backdrop-blur-sm shadow-lg"
            >
              <Settings2 className="h-4 w-4" />
              Assumptions
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mb-8 rounded-2xl border border-slate-700/50 bg-slate-900/80 p-6 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Settings2 className="h-4 w-4 text-blue-400" />
              Configuration & Assumptions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 group-focus-within:text-blue-400 transition-colors">Target Corpus (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                  <input 
                    type="number" 
                    value={targetCorpus}
                    onChange={(e) => {
                       const v = Number(e.target.value);
                       setTargetCorpus(v);
                       localStorage.setItem("retirementSettings", JSON.stringify({ targetCorpus: v, realEstateYield, debtYield, equityYield }));
                    }}
                    className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-2.5 pl-8 pr-3 text-slate-200 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
              <div className="group">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 group-focus-within:text-emerald-400 transition-colors">Real Estate Yield</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1"
                    value={Number((realEstateYield * 100).toFixed(1))}
                    onChange={(e) => {
                       const v = Number(e.target.value) / 100;
                       setRealEstateYield(v);
                       localStorage.setItem("retirementSettings", JSON.stringify({ targetCorpus, realEstateYield: v, debtYield, equityYield }));
                    }}
                    className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-2.5 px-3 text-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                </div>
              </div>
              <div className="group">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 group-focus-within:text-emerald-400 transition-colors">Fixed Income Yield</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1"
                    value={Number((debtYield * 100).toFixed(1))}
                    onChange={(e) => {
                       const v = Number(e.target.value) / 100;
                       setDebtYield(v);
                       localStorage.setItem("retirementSettings", JSON.stringify({ targetCorpus, realEstateYield, debtYield: v, equityYield }));
                    }}
                    className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-2.5 px-3 text-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                </div>
              </div>
              <div className="group">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 group-focus-within:text-emerald-400 transition-colors">Equity Dividend Yield</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1"
                    value={Number((equityYield * 100).toFixed(1))}
                    onChange={(e) => {
                       const v = Number(e.target.value) / 100;
                       setEquityYield(v);
                       localStorage.setItem("retirementSettings", JSON.stringify({ targetCorpus, realEstateYield, debtYield, equityYield: v }));
                    }}
                    className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-2.5 px-3 text-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Corpus Progress */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl flex flex-col justify-center min-h-[200px] hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-blue-500 blur-3xl opacity-10" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 shadow-inner">
                  <Target className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Target Corpus</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">How close are you to financial freedom?</p>
                </div>
              </div>
              
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Current Corpus</div>
                  <div className="text-4xl font-extrabold tabular-nums text-white drop-shadow-sm">
                    ₹{plan.total_corpus.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Target</div>
                  <div className="text-xl font-bold tabular-nums text-slate-400">
                    ₹{plan.target_corpus.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              <div className="relative h-4 w-full bg-slate-950/50 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-3 text-right text-sm font-bold text-emerald-400 drop-shadow-sm">
                {progressPercent.toFixed(1)}% Completed
              </div>
            </div>
          </div>

          {/* Passive Income */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl flex flex-col justify-center min-h-[200px] hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-500 blur-3xl opacity-10" />
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 shadow-inner">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Monthly Passive Income</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Estimated yields from assets</p>
                </div>
              </div>
              
              <div className="mt-auto mb-4">
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 drop-shadow-sm">
                    ₹{plan.estimated_monthly_passive_income.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-sm font-medium text-slate-500 ml-3">/ month</span>
                </div>
              </div>
              
              <div className="mt-auto rounded-xl bg-slate-950/40 p-3 border border-slate-800/50 backdrop-blur-sm">
                <p className="text-xs font-medium text-slate-400 leading-relaxed">
                  Assumes <span className="text-slate-300 font-semibold">{(realEstateYield*100).toFixed(1)}%</span> Real Estate yield, <span className="text-slate-300 font-semibold">{(debtYield*100).toFixed(1)}%</span> Fixed Income interest, and <span className="text-slate-300 font-semibold">{(equityYield*100).toFixed(1)}%</span> average Equity dividend yield.
                </p>
              </div>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plan.withdrawal_strategy.map((bucket) => {
              const bgClass = bucket.priority === 1 ? "from-rose-500/10 to-red-600/10 border-red-500/20" :
                              bucket.priority === 2 ? "from-blue-500/10 to-indigo-600/10 border-blue-500/20" :
                              bucket.priority === 3 ? "from-emerald-500/10 to-teal-600/10 border-emerald-500/20" :
                              "from-amber-500/10 to-orange-600/10 border-amber-500/20";
                              
              const iconBgClass = bucket.priority === 1 ? "bg-red-500/20 text-red-400" :
                                  bucket.priority === 2 ? "bg-blue-500/20 text-blue-400" :
                                  bucket.priority === 3 ? "bg-emerald-500/20 text-emerald-400" :
                                  "bg-amber-500/20 text-amber-400";
              
              const accentClass = bucket.priority === 1 ? "bg-red-500" :
                                  bucket.priority === 2 ? "bg-blue-500" :
                                  bucket.priority === 3 ? "bg-emerald-500" :
                                  "bg-amber-500";

              return (
                <div key={bucket.priority} className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-1 flex flex-col min-h-[350px] shadow-xl ${bgClass} transition-all hover:shadow-2xl hover:-translate-y-1`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-20 ${accentClass}`} />
                  
                  <div className="flex-1 bg-slate-900/80 rounded-xl flex flex-col backdrop-blur-md overflow-hidden z-10 border border-slate-700/50">
                    <div className="p-5 border-b border-slate-700/50 relative overflow-hidden">
                      <div className="absolute right-0 bottom-0 opacity-5 translate-x-1/4 translate-y-1/4">
                         {bucket.priority === 1 ? <WalletCards className="h-24 w-24" /> :
                          bucket.priority === 2 ? <TrendingUp className="h-24 w-24" /> :
                          bucket.priority === 3 ? <ShieldCheck className="h-24 w-24" /> :
                          <CheckCircle2 className="h-24 w-24" />}
                      </div>
                      
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/50 px-2 py-1 rounded-md border border-slate-800">
                          Vault {bucket.priority}
                        </span>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shadow-inner ${iconBgClass}`}>
                          {bucket.priority === 1 ? <WalletCards className="h-4 w-4" /> :
                           bucket.priority === 2 ? <TrendingUp className="h-4 w-4" /> :
                           bucket.priority === 3 ? <ShieldCheck className="h-4 w-4" /> :
                           <CheckCircle2 className="h-4 w-4" />}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-white leading-snug mb-1 relative z-10">{bucket.bucket_name}</h3>
                      <p className="text-xs font-medium text-slate-400 relative z-10">{bucket.description}</p>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar bg-slate-950/20">
                      {bucket.assets.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-8 opacity-50">
                          <AlertCircle className="h-6 w-6 text-slate-500 mb-2" />
                          <span className="text-xs font-medium text-slate-500">No assets allocated</span>
                        </div>
                      ) : (
                        bucket.assets.map((a, i) => (
                          <div key={i} className="group flex flex-col gap-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors hover:border-slate-600">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate" title={a.name}>{a.name}</span>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">{a.category}</span>
                            </div>
                            <span className="text-sm font-bold tabular-nums text-slate-400">
                              ₹{Math.round(a.value).toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
