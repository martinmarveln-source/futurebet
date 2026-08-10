"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      // Set a cookie for 30 days
      document.cookie = `fb_ref_code=${ref}; path=/; max-age=${30 * 24 * 60 * 60}`;
    }
  }, [searchParams]);

  return null;
}
