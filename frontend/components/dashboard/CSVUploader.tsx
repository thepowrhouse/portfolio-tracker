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
    { label: "Portfolio", url: "/samples/indmoney_portfolio.csv" }
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Import Holdings
        </h3>
        <div className="flex gap-2">
          <select
            value={selectedBroker}
            onChange={(e) => setSelectedBroker(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="zerodha">Zerodha Console</option>
            <option value="groww">Groww Holdings</option>
            <option value="indmoney">INDmoney Portfolio</option>
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
          relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed 
          p-8 transition-all duration-200
          ${dragActive 
            ? "border-blue-500 bg-blue-500/5" 
            : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
          }
        `}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <FileSpreadsheet className="mb-3 h-8 w-8 text-slate-500" />
        <p className="text-sm font-medium text-slate-300">
          Drop your {selectedBroker} CSV here
        </p>
        <p className="mt-1 text-xs text-slate-500">
          or click to browse
        </p>
      </div>

      <div className="mt-4 flex flex-col items-center justify-center space-y-2 text-xs text-slate-500">
        <span>Need a sample file?</span>
        <div className="flex gap-4">
          {sampleFiles[selectedBroker as keyof typeof sampleFiles]?.map((file, idx) => (
            <a 
              key={idx} 
              href={file.url} 
              download
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Download className="h-3 w-3" />
              {file.label}
            </a>
          ))}
        </div>
      </div>

      {uploadStatus !== "idle" && (
        <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          uploadStatus === "success" 
            ? "bg-emerald-500/10 text-emerald-400" 
            : "bg-red-500/10 text-red-400"
        }`}>
          {uploadStatus === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {statusMessage}
        </div>
      )}

      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
          Processing and reconciling...
        </div>
      )}
    </div>
  );
}