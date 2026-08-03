// @ts-nocheck
import { memo } from "react";
import { Lock, X, ExternalLink } from "lucide-react";
import { cn } from "@/utils/matchUtils";
import UpgradeButton from "./UpgradeButton";

export const PremiumHomeModal = memo(function PremiumHomeModal({
  open,
  onClose,
  darkMode,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden",
          darkMode
            ? "border-white/10 bg-gradient-to-b from-gray-950 to-gray-950/70 text-white"
            : "border-gray-200 bg-white text-gray-900",
        )}
      >
        <div
          className={cn(
            "flex items-start justify-between gap-3 p-4 border-b",
            darkMode
              ? "border-white/10 bg-white/[0.03]"
              : "border-gray-200 bg-gray-50",
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-10 w-10 rounded-2xl flex items-center justify-center ring-1",
                darkMode
                  ? "bg-white/5 ring-white/10"
                  : "bg-yellow-50 ring-yellow-200",
              )}
            >
              <Lock
                className={cn(
                  "h-5 w-5",
                  darkMode ? "text-yellow-300" : "text-yellow-700",
                )}
              />
            </div>

            <div>
              <h3 className="text-base font-extrabold">Home is Premium</h3>
              <p
                className={cn(
                  "text-xs mt-0.5",
                  darkMode ? "text-gray-400" : "text-gray-600",
                )}
              >
                Upgrade to unlock curated "Best Today" + "Best This Week".
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-xl border transition active:scale-[0.99]",
              darkMode
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-gray-200 bg-white hover:bg-gray-50",
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div
            className={cn(
              "rounded-2xl border p-3 text-sm",
              darkMode
                ? "border-white/10 bg-white/5 text-gray-200"
                : "border-gray-200 bg-gray-50 text-gray-800",
            )}
          >
            <div className="font-extrabold mb-2">What you get in Home</div>
            <ul className="list-disc list-inside space-y-1 text-xs leading-6">
              <li>Top ✅ matches ranked by rating + chance</li>
              <li>Quick rationale for why a pick is strong</li>
              <li>Fast add-to-betslip workflow</li>
              <li>Cleaner "daily plan" view for staking decisions</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded-2xl text-sm font-extrabold border transition active:scale-[0.99]",
                darkMode
                  ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-100"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800",
              )}
            >
              Not now
            </button>

            <UpgradeButton
              className={cn(
                "px-4 py-2 rounded-2xl text-sm font-extrabold text-white transition active:scale-[0.99]",
                "bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
              )}
            >
              Upgrade
            </UpgradeButton>
          </div>
        </div>
      </div>
    </div>
  );
});
