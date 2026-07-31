// @ts-nocheck
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  Lock,
  Star,
  TrendingUp,
  Target,
  Calendar,
  ExternalLink,
  RefreshCw,
} from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";

export default function VipPick() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser();

  // User permissions
  const isAdmin = user?.user_role === "admin";
  const isPremium = user?.user_role === "premium";
  const hasAccess = isAdmin || isPremium;

  // Fetch VIP pick data
  const {
    data: vipData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["vip-pick"],
    queryFn: async () => {
      const response = await fetch("/api/vip-pick");
      if (!response.ok) throw new Error("Failed to fetch VIP pick");
      return response.json();
    },
    enabled: hasAccess,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

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
        <Lock color="#6B7280" size={64} />
        <Text
          style={{
            color: "white",
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "center",
            marginTop: 16,
          }}
        >
          Authentication Required
        </Text>
        <Text
          style={{
            color: "#9CA3AF",
            fontSize: 16,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Please sign in to access VIP picks
        </Text>
      </View>
    );
  }

  if (!hasAccess) {
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
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#374151",
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "white",
            }}
          >
            VIP Pick
          </Text>
        </View>

        {/* Upgrade Prompt */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              backgroundColor: "#1F2937",
              borderRadius: 20,
              padding: 32,
              alignItems: "center",
              borderWidth: 2,
              borderColor: "#F59E0B",
            }}
          >
            <Crown color="#F59E0B" size={64} />
            <Text
              style={{
                color: "white",
                fontSize: 24,
                fontWeight: "bold",
                textAlign: "center",
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              Premium Feature
            </Text>
            <Text
              style={{
                color: "#9CA3AF",
                fontSize: 16,
                textAlign: "center",
                lineHeight: 24,
                marginBottom: 24,
              }}
            >
              VIP picks are exclusive to Premium members. Get access to our
              highest confidence predictions with detailed analysis.
            </Text>

            <View
              style={{
                backgroundColor: "#111827",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                width: "100%",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 12,
                }}
              >
                Premium Benefits:
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Star color="#F59E0B" size={16} />
                <Text style={{ color: "#9CA3AF", marginLeft: 8 }}>
                  Daily VIP picks with 85%+ accuracy
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Target color="#F59E0B" size={16} />
                <Text style={{ color: "#9CA3AF", marginLeft: 8 }}>
                  Detailed match analysis
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TrendingUp color="#F59E0B" size={16} />
                <Text style={{ color: "#9CA3AF", marginLeft: 8 }}>
                  AI insights and risk analysis
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: "#F59E0B",
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Crown color="white" size={20} />
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                  marginRight: 4,
                }}
              >
                Upgrade to Premium
              </Text>
              <ExternalLink color="white" size={16} />
            </TouchableOpacity>

            <Text
              style={{
                color: "#6B7280",
                fontSize: 12,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              Just $2.09/month
            </Text>
          </View>
        </View>
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
              color: "white",
            }}
          >
            VIP Pick
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#F59E0B",
            }}
          >
            Premium Exclusive
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F59E0B",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
          }}
        >
          <Crown color="white" size={16} />
          <Text
            style={{
              color: "white",
              fontSize: 12,
              fontWeight: "bold",
              marginLeft: 4,
            }}
          >
            PREMIUM
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View
            style={{
              padding: 40,
              alignItems: "center",
            }}
          >
            <RefreshCw color="#3B82F6" size={32} />
            <Text
              style={{
                color: "#9CA3AF",
                marginTop: 16,
              }}
            >
              Loading today's VIP pick...
            </Text>
          </View>
        ) : vipData?.pick ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            {/* VIP Pick Card */}
            <View
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                borderWidth: 2,
                borderColor: "#F59E0B",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: "#F59E0B",
                      fontSize: 12,
                      fontWeight: "600",
                      marginBottom: 4,
                    }}
                  >
                    TODAY'S VIP PICK
                  </Text>
                  <Text
                    style={{
                      color: "white",
                      fontSize: 20,
                      fontWeight: "bold",
                    }}
                  >
                    {vipData.pick.match_name}
                  </Text>
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: 14,
                    }}
                  >
                    {vipData.pick.league}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#10B981",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    {vipData.pick.confidence}%
                  </Text>
                  <Text
                    style={{
                      color: "white",
                      fontSize: 10,
                    }}
                  >
                    CONFIDENCE
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "#3B82F6",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  {vipData.pick.prediction}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <View>
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    Recommended Odds
                  </Text>
                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    {vipData.pick.odds}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    Match Time
                  </Text>
                  <Text
                    style={{ color: "white", fontSize: 16, fontWeight: "600" }}
                  >
                    {vipData.pick.match_time}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#374151",
                  paddingTop: 16,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 14,
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  Analysis Summary:
                </Text>
                <Text
                  style={{
                    color: "#9CA3AF",
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {vipData.pick.analysis}
                </Text>
              </View>
            </View>

            {/* Statistics */}
            <View
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 16,
                }}
              >
                VIP Pick Performance
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 20,
                      fontWeight: "bold",
                    }}
                  >
                    87%
                  </Text>
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    Win Rate
                  </Text>
                </View>

                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      color: "#3B82F6",
                      fontSize: 20,
                      fontWeight: "bold",
                    }}
                  >
                    24
                  </Text>
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    This Month
                  </Text>
                </View>

                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      color: "#F59E0B",
                      fontSize: 20,
                      fontWeight: "bold",
                    }}
                  >
                    +15.3%
                  </Text>
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    ROI
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={{
                backgroundColor: "#10B981",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 12,
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <Target color="white" size={20} />
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                Add to BetSlip
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#374151",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <Calendar color="white" size={20} />
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                View Previous Picks
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={{
              padding: 40,
              alignItems: "center",
            }}
          >
            <Calendar color="#6B7280" size={64} />
            <Text
              style={{
                color: "white",
                fontSize: 20,
                fontWeight: "bold",
                textAlign: "center",
                marginTop: 16,
              }}
            >
              No VIP Pick Today
            </Text>
            <Text
              style={{
                color: "#9CA3AF",
                fontSize: 16,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Check back later for today's premium pick
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
