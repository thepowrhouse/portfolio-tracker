"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, Wallet, LayoutDashboard, PieChart, ReceiptText } from "lucide-react";

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
    },
    {
      name: "Performance",
      href: "/dashboard/performance",
      icon: PieChart,
      exact: false
    },
    {
      name: "Expenses",
      href: "/dashboard/expenses",
      icon: ReceiptText,
      exact: false
    }
  ];

  return (
    <div className="hidden lg:flex h-screen w-16 flex-col items-center border-r border-slate-800 bg-slate-900/50 backdrop-blur py-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/50 border border-slate-700/50 mb-8" title="WealthTrack">
        <LayoutDashboard className="h-6 w-6 text-blue-500" />
      </div>
      
      <div className="flex-1 overflow-y-auto w-full px-2 flex flex-col items-center gap-4">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href
              : pathname?.startsWith(item.href);
              
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={`group flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"
                  }`}
                />
              </Link>
            );
          })}
      </div>
    </div>
  );
}
