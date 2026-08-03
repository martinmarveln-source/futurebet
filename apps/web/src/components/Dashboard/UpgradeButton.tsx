import dynamic from "next/dynamic";
import React from "react";
import { Loader2 } from "lucide-react";

const UpgradeButtonInner = dynamic(() => import("./UpgradeButtonInner"), {
  ssr: false,
  loading: () => (
    <button
      disabled
      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white opacity-50"
    >
      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
    </button>
  ),
});

interface UpgradeButtonProps {
  plan?: "silver" | "premium";
  className?: string;
  children?: React.ReactNode;
}

export default function UpgradeButton(props: UpgradeButtonProps) {
  return <UpgradeButtonInner {...props} />;
}
