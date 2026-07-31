// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import {
  Filter,
  Calendar,
  RefreshCw,
  TrendingUp,
  Target,
  Activity,
  Star,
  Brain,
  Eye,
  Plus,
} from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";

const { width } = Dimensions.get("window");

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signIn } = useAuth();
  const { data: user } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    league: "all",
    market: "all",
    rating: 70,
  });

  // User permissions
  const isAdmin = user?.user_role === "admin";
  const isPremium = user?.user_role === "premium";
  const isSilver = user?.user_role === "silver";
  const canAccessAI = isAdmin || isPremium;

  // Fetch matches data
  const {
    data: matchesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Fetch AI usage stats for premium users
  const { data: usageStats } = useQuery({
    queryKey: ["aiUsage"],
    queryFn: async () => {
      const response = await fetch("/api/ai-usage");
      if (!response.ok) throw new Error("Failed to fetch usage");
      return response.json();
    },
    enabled: canAccessAI,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getRoleColor = () => {
    if (isAdmin) return "#9333EA";
    if (isPremium) return "#F59E0B";
    if (isSilver) return "#6B7280";
    return "#10B981";
  };

  const getRoleText = () => {
    if (isAdmin) return "ADMIN";
    if (isPremium) return "PREMIUM";
    if (isSilver) return "SILVER";
    return "FREE";
  };

  if (!isAuthenticated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#111827",
          paddingTop: insets.top,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <StatusBar style="light" />
        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: "#3B82F6",
            marginBottom: 10,
          }}
        >
          FutureBet
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#9CA3AF",
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          Football Prediction Analytics
        </Text>
        <TouchableOpacity
          onPress={signIn}
          style={{
            backgroundColor: "#3B82F6",
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            Sign In to Continue
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#111827",
        paddingTop: insets.top,
      }}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#374151",
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "#3B82F6",
            }}
          >
            FutureBet
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#9CA3AF",
            }}
          >
            Football Analytics
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <View
            style={{
              backgroundColor: getRoleColor(),
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 10,
                fontWeight: "bold",
              }}
            >
              {getRoleText()}
            </Text>
          </View>

          {canAccessAI && usageStats && (
            <Text
              style={{
                fontSize: 10,
                color: "#9CA3AF",
              }}
            >
              {isAdmin
                ? "∞ AI Insights"
                : `${usageStats.todayInsights || 0}/20`}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "white",
              marginBottom: 16,
            }}
          >
            Today's Overview
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                backgroundColor: "#1F2937",
                padding: 16,
                borderRadius: 12,
                flex: 1,
                marginRight: 8,
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <Activity color="#10B981" size={20} />
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 8,
                }}
              >
                {matchesData?.matches?.length || 0}
              </Text>
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 12,
                }}
              >
                Total Matches
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#1F2937",
                padding: 16,
                borderRadius: 12,
                flex: 1,
                marginLeft: 8,
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <Star color="#F59E0B" size={20} />
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 8,
                }}
              >
                {matchesData?.matches?.filter((m) => m.our_rating >= 75)
                  .length || 0}
              </Text>
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 12,
                }}
              >
                High Quality
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View
          style={{
            paddingHorizontal: 20,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "white",
              marginBottom: 16,
            }}
          >
            Quick Actions
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {/* Filter Button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#1F2937",
                padding: 16,
                borderRadius: 12,
                width: (width - 52) / 2,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#374151",
                alignItems: "center",
              }}
            >
              <Filter color="#3B82F6" size={24} />
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: "600",
                  marginTop: 8,
                }}
              >
                Filters
              </Text>
            </TouchableOpacity>

            {/* Calendar Button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#1F2937",
                padding: 16,
                borderRadius: 12,
                width: (width - 52) / 2,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#374151",
                alignItems: "center",
              }}
            >
              <Calendar color="#10B981" size={24} />
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: "600",
                  marginTop: 8,
                }}
              >
                Schedule
              </Text>
            </TouchableOpacity>

            {canAccessAI && (
              <TouchableOpacity
                style={{
                  backgroundColor: "#1F2937",
                  padding: 16,
                  borderRadius: 12,
                  width: (width - 52) / 2,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "#374151",
                  alignItems: "center",
                }}
              >
                <Brain color="#9333EA" size={24} />
                <Text
                  style={{
                    color: "white",
                    fontSize: 14,
                    fontWeight: "600",
                    marginTop: 8,
                  }}
                >
                  AI Insights
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: "#1F2937",
                padding: 16,
                borderRadius: 12,
                width: (width - 52) / 2,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#374151",
                alignItems: "center",
              }}
            >
              <TrendingUp color="#F59E0B" size={24} />
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: "600",
                  marginTop: 8,
                }}
              >
                Analytics
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Matches */}
        <View
          style={{
            paddingHorizontal: 20,
            marginBottom: 100,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "white",
              marginBottom: 16,
            }}
          >
            Today's Top Picks
          </Text>

          {isLoading ? (
            <View
              style={{
                backgroundColor: "#1F2937",
                padding: 20,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <RefreshCw color="#3B82F6" size={24} />
              <Text
                style={{
                  color: "#9CA3AF",
                  marginTop: 8,
                }}
              >
                Loading matches...
              </Text>
            </View>
          ) : (
            matchesData?.matches?.slice(0, 3).map((match, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: "#1F2937",
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "#374151",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 16,
                      fontWeight: "600",
                      flex: 1,
                    }}
                  >
                    {match.match_name}
                  </Text>
                  <View
                    style={{
                      backgroundColor:
                        match.our_rating >= 75 ? "#10B981" : "#F59E0B",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {match.our_rating}%
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: 12,
                    }}
                  >
                    {match.league}
                  </Text>
                  <Text
                    style={{
                      color: "#3B82F6",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {match.prediction}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
