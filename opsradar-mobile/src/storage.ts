import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
export const storage = {
  async get(key: string): Promise<string | null> {
    return Platform.OS === "web"
      ? (globalThis.sessionStorage?.getItem(key) ?? null)
      : SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string | null) {
    if (Platform.OS === "web") {
      if (value === null) globalThis.sessionStorage?.removeItem(key);
      else globalThis.sessionStorage?.setItem(key, value);
      return;
    }
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  },
};
