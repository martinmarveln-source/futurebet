// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  Plus,
  Trophy,
  AlertCircle,
} from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";

export default function Performance() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser();
  const queryClient = useQueryClient();

  // User permissions
  const isAdmin = user?.user_role === "admin";
  const isPremium = user?.user_role === "premium";
  const hasAccess = isAdmin || isPremium;

  const [newBet, setNewBet] = useState({
    match_name: "",
    league: "",
    prediction: "",
    bet_amount: "",
    potential_payout: "",
    match_date: "",
  });

  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch performance data
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["performance-tracker"],
    queryFn: async () => {
      const response = await fetch("/api/performance-tracker");
      if (!response.ok) throw new Error("Failed to fetch performance data");
      return response.json();
    },
    enabled: hasAccess,
  });

  // Add bet mutation
  const addBetMutation = useMutation({
    mutationFn: async (betData) => {
      const response = await fetch("/api/performance-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(betData),
      });
      if (!response.ok) throw new Error("Failed to add bet");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-tracker"] });
      setShowAddForm(false);
      setNewBet({
        match_name: "",
        league: "",
        prediction: "",
        bet_amount: "",
        potential_payout: "",
        match_date: "",
      });
      Alert.alert("Success", "Bet added successfully!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
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
        <AlertCircle color="#6B7280" size={64} />
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
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        <StatusBar style="light" />
        <Target color="#9333EA" size={64} />
        <Text
          style={{
            color: "white",
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "center",
            marginTop: 16,
          }}
        >
          Premium Feature
        </Text>
        <Text
          style={{
            color: "#9CA3AF",
            fontSize: 16,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Performance tracking is available for Premium members only
        </Text>
      </View>
    );
  }

  const stats = performanceData?.stats || {};
  const bets = performanceData?.bets || [];

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
            Performance
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#9CA3AF",
            }}
          >
            Track your betting results
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowAddForm(!showAddForm)}
          style={{
            backgroundColor: "#3B82F6",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Plus color="white" size={16} />
          <Text
            style={{
              color: "white",
              fontSize: 14,
              fontWeight: "600",
              marginLeft: 4,
            }}
          >
            Add Bet
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 16,
            }}
          >
            Performance Overview
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 16,
                width: "48%",
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <Trophy color="#10B981" size={24} />
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 8,
                }}
              >
                {stats.winRate || 0}%
              </Text>
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 12,
                }}
              >
                Win Rate
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 16,
                width: "48%",
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <DollarSign color="#3B82F6" size={24} />
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 8,
                }}
              >
                ${stats.totalProfit || 0}
              </Text>
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 12,
                }}
              >
                Total Profit
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 16,
                width: "48%",
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <Percent color="#F59E0B" size={24} />
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 8,
                }}
              >
                {stats.roi || 0}%
              </Text>
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 12,
                }}
              >
                ROI
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 16,
                width: "48%",
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <Target color="#9333EA" size={24} />
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 8,
                }}
              >
                {stats.totalBets || 0}
              </Text>
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 12,
                }}
              >
                Total Bets
              </Text>
            </View>
          </View>
        </View>

        {/* Add Bet Form */}
        {showAddForm && (
          <View
            style={{
              marginHorizontal: 20,
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
              Add New Bet
            </Text>

            <TextInput
              placeholder="Match Name"
              placeholderTextColor="#6B7280"
              value={newBet.match_name}
              onChangeText={(text) =>
                setNewBet((prev) => ({ ...prev, match_name: text }))
              }
              style={{
                backgroundColor: "#374151",
                color: "white",
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
              }}
            />

            <TextInput
              placeholder="League"
              placeholderTextColor="#6B7280"
              value={newBet.league}
              onChangeText={(text) =>
                setNewBet((prev) => ({ ...prev, league: text }))
              }
              style={{
                backgroundColor: "#374151",
                color: "white",
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
              }}
            />

            <TextInput
              placeholder="Prediction"
              placeholderTextColor="#6B7280"
              value={newBet.prediction}
              onChangeText={(text) =>
                setNewBet((prev) => ({ ...prev, prediction: text }))
              }
              style={{
                backgroundColor: "#374151",
                color: "white",
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
              }}
            />

            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              <TextInput
                placeholder="Bet Amount ($)"
                placeholderTextColor="#6B7280"
                value={newBet.bet_amount}
                onChangeText={(text) =>
                  setNewBet((prev) => ({ ...prev, bet_amount: text }))
                }
                keyboardType="numeric"
                style={{
                  backgroundColor: "#374151",
                  color: "white",
                  padding: 12,
                  borderRadius: 8,
                  flex: 1,
                  marginRight: 8,
                }}
              />

              <TextInput
                placeholder="Potential Payout ($)"
                placeholderTextColor="#6B7280"
                value={newBet.potential_payout}
                onChangeText={(text) =>
                  setNewBet((prev) => ({ ...prev, potential_payout: text }))
                }
                keyboardType="numeric"
                style={{
                  backgroundColor: "#374151",
                  color: "white",
                  padding: 12,
                  borderRadius: 8,
                  flex: 1,
                }}
              />
            </View>

            <TextInput
              placeholder="Match Date (YYYY-MM-DD)"
              placeholderTextColor="#6B7280"
              value={newBet.match_date}
              onChangeText={(text) =>
                setNewBet((prev) => ({ ...prev, match_date: text }))
              }
              style={{
                backgroundColor: "#374151",
                color: "white",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
              }}
            />

            <TouchableOpacity
              onPress={() => addBetMutation.mutate(newBet)}
              disabled={addBetMutation.isPending}
              style={{
                backgroundColor: "#10B981",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
                opacity: addBetMutation.isPending ? 0.7 : 1,
              }}
            >
              {addBetMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Add Bet
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Bets */}
        <View
          style={{
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 16,
            }}
          >
            Recent Bets
          </Text>

          {isLoading ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator color="#3B82F6" size="large" />
            </View>
          ) : bets.length === 0 ? (
            <View
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 32,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <Calendar color="#6B7280" size={48} />
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "bold",
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                No bets tracked yet
              </Text>
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Start tracking your bets to see performance analytics
              </Text>
            </View>
          ) : (
            bets.map((bet) => (
              <View
                key={bet.id}
                style={{
                  backgroundColor: "#1F2937",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "#374151",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "600",
                        marginBottom: 4,
                      }}
                    >
                      {bet.match_name}
                    </Text>
                    <Text
                      style={{
                        color: "#9CA3AF",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      {bet.league} • {bet.match_date}
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#3B82F6",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {bet.prediction}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor:
                        bet.status === "won"
                          ? "#10B981"
                          : bet.status === "lost"
                            ? "#EF4444"
                            : "#F59E0B",
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
                        textTransform: "uppercase",
                      }}
                    >
                      {bet.status}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "#374151",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: "#9CA3AF",
                        fontSize: 12,
                      }}
                    >
                      Stake: ${bet.bet_amount}
                    </Text>
                  </View>

                  <View>
                    <Text
                      style={{
                        color:
                          bet.actual_payout > bet.bet_amount
                            ? "#10B981"
                            : "#EF4444",
                        fontSize: 14,
                        fontWeight: "bold",
                      }}
                    >
                      {bet.actual_payout > bet.bet_amount ? "+" : ""}$
                      {(bet.actual_payout - bet.bet_amount).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
