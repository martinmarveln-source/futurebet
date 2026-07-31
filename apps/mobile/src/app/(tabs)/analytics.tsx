// @ts-nocheck
import React, { useMemo } from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Activity, Target, TrendingUp, PieChart } from "lucide-react-native";

const { width } = Dimensions.get("window");

/* ============================================================================
  Design tokens (single source of truth)
============================================================================ */
const COLORS = {
  bg: "#0B1020",
  surface: "#12182B",
  border: "#1F2A44",
  textPrimary: "#FFFFFF",
  textSecondary: "#9CA3AF",
  blue: "#3B82F6",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  violet: "#8B5CF6",
};

/* ============================================================================
  UI Primitives
============================================================================ */
function Surface({ children, style }: any) {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

function SectionHeader({ title, subtitle }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          color: COLORS.textPrimary,
          fontSize: 18,
          fontWeight: "800",
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: 2,
            fontSize: 12,
            color: COLORS.textSecondary,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function StatTile({ icon, value, label, color }: any) {
  return (
    <Surface
      style={{
        width: (width - 52) / 2,
        marginBottom: 12,
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: 26,
          fontWeight: "900",
          color: COLORS.textPrimary,
          marginTop: 8,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: COLORS.textSecondary,
        }}
      >
        {label}
      </Text>
    </Surface>
  );
}

function InsightText({ children }: any) {
  return (
    <Text
      style={{
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 20,
      }}
    >
      {children}
    </Text>
  );
}

/* ============================================================================
  Analytics Screen
============================================================================ */
export default function Analytics() {
  const insets = useSafeAreaInsets();

  const { data } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
  });

  const matches = data?.matches || [];
  const total = matches.length;

  const high = matches.filter((m) => m.our_rating >= 80).length;
  const mid = matches.filter(
    (m) => m.our_rating >= 60 && m.our_rating < 80
  ).length;
  const low = matches.filter((m) => m.our_rating < 60).length;

  const avgRating = total
    ? Math.round(matches.reduce((a, m) => a + m.our_rating, 0) / total)
    : 0;

  /* ================== Intelligence Layer ================== */
  const environmentInsight = useMemo(() => {
    if (!total) return "No matches available yet.";
    if (high / total > 0.5)
      return "Today’s slate is dominated by high-confidence selections, indicating favorable model conditions.";
    if (low / total > 0.4)
      return "Increased volatility detected. Stake sizing discipline is advised.";
    return "The match environment is balanced with selective value opportunities.";
  }, [total, high, low]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        paddingTop: insets.top,
      }}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "900",
            color: COLORS.textPrimary,
          }}
        >
          Analytics
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: COLORS.textSecondary,
          }}
        >
          Model performance & prediction intelligence
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: 20,
        }}
      >
        {/* ================= EXECUTIVE SNAPSHOT ================= */}
        <SectionHeader
          title="Executive Snapshot"
          subtitle="Today at a glance"
        />

        <Surface style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "900",
              color: COLORS.textPrimary,
            }}
          >
            {total}
          </Text>
          <Text style={{ color: COLORS.textSecondary, marginBottom: 10 }}>
            Matches analyzed today
          </Text>
          <InsightText>{environmentInsight}</InsightText>
        </Surface>

        {/* ================= OVERVIEW STATS ================= */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <StatTile
            icon={<Target color={COLORS.green} size={24} />}
            value={high}
            label="High confidence"
          />
          <StatTile
            icon={<TrendingUp color={COLORS.amber} size={24} />}
            value={`${avgRating}%`}
            label="Average rating"
          />
          <StatTile
            icon={<Activity color={COLORS.blue} size={24} />}
            value={mid}
            label="Medium confidence"
          />
          <StatTile
            icon={<PieChart color={COLORS.violet} size={24} />}
            value={low}
            label="Low confidence"
          />
        </View>

        {/* ================= CONFIDENCE HEALTH ================= */}
        <SectionHeader
          title="Confidence Health"
          subtitle="Distribution & volatility"
        />

        <Surface>
          <InsightText>
            {high} high-confidence, {mid} medium-confidence and {low}{" "}
            low-confidence fixtures define today’s prediction landscape.
          </InsightText>
        </Surface>
      </ScrollView>
    </View>
  );
}