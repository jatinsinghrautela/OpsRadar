import { ConfigContext, ExpoConfig } from "expo/config";
const allowHttp = process.env.OPSRADAR_ALLOW_HTTP === "true";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "OpsRadar",
  slug: "opsradar-mobile",
  version: "1.0.0",
  scheme: "opsradar",
  icon: "./assets/opsradar-icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    ...config.ios,
    bundleIdentifier:
      process.env.OPSRADAR_IOS_BUNDLE_ID || "com.jatinsinghrautela.opsradar",
    supportsTablet: true,
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: "./assets/opsradar-icon.png",
      backgroundColor: "#6250B8",
    },
    package:
      process.env.OPSRADAR_ANDROID_PACKAGE || "com.jatinsinghrautela.opsradar",
  },
  web: { ...config.web, favicon: "./assets/opsradar-icon.png" },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    allowHttp,
    ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
      : {}),
  },
  plugins: [
    "expo-secure-store",
    "expo-font",
    "expo-system-ui",
    "expo-notifications",
    "./plugins/with-release-signing",
    "./plugins/with-short-cmake-paths",
    ["./plugins/with-network-policy", { allowHttp }],
  ],
});
