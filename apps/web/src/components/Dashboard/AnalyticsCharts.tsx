// @ts-nocheck
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CircleHelp } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#F97316", "#8B5CF6"];

/* === UPGRADE 3: "HUD" GLASS TOOLTIPS & PILLS === */
const CustomTooltip = ({ active, payload, label, darkMode }) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  const data = item?.payload || {};
  const title = label || data.name || data.league || "Unknown";
  const value = item?.value ?? 0;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl transition-all",
        darkMode
          ? "bg-gray-950/80 border-white/10 text-white"
          : "bg-white/90 border-gray-200 text-gray-900"
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">
        {title}
      </p>

      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]",
            darkMode ? "bg-cyan-400 text-cyan-400" : "bg-cyan-500 text-cyan-500"
          )}
        />
        <p className="text-xs font-bold">
          <span className="opacity-60 uppercase tracking-wider mr-1">
            Count:
          </span>
          <span className="tabular-nums text-sm font-black">{value}</span>
        </p>
      </div>

      {typeof data.avgRating !== "undefined" && (
        <div className="flex items-center gap-2.5 mt-2">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]",
              darkMode
                ? "bg-fuchsia-400 text-fuchsia-400"
                : "bg-fuchsia-500 text-fuchsia-500"
            )}
          />
          <p className="text-xs font-bold">
            <span className="opacity-60 uppercase tracking-wider mr-1">
              Avg Rating:
            </span>
            <span className="tabular-nums text-sm font-black">
              {data.avgRating}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

const PieLegend = ({ data, darkMode }) => {
  if (!data?.length) return null;

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      {data.map((entry, index) => (
        <div
          key={`legend-${index}`}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm transition-all",
            darkMode
              ? "bg-white/5 border-white/10 hover:bg-white/10"
              : "bg-gray-50 border-gray-200 hover:bg-white"
          )}
        >
          <span
            className="h-2.5 w-2.5 rounded-full shadow-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-wider",
              darkMode ? "text-gray-200" : "text-gray-700"
            )}
          >
            {entry.name}{" "}
            <span className="opacity-50 ml-1 tabular-nums">
              ({entry.value})
            </span>
          </span>
        </div>
      ))}
    </div>
  );
};

