// @ts-nocheck
"use client";

import React, { Suspense } from "react";
import { SafeFallback } from "@/components/Dashboard/PremiumUI";

const VipPick = React.lazy(() => import("@/components/Dashboard/VipPick"));

export function VipPickTab({ darkMode, isAdmin, isPremium, hasKickoffPassed }) {
  return (
    <div className="w-full relative z-10 flex flex-col gap-8 pb-10">
      <Suspense fallback={<SafeFallback text="Loading VIP Intelligence…" />}>
        <VipPick
          darkMode={darkMode}
          isPro={isAdmin || isPremium}
          hasKickoffPassed={hasKickoffPassed}
        />
      </Suspense>
    </div>
  );
}