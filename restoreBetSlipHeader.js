const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', 'utf8');

const header = `// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import useBetslipStore from "@/store/betslipStore";
import useUserPermissions from "@/hooks/useUserPermissions";
import BetslipMarketModal from "@/components/Dashboard/BetslipMarketModal";
import { formatNaira } from "@/utils/matchUtils";
import {
  Ticket,
  X,
  AlertTriangle,
  Lock,
  Share2,
  Zap,
  Edit2,
  ExternalLink,
  ChevronDown,
  Calculator,
  Brain,
  Sparkles,
  Wand2,
} from "lucide-react";

/* =========================
   Small UI helper
========================= */
`;

// Remove any leftover header fragments from the start
code = code.replace(/^[\s\S]*?(function cn|function calculateSystemBet)/, (match, p1) => {
  if (p1 === 'function cn') return header + 'function cn';
  return header + '/* =========================\n   🔥 UPGRADE: O(n^2) DYNAMIC PROGRAMMING ENGINE\n========================= */\nfunction calculateSystemBet';
});

// If cn helper is not in the file, add it after header
if (!code.includes('function cn(')) {
  code = code.replace(header, header + 'function cn(...c) {\n  return c.filter(Boolean).join(" ");\n}\n\n');
}

fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
console.log('✅ Imports restored. File starts with:', code.substring(0, 100));