const PieLegend = ({ data }) => {
  if (!data?.length) return null;

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
      {data.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm">
            {entry.name} ({entry.value})
          </span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsCharts({
  filteredMatches = [],
  darkMode = false,
}) {
  const [showGuide, setShowGuide] = useState(false);
  const leagueStats = useMemo(() => {
    if (!filteredMatches.length) return [];

    const stats = {};

    filteredMatches.forEach((match) => {
      const leagueName = match.fullLeague || "Unknown League";

      if (!stats[leagueName]) {
        stats[leagueName] = {
          fullLeague: leagueName,
          count: 0,
          totalRating: 0,
        };
      }

      stats[leagueName].count += 1;

      const rawRating = Number(match.rating) || 0;
      const rating = rawRating > 1 ? rawRating : rawRating * 100;
      stats[leagueName].totalRating += rating;
    });

    return Object.values(stats)
      .map((item) => ({
        fullLeague: item.fullLeague,
        league:
          item.fullLeague.length > 20
            ? `${item.fullLeague.substring(0, 20)}...`
            : item.fullLeague,
        matches: item.count,
        avgRating: (item.totalRating / item.count).toFixed(1),
      }))
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 8);
  }, [filteredMatches]);

  const marketDistribution = useMemo(() => {
    if (!filteredMatches.length) return [];

    const pickCounts = {};

    filteredMatches.forEach((match) => {
      const pick = match.pick?.toString().trim() || "No Pick";
      pickCounts[pick] = (pickCounts[pick] || 0) + 1;
    });

    return Object.entries(pickCounts)
      .map(([pick, count], index) => ({
        name: pick,
        value: count,
        color: COLORS[index % COLORS.length],
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredMatches]);

  if (!filteredMatches.length) {
    return (
      <div
        className={`rounded-lg p-6 text-center shadow ${
          darkMode ? "bg-gray-800 text-gray-300" : "bg-white text-gray-500"
        }`}
      >
        No analytics data available.
      </div>
    );
  }

  /* === UPGRADE 1 & 2: NEON GRADIENTS & GLASS CARDS === */
  const cardClass = cn(
    "relative overflow-hidden rounded-[32px] p-6 sm:p-8 border shadow-2xl transition-all",
    darkMode
      ? "bg-gray-950/50 border-white/10 text-white backdrop-blur-2xl"
      : "bg-white/90 border-gray-200 text-gray-900 backdrop-blur-2xl"
  );

  const axisTickColor = darkMode ? "#9CA3AF" : "#6B7280";
  const gridColor = darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  return (
    <div className="space-y-6">
      {/* Guide Section */}
      <div
        className={cn(
          "rounded-[32px] border p-5 sm:p-6 shadow-sm",
          darkMode
            ? "border-white/10 bg-white/[0.02] text-white"
            : "border-gray-200 bg-white text-gray-900"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black tracking-tight">
              Analytics Guide
            </h3>
            <p
              className={cn(
                "text-xs font-semibold mt-1 max-w-lg leading-relaxed",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              A breakdown of current filter data, highest volume leagues, and
              market distribution patterns.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black transition active:scale-[0.99]",
              darkMode
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-100"
                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
            )}
          >
            <CircleHelp size={16} />
            {showGuide ? "Hide Analytics Guide" : "View Guide"}
          </button>
        </div>

        {showGuide && (
          <div
            className={cn(
              "mt-5 rounded-3xl border p-5 sm:p-6 text-xs sm:text-sm leading-loose font-medium grid gap-4 animate-in slide-in-from-top-4 duration-300",
              darkMode
                ? "border-white/10 bg-black/20 text-gray-300"
                : "border-gray-200 bg-gray-50 text-gray-600"
            )}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="mb-2">
                  <b className={darkMode ? "text-white" : "text-black"}>
                    Top Leagues by Matches
                  </b>{" "}
                  shows which leagues appear most often in the current filtered
                  results.
                </p>
                <p className="mb-2">
                  <b className={darkMode ? "text-white" : "text-black"}>
                    Matches
                  </b>{" "}
                  is calculated by counting how many filtered matches belong to
                  each league.
                </p>
                <p>
                  <b className={darkMode ? "text-white" : "text-black"}>
                    Avg Rating
                  </b>{" "}
                  is calculated as the total rating for a league divided by the
                  number of matches in that league.
                </p>
              </div>
              <div>
                <p className="mb-2">
                  If a rating comes as a decimal like{" "}
                  <b className={darkMode ? "text-white" : "text-black"}>0.68</b>
                  , it is converted to percentage style before averaging.
                </p>
                <p className="mb-2">
                  <b className={darkMode ? "text-white" : "text-black"}>
                    Market Distribution
                  </b>{" "}
                  shows how often each pick label appears across the filtered
                  matches.
                </p>
                <p>
                  <b className={darkMode ? "text-white" : "text-black"}>
                    Value
                  </b>{" "}
                  in the pie chart tooltip is the number of matches using that
                  same pick label.
                </p>
              </div>
            </div>
            <div
              className={cn(
                "pt-4 border-t",
                darkMode ? "border-white/10" : "border-gray-200"
              )}
            >
              <p className="text-center italic opacity-80">
                These charts respond only to the currently filtered match list,
                so changing filters changes the chart output.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* === CHART 1: NEON GRADIENT BARS === */}
        <div className={cardClass}>
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

          <h3 className="mb-6 text-xs font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
            <BarChart3 size={14} className="text-cyan-500" /> Volume by League
          </h3>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={leagueStats}
              margin={{ top: 10, right: 20, left: -20, bottom: 50 }}
            >
              <defs>
                <linearGradient id="neonCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridColor}
                vertical={false}
              />
              <XAxis
                dataKey="league"
                tick={{ fontSize: 9, fill: axisTickColor, fontWeight: 800 }}
                axisLine={false}
                tickLine={false}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fontSize: 10,
                  fill: axisTickColor,
                  fontWeight: 800,
                  fontFamily: "monospace",
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip darkMode={darkMode} />}
                cursor={{
                  fill: darkMode
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                }}
              />
              <Bar
                dataKey="matches"
                fill="url(#neonCyan)"
                radius={[8, 8, 0, 0]}
                maxBarSize={45}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* === CHART 2: BLOOMBERG DONUT === */}
        <div className={cardClass}>
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

          <h3 className="mb-2 text-xs font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
            <Brain size={14} className="text-amber-500" /> Market Distribution
          </h3>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={marketDistribution}
                cx="50%"
                cy="50%"
                innerRadius={75}
                outerRadius={105}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                stroke={darkMode ? "#030614" : "#FFFFFF"}
                strokeWidth={3}
                className="drop-shadow-sm"
              >
                {marketDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            </PieChart>
          </ResponsiveContainer>

          <PieLegend data={marketDistribution} darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}