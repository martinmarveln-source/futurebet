// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, signOut } from "@/lib/auth-client";
import useUserPermissions from "@/hooks/useUserPermissions";
import { useKickoffTime } from "@/hooks/useKickoffTime";

function getDbMarketName(pickStr) {
  const rawMarket = String(pickStr || "").trim().toUpperCase();
  if (rawMarket === "HOME WIN" || rawMarket === "HOME" || rawMarket === "1" || rawMarket.includes("HOME")) return "HOME";
  if (rawMarket === "AWAY WIN" || rawMarket === "AWAY" || rawMarket === "2" || rawMarket.includes("AWAY")) return "AWAY";
  if (rawMarket === "DRAW" || rawMarket === "X") return "DRAW";
  if (rawMarket === "GG" || rawMarket === "BTTS - YES" || rawMarket === "BTTS YES" || rawMarket.includes("GG") || rawMarket.includes("YES")) return "GG";
  if (rawMarket === "NG" || rawMarket === "BTTS - NO" || rawMarket.includes("NG") || rawMarket.includes("NO")) return "NG";
  if (rawMarket === "OV2.5" || rawMarket === "OV.2.5" || rawMarket === "OVER 2.5" || rawMarket === "OVER2.5" || rawMarket === "OV" || rawMarket.includes("OV") || rawMarket.includes("OVER")) return "OV";
  if (rawMarket === "UN2.5" || rawMarket === "UN.2.5" || rawMarket === "UNDER 2.5" || rawMarket === "UNDER2.5" || rawMarket === "UN" || rawMarket.includes("UN") || rawMarket.includes("UNDER")) return "UN";
  return rawMarket;
}

import { calculateHistWinRateForMatch } from "@/components/Dashboard/MatchCard";

