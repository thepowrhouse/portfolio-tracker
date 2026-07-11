"use client";

import { StockRecommendation } from "@/types";
import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, Newspaper } from "lucide-react";

interface Props {
  recommendation: StockRecommendation;
}

export function StockDetailPanel({ recommendation }: Props) {
  const { technical, fundamental, sentiment, rationale, overall_summary } = recommendation;

  const MetricRow = ({ label, value, suffix = "" }: { label: string; value: string | number | null; suffix?: string }) => (
    <div className="flex justify-between py-1.5 border-b border-slate-800/50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-medium tabular-nums ${
        label === "Chart Pattern" 
          ? (value && String(value).includes("Bull") || String(value).includes("Bottom") || String(value).includes("Inverse")) 
            ? "text-emerald-400" 
            : (value && String(value).includes("Bear") || String(value).includes("Top") || String(value).includes("Head"))
            ? "text-red-400"
            : "text-slate-300"
          : "text-slate-300"
      }`}>
        {value !== null && value !== undefined ? `${value}${suffix}` : "—"}
      </span>
    </div>
  );

  const SentimentBadge = ({ grade }: { grade: string }) => {
    const color = grade === "Bullish" 
      ? "text-emerald-400 bg-emerald-500/10" 
      : grade === "Bearish" 
      ? "text-red-400 bg-red-500/10" 
      : "text-slate-400 bg-slate-500/10";
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
        {grade}
      </span>
    );
  };

  return (
    <div className="animate-fade-in border-t border-slate-800 bg-slate-900/80 p-6">
      {fundamental.company_description && (
        <div className="mb-6 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">About the Company</h4>
            {fundamental.industry && (
              <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                {fundamental.industry}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {fundamental.company_description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Technical Column */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Technical</h4>
          </div>
          <MetricRow label="RSI (14)" value={technical.rsi_14} />
          <MetricRow label="MACD" value={technical.macd} />
          <MetricRow label="MACD Signal" value={technical.macd_signal} />
          <MetricRow label="Bollinger Position" value={technical.bollinger_position} />
          <MetricRow label="SMA 50" value={technical.sma_50} />
          <MetricRow label="SMA 200" value={technical.sma_200} />
          <MetricRow label="Trend" value={technical.trend} />
          <MetricRow label="Chart Pattern" value={technical.chart_pattern || "None"} />
        </div>

        {/* Fundamental Column */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fundamental</h4>
          </div>
          <MetricRow label="P/E Ratio" value={fundamental.pe_ratio} suffix="x" />
          <MetricRow label="Debt/Equity" value={fundamental.debt_to_equity} />
          <MetricRow label="EPS Growth (YoY)" value={fundamental.eps_growth_yoy} suffix="%" />
          <MetricRow label="ROE" value={fundamental.roe} suffix="%" />
          <MetricRow label="Intrinsic Value" value={fundamental.intrinsic_value_estimate} />
          <MetricRow label="Margin of Safety" value={fundamental.margin_of_safety} suffix="%" />
        </div>

        {/* Sentiment Column */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-amber-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sentiment</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">News Grade</span>
              <SentimentBadge grade={sentiment.news_grade} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Social Grade</span>
              <SentimentBadge grade={sentiment.social_grade} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Overall</span>
              <SentimentBadge grade={sentiment.overall_grade} />
            </div>
            <div className="mt-3 border-t border-slate-800 pt-3">
              <span className="text-xs text-slate-500">Recent Headlines</span>
              <ul className="mt-2 space-y-1.5">
                {sentiment.recent_headlines.slice(0, 3).map((headline, i) => (
                  <li key={i} className="text-xs text-slate-400 leading-relaxed">
                    • {headline}
                  </li>
                ))}
                {sentiment.recent_headlines.length === 0 && (
                  <li className="text-xs text-slate-600">No recent headlines</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Performance History */}
      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Price Performance</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">1 Day</span>
            <span className={`text-sm font-medium ${technical.return_1d && technical.return_1d >= 0 ? "text-emerald-400" : technical.return_1d && technical.return_1d < 0 ? "text-red-400" : "text-slate-300"}`}>
              {technical.return_1d !== null && technical.return_1d !== undefined ? `${technical.return_1d > 0 ? '+' : ''}${technical.return_1d}%` : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">1 Week</span>
            <span className={`text-sm font-medium ${technical.return_1w && technical.return_1w >= 0 ? "text-emerald-400" : technical.return_1w && technical.return_1w < 0 ? "text-red-400" : "text-slate-300"}`}>
              {technical.return_1w !== null && technical.return_1w !== undefined ? `${technical.return_1w > 0 ? '+' : ''}${technical.return_1w}%` : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">1 Month</span>
            <span className={`text-sm font-medium ${technical.return_1m && technical.return_1m >= 0 ? "text-emerald-400" : technical.return_1m && technical.return_1m < 0 ? "text-red-400" : "text-slate-300"}`}>
              {technical.return_1m !== null && technical.return_1m !== undefined ? `${technical.return_1m > 0 ? '+' : ''}${technical.return_1m}%` : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">3 Months</span>
            <span className={`text-sm font-medium ${technical.return_3m && technical.return_3m >= 0 ? "text-emerald-400" : technical.return_3m && technical.return_3m < 0 ? "text-red-400" : "text-slate-300"}`}>
              {technical.return_3m !== null && technical.return_3m !== undefined ? `${technical.return_3m > 0 ? '+' : ''}${technical.return_3m}%` : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">6 Months</span>
            <span className={`text-sm font-medium ${technical.return_6m && technical.return_6m >= 0 ? "text-emerald-400" : technical.return_6m && technical.return_6m < 0 ? "text-red-400" : "text-slate-300"}`}>
              {technical.return_6m !== null && technical.return_6m !== undefined ? `${technical.return_6m > 0 ? '+' : ''}${technical.return_6m}%` : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">1 Year</span>
            <span className={`text-sm font-medium ${technical.return_1y && technical.return_1y >= 0 ? "text-emerald-400" : technical.return_1y && technical.return_1y < 0 ? "text-red-400" : "text-slate-300"}`}>
              {technical.return_1y !== null && technical.return_1y !== undefined ? `${technical.return_1y > 0 ? '+' : ''}${technical.return_1y}%` : '—'}
            </span>
          </div>
          <div className="flex flex-col border-l border-slate-800/50 pl-4">
            <span className="text-xs text-slate-500 mb-1">All-Time High</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300 tabular-nums">
                {technical.all_time_high !== null && technical.all_time_high !== undefined ? `${technical.all_time_high}` : '—'}
              </span>
              {fundamental.current_price && technical.all_time_high && technical.all_time_high > 0 && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  ((fundamental.current_price - technical.all_time_high) / technical.all_time_high) * 100 > -10 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {(((fundamental.current_price - technical.all_time_high) / technical.all_time_high) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verdict Panel */}
      <div className={`
        mt-4 rounded-lg border-l-4 p-4
        ${recommendation.recommendation === "BUY" 
          ? "border-l-emerald-500 bg-emerald-500/5" 
          : recommendation.recommendation === "SELL"
          ? "border-l-red-500 bg-red-500/5"
          : "border-l-amber-500 bg-amber-500/5"
        }
      `}>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`
            text-sm font-semibold
            ${recommendation.recommendation === "BUY" 
              ? "text-emerald-400" 
              : recommendation.recommendation === "SELL"
              ? "text-red-400"
              : "text-amber-400"
            }
          `}>
            Verdict: {recommendation.recommendation} ({recommendation.confidence_score}% confidence)
          </h4>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">{overall_summary}</p>
        
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {rationale.map((r) => (
            <div key={r.pillar} className="rounded bg-slate-950/50 p-3">
              <h5 className="text-xs font-semibold text-slate-500 mb-1.5">{r.pillar}</h5>
              <ul className="space-y-1">
                {r.points.map((point, i) => (
                  <li key={i} className="text-xs text-slate-400 leading-relaxed">• {point}</li>
                ))}
                {r.points.length === 0 && (
                  <li className="text-xs text-slate-600">No significant signals</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}