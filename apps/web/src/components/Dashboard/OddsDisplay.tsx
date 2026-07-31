// @ts-nocheck
import { useState, useEffect } from "react";
import {
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import useUserPermissions from "@/hooks/useUserPermissions";

export default function OddsDisplay({ matches, darkMode, onRefresh }) {
  const [oddsData, setOddsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { isAdmin } = useUserPermissions();

  const fetchOdds = async () => {
    if (!matches || matches.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/odds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matches }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch odds");
      }

      const data = await response.json();
      setOddsData(data.results);
      setLastUpdated(new Date());

      if (onRefresh) {
        onRefresh(data.results);
      }
    } catch (err) {
      console.error("Error fetching odds:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (matches && matches.length > 0) {
      fetchOdds();
    }
  }, [matches]);

  const getStatusIcon = (result) => {
    if (!result) return null;

    switch (result.status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "no_match":
      case "no_data":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatPrice = (price) => {
    if (!price || typeof price !== "number") return "-";
    return price.toFixed(2);
  };

  const getUniqueBookmakers = () => {
    const bookmakers = new Set();
    Object.values(oddsData).forEach((result) => {
      if (result.status === "success" && result.odds) {
        Object.keys(result.odds).forEach((bookmaker) => {
          bookmakers.add(bookmaker);
        });
      }
    });
    return Array.from(bookmakers).slice(0, 6); // Limit to 6 bookmakers for table width
  };

  const uniqueBookmakers = getUniqueBookmakers();

  if (!matches || matches.length === 0) {
    return (
      <div
        className={`${
          darkMode ? "bg-gray-800" : "bg-white"
        } rounded-lg p-6 text-center`}
      >
        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          No matches in betslip to fetch odds for
        </p>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold">Live Bookmaker Odds</h3>
            <p
              className={`text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Real-time odds from The Odds API
            </p>
          </div>
        </div>

        {/* Admin-only Refresh Button */}
        {isAdmin && (
          <button
            onClick={fetchOdds}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="text-sm">
              {loading ? "Refreshing..." : "Refresh Odds"}
            </span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Fetching live odds from bookmakers...
          </p>
        </div>
      )}

      {/* Odds Table */}
      {!loading && Object.keys(oddsData).length > 0 && (
        <div className="space-y-4">
          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-right">
              <p
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table
              className={`w-full text-sm ${
                darkMode ? "text-gray-300" : "text-gray-900"
              }`}
            >
              <thead>
                <tr
                  className={`border-b ${
                    darkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <th className="text-left py-3 px-2 font-medium">Match</th>
                  <th className="text-left py-3 px-2 font-medium">Market</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  {uniqueBookmakers.map((bookmaker) => (
                    <th
                      key={bookmaker}
                      className="text-center py-3 px-2 font-medium"
                    >
                      {bookmaker}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map((match, index) => {
                  const matchKey =
                    match.match || `${match.homeTeam} vs ${match.awayTeam}`;
                  const result = oddsData[matchKey];
                  const market =
                    match.selectedMarket || match.pick || "Unknown";

                  return (
                    <tr
                      key={index}
                      className={`border-b ${
                        darkMode ? "border-gray-700" : "border-gray-100"
                      } hover:${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
                    >
                      {/* Match */}
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium text-sm">
                            {result?.match || matchKey}
                          </div>
                          {result?.similarity && (
                            <div
                              className={`text-xs ${
                                darkMode ? "text-gray-500" : "text-gray-400"
                              }`}
                            >
                              Match:{" "}
                              {(parseFloat(result.similarity) * 100).toFixed(0)}
                              %
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Market */}
                      <td className="py-3 px-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          {market}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(result)}
                          <span className="text-xs">
                            {result?.status === "success"
                              ? "Found"
                              : result?.status === "no_match"
                                ? "No Match"
                                : result?.status === "no_data"
                                  ? "No Data"
                                  : result?.status === "error"
                                    ? "Error"
                                    : "Loading"}
                          </span>
                        </div>
                      </td>

                      {/* Bookmaker Odds */}
                      {uniqueBookmakers.map((bookmaker) => (
                        <td key={bookmaker} className="py-3 px-2 text-center">
                          {result?.status === "success" &&
                          result.odds?.[bookmaker] ? (
                            <div className="space-y-1">
                              <div className="font-bold text-green-600 dark:text-green-400">
                                {formatPrice(result.odds[bookmaker].price)}
                              </div>
                            </div>
                          ) : (
                            <span
                              className={`text-xs ${
                                darkMode ? "text-gray-500" : "text-gray-400"
                              }`}
                            >
                              -
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {
                  Object.values(oddsData).filter((r) => r.status === "success")
                    .length
                }
              </div>
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Odds Found
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">
                {
                  Object.values(oddsData).filter(
                    (r) => r.status === "no_match" || r.status === "no_data",
                  ).length
                }
              </div>
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                No Odds
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {uniqueBookmakers.length}
              </div>
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Bookmakers
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {matches.length}
              </div>
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Total Matches
              </div>
            </div>
          </div>

          {/* Error Details */}
          {Object.entries(oddsData).some(
            ([_, result]) => result.status !== "success",
          ) && (
            <div className="mt-4">
              <details
                className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                <summary className="cursor-pointer text-sm font-medium mb-2">
                  View Issues (
                  {
                    Object.values(oddsData).filter(
                      (r) => r.status !== "success",
                    ).length
                  }{" "}
                  matches)
                </summary>
                <div className="space-y-2 text-xs">
                  {Object.entries(oddsData).map(([matchKey, result]) => {
                    if (result.status === "success") return null;
                    return (
                      <div
                        key={matchKey}
                        className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded"
                      >
                        <div className="font-medium">{matchKey}</div>
                        <div className="text-gray-500">{result.message}</div>
                        {result.availableMatches && (
                          <div className="text-gray-400">
                            Available: {result.availableMatches.join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && Object.keys(oddsData).length === 0 && !error && (
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Click {isAdmin ? '"Refresh Odds"' : "refresh"} to fetch live
            bookmaker odds
          </p>
        </div>
      )}
    </div>
  );
}
