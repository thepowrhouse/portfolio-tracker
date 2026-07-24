"use client";

import { useState, useMemo } from "react";
import { 
  Building2, Coins, Landmark, WalletCards, 
  Car, Shield, PiggyBank, Briefcase, 
  Plus, Edit2, Trash2, X, ChevronRight, HandCoins
} from "lucide-react";
import { usePortfolio } from "@/store/PortfolioContext";
import { OtherAssetCategory, OtherAsset } from "@/types";

const CATEGORY_CONFIG: Record<OtherAssetCategory, { label: string, icon: any, color: string, bg: string }> = {
  mutual_funds: { label: "Mutual Funds", icon: Landmark, color: "text-blue-400", bg: "bg-blue-500/10" },
  real_estate: { label: "Real Estate", icon: Building2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  crypto: { label: "Crypto", icon: Coins, color: "text-purple-400", bg: "bg-purple-500/10" },
  gold: { label: "Gold", icon: WalletCards, color: "text-amber-400", bg: "bg-amber-500/10" },
  savings_bank: { label: "Savings Bank", icon: PiggyBank, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  ppf: { label: "PPF", icon: PiggyBank, color: "text-pink-400", bg: "bg-pink-500/10" },
  nps: { label: "NPS", icon: Shield, color: "text-orange-400", bg: "bg-orange-500/10" },
  bonds: { label: "Bonds", icon: HandCoins, color: "text-teal-400", bg: "bg-teal-500/10" },
  vehicle: { label: "Vehicle", icon: Car, color: "text-rose-400", bg: "bg-rose-500/10" },
  fixed_income: { label: "Fixed Income", icon: WalletCards, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  epf: { label: "EPF", icon: Briefcase, color: "text-indigo-400", bg: "bg-indigo-500/10" }
};

export default function OtherAssetsPage() {
  const { portfolio, addOtherAsset, updateOtherAsset, deleteOtherAsset } = usePortfolio();
  const [activeCategory, setActiveCategory] = useState<OtherAssetCategory | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<OtherAsset | null>(null);
  const [formData, setFormData] = useState({ name: "", value: "", currency: "INR", category: "gold" as OtherAssetCategory, invested_value: "", investment_date: "" });

  const formatCurrency = (val: number, curr: string) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(val);
  };

  const assetsByCategory = useMemo(() => {
    const map = new Map<OtherAssetCategory, OtherAsset[]>();
    Object.keys(CATEGORY_CONFIG).forEach(c => map.set(c as OtherAssetCategory, []));
    
    if (portfolio?.other_assets) {
      portfolio.other_assets.forEach(a => {
        if (!map.has(a.category)) map.set(a.category, []);
        map.get(a.category)!.push(a);
      });
    }
    return map;
  }, [portfolio?.other_assets]);

  const handleOpenModal = (category: OtherAssetCategory, asset?: OtherAsset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({ 
        name: asset.name, 
        value: asset.value.toString(), 
        currency: asset.currency, 
        category: asset.category,
        invested_value: asset.invested_value ? asset.invested_value.toString() : "",
        investment_date: asset.investment_date || ""
      });
    } else {
      setEditingAsset(null);
      setFormData({ name: "", value: "", currency: "INR", category, invested_value: "", investment_date: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        value: parseFloat(formData.value),
        currency: formData.currency,
        category: formData.category,
        invested_value: formData.invested_value ? parseFloat(formData.invested_value) : null,
        investment_date: formData.investment_date || null
      };
      if (editingAsset) {
        await updateOtherAsset(editingAsset.id, payload);
      } else {
        await addOtherAsset(payload);
      }
      setIsModalOpen(false);
    } catch (e) {
      alert("Failed to save asset");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      await deleteOtherAsset(id);
    }
  };

  // Calculate totals per category (convert USD to INR using portfolio.usd_to_inr if needed)
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const rate = portfolio?.usd_to_inr || 83.5;
    
    Array.from(assetsByCategory.entries()).forEach(([cat, items]) => {
      let sum = 0;
      items.forEach(item => {
        sum += item.currency === "USD" ? item.value * rate : item.value;
      });
      totals[cat] = sum;
    });
    return totals;
  }, [assetsByCategory, portfolio?.usd_to_inr]);

  const totalNonEquityWealth = useMemo(() => {
    return Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  }, [categoryTotals]);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500 blur-[100px] opacity-20" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500 blur-[100px] opacity-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/50 border border-slate-800 backdrop-blur-sm mb-4">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-300">Alternative Investments</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Other Assets</h1>
              <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                Track your non-equity investments like Real Estate, Gold, and Provident Funds. This forms the defensive moat of your portfolio.
              </p>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-4">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Non-Equity Wealth</span>
                <span className="text-4xl font-extrabold tabular-nums text-white drop-shadow-sm">
                  {formatCurrency(totalNonEquityWealth, "INR")}
                </span>
              </div>
              <button
                onClick={() => handleOpenModal("real_estate")}
                className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Asset</span>
              </button>
            </div>
          </div>
        </div>

        {activeCategory ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveCategory(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  {(() => {
                    const Icon = CATEGORY_CONFIG[activeCategory].icon;
                    return <Icon className={`h-6 w-6 ${CATEGORY_CONFIG[activeCategory].color}`} />;
                  })()}
                  {CATEGORY_CONFIG[activeCategory].label}
                </h2>
                <p className="text-sm font-medium text-slate-400 mt-1">
                  Total Value: <span className="text-slate-200">{formatCurrency(categoryTotals[activeCategory] || 0, "INR")}</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="border-b border-slate-700/50 bg-slate-800/30 p-4 flex justify-between items-center">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  {assetsByCategory.get(activeCategory)?.length || 0} Assets
                </h3>
                <button
                  onClick={() => handleOpenModal(activeCategory)}
                  className="flex items-center space-x-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Invested</th>
                      <th className="px-6 py-4">P&L</th>
                      <th className="px-6 py-4 text-right">Value</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {assetsByCategory.get(activeCategory)?.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-200">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {item.invested_value ? formatCurrency(item.invested_value, item.currency) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          {item.pnl_absolute != null ? (
                            <span className={item.pnl_absolute >= 0 ? "text-emerald-400" : "text-red-400"}>
                              {item.pnl_absolute >= 0 ? "+" : ""}{formatCurrency(item.pnl_absolute, item.currency)} 
                              <span className="text-xs opacity-70 ml-1">({item.pnl_absolute >= 0 ? "+" : ""}{item.pnl_percent?.toFixed(2)}%)</span>
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-6 py-4 text-right font-bold tabular-nums text-slate-200">
                          {formatCurrency(item.value, item.currency)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingAsset(item);
                                handleOpenModal(activeCategory);
                              }}
                              className="rounded-lg p-2 text-slate-400 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!assetsByCategory.get(activeCategory)?.length && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50`}>
                              {(() => {
                                const Icon = CATEGORY_CONFIG[activeCategory].icon;
                                return <Icon className="h-8 w-8 text-slate-600" />;
                              })()}
                            </div>
                            <p className="font-medium">No assets found in this category.</p>
                            <button
                              onClick={() => handleOpenModal(activeCategory)}
                              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                            >
                              Add your first asset
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const cat = key as OtherAssetCategory;
              const count = assetsByCategory.get(cat)?.length || 0;
              const total = categoryTotals[cat] || 0;
              const Icon = config.icon;

              return (
                <div 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 hover:border-slate-600 hover:bg-slate-800/80 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer"
                >
                  <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-30 ${config.bg.replace('/10', '')}`} />
                  <Icon className={`absolute -right-2 -bottom-2 h-20 w-20 opacity-5 transition-transform group-hover:scale-110 group-hover:-rotate-12 ${config.color}`} />
                  
                  <div className="relative z-10">
                    <div className="mb-4 flex items-start justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bg} shadow-inner`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/50 border border-slate-800/50 group-hover:bg-slate-800 transition-colors">
                        <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-200 group-hover:text-white transition-colors">{config.label}</h3>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className="text-2xl font-extrabold tabular-nums text-slate-100 group-hover:text-white transition-colors drop-shadow-sm">
                        {total > 0 ? formatCurrency(total, "INR") : "₹0"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider group-hover:text-slate-400 transition-colors">
                      {count} {count === 1 ? 'Asset' : 'Assets'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-all">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/50 p-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  {editingAsset ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
                {editingAsset ? "Edit Asset" : "Add Asset"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as OtherAssetCategory })}
                  className="w-full rounded-xl border border-slate-700/50 bg-slate-950/50 p-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Asset Name / Description</label>
                <input
                  type="text"
                  value={formData.name}
                  placeholder="e.g. HDFC Provident Fund, 2BHK Apartment"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/50 bg-slate-950/50 p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Invested Value (Optional)</label>
                  <input
                    type="number"
                    value={formData.invested_value}
                    placeholder="0.00"
                    onChange={(e) => setFormData({ ...formData, invested_value: e.target.value })}
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-950/50 p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Investment Date</label>
                  <input
                    type="date"
                    value={formData.investment_date}
                    onChange={(e) => setFormData({ ...formData, investment_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-950/50 p-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Current Value</label>
                  <input
                    type="number"
                    value={formData.value}
                    placeholder="0.00"
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-950/50 p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div className="w-1/3">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-950/50 p-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 border-t border-slate-700/50 bg-slate-900/80 p-5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.value}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Save Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
