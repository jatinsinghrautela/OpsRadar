import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { ApiClient, Session } from "./api";
import { storage } from "./storage";
const defaultUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:5000"
    : "http://localhost:5000");
type SessionContextValue = {
  api: ApiClient;
  session: Session | null;
  ready: boolean;
  enrollment: boolean;
  setEnrollment: (v: boolean) => void;
  changeServer: (url: string) => Promise<void>;
};
const Context = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [enrollment, setEnrollment] = useState(false);
  const api = useMemo(
    () =>
      new ApiClient(defaultUrl, async (value) => {
        await storage.set(
          "opsradar.session",
          value ? JSON.stringify(value) : null,
        );
        setSession(value);
      }),
    [],
  );
  useEffect(() => {
    Promise.all([
      storage.get("opsradar.server"),
      storage.get("opsradar.session"),
    ])
      .then(([url, saved]) => {
        if (url) api.base = url;
        if (saved) {
          try {
            const value = JSON.parse(saved);
            if (value.token && value.refresh_token && value.user) {
              api.session = value;
              setSession(value);
            }
          } catch {
            /* Ignore corrupt local state. */
          }
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [api]);
  async function changeServer(value: string) {
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      throw new Error("Enter a valid API URL including https://.");
    }
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["https:", "http:"].includes(url.protocol)
    )
      throw new Error("Use a plain API URL without credentials.");
    if (
      url.protocol !== "https:" &&
      !__DEV__ &&
      !Constants.expoConfig?.extra?.allowHttp
    )
      throw new Error(
        "This release requires HTTPS. See the personal LAN build guide.",
      );
    const base = url.toString().replace(/\/$/, "");
    await new ApiClient(base, async () => {}).request("/health");
    await api.clear();
    await storage.set("opsradar.server", base);
    api.base = base;
  }
  return (
    <Context.Provider
      value={{ api, session, ready, enrollment, setEnrollment, changeServer }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider missing");
  return value;
}
