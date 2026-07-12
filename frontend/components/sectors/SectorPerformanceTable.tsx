"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePortfolio } from "@/store/PortfolioContext";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

interface IndustryAgg {
  name: string;
  count: number;
  sum_1d: number; c_1d: number;
  sum_1w: number; c_1w: number;
  sum_1m: number; c_1m: number;
  sum_3m: number; c_3m: number;
  sum_6m: number; c_6m: number;
  sum_1y: number; c_1y: number;
  market_return_1d?: number;
  market_return_1w?: number;
  market_return_1m?: number;
  market_return_3m?: number;
  market_return_6m?: number;
  market_return_1y?: number;
}

interface SectorAgg {
  sector: string;
  count: number;
  return_1d: number;
  return_1w: number;
  return_1m: number;
  return_3m: number;
  return_6m: number;
  return_1y: number;
  industries: IndustryAgg[];
}

const INDUSTRY_TO_SECTOR_MAP: Record<string, string> = {
  "Auto Manufacturers": "Auto",
  "Auto Parts": "Auto",
  "Banking": "Banking",
  "Banks - Regional": "Banking",
  "Chemicals": "Commodities",
  "Communication Services": "Media",
  "Construction": "Infrastructure",
  "Consumer Defensive": "FMCG",
  "Consumer Electronics": "FMCG",
  "Defense": "Infrastructure",
  "Education": "Media",
  "Electrical Equipment": "Infrastructure",
  "Electronic Manufacturers": "IT",
  "Engineering": "Infrastructure",
  "FMCG": "FMCG",
  "Financial Services": "Financial Services",
  "Credit Services": "Financial Services",
  "Exchange Traded Fund": "Financial Services",
  "Healthcare": "Pharma",
  "Hospitality": "FMCG",
  "IT Services": "IT",
  "Information Technology Services": "IT",
  "Insurance": "Financial Services",
  "Media": "Media",
  "Metals & Mining": "Metals & Mining",
  "Steel": "Metals & Mining",
  "Oil & Gas": "Energy",
  "Oil": "Energy",
  "Packaging": "Commodities",
  "Pharmaceuticals": "Pharma",
  "Power": "Energy",
  "Real Estate": "Real Estate",
  "Renewable Energy": "Energy",
  "Retail": "FMCG",
  "Software - Infrastructure": "IT",
  "Software - Application": "IT",
  "Sugar": "FMCG",
  "Telecommunications": "Media",
  "Textiles": "Commodities",
  "Utilities": "Energy"
};

const CYCLICAL_SECTORS: Record<string, { months: string, reason: string }> = {
  "Auto": { months: "Sep - Nov", reason: "Driven by the festive season" },
  "Real Estate": { months: "Oct - Mar", reason: "Festive buying and auspicious periods" },
  "Metals & Mining": { months: "Feb - May", reason: "Pre-monsoon construction ramp-up" },
};