export default function useDashboard() {
  const { data: sessionData, isPending: isSessionPending } = useSession();
  const [forceReady, setForceReady] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 2500); // 2.5s fallback
    return () => clearTimeout(timer);
  }, []);

  const userLoading = isSessionPending && !forceReady;
  const user = sessionData?.user;
  const {
    permissions,
    hasFilterAccess,
    isAdmin,
    isPremium,
    isSilver,
    canAccessAllFeatures,
    canAccessAdvancedFilters,
    hasFeatureAccess,
  } = useUserPermissions();
  const queryClient = useQueryClient();

  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // New state for tab management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({ from: new Date(), to: null });
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectedMarkets, setSelectedMarkets] = useState([
    "homeWin",
    "draw",
    "awayWin",
    "gg",
    "ng",
    "ov25",
    "un25",
  ]);
  const [chanceThreshold, setChanceThreshold] = useState(50);
  const [ratingThreshold, setRatingThreshold] = useState(10);
  const [csThreshold, setCsThreshold] = useState(0);
  const [kickoffFilter, setKickoffFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [onlyAlignedPredictions, setOnlyAlignedPredictions] = useState(false);
  const [sortBy, setSortBy] = useState("chance"); // Default sort by chance

  const {
    data: matchesData,
    isLoading: matchesLoading,
    error: matchesError,
    refetch,
  } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const response = await fetch("/api/matches?all=true");
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    refetchInterval: 1000 * 60 * 60,
    staleTime: 1000 * 60 * 30,
  });

  const { data: archiveData = [] } = useQuery({
    queryKey: ["ml-archive-data"],
    queryFn: async () => {
      const response = await fetch("/api/ml-archive");
      if (response.status === 403) {
        return [];
      }
      if (!response.ok) throw new Error("Failed to fetch archive data");
      const res = await response.json();
      if (res && res.code === "PREMIUM_REQUIRED") {
        return [];
      }
      return res;
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    gcTime: 1000 * 60 * 60, // 1 hour gc
  });

  const { data: preferencesData } = useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const response = await fetch("/api/preferences");
      if (response.status === 401) return { preferences: {} };
      if (!response.ok) throw new Error("Failed to fetch preferences");
      return response.json();
    },
    enabled: !!user,
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences) => {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) throw new Error("Failed to save preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      setShowSettings(false);
    },
  });

  useEffect(() => {
    if (preferencesData?.preferences) {
      const prefs = preferencesData.preferences;
      setSelectedLeagues(prefs.favorite_leagues || []);
      setSelectedMarkets(
        prefs.favorite_markets || ["homeWin", "draw", "awayWin", "gg", "ov25"]
      );
      setChanceThreshold((prefs.default_chance_threshold || 0.1) * 100);
      setRatingThreshold((prefs.default_rating_threshold || 0.1) * 100);
    }
  }, [preferencesData]);

  useEffect(() => {
    if (
      !canAccessAdvancedFilters &&
      !["homeWin", "draw", "awayWin", "date", "ng", "un25"].includes(sortBy)
    ) {
      setSortBy("homeWin");
    }
  }, [canAccessAdvancedFilters, sortBy]);

  const handleSaveSettings = useCallback(
    (telegramSettings) => {
      if (!user) return;
      savePreferencesMutation.mutate({
        favorite_leagues: selectedLeagues,
        favorite_markets: selectedMarkets,
        default_chance_threshold: chanceThreshold / 100,
        default_rating_threshold: ratingThreshold / 100,
        ...telegramSettings,
      });
    },
    [
      user,
      selectedLeagues,
      selectedMarkets,
      chanceThreshold,
      ratingThreshold,
      savePreferencesMutation,
    ]
  );

  const { hasKickoffPassed } = useKickoffTime();

  const filteredMatches = useMemo(() => {
    if (!matchesData?.matches) return [];

    const filtered = matchesData.matches.filter((match) => {
      const matchDate = new Date(match.date);
      if (dateRange && dateRange.to) {
        if (matchDate < dateRange.from || matchDate > dateRange.to)
          return false;
      } else {
        if (match.date !== selectedDate.toISOString().split("T")[0])
          return false;
      }
      if (
        selectedLeagues.length > 0 &&
        !selectedLeagues.includes(match.fullLeague)
      )
        return false;
      if (selectedMatches.length > 0 && !selectedMatches.includes(match.match))
        return false;

      // Kickoff filter
      const isPassed = hasKickoffPassed(match);
      if (kickoffFilter === "passed" && !isPassed) return false;
      if (kickoffFilter === "upcoming" && isPassed) return false;

      // Handle both decimal (0.75) and percentage (75) formats for chance, rating, and CS
      const chancePercent =
        match.chance > 1 ? match.chance : match.chance * 100;
      const ratingPercent =
        match.rating > 1 ? match.rating : match.rating * 100;
      const csPercent =
        match.modelCSPercent > 1 ? match.modelCSPercent : (match.modelCSPercent || 0) * 100;

      if (chancePercent < chanceThreshold || ratingPercent < ratingThreshold || csPercent < csThreshold)
        return false;

      // Filter by flag alignment - only show matches where model and stats agree
      if (onlyAlignedPredictions && match.flag !== "✅") {
        return false;
      }

      // Market filtering: Check if the match's pick matches ANY of the selected markets
      if (selectedMarkets.length > 0) {
        const matchPick = String(match.pick || "")
          .toUpperCase()
          .trim();

        const isMatchAllowed = selectedMarkets.some((marketKey) => {
          switch (marketKey) {
            case "homeWin":
              return matchPick === "HOME WIN";
            case "draw":
              return matchPick === "DRAW";
            case "awayWin":
              return matchPick === "AWAY WIN";
            case "gg":
              return matchPick === "GG";
            case "ng":
              return matchPick === "NG";
            case "ov25":
              return matchPick === "OV.2.5" || matchPick === "OVER 2.5";
            case "un25":
              return matchPick === "UN2.5" || matchPick === "UNDER 2.5";
            default:
              return false;
          }
        });

        if (!isMatchAllowed) return false;
      }

      return true;
    });

    // Pre-calculate histWinRates if sorting by it, to avoid O(N log N) database scans
    const matchesWithRates = filtered.map((m) => {
      const histData = sortBy === "histWinRate" ? calculateHistWinRateForMatch(m, archiveData) : { rate: 0, count: 0 };
      return {
        match: m,
        rate: histData.rate,
        count: histData.count,
      };
    });

    matchesWithRates.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "homeWin":
          aValue = a.match.homeWin || 0;
          bValue = b.match.homeWin || 0;
          break;
        case "draw":
          aValue = a.match.draw || 0;
          bValue = b.match.draw || 0;
          break;
        case "awayWin":
          aValue = a.match.awayWin || 0;
          bValue = b.match.awayWin || 0;
          break;
        case "date":
          aValue = new Date(a.match.date || "1900-01-01");
          bValue = new Date(b.match.date || "1900-01-01");
          return aValue - bValue; // Ascending order for dates
        case "league":
          return (a.match.fullLeague || "").localeCompare(b.match.fullLeague || "");
        case "ng":
          aValue = a.match.ng || 0;
          bValue = b.match.ng || 0;
          break;
        case "un25":
          aValue = a.match.un25 || 0;
          bValue = b.match.un25 || 0;
          break;
        case "gg":
          aValue = a.match.gg || 0;
          bValue = b.match.gg || 0;
          break;
        case "ov25":
          aValue = a.match.ov25 || 0;
          bValue = b.match.ov25 || 0;
          break;
        case "cs":
          aValue = a.match.modelCSPercent || 0;
          bValue = b.match.modelCSPercent || 0;
          break;
        case "chance":
          aValue = a.match.chance || 0;
          bValue = b.match.chance || 0;
          break;
        case "rating":
          aValue = a.match.rating || 0;
          bValue = b.match.rating || 0;
          break;
        case "histWinRate":
          aValue = a.rate;
          bValue = b.rate;
          // Tie-breaker using sample size for historical win rate
          if (aValue === bValue) {
            return b.count - a.count;
          }
          break;
        default:
          aValue = a.match.chance || 0;
          bValue = b.match.chance || 0;
      }

      return bValue - aValue; // Descending order for most fields (except date)
    });

    return matchesWithRates.map((item) => item.match);
  }, [
    matchesData?.matches,
    archiveData,
    selectedDate,
    dateRange,
    selectedLeagues,
    selectedMatches,
    selectedMarkets,
    chanceThreshold,
    ratingThreshold,
    csThreshold,
    onlyAlignedPredictions,
    kickoffFilter,
    hasKickoffPassed,
    sortBy,
  ]);

  const uniqueLeagues = useMemo(() => {
    if (!matchesData?.matches) return [];
    return [...new Set(matchesData.matches.map((m) => m.fullLeague))]
      .filter(Boolean)
      .sort();
  }, [matchesData?.matches]);

  return {
    user,
    userLoading,
    signOut,
    permissions,
    hasFilterAccess, // This now includes admin access automatically
    isAdmin,
    isPremium,
    canAccessAllFeatures, // New: Admins get everything
    canAccessAdvancedFilters, // New: Future-proof advanced features
    hasFeatureAccess, // New: Function to check any feature by name
    darkMode,
    setDarkMode,
    activeTab, // New: Current active tab
    setActiveTab, // New: Function to change tabs
    selectedDate,
    setDateRange,
    dateRange,
    selectedLeagues,
    setSelectedLeagues,
    selectedMarkets,
    setSelectedMarkets,
    chanceThreshold,
    setChanceThreshold,
    ratingThreshold,
    setRatingThreshold,
    csThreshold,
    setCsThreshold,
    onlyAlignedPredictions,
    setOnlyAlignedPredictions,
    kickoffFilter,
    setKickoffFilter,
    sortBy,
    setSortBy,
    showFilters,
    setShowFilters,
    showDatePicker,
    setShowDatePicker,
    showSettings,
    setShowSettings,
    matchesData,
    matchesLoading,
    matchesError,
    refetch,
    preferencesData: preferencesData?.preferences,
    handleSaveSettings,
    savePreferencesMutation,
    filteredMatches,
    uniqueLeagues,
  };
}