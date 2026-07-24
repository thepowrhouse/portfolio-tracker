import { getSession } from "next-auth/react";

const API_BASE = typeof window !== "undefined" 
  ? "/api/backend" 
  : (process.env.API_URL || "http://backend:8000").replace(/\/+$/, "");

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function getHeaders(customHeaders: Record<string, string> = {}) {
  const session = await getSession();
  const headers: Record<string, string> = { ...customHeaders };
  // X-User-Email is now injected securely by the Next.js API Proxy!
  if (typeof window !== "undefined") {
    if (!sessionStorage.getItem("sessionId")) {
      sessionStorage.setItem("sessionId", Math.random().toString(36).substring(2, 10));
    }
    headers["X-Session-ID"] = sessionStorage.getItem("sessionId") || "";
  }
  return headers;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${path}`, { headers, cache: 'no-store' });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res.json();
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const headers = await getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res.json();
  },

  async put<T>(path: string, body: unknown): Promise<T> {
    const headers = await getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res.json();
  },

  async postForm<T>(path: string, formData: FormData): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res.json();
  },

  async delete<T>(path: string): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res.json();
  },
};