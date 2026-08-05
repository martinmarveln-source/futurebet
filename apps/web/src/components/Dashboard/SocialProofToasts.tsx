"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, TrendingUp, Crown, Zap } from "lucide-react";
import { cn } from "@/utils/matchUtils";

// Expanded name pool to prevent repeating
const ALL_NAMES = [
  "John", "Sarah", "Emeka", "Chidi", "Oluwaseun", "Amina", "David", "Michael", "Grace", "Ibrahim", 
  "Ngozi", "Tunde", "Ade", "Bisi", "Chika", "Damilola", "Efe", "Femi", "Gbenga", "Halima", 
  "Idris", "Joy", "Kelechi", "Lola", "Musa", "Nneka", "Obinna", "Peter", "Qasim", "Ruth", 
  "Samuel", "Tochukwu", "Uche", "Victor", "Wale", "Yusuf", "Zainab", "Abubakar", "Blessing", "Chinedu",
  "Daniel", "Emmanuel", "Fatima", "Gabriel", "Hassan", "Isaac", "Jude", "Kingsley", "Lucky", "Mary",
  "Nelson", "Olamide", "Paul", "Rachel", "Stanley", "Timothy", "Umar", "Vincent", "Wisdom", "Yomi"
];

const CITIES = [
  "Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu", "Asaba", "Owerri", "Uyo", "Jos",
  "Benin City", "Kaduna", "Onitsha", "Warri", "Calabar", "Abeokuta", "Ilorin", "Akure", "Makurdi", "Zaria"
];
const AMOUNTS = ["₦15,000", "₦45,000", "₦120,500", "₦8,500", "₦64,000", "₦22,000", "₦115,000", "₦33,500", "₦85,000", "₦54,200", "₦210,000", "₦12,500"];

const ACTIONS = [
  {
    type: "upgrade",
    template: (name, city, amount, tier) => `${name} from ${city} just upgraded to ${tier || "Premium"}! 👑`,
    icon: <Crown className="h-5 w-5 text-yellow-500" />,
    color: "border-yellow-500/30 bg-yellow-500/10",
  },
  {
    type: "win",
    template: (name, city, amount) => `${name} just won ${amount} using Elite Edge 📈`,
    icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
    color: "border-emerald-500/30 bg-emerald-500/10",
  },
  {
    type: "verify",
    template: (name, city) => `${name} from ${city} verified their phone number ✅`,
    icon: <CheckCircle2 className="h-5 w-5 text-blue-500" />,
    color: "border-blue-500/30 bg-blue-500/10",
  },
  {
    type: "view",
    template: (name) => `${name} is currently viewing the Auto-Pick AI 🤖`,
    icon: <Zap className="h-5 w-5 text-purple-500" />,
    color: "border-purple-500/30 bg-purple-500/10",
  },
];

export default function SocialProofToasts({ darkMode = false }) {
  const [toast, setToast] = useState<{ id: number; message: string; icon: React.ReactNode; color: string } | null>(null);
  
  // Track used names in this session to prevent repeats
  const usedNamesRef = useRef(new Set<string>());
  
  // Real data state
  const [realData, setRealData] = useState<{ names: string[], upgrades: {name: string, tier: string}[] }>({ names: [], upgrades: [] });

  useEffect(() => {
    // Fetch real data on mount
    fetch("/api/fomo")
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setRealData({
            names: data.names || [],
            upgrades: data.upgrades || []
          });
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Generate a random delay between 30 and 75 seconds
    const getRandomDelay = () => Math.floor(Math.random() * (75000 - 30000 + 1) + 30000);

    let timeoutId: NodeJS.Timeout;

    const showRandomToast = () => {
      // Use real names if available, fallback to ALL_NAMES
      const sourceNames = realData.names.length > 0 ? realData.names : ALL_NAMES;
      
      // Find a name that hasn't been used recently
      let availableNames = sourceNames.filter(n => !usedNamesRef.current.has(n));
      
      // If we somehow used all names, reset the pool
      if (availableNames.length === 0) {
        usedNamesRef.current.clear();
        availableNames = sourceNames;
      }

      const name = availableNames[Math.floor(Math.random() * availableNames.length)];
      usedNamesRef.current.add(name); // Mark as used

      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const amount = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
      
      // If we have real upgrades, we can bias towards showing an upgrade toast
      let action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      let tier = "Premium";
      let finalName = name;
      
      if (realData.upgrades.length > 0 && Math.random() > 0.6) {
         // Show a real upgrade 40% of the time if available
         const realUpgrade = realData.upgrades[Math.floor(Math.random() * realData.upgrades.length)];
         action = ACTIONS[0]; // Upgrade action
         finalName = realUpgrade.name;
         tier = realUpgrade.tier.charAt(0).toUpperCase() + realUpgrade.tier.slice(1);
         usedNamesRef.current.add(finalName);
      }

      setToast({
        id: Date.now(),
        message: action.template(finalName, city, amount, tier),
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
  }, [realData]);

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
