// @ts-nocheck
import {
  Settings,
  LogOut,
  Moon,
  Sun,
  Brain,
  Zap,
  ExternalLink,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import useUserPermissions from "@/hooks/useUserPermissions";
import { useState } from "react";
import UpgradeButton from "./UpgradeButton";

export default function Header({
  darkMode,
  setDarkMode,
  user,
  signOut,
  onShowSettings,
  userPermissions,
}) {
  const { data: currentUser, refetch: refetchUser } = useUser();
  const { isAdmin, isPremium, canAccessAIInsights } = useUserPermissions();
  const [upgradeStatus, setUpgradeStatus] = useState(null); // For success/error messages

  // Selar payment link
  const PAYMENT_LINK = "https://selar.com/8x155u0715";

  // Handle upgrade button click
  const handleUpgradeClick = () => {
    try {
      // Open payment link in new tab
      window.open(PAYMENT_LINK, "_blank", "noopener,noreferrer");

      // Set a message to inform user
      setUpgradeStatus({
        type: "info",
        message:
          "Payment page opened. Return here after completing payment - your account will upgrade automatically.",
      });

      // Clear the message after 10 seconds
      setTimeout(() => setUpgradeStatus(null), 10000);

      // Optional: Poll for user status update every 30 seconds for 5 minutes after upgrade attempt
      const pollForUpgrade = () => {
        let pollCount = 0;
        const maxPolls = 10; // 5 minutes (30s * 10)

        const interval = setInterval(async () => {
          pollCount++;

          try {
            // Refetch user data to check if upgraded
            await refetchUser();

            // Stop polling after max attempts
            if (pollCount >= maxPolls) {
              clearInterval(interval);
            }
          } catch (error) {
            console.error("Error polling user status:", error);
          }
        }, 30000); // Poll every 30 seconds

        return interval;
      };

      // Start polling
      pollForUpgrade();
    } catch (error) {
      console.error("Error opening payment link:", error);
      setUpgradeStatus({
        type: "error",
        message: "Unable to open payment page. Please try again.",
      });
      setTimeout(() => setUpgradeStatus(null), 5000);
    }
  };

  // Fetch AI usage stats for logged-in premium users
  const { data: usageStats } = useQuery({
    queryKey: ["aiUsage"],
    queryFn: async () => {
      const response = await fetch("/api/ai-usage");
      if (!response.ok) throw new Error("Failed to fetch usage");
      return response.json();
    },
    enabled: !!currentUser && (isPremium || isAdmin),
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <header
      className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b px-4 py-3`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-blue-600">FutureBet</h1>
          <span
            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Football Prediction Analytics
          </span>
        </div>

        {/* Upgrade Status Message */}
        {upgradeStatus && (
          <div
            className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg max-w-sm ${
              upgradeStatus.type === "error"
                ? "bg-red-100 text-red-800 border border-red-200"
                : upgradeStatus.type === "success"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            <div className="flex items-start space-x-2">
              <div className="flex-1 text-sm">{upgradeStatus.message}</div>
              <button
                onClick={() => setUpgradeStatus(null)}
                className="flex-shrink-0 text-current opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4">
          {/* AI Usage Stats for Premium Users */}
          {currentUser && (isPremium || isAdmin) && usageStats && (
            <div
              className={`flex items-center space-x-4 px-3 py-2 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}
            >
              <div className="flex items-center space-x-1">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">
                  {isAdmin
                    ? "∞ AI Insights"
                    : `${usageStats.todayInsights || 0}/20`}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">
                  {usageStats.totalCredits || 0}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {user ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium">
                    {user.first_name
                      ? `${user.first_name} ${user.last_name || ""}`.trim()
                      : user.email}
                  </div>
                  {userPermissions && (
                    <div className="text-xs text-gray-500">
                      {userPermissions.isAdmin ? (
                        <span className="text-purple-600 font-semibold">
                          Admin
                        </span>
                      ) : userPermissions.isPremium ? (
                        <span className="text-yellow-600 font-semibold">
                          Premium
                        </span>
                      ) : userPermissions.isSilver ? (
                        <span className="text-gray-600 font-semibold">
                          Silver
                        </span>
                      ) : (
                        <span className="text-gray-600">Free</span>
                      )}
                      {/* Show today's usage under subscription status */}
                      {(userPermissions.isPremium || userPermissions.isAdmin) &&
                        usageStats && (
                          <div className="text-xs mt-1">
                            {userPermissions.isAdmin ? (
                              <span className="text-purple-500">
                                Unlimited AI
                              </span>
                            ) : (
                              <span
                                className={
                                  usageStats.todayInsights >= 15
                                    ? "text-red-500"
                                    : "text-green-500"
                                }
                              >
                                {usageStats.todayInsights || 0}/20 today
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>
                {!userPermissions?.isPremium &&
                  !userPermissions?.isAdmin &&
                  !userPermissions?.isSilver && (
                    <UpgradeButton
                      className="flex items-center space-x-1 px-3 py-1 text-xs font-medium bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                    >
                      <span>Upgrade</span>
                    </UpgradeButton>
                  )}
              </div>
              <a
                href="/account/profile"
                className={`p-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"}`}
                title="Profile Settings"
              >
                <User className="h-5 w-5" />
              </a>
              <button
                onClick={onShowSettings}
                className={`p-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/", redirect: true })}
                className={`p-2 rounded-lg text-red-600 ${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <a
                href="/account/signin"
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Sign In
              </a>
              <a
                href="/account/signup"
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign Up
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
