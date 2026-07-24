"use client";

import { useState, useCallback } from "react";
import { usePortfolio } from "@/store/PortfolioContext";
import { Upload, FileSpreadsheet, AlertCircle, Check, Trash2, Download } from "lucide-react";

const sampleFiles = {
  zerodha: [
    { label: "Holdings", url: "/samples/zerodha_holdings.csv" },
    { label: "Tradebook (XIRR)", url: "/samples/zerodha_tradebook.csv" }
  ],
  groww: [
    { label: "Holdings", url: "/samples/groww_holdings.csv" },
    { label: "Order History (XIRR)", url: "/samples/groww_order_history.csv" }
  ],
  indmoney: [
    { label: "Portfolio", url: "/samples/indmoney_portfolio.csv" },
    { label: "Order History (XIRR)", url: "/samples/indmoney_order_history.csv" }
  ],
  angelone: [
    { label: "Holdings", url: "/samples/angelone_holdings.csv" },
    { label: "Tradebook (XIRR)", url: "/samples/angelone_tradebook.csv" }
  ],
  rsu: [
    { label: "Company RSUs", url: "/samples/walmart_rsu.csv" }
  ]
};

export function CSVUploader() {
  const { syncCSV, isLoading, resetPortfolio } = usePortfolio();
  const [dragActive, setDragActive] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState("zerodha");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  }, [selectedBroker]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = ''; // Reset input so the same file can be selected again
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setUploadStatus("error");
      setStatusMessage("Please upload a CSV file");
      return;
    }
    
    setUploadStatus("idle");
    try {
      await syncCSV(file, selectedBroker);
      setUploadStatus("success");
      setStatusMessage(`Successfully synced ${selectedBroker} holdings`);
    } catch (err) {
      setUploadStatus("error");
      setStatusMessage(err instanceof Error ? err.message : "Sync failed");
    }
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to completely reset and delete all portfolio data? This action cannot be undone.")) {
      await resetPortfolio();
      setUploadStatus("success");
      setStatusMessage("Portfolio has been successfully reset");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500 blur-3xl opacity-10" />
      
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Upload className="h-4 w-4" />
            </div>
            Import Holdings
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-1.5 text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 backdrop-blur-sm"
            >
              <option value="zerodha">Zerodha Console</option>
              <option value="groww">Groww Holdings</option>
              <option value="indmoney">INDmoney Portfolio</option>
              <option value="angelone">AngelOne Details</option>
              <option value="rsu">Company RSUs</option>
            </select>
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
              title="Reset Portfolio"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed 
            p-8 transition-all duration-300
            ${dragActive 
              ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
              : "border-slate-700 bg-slate-950/30 hover:border-slate-600 hover:bg-slate-900/50"
            }
          `}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className={`mb-3 p-3 rounded-full transition-colors duration-300 ${dragActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <p className={`text-sm font-bold transition-colors ${dragActive ? 'text-emerald-400' : 'text-slate-300'}`}>
            Drop your {selectedBroker} CSV here
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            or click to browse
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center justify-center space-y-2 text-xs font-medium text-slate-500">
          <span>Need a sample file?</span>
          <div className="flex gap-4">
            {sampleFiles[selectedBroker as keyof typeof sampleFiles]?.map((file, idx) => (
              <a 
                key={idx} 
                href={file.url} 
                download
                className="flex items-center gap-1.5 text-emerald-500 hover:text-emerald-400 transition-colors bg-emerald-500/10 px-2 py-1 rounded-md"
              >
                <Download className="h-3 w-3" />
                {file.label}
              </a>
            ))}
          </div>
        </div>

        {uploadStatus !== "idle" && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
            uploadStatus === "success" 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {uploadStatus === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {statusMessage}
          </div>
        )}

        {isLoading && (
          <div className="mt-4 flex items-center gap-3 text-sm font-medium text-slate-400 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
            Processing and reconciling holdings...
          </div>
        )}
      </div>
    </div>
  );
}