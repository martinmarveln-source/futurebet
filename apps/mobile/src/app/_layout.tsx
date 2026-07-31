// @ts-nocheck
/**
 * RootLayout – Premium App Foundation (Expo)
 * Stable • Intentional • Mobile-first
 */

import { useEffect, useMemo, useState } from "react";
import { View, StatusBar, Platform } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { AppState } from "react-native";

import { useAuth } from "@/utils/auth/useAuth";

// Keep splash visible until app is truly ready
SplashScreen.preventAutoHideAsync();

/* =============================================================================
   React Query – mobile-aware & calm
============================================================================= */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // feels instant
        gcTime: 1000 * 60 * 30, // survives app backgrounding
        retry: 1,
        refetchOnWindowFocus: false, // web-only concept
        refetchOnReconnect: true, // mobile reality
        suspense: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/* =============================================================================
   App State → React Query focus (important on mobile)
============================================================================= */
function onAppStateChange(status: string) {
  focusManager.setFocused(status === "active");
}

export default function RootLayout() {
  const { initiate, isReady } = useAuth();

  const queryClient = useMemo(() => createQueryClient(), []);

  const [appReady, setAppReady] = useState(false);

  /* ---------------------------------------------------------------------------
     Auth bootstrap
  --------------------------------------------------------------------------- */
  useEffect(() => {
    initiate();
  }, [initiate]);

  /* ---------------------------------------------------------------------------
     AppState awareness (pause/resume intelligence)
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  /* ---------------------------------------------------------------------------
     Splash → App handoff (no blank frame)
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (isReady && !appReady) {
      setAppReady(true);
      SplashScreen.hideAsync();
    }
  }, [isReady, appReady]);

  /* ---------------------------------------------------------------------------
     Never render “nothing” – splash stays until ready
  --------------------------------------------------------------------------- */
  if (!appReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0B0B0F" }}>
        <StatusBar
          barStyle={Platform.OS === "ios" ? "light-content" : "light-content"}
          backgroundColor="#0B0B0F"
        />

        <View style={{ flex: 1, backgroundColor: "#0B0B0F" }}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              contentStyle: { backgroundColor: "#0B0B0F" },
            }}
            initialRouteName="index"
          >
            <Stack.Screen name="index" />
          </Stack>
        </View>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}