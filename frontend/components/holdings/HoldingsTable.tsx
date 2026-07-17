"use client";

import React, { useState, useEffect } from "react";
import { usePortfolio } from "@/store/PortfolioContext";
import { StockDetailPanel } from "./StockDetailPanel";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { PortfolioHolding } from "@/types";

interface AggregatedHolding extends PortfolioHolding {
  brokers: string[];
}

const aggregateHoldings = (holdings: PortfolioHolding[]): AggregatedHolding[] => {
  const map = new Map<string, AggregatedHolding>();
  
  for (const h of holdings) {
    if (map.has(h.ticker)) {
      const existing = map.get(h.ticker)!;
      const totalQty = existing.quantity + h.quantity;
      
      const existingInvested = existing.quantity * existing.avg_price;
      const newInvested = h.quantity * h.avg_price;
      const newAvgPrice = totalQty > 0 ? (existingInvested + newInvested) / totalQty : 0;
      
      const newPnlAbsolute = (existing.pnl_absolute || 0) + (h.pnl_absolute || 0);
      
      let newPnlPercent = 0;
      if (newAvgPrice > 0 && existing.current_price) {
        newPnlPercent = ((existing.current_price - newAvgPrice) / newAvgPrice) * 100;
      }
      
      let newXirr: number | null = null;
      if (existing.xirr != null && h.xirr != null) {
        if (existingInvested + newInvested > 0) {
          newXirr = ((existing.xirr * existingInvested) + (h.xirr * newInvested)) / (existingInvested + newInvested);
        }
      } else if (existing.xirr != null) {
        newXirr = existing.xirr;
      } else if (h.xirr != null) {
        newXirr = h.xirr;
      }
      
      const brokers = Array.from(new Set([...existing.brokers, h.broker]));
      
      map.set(h.ticker, {
        ...existing,
        quantity: totalQty,
        avg_price: newAvgPrice,
        pnl_absolute: newPnlAbsolute,
        pnl_percent: newPnlPercent,
        brokers,
        broker: brokers.length > 1 ? ("multiple" as any) : brokers[0], 
        xirr: newXirr
      });
    } else {
      map.set(h.ticker, {
        ...h,
        brokers: [h.broker]
      });
    }
  }
  return Array.from(map.values());
};

