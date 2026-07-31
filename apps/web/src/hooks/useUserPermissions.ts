// @ts-nocheck
import { useQuery } from "@tanstack/react-query";

export default function useUserPermissions() {
  const {
    data: permissions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["userPermissions"],
    queryFn: async () => {
      const response = await fetch("/api/user/permissions");
      if (!response.ok) {
        throw new Error("Failed to fetch user permissions");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  const isAdmin = permissions?.isAdmin || false;
  const isPremium = permissions?.isPremium || false;
  const isSilver = permissions?.isSilver || false;
  const hasFilterAccess = permissions?.hasFilterAccess || false;
  const canAccessAIInsights = permissions?.canAccessAIInsights || false;

  return {
    permissions: permissions || {
      hasAccess: false,
      role: "guest",
      subscription: "none",
      isAdmin: false,
      isPremium: false,
      isSilver: false,
      hasValidSubscription: false,
      hasFilterAccess: false,
      canAccessAIInsights: false,
    },
    loading: isLoading,
    error,
    refetch,
    // Convenience getters
    isAdmin,
    isPremium,
    isSilver,
    hasFilterAccess,
    canAccessAIInsights,
    role: permissions?.role || "guest",
    subscription: permissions?.subscription || "none",

    // Feature access
    canAccessAdvancedFilters:
      permissions?.canAccessAdvancedFilters || hasFilterAccess,
    canAccessAnalytics: permissions?.canAccessAnalytics || hasFilterAccess,
    canAccessPremiumFeatures:
      permissions?.canAccessPremiumFeatures || isAdmin || isPremium || isSilver,
    canAccessAllFeatures: isAdmin,

    // Future-proof: any new feature should check isAdmin first
    hasFeatureAccess: (featureName) => {
      if (isAdmin) return true; // Admin always gets access

      switch (featureName) {
        case "ai-insights":
        case "ai-risk-analyzer":
        case "vip-pick":
          return canAccessAIInsights; // Only Admin & Premium
        case "advanced-filters":
        case "analytics":
          return hasFilterAccess || isSilver || isPremium || isAdmin; // Silver and above
        case "silver":
        case "advanced-data":
          return isSilver || isPremium || isAdmin; // Silver and above
        case "premium-features":
          return isPremium || isSilver || isAdmin; // All paid tiers
        case "performance-tracker": // NEW FEATURE!
          return isAdmin || isPremium; // Admin & Premium only
        default:
          return false;
      }
    },
  };
}
