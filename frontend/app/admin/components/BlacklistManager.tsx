"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BlacklistManager({ token, initialBlacklist }: { token: string, initialBlacklist: any[] }) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    
    try {
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      apiUrl = apiUrl.replace("localhost", "127.0.0.1");
      const res = await fetch(`${apiUrl}/admin/blacklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": token,
        },
        body: JSON.stringify({ email, reason }),
      });
      
      if (res.ok) {
        setEmail("");
        setReason("");
        router.refresh();
      } else {
        alert("Failed to add user to blacklist.");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding to blacklist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (emailToRemove: string) => {
    if (!confirm(`Are you sure you want to remove ${emailToRemove} from the blacklist?`)) return;
    
    try {
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      apiUrl = apiUrl.replace("localhost", "127.0.0.1");
      const res = await fetch(`${apiUrl}/admin/blacklist/${emailToRemove}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": token,
        },
      });
      
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to remove user from blacklist.");
      }
    } catch (err) {
      console.error(err);
      alert("Error removing from blacklist.");
    }
  };

  return (
    <div className="bg-slate-900/50 border border-red-900/30 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col mt-8">
      <div className="p-6 border-b border-slate-800/80 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Blacklisted Users</h2>
          <p className="text-sm text-slate-400 mt-1">These users are blocked from logging in or accessing the API.</p>
        </div>
      </div>
      
      <div className="p-6 border-b border-slate-800/80 bg-slate-900/80">
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {isSubmitting ? "Adding..." : "Blacklist User"}
          </button>
        </form>
      </div>

      <div className="overflow-y-auto max-h-[400px] p-2">
        <table className="w-full text-left text-sm text-slate-300">
          <thead>
            <tr className="bg-slate-800/50 text-xs text-slate-400 text-left uppercase tracking-wider">
              <th className="px-4 py-3 font-medium rounded-l-lg">Email</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium text-right">Timestamp</th>
              <th className="px-4 py-3 font-medium rounded-r-lg text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {initialBlacklist.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No blacklisted users</td>
              </tr>
            ) : (
              initialBlacklist.map((b: any) => (
                <tr key={b.email} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-300">{b.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{b.reason || "N/A"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                    {new Date(b.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(b.email)}
                      className="text-xs font-medium text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-md hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
