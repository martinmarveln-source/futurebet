// @ts-nocheck
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Trash2,
  Plus,
  Calculator,
  TrendingUp,
  Eye,
  Brain,
} from "lucide-react-native";

export default function BetSlip() {
  const insets = useSafeAreaInsets();

  // Mock betslip data - in a real app this would come from a store
  const betslipMatches = [
    {
      id: 1,
      match_name: "Liverpool vs Manchester City",
      league: "Premier League",
      prediction: "Liverpool Win",
      odds: 2.5,
      our_rating: 82,
    },
    {
      id: 2,
      match_name: "Barcelona vs Real Madrid",
      league: "La Liga",
      prediction: "Over 2.5 Goals",
      odds: 1.8,
      our_rating: 75,
    },
  ];

  const totalOdds = betslipMatches.reduce((acc, match) => acc * match.odds, 1);
  const stakeAmount = 10; // Default stake
  const potentialWin = totalOdds * stakeAmount;

  const removeFromBetslip = (id) => {
    Alert.alert(
      "Remove Match",
      "Are you sure you want to remove this match from your betslip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            // Handle removal logic here
            console.log("Remove match:", id);
          },
        },
      ],
    );
  };

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
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "white",
          }}
        >
          BetSlip
        </Text>

        <View
          style={{
            backgroundColor: "#10B981",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 12,
              fontWeight: "bold",
            }}
          >
            {betslipMatches.length} picks
          </Text>
        </View>
      </View>

      {betslipMatches.length === 0 ? (
        // Empty state
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <Calculator color="#6B7280" size={64} />
          <Text
            style={{
              color: "white",
              fontSize: 20,
              fontWeight: "bold",
              textAlign: "center",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Your BetSlip is Empty
          </Text>
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 16,
              textAlign: "center",
              lineHeight: 24,
            }}
          >
            Add matches from the dashboard to build your betting combinations
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Matches List */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              Selected Matches
            </Text>

            {betslipMatches.map((match) => (
              <View
                key={match.id}
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
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "600",
                        marginBottom: 4,
                      }}
                    >
                      {match.match_name}
                    </Text>
                    <Text
                      style={{
                        color: "#9CA3AF",
                        fontSize: 12,
                        marginBottom: 8,
                      }}
                    >
                      {match.league}
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
                        {match.prediction}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => removeFromBetslip(match.id)}
                    style={{
                      backgroundColor: "#DC2626",
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Trash2 color="white" size={18} />
                  </TouchableOpacity>
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
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        backgroundColor:
                          match.our_rating >= 75 ? "#10B981" : "#F59E0B",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      >
                        {match.our_rating}%
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: "#9CA3AF",
                        fontSize: 12,
                      }}
                    >
                      Rating
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    {match.odds.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Betslip Summary */}
          <View
            style={{
              marginHorizontal: 20,
              backgroundColor: "#1F2937",
              borderRadius: 16,
              padding: 20,
              borderWidth: 2,
              borderColor: "#10B981",
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
              Betslip Summary
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                Number of Selections:
              </Text>
              <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                {betslipMatches.length}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                Total Odds:
              </Text>
              <Text
                style={{ color: "#10B981", fontSize: 14, fontWeight: "bold" }}
              >
                {totalOdds.toFixed(2)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                Stake Amount:
              </Text>
              <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                ${stakeAmount.toFixed(2)}
              </Text>
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#374151",
                paddingTop: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "white", fontSize: 16, fontWeight: "bold" }}
              >
                Potential Win:
              </Text>
              <Text
                style={{
                  color: "#10B981",
                  fontSize: 20,
                  fontWeight: "bold",
                }}
              >
                ${potentialWin.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 20,
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#3B82F6",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 12,
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <Brain color="white" size={20} />
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                Get AI Insights
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#10B981",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <TrendingUp color="white" size={20} />
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                Place Bet
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
