// @ts-nocheck
import { memo } from "react";
import { cn, clamp } from "@/utils/matchUtils";

export const Chip = memo(function Chip({ children, tone = "gray", darkMode }) {
  const tones = {
    gray: darkMode
      ? "bg-white/5 text-gray-100 ring-white/10"
      : "bg-gray-100 text-gray-800 ring-gray-200",
    blue: darkMode
      ? "bg-blue-500/15 text-blue-200 ring-blue-400/25"
      : "bg-blue-50 text-blue-700 ring-blue-200",
    green: darkMode
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25"
      : "bg-emerald-50 text-emerald-700 ring-emerald-200",
    yellow: darkMode
      ? "bg-amber-500/15 text-amber-200 ring-amber-400/25"
      : "bg-amber-50 text-amber-700 ring-amber-200",
    red: darkMode
      ? "bg-rose-500/15 text-rose-200 ring-rose-400/25"
      : "bg-rose-50 text-rose-700 ring-rose-200",
    purple: darkMode
      ? "bg-violet-500/15 text-violet-200 ring-violet-400/25"
      : "bg-violet-50 text-violet-700 ring-violet-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold ring-1",
        tones[tone] || tones.gray,
      )}
    >
      {children}
    </span>
  );
});

export const Stars = memo(function Stars({ score = 0 }) {
  const s = Math.max(0, Math.min(5, Math.round((Number(score) || 0) / 20)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < s ? "text-yellow-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </div>
  );
});

export const ProgressBar = memo(function ProgressBar({
  value = 0,
  tone = "blue",
  darkMode,
}) {
  const v = clamp(Number(value) || 0);
  const track = darkMode ? "bg-white/10" : "bg-gray-100";
  const fill =
    tone === "yellow"
      ? "bg-gradient-to-r from-amber-500 to-yellow-500"
      : tone === "green"
        ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
        : tone === "red"
          ? "bg-gradient-to-r from-rose-500 to-red-600"
          : "bg-gradient-to-r from-blue-600 to-indigo-600";

  return (
    <div className={cn("h-2 w-full rounded-full overflow-hidden", track)}>
      <div className={cn("h-full", fill)} style={{ width: `${v}%` }} />
    </div>
  );
});

export function SafeFallback({ text }) {
  return <div className="text-sm opacity-70 px-2 sm:px-4">{text}</div>;
}
