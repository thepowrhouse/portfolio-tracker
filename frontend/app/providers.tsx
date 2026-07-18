"use client";
import { PortfolioProvider } from "@/store/PortfolioContext";
import NextAuthSessionProvider from "@/components/providers/SessionProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <PortfolioProvider>{children}</PortfolioProvider>
    </NextAuthSessionProvider>
  );
}