"use client";
import { PortfolioProvider } from "@/store/PortfolioContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <PortfolioProvider>{children}</PortfolioProvider>;
}