const CYCLICAL_INDUSTRIES: Record<string, { months: string, reason: string }> = {
  "Auto Manufacturers": { months: "Sep - Nov", reason: "Driven by the festive season" },
  "Auto Parts": { months: "Sep - Nov", reason: "Driven by the festive season" },
  "Real Estate": { months: "Oct - Mar", reason: "Festive buying and auspicious periods" },
  "Retail": { months: "Sep - Dec", reason: "Festive and holiday shopping" },
  "Consumer Electronics": { months: "Sep - Dec", reason: "Festive and holiday shopping" },
  "Metals & Mining": { months: "Feb - May", reason: "Pre-monsoon construction ramp-up" },
  "Steel": { months: "Feb - May", reason: "Pre-monsoon construction ramp-up" },
  "Sugar": { months: "Nov - Mar", reason: "Sugarcane crushing season" },
  "Hospitality": { months: "Oct - Mar", reason: "Peak tourism and wedding season" },
  "Power": { months: "Apr - Jul", reason: "Peak summer electricity demand" },
  "Chemicals": { months: "Jun - Aug", reason: "Kharif crop sowing season" },
  "Construction": { months: "Jan - May", reason: "Pre-monsoon execution phase" },
  "Engineering": { months: "Jan - May", reason: "Pre-monsoon execution phase" },
  "Textiles": { months: "Sep - Dec", reason: "Festive and winter demand" },
};
export function SectorPerformanceTable() {
  const { portfolio, recommendations, isLoading: contextLoading, isAnalyzing } = usePortfolio();
  const [marketData, setMarketData] = useState<any[]>([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SectorAgg;
    direction: "asc" | "desc";
  } | null>({ key: "sector", direction: "asc" });
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());
  const [industryStocks, setIndustryStocks] = useState<Record<string, any[]>>({});
  const [loadingIndustries, setLoadingIndustries] = useState<Record<string, boolean>>({});
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const toggleRow = (sector: string) => {
    setExpandedSectors(prev => {
      const next = new Set(prev);
      if (next.has(sector)) {
        next.delete(sector);
      } else {
        next.add(sector);
      }
      return next;
    });
  };

  const toggleIndustry = async (industry: string) => {
    setExpandedIndustries(prev => {
      const next = new Set(prev);
      if (next.has(industry)) {
        next.delete(industry);
      } else {
        next.add(industry);
      }
      return next;
    });

    if (!expandedIndustries.has(industry) && !industryStocks[industry]) {
      setLoadingIndustries(prev => ({ ...prev, [industry]: true }));
      try {
        const res = await api.get<{status: string, data: any[]}>(`/api/market/industry/${encodeURIComponent(industry)}`);
        setIndustryStocks(prev => ({ ...prev, [industry]: res.data }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingIndustries(prev => ({ ...prev, [industry]: false }));
      }
    }
  };

  useEffect(() => {
    async function fetchSectors() {
      setIsLoadingMarket(true);
      try {
        const res = await api.get<{status: string, data: any[]}>("/api/market/sectors");
        setMarketData(res.data);
      } catch (err) {
        console.error("Failed to fetch market sectors", err);
      } finally {
        setIsLoadingMarket(false);
      }
    }
    fetchSectors();
  }, []);

  const sectorData: SectorAgg[] = useMemo(() => {
    const map = new Map<string, SectorAgg>();
    
    marketData.forEach(sector => {
      const marketInds = sector.industries_market || {};
      const mappedIndustries: IndustryAgg[] = Object.entries(INDUSTRY_TO_SECTOR_MAP)
        .filter(([ind, sec]) => sec === sector.sector)
        .map(([ind, sec]) => {
          const perf = marketInds[ind] || {};
          return {
            name: ind, count: 0,
            sum_1d: 0, c_1d: 0, sum_1w: 0, c_1w: 0, sum_1m: 0, c_1m: 0,
            sum_3m: 0, c_3m: 0, sum_6m: 0, c_6m: 0, sum_1y: 0, c_1y: 0,
            market_return_1d: perf.return_1d,
            market_return_1w: perf.return_1w,
            market_return_1m: perf.return_1m,
            market_return_3m: perf.return_3m,
            market_return_6m: perf.return_6m,
            market_return_1y: perf.return_1y,
          };
        });
        
      if (sector.sector === "Metals & Mining") {
        console.log("Mapped Industries for Metals & Mining:", mappedIndustries);
        console.log("marketInds for Metals & Mining:", marketInds);
      }

      const calcAvg = (key: keyof IndustryAgg) => {
        const valid = mappedIndustries.filter(i => typeof i[key] === 'number' && !isNaN(i[key] as number));
        if (valid.length === 0) return 0;
        return valid.reduce((acc, curr) => acc + (curr[key] as number), 0) / valid.length;
      };

      map.set(sector.sector, {
        sector: sector.sector,
        count: 0,
        return_1d: sector.return_1d ?? calcAvg('market_return_1d'),
        return_1w: sector.return_1w ?? calcAvg('market_return_1w'),
        return_1m: sector.return_1m ?? calcAvg('market_return_1m'),
        return_3m: sector.return_3m ?? calcAvg('market_return_3m'),
        return_6m: sector.return_6m ?? calcAvg('market_return_6m'),
        return_1y: sector.return_1y ?? calcAvg('market_return_1y'),
        industries: mappedIndustries
      });
    });

    // 2. Map user holdings to sectors to increment count
    if (portfolio?.holdings && recommendations) {
      portfolio.holdings.forEach(holding => {
        const rec = recommendations.find(r => r.ticker === holding.ticker);
        if (!rec) return;

        const industry = rec.fundamental?.industry || "Other";
        const broadSector = INDUSTRY_TO_SECTOR_MAP[industry] || "Other";
        
        if (map.has(broadSector)) {
          const agg = map.get(broadSector)!;
          agg.count += 1;
          const ind = agg.industries.find(i => i.name === industry);
          
          let targetInd = ind;
          if (!targetInd) {
            // Usually won't hit this if INDUSTRY_TO_SECTOR_MAP matches
            const perf = (marketData[0]?.industries_market || {})[industry] || {};
            targetInd = {
              name: industry, count: 0,
              sum_1d: 0, c_1d: 0, sum_1w: 0, c_1w: 0, sum_1m: 0, c_1m: 0,
              sum_3m: 0, c_3m: 0, sum_6m: 0, c_6m: 0, sum_1y: 0, c_1y: 0,
              market_return_1d: perf.return_1d,
              market_return_1w: perf.return_1w,
              market_return_1m: perf.return_1m,
              market_return_3m: perf.return_3m,
              market_return_6m: perf.return_6m,
              market_return_1y: perf.return_1y,
            };
            agg.industries.push(targetInd);
          }
          
          targetInd.count += 1;
          
        } else if (broadSector !== "Other") {
          // If we mapped to a sector that somehow wasn't in the market data, add it with 0 returns
          const perf = (marketData[0]?.industries_market || {})[industry] || {};
          const newInd: IndustryAgg = {
            name: industry, count: 1,
            sum_1d: 0, c_1d: 0, sum_1w: 0, c_1w: 0, sum_1m: 0, c_1m: 0,
            sum_3m: 0, c_3m: 0, sum_6m: 0, c_6m: 0, sum_1y: 0, c_1y: 0,
            market_return_1d: perf.return_1d,
            market_return_1w: perf.return_1w,
            market_return_1m: perf.return_1m,
            market_return_3m: perf.return_3m,
            market_return_6m: perf.return_6m,
            market_return_1y: perf.return_1y,
          };

          map.set(broadSector, {
            sector: broadSector,
            count: 1,
            return_1d: 0,
            return_1w: 0,
            return_1m: 0,
            return_3m: 0,
            return_6m: 0,
            return_1y: 0,
            industries: [newInd]
          });
        }
      });
    }

    map.forEach(agg => {
      agg.industries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    });

    return Array.from(map.values());
  }, [portfolio, recommendations, marketData]);

  const sortedData = useMemo(() => {
    let sortable = [...sectorData];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortable;
  }, [sectorData, sortConfig]);

  const handleSort = (key: keyof SectorAgg) => {
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

  const FormatReturn = ({ value }: { value?: number | null }) => {
    if (value == null) return <span className="text-slate-500">—</span>;
    return (
      <span className={`tabular-nums font-medium ${value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-slate-300"}`}>
        {value > 0 ? "+" : ""}{value.toFixed(2)}%
      </span>
    );
  };

  if (contextLoading || isAnalyzing || isLoadingMarket) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
        <p className="mt-2 text-sm text-slate-500">
          {isLoadingMarket ? "Fetching market-wide sector performance..." : "Aggregating your holdings..."}
        </p>
      </div>
    );
  }

  if (sectorData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <p className="text-slate-400">No market sector data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors" onClick={() => handleSort('sector')}>
                Market Sector <SortIcon columnKey="sector" />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors text-right" onClick={() => handleSort('count')}>
                Your Holdings <SortIcon columnKey="count" />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors text-right" onClick={() => handleSort('return_1d')}>
                1D <SortIcon columnKey="return_1d" />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors text-right" onClick={() => handleSort('return_1w')}>
                1W <SortIcon columnKey="return_1w" />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors text-right" onClick={() => handleSort('return_1m')}>
                1M <SortIcon columnKey="return_1m" />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors text-right" onClick={() => handleSort('return_3m')}>
                3M <SortIcon columnKey="return_3m" />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors text-right" onClick={() => handleSort('return_6m')}>
                6M <SortIcon columnKey="return_6m" />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-slate-300 group transition-colors text-right" onClick={() => handleSort('return_1y')}>
                1Y <SortIcon columnKey="return_1y" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => {
              const isExpanded = expandedSectors.has(row.sector);
              return (
                <React.Fragment key={row.sector}>
                  <tr
                    className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => toggleRow(row.sector)}
                  >
                    <td className="px-4 py-3 flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-200">
                          {row.sector}
                        </span>
                        {CYCLICAL_SECTORS[row.sector] && (
                          <div className="flex flex-col gap-1 items-start">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === row.sector ? null : row.sector);
                              }}
                              className="text-[10px] font-medium bg-amber-500/10 text-amber-400/90 px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap cursor-pointer hover:bg-amber-500/20 transition-colors"
                            >
                              ♻ Cyclic: {CYCLICAL_SECTORS[row.sector].months} {activeTooltip === row.sector ? '▼' : '▶'}
                            </span>
                            {activeTooltip === row.sector && (
                              <div className="text-[10px] text-amber-300/80 leading-tight max-w-[200px] whitespace-normal" onClick={(e) => e.stopPropagation()}>
                                ({CYCLICAL_SECTORS[row.sector].reason})
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                      {row.count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <FormatReturn value={row.return_1d} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <FormatReturn value={row.return_1w} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <FormatReturn value={row.return_1m} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <FormatReturn value={row.return_3m} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <FormatReturn value={row.return_6m} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <FormatReturn value={row.return_1y} />
                    </td>
                  </tr>
                  {isExpanded && row.industries.length > 0 && (
                    <tr className="bg-slate-900/40 border-b border-slate-800/50">
                      <td colSpan={8} className="p-0">
                        <div className="px-8 py-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800/50">
                                <th className="px-4 py-2 font-medium">Industry</th>
                                <th className="px-4 py-2 font-medium text-right">Holdings</th>
                                <th className="px-4 py-2 font-medium text-right">1D</th>
                                <th className="px-4 py-2 font-medium text-right">1W</th>
                                <th className="px-4 py-2 font-medium text-right">1M</th>
                                <th className="px-4 py-2 font-medium text-right">3M</th>
                                <th className="px-4 py-2 font-medium text-right">6M</th>
                                <th className="px-4 py-2 font-medium text-right">1Y</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.industries.map(ind => {
                                const isIndExpanded = expandedIndustries.has(ind.name);
                                const stocks = industryStocks[ind.name] || [];
                                const isLoadingInd = loadingIndustries[ind.name];
                                
                                return (
                                  <React.Fragment key={ind.name}>
                                    <tr 
                                      className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/30 transition-colors cursor-pointer"
                                      onClick={() => toggleIndustry(ind.name)}
                                    >
                                      <td className="px-4 py-2 flex items-center gap-2">
                                        {isIndExpanded ? <ChevronDown className="h-3 w-3 text-slate-500" /> : <ChevronRight className="h-3 w-3 text-slate-500" />}
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-300">{ind.name}</span>
                                          {CYCLICAL_INDUSTRIES[ind.name] && (
                                            <div className="flex flex-col gap-1 items-start">
                                              <span 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveTooltip(activeTooltip === ind.name ? null : ind.name);
                                                }}
                                                className="text-[10px] font-medium bg-amber-500/10 text-amber-400/90 px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap cursor-pointer hover:bg-amber-500/20 transition-colors"
                                              >
                                                ♻ Cyclic: {CYCLICAL_INDUSTRIES[ind.name].months} {activeTooltip === ind.name ? '▼' : '▶'}
                                              </span>
                                              {activeTooltip === ind.name && (
                                                <div className="text-[10px] text-amber-300/80 leading-tight max-w-[200px] whitespace-normal" onClick={(e) => e.stopPropagation()}>
                                                  ({CYCLICAL_INDUSTRIES[ind.name].reason})
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${ind.count > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800/50 text-slate-500"}`}>
                                          {ind.count}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-right"><FormatReturn value={ind.market_return_1d} /></td>
                                      <td className="px-4 py-2 text-right"><FormatReturn value={ind.market_return_1w} /></td>
                                      <td className="px-4 py-2 text-right"><FormatReturn value={ind.market_return_1m} /></td>
                                      <td className="px-4 py-2 text-right"><FormatReturn value={ind.market_return_3m} /></td>
                                      <td className="px-4 py-2 text-right"><FormatReturn value={ind.market_return_6m} /></td>
                                      <td className="px-4 py-2 text-right"><FormatReturn value={ind.market_return_1y} /></td>
                                    </tr>
                                    {isIndExpanded && (
                                      <tr className="bg-slate-900/60 border-b border-slate-800/30">
                                        <td colSpan={8} className="p-0">
                                          <div className="px-12 py-3">
                                            {isLoadingInd ? (
                                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
                                                Loading top stocks...
                                              </div>
                                            ) : stocks.length === 0 ? (
                                              <p className="text-xs text-slate-500">No top stocks mapped for this industry.</p>
                                            ) : (
                                              <table className="w-full text-xs">
                                                <thead>
                                                  <tr className="text-left text-slate-500 border-b border-slate-800/30">
                                                    <th className="px-3 py-1.5 font-medium">Top Stock</th>
                                                    <th className="px-3 py-1.5 font-medium text-right">1D</th>
                                                    <th className="px-3 py-1.5 font-medium text-right">1W</th>
                                                    <th className="px-3 py-1.5 font-medium text-right">1M</th>
                                                    <th className="px-3 py-1.5 font-medium text-right">3M</th>
                                                    <th className="px-3 py-1.5 font-medium text-right">6M</th>
                                                    <th className="px-3 py-1.5 font-medium text-right">1Y</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {stocks.map(stock => (
                                                    <tr key={stock.ticker} className="border-b border-slate-800/20 last:border-0 hover:bg-slate-800/40">
                                                      <td className="px-3 py-2">
                                                        <span className="font-medium text-slate-300">{stock.name}</span>
                                                      </td>
                                                      <td className="px-3 py-2 text-right"><FormatReturn value={stock.return_1d || 0} /></td>
                                                      <td className="px-3 py-2 text-right"><FormatReturn value={stock.return_1w || 0} /></td>
                                                      <td className="px-3 py-2 text-right"><FormatReturn value={stock.return_1m || 0} /></td>
                                                      <td className="px-3 py-2 text-right"><FormatReturn value={stock.return_3m || 0} /></td>
                                                      <td className="px-3 py-2 text-right"><FormatReturn value={stock.return_6m || 0} /></td>
                                                      <td className="px-3 py-2 text-right"><FormatReturn value={stock.return_1y || 0} /></td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
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
