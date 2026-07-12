const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res.json();
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res.json();
  },

  async postForm<T>(path: string, formData: FormData): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res.json();
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res.json();
  },
};