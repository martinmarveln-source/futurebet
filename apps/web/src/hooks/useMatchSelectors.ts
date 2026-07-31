// @ts-nocheck
import { useMemo } from "react";

export function useMatchSelectors() {
  const selectors = useMemo(() => {
    const getISODate = (m) => m?.date || "";
    const getTime = (m) => m?.time || "";
    const getCountry = (m) => m?.country || "";
    const getLeague = (m) => m?.league || m?.fullLeague || "";
    const getMatchTitle = (m) =>
      m?.match || `${m?.home || ""} - ${m?.away || ""}` || "";
    const getPick = (m) => m?.pick || "";
    const getTips = (m) => m?.tips || "";
    const getChance = (m) => {
      const n = Number(m?.chance);
      return Number.isFinite(n) ? n : 0;
    };

    const getRating = (m) => Number(m?.rating ?? 0) || 0;
    const getFlag = (m) => m?.flag || "";
    return {
      getISODate,
      getTime,
      getCountry,
      getLeague,
      getMatchTitle,
      getPick,
      getTips,
      getChance,
      getRating,
      getFlag,
    };
  }, []);

  return selectors;
}
