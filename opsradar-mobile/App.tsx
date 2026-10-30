import React from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { ThemeProvider } from "./src/theme";
import { SessionProvider } from "./src/context";
import Workspace from "./src/Workspace";
export default function App() {
  const [loaded, error] = useFonts({ DMSans_400Regular, DMSans_700Bold });
  if (!loaded && !error)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#6250B8" />
      </View>
    );
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <Workspace />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
