"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, TrendingUp, Crown, Zap } from "lucide-react";
import { cn } from "@/utils/matchUtils";

const NAMES = ["John", "Sarah", "Emeka", "Chidi", "Oluwaseun", "Amina", "David", "Michael", "Grace", "Ibrahim", "Ngozi", "Tunde"];
const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu", "Asaba", "Owerri", "Uyo", "Jos"];
const AMOUNTS = ["₦15,000", "₦45,000", "₦120,500", "₦8,500", "₦64,000", "₦22,000", "₦115,000", "₦33,500"];

const ACTIONS = [
  {
    template: (name, city) => `${name} from ${city} just upgraded to Premium! 👑`,
    icon: <Crown className="h-5 w-5 text-yellow-500" />,
    color: "border-yellow-500/30 bg-yellow-500/10",
  },
  {
    template: (name, city, amount) => `${name} just won ${amount} using Elite Edge 📈`,
    icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
    color: "border-emerald-500/30 bg-emerald-500/10",
  },
  {
    template: (name, city) => `${name} from ${city} verified their phone number ✅`,
    icon: <CheckCircle2 className="h-5 w-5 text-blue-500" />,
    color: "border-blue-500/30 bg-blue-500/10",
  },
  {
    template: (name) => `${name} is currently viewing the Auto-Pick AI 🤖`,
    icon: <Zap className="h-5 w-5 text-purple-500" />,
    color: "border-purple-500/30 bg-purple-500/10",
  },
];

export default function SocialProofToasts({ darkMode = false }) {
  const [toast, setToast] = useState<{ id: number; message: string; icon: React.ReactNode; color: string } | null>(null);

  useEffect(() => {
    // Generate a random delay between 30 and 75 seconds
    const getRandomDelay = () => Math.floor(Math.random() * (75000 - 30000 + 1) + 30000);

    let timeoutId: NodeJS.Timeout;

    const showRandomToast = () => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const amount = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
      const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];

      setToast({
        id: Date.now(),
        message: action.template(name, city, amount),
        icon: action.icon,
        color: action.color,
      });

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToast(null);
      }, 5000);

      // Schedule next toast
      timeoutId = setTimeout(showRandomToast, getRandomDelay());
    };

    // Start the first one after a short delay (15s) so the user sees it soon after logging in
    timeoutId = setTimeout(showRandomToast, 15000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border",
          toast.color,
          darkMode ? "bg-gray-900/90 text-white" : "bg-white/95 text-gray-900"
        )}
      >
        <div className="flex-shrink-0 bg-white/10 p-2 rounded-full">
          {toast.icon}
        </div>
        <p className="text-sm font-semibold tracking-tight">{toast.message}</p>
      </div>
    </div>
  );
}
