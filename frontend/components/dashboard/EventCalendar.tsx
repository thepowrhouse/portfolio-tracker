"use client";

import { usePortfolio } from "@/store/PortfolioContext";
import { useState } from "react";
import { Calendar, AlertCircle, Building2, Globe2 } from "lucide-react";
import { CalendarEvent } from "@/types";

export function EventCalendar() {
  const { calendarEvents, isLoading } = usePortfolio();
  const [filter, setFilter] = useState<"all" | "earnings" | "macro">("all");

  const filteredEvents = calendarEvents.filter((event) => {
    if (filter === "all") return true;
    return event.type === filter;
  });

  const getSeverityColor = (severity?: "high" | "medium" | "low" | null) => {
    switch (severity) {
      case "high":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "medium":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "low":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="text-slate-500 animate-pulse">Loading Calendar...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Calendar className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Event Calendar</h3>
            <p className="text-xs text-slate-400">Earnings and Macro-Economic Schedule</p>
          </div>
        </div>

        <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "all" ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilter("earnings")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "earnings" ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Earnings Only
          </button>
          <button
            onClick={() => setFilter("macro")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "macro" ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Macro Only
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No events scheduled for the selected filter.
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-4 rounded-lg border border-slate-800/50 bg-slate-950/50 p-4 transition-colors hover:border-slate-700"
            >
              <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="text-lg font-bold text-slate-200">
                  {new Date(event.date).getDate()}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-center">
                <div className="flex items-center gap-2">
                  {event.type === "earnings" ? (
                    <Building2 className="h-3.5 w-3.5 text-blue-400" />
                  ) : (
                    <Globe2 className="h-3.5 w-3.5 text-purple-400" />
                  )}
                  <h4 className="text-sm font-semibold text-slate-200">{event.title}</h4>
                  
                  {event.severity && (
                    <span
                      className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getSeverityColor(
                        event.severity
                      )}`}
                    >
                      {event.severity} Impact
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="mt-1 text-xs text-slate-400">{event.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
