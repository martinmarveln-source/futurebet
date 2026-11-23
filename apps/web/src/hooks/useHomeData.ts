// @ts-nocheck
import { useMemo, useCallback } from "react";

export function useHomeData(rawMatches, selectors) {
  const pad2 = (n) => String(n).padStart(2, "0");
  const toISODate = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const getCurrentWeekRange = useCallback(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }, []);

  const { monday, sunday } = useMemo(getCurrentWeekRange, [
    getCurrentWeekRange,
  ]);

  const isInCurrentWeek = useCallback(
    (iso) => {
      if (!iso) return false;
      const d = new Date(iso + "T00:00:00");
      return d >= monday && d <= sunday;
    },
    [monday, sunday],
  );

  const isBestCandidate = useCallback(
    (m) => selectors.getFlag(m) === "✅",
    [selectors],
  );

  const bestSort = useCallback(
    (a, b) => {
      const r = selectors.getRating(b) - selectors.getRating(a);
      if (r !== 0) return r;
      return selectors.getChance(b) - selectors.getChance(a);
    },
    [selectors],
  );

  const bestToday = useMemo(() => {
    let todayMatches = rawMatches
      .filter(isBestCandidate)
      .filter((m) => selectors.getISODate(m) === todayISO);

    // Intelligent fallback: if no matches have the exact ✅ flag for today,
    // take the top algorithmic rated matches for today so the tab is never empty
    if (todayMatches.length === 0) {
      todayMatches = rawMatches
        .filter((m) => selectors.getISODate(m) === todayISO)
        .filter(
          (m) =>
            (selectors.getChance(m) || 0) >= 55 ||
            (selectors.getRating(m) || 0) >= 50
        );
    }

    return todayMatches.sort(bestSort).slice(0, 20);
  }, [rawMatches, isBestCandidate, selectors, todayISO, bestSort]);

  const bestWeek = useMemo(() => {
    let weekMatches = rawMatches
      .filter(isBestCandidate)
      .filter((m) => isInCurrentWeek(selectors.getISODate(m)))
      .filter((m) => selectors.getISODate(m) !== todayISO);

    // Intelligent fallback: if no matches have the exact ✅ flag for this week,
    // take the top algorithmic rated matches for the week
    if (weekMatches.length === 0) {
      weekMatches = rawMatches
        .filter((m) => isInCurrentWeek(selectors.getISODate(m)))
        .filter((m) => selectors.getISODate(m) !== todayISO)
        .filter(
          (m) =>
            (selectors.getChance(m) || 0) >= 55 ||
            (selectors.getRating(m) || 0) >= 50
        );
    }

    const seen = new Set();
    return weekMatches
      .sort(bestSort)
      .filter((m) => {
        const key = selectors.getMatchTitle(m);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20);
  }, [
    rawMatches,
    isBestCandidate,
    isInCurrentWeek,
    selectors,
    todayISO,
    bestSort,
  ]);

  return { bestToday, bestWeek, todayISO };
}
