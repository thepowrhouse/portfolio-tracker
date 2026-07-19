"use client";
import { PortfolioProvider } from "@/store/PortfolioContext";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

function ActivityTracker() {
  const { data: session, status } = useSession();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email && !trackedRef.current) {
      trackedRef.current = true;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      let sessionId = sessionStorage.getItem("sessionId");
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem("sessionId", sessionId);
      }
      
      fetch(`${apiUrl}/activity/login`, {
        method: "POST",
        headers: {
          "x-user-email": session.user.email,
          "x-session-id": sessionId
        }
      }).catch(() => {});
    }
  }, [session, status]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ActivityTracker />
      <PortfolioProvider>{children}</PortfolioProvider>
    </SessionProvider>
  );
}