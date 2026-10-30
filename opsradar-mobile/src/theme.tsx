import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { storage } from "./storage";
export type Appearance = "Light" | "Dark" | "System";
const light = {
  bg: "#F4F2FB",
  end: "#F8ECF2",
  card: "#FFFFFF",
  ink: "#2D2846",
  muted: "#716780",
  line: "#DDD6EA",
  accent: "#6250B8",
  accentText: "#FFFFFF",
  soft: "#E9E3F8",
  critical: "#B52E4A",
  criticalBg: "#FCE9EE",
  major: "#945A13",
  majorBg: "#FFF1DB",
  minor: "#3164A6",
  minorBg: "#EAF1FC",
  trivial: "#4D7660",
  trivialBg: "#E9F4EC",
};
const dark: typeof light = {
  bg: "#191725",
  end: "#2D2033",
  card: "#2A253B",
  ink: "#F2EDF9",
  muted: "#BCB1CE",
  line: "#51465F",
  accent: "#BBAAFF",
  accentText: "#241D39",
  soft: "#3A304E",
  critical: "#FF9CB0",
  criticalBg: "#4A2938",
  major: "#F0C182",
  majorBg: "#443627",
  minor: "#9AC1FF",
  minorBg: "#28374E",
  trivial: "#A3D4B1",
  trivialBg: "#293F36",
};
const ThemeContext = createContext({
  colors: light,
  dark: false,
  appearance: "System" as Appearance,
  setAppearance: (_: Appearance) => {},
});
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [appearance, update] = useState<Appearance>("System");
  useEffect(() => {
    storage
      .get("opsradar.appearance")
      .then((v) => {
        if (v && ["Light", "Dark", "System"].includes(v))
          update(v as Appearance);
      })
      .catch(() => {});
  }, []);
  const isDark =
    appearance === "Dark" || (appearance === "System" && system === "dark");
  const setAppearance = (value: Appearance) => {
    update(value);
    storage.set("opsradar.appearance", value).catch(() => {});
  };
  return (
    <ThemeContext.Provider
      value={{
        colors: isDark ? dark : light,
        dark: isDark,
        appearance,
        setAppearance,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
