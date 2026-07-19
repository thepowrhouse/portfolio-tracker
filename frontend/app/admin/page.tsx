import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import AccessManager from "./components/AccessManager";

async function getAdminData(token: string) {
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  // Node.js fetch prefers IPv6, which fails if Uvicorn is bound to IPv4 0.0.0.0
  apiUrl = apiUrl.replace("localhost", "127.0.0.1");
  try {
    const [dashRes, accessRes] = await Promise.all([
      fetch(`${apiUrl}/admin/dashboard`, {
        headers: { "x-admin-password": token },
        cache: "no-store",
      }),
      fetch(`${apiUrl}/admin/access`, {
        headers: { "x-admin-password": token },
        cache: "no-store",
      })
    ]);

    if (!dashRes.ok || !accessRes.ok) {
      console.error("Admin dashboard fetch failed");
      return null;
    }

    const dashData = await dashRes.json();
    const accessData = await accessRes.json();
    return { ...dashData, accessList: accessData };
  } catch (err) {
    console.error("Admin dashboard fetch error:", err);
    return null;
  }
}

export default async function AdminDashboard() {
  const token = cookies().get("admin_token")?.value;
  if (!token) {
    redirect("/admin/login");
  }

  const data = await getAdminData(token);
  if (!data) {
    // Token is invalid or backend is down
    redirect("/admin/login");
  }

  const { stats, recent_logins, recent_uploads, accessList } = data;

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-400 mt-1">System activity and usage tracking</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Return to App
            </Link>
            <form action="/api/admin/logout" method="POST">
              <button className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg border border-slate-700 transition-colors">
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex items-center gap-6">
            <div className="h-14 w-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Total Unique Users</p>
              <p className="text-3xl font-bold text-white tabular-nums">{stats.unique_users}</p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex items-center gap-6">
            <div className="h-14 w-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Total CSV Uploads</p>
              <p className="text-3xl font-bold text-white tabular-nums">{stats.total_uploads}</p>
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Logins */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col">
            <div className="p-6 border-b border-slate-800/80">
              <h2 className="text-lg font-semibold text-white">Recent Logins</h2>
            </div>
            <div className="overflow-y-auto max-h-[600px] p-2">
              <table className="w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="bg-slate-800/50 text-xs text-slate-400 text-left uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium rounded-l-lg">Email</th>
                    <th className="px-4 py-3 font-medium">Session ID</th>
                    <th className="px-4 py-3 font-medium">IP Address</th>
                    <th className="px-4 py-3 font-medium rounded-r-lg text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_logins.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No recent logins</td>
                    </tr>
                  ) : (
                    recent_logins.map((login: any) => (
                      <tr key={login.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-300">{login.email}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-500">{login.session_id || "N/A"}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-500">{login.ip_address || "N/A"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                          {new Date(login.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Uploads */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col">
            <div className="p-6 border-b border-slate-800/80">
              <h2 className="text-lg font-semibold text-white">Recent Uploads</h2>
            </div>
            <div className="overflow-y-auto max-h-[600px] p-2">
              <table className="w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="bg-slate-800/50 text-xs text-slate-400 text-left uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium rounded-l-lg">Email</th>
                    <th className="px-4 py-3 font-medium">Session ID</th>
                    <th className="px-4 py-3 font-medium">Broker</th>
                    <th className="px-4 py-3 font-medium">Parsed</th>
                    <th className="px-4 py-3 font-medium text-right">Timestamp</th>
                    <th className="px-4 py-3 font-medium rounded-r-lg text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_uploads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No recent uploads</td>
                    </tr>
                  ) : (
                    recent_uploads.map((upload: any) => (
                      <tr key={upload.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-300">{upload.email}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-500">{upload.session_id || "N/A"}</td>
                        <td className="px-4 py-3 text-sm capitalize text-slate-300">{upload.broker}</td>
                        <td className="px-4 py-3 text-emerald-400 font-medium tabular-nums">+{upload.records_parsed}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                          {new Date(upload.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {upload.file_path ? (
                            <a 
                              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/download/${upload.id}?token=${token}`}
                              className="inline-block text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-md border border-indigo-500/20 whitespace-nowrap"
                              download
                            >
                              Download CSV
                            </a>
                          ) : (
                            <span className="text-xs text-slate-600">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Access Management */}
        <AccessManager token={token} initialAccessList={accessList} />

      </div>
    </div>
  );
}
