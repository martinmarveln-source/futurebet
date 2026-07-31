// @ts-nocheck
import { Tabs } from "expo-router";
import {
  Home,
  BarChart3,
  Ticket,
  Crown,
  Target,
  User,
  DollarSign,
} from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser();
  const insets = useSafeAreaInsets();

  // Check user permissions
  const role = String(user?.user_role ?? user?.role ?? "")
    .trim()
    .toLowerCase();

  const subscriptionStatus = String(user?.subscription_status ?? "")
    .trim()
    .toLowerCase();

  const isAdmin = role === "admin";
  const isPremium = role === "premium" || subscriptionStatus === "premium";

  const hasPerformanceAccess = isAdmin || isPremium;
  const hasPaymentsAccess = isAdmin;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1F2937",
          borderTopWidth: 1,
          borderTopColor: "#374151",
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          height: insets.bottom + 60,
        },
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Home color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="betslip"
        options={{
          title: "BetSlip",
          tabBarIcon: ({ color, size }) => <Ticket color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="vip-pick"
        options={{
          title: "VIP Pick",
          tabBarIcon: ({ color, size }) => <Crown color={color} size={22} />,
        }}
      />

      {hasPerformanceAccess && (
        <Tabs.Screen
          name="performance"
          options={{
            title: "Performance",
            tabBarIcon: ({ color, size }) => <Target color={color} size={22} />,
          }}
        />
      )}
      {hasPaymentsAccess && (
        <Tabs.Screen
          name="payments"
          options={{
            title: "Payments",
            tabBarIcon: ({ color, size }) => (
              <DollarSign color={color} size={22} />
            ),
          }}
        />
      )}

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
