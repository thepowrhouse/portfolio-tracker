"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, Wallet, LayoutDashboard } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Stocks",
      href: "/dashboard",
      icon: LineChart,
      exact: true
    },
    {
      name: "Other Assets",
      href: "/dashboard/assets",
      icon: Wallet,
      exact: false
    }
  ];

  return (
    <div className="hidden lg:flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur">
      <div className="flex h-[72px] items-center px-6 border-b border-slate-800">
        <LayoutDashboard className="h-6 w-6 text-blue-500 mr-2" />
        <span className="text-lg font-bold text-slate-100 tracking-tight">Portfolio Tracker</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
          Overview
        </div>
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href
              : pathname?.startsWith(item.href);
              
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                    isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
