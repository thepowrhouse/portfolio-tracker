"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccessManager({ token, initialAccessList }: { token: string, initialAccessList: any[] }) {
  const router = useRouter();

  const handleUpdateStatus = async (email: string, status: string) => {
    try {
      const apiUrl = typeof window !== "undefined" ? "/api/backend" : (process.env.API_URL || "http://127.0.0.1:8000");
      const res = await fetch(`${apiUrl}/admin/access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": token,
        },
        body: JSON.stringify({ email, status }),
      });
      
      if (res.ok) {
        router.refresh();
      } else {
        alert(`Failed to update user status to ${status}.`);
      }
    } catch (err) {
      console.error(err);
      alert("Error updating user status.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">Approved</span>;
      case "pending":
        return <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">Pending</span>;
      case "blacklisted":
        return <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">Blacklisted</span>;
      default:
        return <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-500/20">{status}</span>;
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col mt-8">
      <div className="p-6 border-b border-slate-800/80">
        <h2 className="text-lg font-semibold text-white">Access Requests & Management</h2>
        <p className="text-sm text-slate-400 mt-1">Manage who is allowed to log in and use the application.</p>
      </div>

      <div className="overflow-y-auto max-h-[600px] p-2">
        <table className="w-full text-left text-sm text-slate-300">
          <thead>
            <tr className="bg-slate-800/50 text-xs text-slate-400 text-left uppercase tracking-wider">
              <th className="px-4 py-3 font-medium rounded-l-lg">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Timestamp</th>
              <th className="px-4 py-3 font-medium rounded-r-lg text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialAccessList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No users found</td>
              </tr>
            ) : (
              initialAccessList.map((u: any) => (
                <tr key={u.email} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.picture ? (
                        <img src={u.picture} alt="Avatar" className="w-8 h-8 rounded-full bg-slate-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-400">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        {u.name && <p className="text-sm font-medium text-slate-200">{u.name}</p>}
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(u.status)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                    {new Date(u.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {u.status !== "approved" && (
                        <button
                          onClick={() => handleUpdateStatus(u.email, "approved")}
                          className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 rounded-md hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20"
                        >
                          Approve
                        </button>
                      )}
                      {u.status !== "blacklisted" && (
                        <button
                          onClick={() => handleUpdateStatus(u.email, "blacklisted")}
                          className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-md hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                        >
                          Blacklist
                        </button>
                      )}
                    </div>
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