export function HoldingsTable({ 
  activeHorizon, 
  setActiveHorizon 
}: { 
  activeHorizon: "short" | "mid" | "long", 
  setActiveHorizon: (h: "short" | "mid" | "long") => void 
}) {
  const { portfolio, recommendations, isLoading, isAnalyzing, lastUpdated } = usePortfolio();
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [localHoldings, setLocalHoldings] = useState(portfolio?.holdings || []);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [sortConfig, setSortConfig] = useState<{
    key: "action" | "pnl_absolute" | "pnl_percent" | "broker" | "invested" | "current_value" | "avg_price" | "current_price" | "sector" | "xirr";
    direction: "asc" | "desc";
  } | null>(null);

  // CRITICAL: Update local holdings whenever portfolio or lastUpdated changes
  useEffect(() => {
    if (portfolio?.holdings) {
      setLocalHoldings(portfolio.holdings);
      console.log("Holdings updated:", portfolio.holdings.length, "stocks");
    } else {
      setLocalHoldings([]);
    }
  }, [portfolio, lastUpdated]);

  const getRecommendation = (ticker: string) => {
    return recommendations.find((r) => r.ticker === ticker);
  };

  const getINRValue = (value: number | null, assetClass: string) => {
    if (value === null || value === undefined) return null;
    return assetClass === "us_equity" ? value * (portfolio?.usd_to_inr || 83.5) : value;
  };

  const formatINR = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return `₹${value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filteredHoldings = localHoldings.filter(
    (h) => activeTab === "All" || h.broker === activeTab.toLowerCase()
  );

  const aggregatedHoldings = React.useMemo(() => aggregateHoldings(filteredHoldings), [filteredHoldings]);

  const sortedHoldings = React.useMemo(() => {
    let sortableItems = [...aggregatedHoldings];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "action") {
          const aRec = recommendations.find((r) => r.ticker === a.ticker)?.horizons?.[activeHorizon]?.recommendation;
          const bRec = recommendations.find((r) => r.ticker === b.ticker)?.horizons?.[activeHorizon]?.recommendation;
          const rank = { BUY: 1, HOLD: 2, SELL: 3 };
          aValue = rank[aRec as keyof typeof rank] || 99;
          bValue = rank[bRec as keyof typeof rank] || 99;
        } else if (sortConfig.key === "broker") {
          aValue = a.brokers.join(", ");
          bValue = b.brokers.join(", ");
        } else if (sortConfig.key === "sector") {
          aValue = getRecommendation(a.ticker)?.fundamental?.industry || "";
          bValue = getRecommendation(b.ticker)?.fundamental?.industry || "";
        } else if (sortConfig.key === "pnl_absolute") {
          aValue = getINRValue(a.pnl_absolute, a.asset_class) || 0;
          bValue = getINRValue(b.pnl_absolute, b.asset_class) || 0;
        } else if (sortConfig.key === "pnl_percent") {
          aValue = a.pnl_percent || 0;
          bValue = b.pnl_percent || 0;
        } else if (sortConfig.key === "invested") {
          aValue = getINRValue(a.quantity * a.avg_price, a.asset_class) || 0;
          bValue = getINRValue(b.quantity * b.avg_price, b.asset_class) || 0;
        } else if (sortConfig.key === "current_value") {
          aValue = getINRValue(a.quantity * (a.current_price || 0), a.asset_class) || 0;
          bValue = getINRValue(b.quantity * (b.current_price || 0), b.asset_class) || 0;
        } else if (sortConfig.key === "avg_price") {
          aValue = getINRValue(a.avg_price, a.asset_class) || 0;
          bValue = getINRValue(b.avg_price, b.asset_class) || 0;
        } else if (sortConfig.key === "current_price") {
          aValue = getINRValue(a.current_price, a.asset_class) || 0;
          bValue = getINRValue(b.current_price, b.asset_class) || 0;
        } else if (sortConfig.key === "xirr") {
          aValue = a.xirr !== null && a.xirr !== undefined ? a.xirr : -Infinity;
          bValue = b.xirr !== null && b.xirr !== undefined ? b.xirr : -Infinity;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [aggregatedHoldings, sortConfig, recommendations, activeHorizon]);

  const handleSort = (key: "action" | "pnl_absolute" | "pnl_percent" | "broker" | "invested" | "current_value" | "avg_price" | "current_price" | "sector" | "xirr") => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="h-3 w-3 inline-block ml-1 opacity-40 group-hover:opacity-100" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-3 w-3 inline-block ml-1 text-blue-400" />
    ) : (
      <ArrowDown className="h-3 w-3 inline-block ml-1 text-blue-400" />
    );
  };

  if (isLoading && !portfolio) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
        <p className="mt-2 text-sm text-slate-500">Loading holdings...</p>
      </div>
    );
  }

  if (!localHoldings || localHoldings.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <p className="text-slate-400">No holdings yet. Upload a CSV to get started.</p>
        {portfolio && (
          <p className="mt-1 text-xs text-slate-600">
            Portfolio state exists but holdings array is empty.
          </p>
        )}
      </div>
    );
  }



  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3 flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-2">
          {["All", "Zerodha", "Groww", "INDmoney"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-slate-800 text-slate-200"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Horizon:</span>
          <div className="flex bg-slate-800/50 p-1 rounded-lg">
            {[
              { id: "short", label: "Short (1-3m)" },
              { id: "mid", label: "Mid (6-12m)" },
              { id: "long", label: "Long (1-5y)" }
            ].map((horizon) => (
              <button
                key={horizon.id}
                onClick={() => setActiveHorizon(horizon.id as any)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeHorizon === horizon.id
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                {horizon.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors" onClick={() => handleSort('broker')}>
                Broker <SortIcon columnKey="broker" />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors" onClick={() => handleSort('sector')}>
                Sector <SortIcon columnKey="sector" />
              </th>
              <th className="px-4 py-3 font-medium text-right">Qty</th>
              <th className="px-4 py-2 font-medium text-right">
                <div className="flex flex-col items-end gap-1">
                  <div>Avg Price</div>
                  <div className="text-slate-400">Current</div>
                </div>
              </th>
              <th className="px-4 py-2 font-medium text-right">
                <div className="flex flex-col items-end gap-1">
                  <div className="cursor-pointer hover:text-slate-300 group transition-colors flex items-center justify-end w-full" onClick={() => handleSort('invested')}>
                    <span>Invested</span> <SortIcon columnKey="invested" />
                  </div>
                  <div className="cursor-pointer hover:text-slate-300 group transition-colors flex items-center justify-end w-full text-slate-400" onClick={() => handleSort('current_value')}>
                    <span>Current</span> <SortIcon columnKey="current_value" />
                  </div>
                </div>
              </th>
              <th className="px-4 py-2 font-medium text-right">
                <div className="flex flex-col items-end gap-1">
                  <div className="cursor-pointer hover:text-slate-300 group transition-colors flex items-center justify-end w-full" onClick={() => handleSort('pnl_absolute')}>
                    <span>P&L (Amt)</span> <SortIcon columnKey="pnl_absolute" />
                  </div>
                  <div className="cursor-pointer hover:text-slate-300 group transition-colors flex items-center justify-end w-full text-slate-400" onClick={() => handleSort('pnl_percent')}>
                    <span>P&L (%)</span> <SortIcon columnKey="pnl_percent" />
                  </div>
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-slate-300 group transition-colors" onClick={() => handleSort('xirr')}>
                XIRR <SortIcon columnKey="xirr" />
              </th>
              <th className="px-4 py-3 font-medium text-center cursor-pointer hover:text-slate-300 group transition-colors" onClick={() => handleSort('action')}>
                Action <SortIcon columnKey="action" />
              </th>
              <th className="px-4 py-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((holding) => {
              const rec = getRecommendation(holding.ticker);
              const isExpanded = expandedTicker === holding.ticker;

              return (
                <React.Fragment key={holding.id}>
                  <tr
                    onClick={() =>
                      setExpandedTicker(isExpanded ? null : holding.ticker)
                    }
                    className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-200">
                          {holding.company_name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {holding.ticker}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {holding.brokers.map((b) => (
                          <span key={b} className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400 capitalize">
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 truncate max-w-[120px] block" title={rec?.fundamental?.industry || "—"}>
                        {rec?.fundamental?.industry || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                      {holding.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-slate-300 font-medium">
                          {formatINR(getINRValue(holding.avg_price, holding.asset_class))}
                        </div>
                        <div className={`text-xs font-medium ${
                          (holding.current_price || 0) > holding.avg_price
                            ? "text-emerald-400"
                            : (holding.current_price || 0) < holding.avg_price
                            ? "text-red-400"
                            : "text-slate-400"
                        }`}>
                          {formatINR(getINRValue(holding.current_price, holding.asset_class))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-slate-300 font-medium">
                          {formatINR(getINRValue(holding.quantity * holding.avg_price, holding.asset_class))}
                        </div>
                        <div className={`text-xs font-medium ${
                          (holding.current_price || 0) > holding.avg_price
                            ? "text-emerald-400"
                            : (holding.current_price || 0) < holding.avg_price
                            ? "text-red-400"
                            : "text-slate-400"
                        }`}>
                          {formatINR(getINRValue(holding.quantity * (holding.current_price || 0), holding.asset_class))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className={`flex items-center justify-end gap-1 tabular-nums font-medium ${
                          (holding.pnl_absolute || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {(holding.pnl_absolute || 0) >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {formatINR(getINRValue(Math.abs(holding.pnl_absolute || 0), holding.asset_class))}
                        </div>
                        <div className={`tabular-nums text-xs font-medium ${
                          (holding.pnl_percent || 0) >= 0 ? "text-emerald-500/80" : "text-red-500/80"
                        }`}>
                          {(holding.pnl_percent || 0) >= 0 ? "+" : ""}{holding.pnl_percent?.toFixed(2)}%
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {holding.xirr != null ? (
                        <div className={`tabular-nums text-sm font-medium ${
                          holding.xirr >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {holding.xirr >= 0 ? "+" : ""}{holding.xirr.toFixed(2)}%
                        </div>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rec && rec.horizons && rec.horizons[activeHorizon] ? (
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              rec.horizons[activeHorizon].recommendation === "BUY"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : rec.horizons[activeHorizon].recommendation === "SELL"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {rec.horizons[activeHorizon].recommendation}
                          </span>
                          {rec.horizons[activeHorizon].trend && (
                            <span className={`text-[10px] font-medium uppercase tracking-wider flex items-center gap-0.5 ${
                              rec.horizons[activeHorizon].trend === "uptrend" ? "text-emerald-500" :
                              rec.horizons[activeHorizon].trend === "downtrend" ? "text-red-500" :
                              "text-amber-500"
                            }`}>
                              {rec.horizons[activeHorizon].trend}
                              {rec.horizons[activeHorizon].trend === "uptrend" ? "↗" :
                               rec.horizons[activeHorizon].trend === "downtrend" ? "↘" : "→"}
                            </span>
                          )}
                        </div>
                      ) : isAnalyzing ? (
                        <div className="flex justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" title="Analyzing..." />
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                    </td>
                  </tr>
                  {isExpanded && rec && (
                    <tr key={`${holding.id}-detail`}>
                      <td colSpan={11} className="p-0">
                        <StockDetailPanel recommendation={rec} activeHorizon={activeHorizon} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
