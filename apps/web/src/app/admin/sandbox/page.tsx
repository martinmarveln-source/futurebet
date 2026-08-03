"use client";

import { CheckCircle } from "lucide-react";

export default function SandboxAdminPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter">Sandbox Data Management</h1>
        <p className="text-gray-500 mt-2">Manage sandbox data synchronization.</p>
      </div>

      <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-[32px] p-12 text-center bg-gray-50 dark:bg-black/20">
        <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
        <h3 className="text-lg font-bold">Fully Automated</h3>
        <p className="text-sm text-gray-500 mb-6 mt-2">
          Manual CSV uploads are disabled. The sandbox environment is now fully synchronized
          automatically via background cron jobs to ensure data freshness without manual intervention.
        </p>
      </div>
    </div>
  );
}
