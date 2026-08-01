"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";

export default function SandboxAdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus(null);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', msg: data.message || "Upload successful!" });
        setFile(null); // Reset
      } else {
        setStatus({ type: 'error', msg: data.error || "Upload failed." });
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter">Sandbox Data Management</h1>
        <p className="text-gray-500 mt-2">Upload the latest CSV export to sync matches into the Sandbox Database.</p>
      </div>

      <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-[32px] p-12 text-center bg-gray-50 dark:bg-black/20">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-bold">Select CSV File</h3>
        <p className="text-sm text-gray-500 mb-6 mt-2">Supports the standard ML export format.</p>
        
        <input 
          type="file" 
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden" 
          id="csv-upload" 
        />
        <label 
          htmlFor="csv-upload" 
          className="cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border shadow-sm font-bold hover:bg-gray-50 transition-colors"
        >
          <FileText size={18} />
          {file ? file.name : "Browse Files"}
        </label>

        {file && (
          <div className="mt-8">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="px-8 py-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Uploading & Syncing..." : "Sync Database"}
            </button>
          </div>
        )}

        {status && (
          <div className={`mt-6 p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}
