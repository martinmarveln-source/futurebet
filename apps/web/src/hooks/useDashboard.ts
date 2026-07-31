// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, signOut } from "@/lib/auth-client";
import useUserPermissions from "@/hooks/useUserPermissions";

export default function useDashboard() {
  const { data: sessionData, isPending: userLoading } = useSession();
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
  const [chanceThreshold, setChanceThreshold] = useState(10);
  const [ratingThreshold, setRatingThreshold] = useState(10);
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
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    refetchInterval: 1000 * 60 * 60,
    staleTime: 1000 * 60 * 30,
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
      !hasFilterAccess &&
      !["home", "draw", "away", "date", "ng", "un25"].includes(sortBy)
    ) {
      setSortBy("home");
    }
  }, [hasFilterAccess, sortBy]);

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

      // Handle both decimal (0.75) and percentage (75) formats for chance and rating
      const chancePercent =
        match.chance > 1 ? match.chance : match.chance * 100;
      const ratingPercent =
        match.rating > 1 ? match.rating : match.rating * 100;

      if (chancePercent < chanceThreshold || ratingPercent < ratingThreshold)
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

    // Sort by selected field
    return filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "home":
          aValue = a.homeWin || 0;
          bValue = b.homeWin || 0;
          break;
        case "draw":
          aValue = a.draw || 0;
          bValue = b.draw || 0;
          break;
        case "away":
          aValue = a.awayWin || 0;
          bValue = b.awayWin || 0;
          break;
        case "date":
          // Date sorting - ascending order
          aValue = new Date(a.date || "1900-01-01");
          bValue = new Date(b.date || "1900-01-01");
          return aValue - bValue; // Ascending order for dates
        case "ng":
          // NG field - descending order
          aValue = a.ng || 0;
          bValue = b.ng || 0;
          break;
        case "un25":
          // UN2.5 field - descending order
          aValue = a.un25 || 0;
          bValue = b.un25 || 0;
          break;
        case "btts":
          aValue = a.gg || 0;
          bValue = b.gg || 0;
          break;
        case "o25":
          aValue = a.ov25 || 0;
          bValue = b.ov25 || 0;
          break;
        case "modelCS":
          aValue = a.modelCSPercent || 0;
          bValue = b.modelCSPercent || 0;
          break;
        case "chance":
          aValue = a.chance || 0;
          bValue = b.chance || 0;
          break;
        case "rating":
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        default:
          aValue = a.chance || 0;
          bValue = b.chance || 0;
      }

      return bValue - aValue; // Descending order for most fields (except date)
    });
  }, [
    matchesData?.matches,
    selectedDate,
    dateRange,
    selectedLeagues,
    selectedMatches,
    selectedMarkets,
    chanceThreshold,
    ratingThreshold,
    onlyAlignedPredictions,
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
    onlyAlignedPredictions,
    setOnlyAlignedPredictions,
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