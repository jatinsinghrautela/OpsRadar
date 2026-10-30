import { Platform } from "react-native";
import Constants from "expo-constants";
import { ApiClient } from "./api";
export async function registerPush(api: ApiClient): Promise<string> {
  const status = await api.request<{ enabled: boolean; ios_enabled: boolean }>(
    "/mobile/push-status",
  );
  if (!status.enabled || (Platform.OS === "ios" && !status.ios_enabled))
    return "Push is disabled on this server. Your inbox still works.";
  if (Platform.OS === "web")
    return "Use the installed Android/iOS app for native push notifications.";
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId)
    return "An Expo project ID and FCM/APNs credentials are required. See the mobile setup guide.";
  // Import only when explicitly enabling push; no native token requests happen by default.
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("opsradar-alerts", {
      name: "OpsRadar alerts",
      importance: Notifications.AndroidImportance.HIGH,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    return "Notification permission was not granted. You can still browse alerts.";
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.request("/mobile/devices", "POST", {
    token: token.data,
    platform: Platform.OS,
  });
  return "This device is registered for alert notifications.";
}
export async function listenForPush(
  onOpen: (data: Record<string, unknown>) => void,
) {
  if (Platform.OS === "web") return () => {};
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (r) => onOpen(r.notification.request.content.data || {}),
  );
  const last = await Notifications.getLastNotificationResponseAsync();
  if (last) {
    onOpen(last.notification.request.content.data || {});
    await Notifications.clearLastNotificationResponseAsync();
  }
  return () => subscription.remove();
}
