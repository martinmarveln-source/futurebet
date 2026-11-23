// @ts-nocheck
import React, { memo } from "react";

// Curated sport palette gradients for team monograms
const CREST_PALETTES = [
  { from: "#1e3a8a", to: "#3b82f6", border: "#60a5fa", text: "#ffffff" }, // Royal Blue
  { from: "#065f46", to: "#10b981", border: "#34d399", text: "#ffffff" }, // Emerald
  { from: "#831843", to: "#ec4899", border: "#f472b6", text: "#ffffff" }, // Crimson / Rose
  { from: "#581c87", to: "#8b5cf6", border: "#a78bfa", text: "#ffffff" }, // Violet / Indigo
  { from: "#78350f", to: "#d97706", border: "#fcd34d", text: "#ffffff" }, // Amber / Gold
  { from: "#1e293b", to: "#475569", border: "#94a3b8", text: "#ffffff" }, // Slate
  { from: "#0f766e", to: "#14b8a6", border: "#2dd4bf", text: "#ffffff" }, // Teal
  { from: "#991b1b", to: "#ef4444", border: "#f87171", text: "#ffffff" }, // Scarlet
];

function getPalette(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CREST_PALETTES.length;
  return CREST_PALETTES[index];
}

function getInitials(name = "") {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return "FC";
  if (parts.length === 1) {
    return parts[0].slice(0, 3).toUpperCase();
  }
  if (parts.length === 2) {
    return (parts[0][0] + parts[1].slice(0, 2)).toUpperCase();
  }
  return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
}

export const TeamCrest = memo(function TeamCrest({
  name = "Team",
  logoUrl,
  size = 40,
  className = "",
}: {
  name?: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const palette = getPalette(name);
  const initials = getInitials(name);

  if (logoUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-sm flex items-center justify-center bg-white/5 ${className}`}
      >
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-contain p-1"
          onError={(e) => {
            // fallback to monogram if image fails
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 flex items-center justify-center select-none ${className}`}
      title={name}
    >
      <svg
        viewBox="0 0 44 48"
        className="w-full h-full filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient
            id={`grad-${name.replace(/[^a-zA-Z0-9]/g, "")}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={palette.from} />
            <stop offset="100%" stopColor={palette.to} />
          </linearGradient>
          <filter id="shieldShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Shield shape */}
        <path
          d="M 22 2 
             C 34 2, 42 6, 42 16 
             C 42 32, 30 42, 22 46 
             C 14 42, 2 32, 2 16 
             C 2 6, 10 2, 22 2 Z"
          fill={`url(#grad-${name.replace(/[^a-zA-Z0-9]/g, "")})`}
          stroke={palette.border}
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />

        {/* Subtle shield inner highlight */}
        <path
          d="M 22 4 
             C 32 4, 39 7, 39 16 
             C 39 24, 34 33, 22 42 
             C 22 20, 22 4, 22 4 Z"
          fill="white"
          fillOpacity="0.08"
        />

        {/* Team Initials */}
        <text
          x="22"
          y="27"
          textAnchor="middle"
          fill={palette.text}
          fontSize={initials.length > 2 ? "11" : "13"}
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.05em"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
        >
          {initials}
        </text>
      </svg>
    </div>
  );
});

export default TeamCrest;
