import "react-native-reanimated";

import { CHAT_COLORS, CHAT_FONTS } from "@/components/chat/theme";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [CHAT_FONTS.regular]: require("../assets/fonts/Inter-Regular.otf"),
    [CHAT_FONTS.medium]: require("../assets/fonts/Inter-Medium.otf"),
    [CHAT_FONTS.bold]: require("../assets/fonts/Inter-Bold.otf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={CHAT_COLORS.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: CHAT_COLORS.background,
            },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
