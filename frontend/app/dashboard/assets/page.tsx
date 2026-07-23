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
  epf: { label: "EPF", icon: Briefcase, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  ppf: { label: "PPF", icon: PiggyBank, color: "text-pink-400", bg: "bg-pink-500/10" },
  nps: { label: "NPS", icon: Shield, color: "text-orange-400", bg: "bg-orange-500/10" },
  bonds: { label: "Bonds", icon: HandCoins, color: "text-teal-400", bg: "bg-teal-500/10" },
  vehicle: { label: "Vehicle", icon: Car, color: "text-rose-400", bg: "bg-rose-500/10" },
  fixed_income: { label: "Fixed Income", icon: WalletCards, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  esop_rsu: { label: "ESOPs / RSUs", icon: Briefcase, color: "text-lime-400", bg: "bg-lime-500/10" }
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

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Other Assets</h1>
            <p className="mt-1 text-sm text-slate-400">
              Track your non-equity investments like Real Estate, Gold, and Provident Funds.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal("real_estate")}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Asset</span>
          </button>
        </div>

        {activeCategory ? (
          <div className="mb-6">
            <button 
              onClick={() => setActiveCategory(null)}
              className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center"
            >
              ← Back to Categories
            </button>
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-800 bg-slate-800/50 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${CATEGORY_CONFIG[activeCategory].bg}`}>
                    {(() => {
                      const Icon = CATEGORY_CONFIG[activeCategory].icon;
                      return <Icon className={`h-5 w-5 ${CATEGORY_CONFIG[activeCategory].color}`} />;
                    })()}
                  </div>
                  <h2 className="text-lg font-semibold text-slate-200">{CATEGORY_CONFIG[activeCategory].label}</h2>
                </div>
                <button
                  onClick={() => handleOpenModal(activeCategory)}
                  className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700"
                >
                  + Add New
                </button>
              </div>
              <div className="p-0">
                {assetsByCategory.get(activeCategory)?.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No assets added yet in this category.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900 text-xs uppercase bg-slate-900/50 border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-3 font-medium text-slate-300">Name</th>
                        <th className="px-6 py-3 font-medium text-slate-300">Value</th>
                        <th className="px-6 py-3 font-medium text-slate-300">Invested</th>
                        <th className="px-6 py-3 font-medium text-slate-300">P&L</th>
                        <th className="px-6 py-3 font-medium text-slate-300">XIRR</th>
                        <th className="px-6 py-3 font-medium text-slate-300 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {assetsByCategory.get(activeCategory)?.map(asset => (
                        <tr key={asset.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-200">{asset.name}</td>
                          <td className="px-6 py-4 font-medium text-slate-100">{formatCurrency(asset.value, asset.currency)}</td>
                          <td className="px-6 py-4">{asset.invested_value ? formatCurrency(asset.invested_value, asset.currency) : "-"}</td>
                          <td className="px-6 py-4">
                            {asset.pnl_absolute != null ? (
                              <span className={asset.pnl_absolute >= 0 ? "text-emerald-400" : "text-red-400"}>
                                {asset.pnl_absolute >= 0 ? "+" : ""}{formatCurrency(asset.pnl_absolute, asset.currency)} 
                                <span className="text-xs opacity-70 ml-1">({asset.pnl_absolute >= 0 ? "+" : ""}{asset.pnl_percent?.toFixed(2)}%)</span>
                              </span>
                            ) : "-"}
                          </td>
                          <td className="px-6 py-4">
                            {asset.xirr != null ? (
                              <span className={asset.xirr >= 0 ? "text-emerald-400" : "text-red-400"}>
                                {asset.xirr >= 0 ? "+" : ""}{asset.xirr.toFixed(2)}%
                              </span>
                            ) : "-"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleOpenModal(activeCategory, asset)} className="text-slate-400 hover:text-blue-400 p-1 inline-flex">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(asset.id)} className="text-slate-400 hover:text-red-400 p-1 ml-2 inline-flex">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const cat = key as OtherAssetCategory;
              const count = assetsByCategory.get(cat)?.length || 0;
              const total = categoryTotals[cat] || 0;
              const Icon = config.icon;

              return (
                <div 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer group"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${config.bg}`}>
                      <Icon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-200">{config.label}</h3>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-xl font-bold text-slate-100">
                      {total > 0 ? formatCurrency(total, "INR") : "₹0"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {count} {count === 1 ? 'item' : 'items'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <h3 className="text-lg font-semibold text-slate-100">
                {editingAsset ? "Edit Asset" : "Add Asset"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as OtherAssetCategory })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Asset Name / Description</label>
                <input
                  type="text"
                  value={formData.name}
                  placeholder="e.g. HDFC Provident Fund, 2BHK Apartment"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-400">Invested Value (Optional)</label>
                  <input
                    type="number"
                    value={formData.invested_value}
                    placeholder="0.00"
                    onChange={(e) => setFormData({ ...formData, invested_value: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-400">Investment Date</label>
                  <input
                    type="date"
                    value={formData.investment_date}
                    onChange={(e) => setFormData({ ...formData, investment_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-400">Current Value</label>
                  <input
                    type="number"
                    value={formData.value}
                    placeholder="0.00"
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="w-1/3">
                  <label className="mb-1 block text-sm font-medium text-slate-400">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 border-t border-slate-800 p-4 bg-slate-900/50 rounded-b-xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.value}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
