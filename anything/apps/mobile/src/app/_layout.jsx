/**
 * UPGRADED: Top 1% Enterprise Mobile Layout
 * Replaces the auto-generated Anything.com Expo setup.
 */

import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import {
  ThemeProvider,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";

// Keep the splash screen visible while we fetch auth state and assets
SplashScreen.preventAutoHideAsync();

// TOP 1% UPGRADE: Optimized Query Client for Mobile Environments
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (Note: use 'cacheTime' if on TanStack v4)
      retry: 2, // Mobile networks drop often, retry twice before failing
      refetchOnWindowFocus: true, // Crucial for mobile: refetch when switching back from another app
    },
  },
});

// Custom Theme to match your web app's brand colors
const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#4f46e5", // Indigo-600
    background: "#f9fafb", // Gray-50
    card: "#ffffff",
    text: "#111827",
  },
};

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const colorScheme = useColorScheme(); // Detects if user's phone is in Dark/Light mode

  // 1. Kick off the authentication check
  useEffect(() => {
    initiate();
  }, [initiate]);

  // 2. Smooth Splash Screen Dismissal
  useEffect(() => {
    if (isReady) {
      // Small timeout ensures the UI thread has painted the first frame
      // before ripping away the splash screen, preventing visual stutters.
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 100);
    }
  }, [isReady]);

  // Prevent rendering the navigation stack until auth is completely resolved
  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : LightTheme}>
        {/* TOP 1% UPGRADE: Explicit Status Bar Management */}
        {/* 'auto' changes the battery/time icons to dark or light depending on the theme */}
        <StatusBar style="auto" />

        {/* GestureHandler at the absolute root prevents touch bugs in bottom sheets/swipes */}
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              // Adds a premium native iOS swipe-back shadow effect
              animation: "slide_from_right",
            }}
            initialRouteName="index"
          >
            {/* Your routes will go here. 
              Example: <Stack.Screen name="(auth)" options={{ animation: 'fade' }} /> 
            */}
            <Stack.Screen name="index" />
          </Stack>
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}