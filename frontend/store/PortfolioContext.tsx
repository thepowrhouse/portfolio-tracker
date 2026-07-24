"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { PortfolioState, StockRecommendation, PortfolioHolding, CalendarEvent } from "@/types";
import { api } from "@/lib/api";

interface PortfolioContextType {
  portfolio: PortfolioState | null;
  recommendations: StockRecommendation[];
  calendarEvents: CalendarEvent[];
  lastUpdated: number;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  refreshPortfolio: (force?: boolean) => Promise<void>;
  setPortfolio: (state: PortfolioState) => void;
  syncCSV: (file: File, broker: string) => Promise<void>;
  addManualHolding: (holding: any) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  resetPortfolio: () => Promise<void>;
  refreshCalendar: () => Promise<void>;
  addOtherAsset: (asset: any) => Promise<void>;
  updateOtherAsset: (id: string, asset: any) => Promise<void>;
  deleteOtherAsset: (id: string) => Promise<void>;
  refreshAction: (() => Promise<void>) | null;
  setRefreshAction: React.Dispatch<React.SetStateAction<(() => Promise<void>) | null>>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolio, setPortfolioState] = useState<PortfolioState | null>(null);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshAction, setRefreshAction] = useState<(() => Promise<void>) | null>(null);

  const refreshPortfolio = useCallback(async (force: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const cacheBuster = force ? `&_t=${Date.now()}` : "";
      const data = await api.get<PortfolioState>(`/portfolio/state${force ? "?force=true" : ""}${cacheBuster}`);
      setPortfolioState(data);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch portfolio");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshRecommendations = useCallback(async () => {
    if (!portfolio || portfolio.holdings.length === 0) return;
    setIsAnalyzing(true);
    try {
      const recs = await api.get<StockRecommendation[]>("/analysis/batch");
      setRecommendations(recs);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [portfolio]);

  const refreshCalendar = useCallback(async () => {
    if (!portfolio || portfolio.holdings.length === 0) return;
    try {
      const events = await api.get<CalendarEvent[]>("/calendar/events");
      setCalendarEvents(events);
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
    }
  }, [portfolio]);

  useEffect(() => {
    refreshPortfolio();
  }, [refreshPortfolio]);

  useEffect(() => {
    refreshRecommendations();
    refreshCalendar();
  }, [lastUpdated, refreshRecommendations, refreshCalendar]);

  // CRITICAL FIX: syncCSV now properly updates state with returned holdings
  const syncCSV = useCallback(async (file: File, broker: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // The backend returns { holdings: [...], message: "..." }
      const response = await api.postForm<{
        message: string;
        holdings: PortfolioHolding[];
        added: number;
        updated: number;
        deleted: number;
      }>(`/portfolio/sync?broker=${broker}`, formData);

      console.log("Sync response:", response);

      // CRITICAL: Fetch the fresh state from the backend to get correct net worth calculations
      // including currency conversions
      await refreshPortfolio(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV sync failed");
      console.error("Sync error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [portfolio]);

  const addManualHolding = useCallback(async (holding: any) => {
    try {
      await api.post("/portfolio/manual", holding);
      await refreshPortfolio(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
    }
  }, [refreshPortfolio]);

  const deleteHolding = useCallback(async (id: string) => {
    try {
      await api.delete(`/portfolio/${id}`);
      await refreshPortfolio(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }, [refreshPortfolio]);

  const setPortfolio = useCallback((state: PortfolioState) => {
    setPortfolioState(state);
    setLastUpdated(Date.now());
  }, []);

  const resetPortfolio = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.post("/portfolio/reset", {});
      setPortfolioState(null);
      setRecommendations([]);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset portfolio");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addOtherAsset = useCallback(async (asset: any) => {
    try {
      await api.post("/portfolio/other-assets", asset);
      await refreshPortfolio(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add other asset");
      throw err;
    }
  }, [refreshPortfolio]);

  const updateOtherAsset = useCallback(async (id: string, asset: any) => {
    try {
      await api.put(`/portfolio/other-assets/${id}`, asset);
      await refreshPortfolio(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update other asset");
      throw err;
    }
  }, [refreshPortfolio]);

  const deleteOtherAsset = useCallback(async (id: string) => {
    try {
      await api.delete(`/portfolio/other-assets/${id}`);
      await refreshPortfolio(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete other asset");
      throw err;
    }
  }, [refreshPortfolio]);

  return (
    <PortfolioContext.Provider
      value={{
        portfolio,
        recommendations,
        calendarEvents,
        lastUpdated,
        isLoading,
        isAnalyzing,
        error,
        refreshPortfolio,
        setPortfolio,
        syncCSV,
        addManualHolding,
        deleteHolding,
        resetPortfolio,
        refreshCalendar,
        addOtherAsset,
        updateOtherAsset,
        deleteOtherAsset,
        refreshAction,
        setRefreshAction,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

// Helper function
function round(num: number, decimals: number): number {
  return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
}
