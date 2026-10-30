import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from "react-native";
import {
  TriangleAlert,
  HardDrive,
  Info,
  CircleCheck,
  Bell,
  KeyRound,
  SlidersHorizontal,
  Sun,
  Moon,
  Search,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react-native";
import { Severity } from "./api";
import { useTheme } from "./theme";
export const Icons = {
  critical: TriangleAlert,
  major: HardDrive,
  minor: Info,
  trivial: CircleCheck,
  bell: Bell,
  access: KeyRound,
  settings: SlidersHorizontal,
  sun: Sun,
  moon: Moon,
  search: Search,
  back: ChevronLeft,
  next: ChevronRight,
  lock: LockKeyhole,
  logout: LogOut,
  refresh: RefreshCw,
  shield: ShieldCheck,
};
export function Label({
  children,
  size = 14,
  bold = false,
  muted = false,
  color,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  muted?: boolean;
  color?: string;
  style?: any;
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: bold ? "DMSans_700Bold" : "DMSans_400Regular",
          color: color || (muted ? colors.muted : colors.ink),
          fontSize: size,
          lineHeight: size * 1.4,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Card({ children, style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  subtle = false,
  busy = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  subtle?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: subtle ? colors.soft : colors.accent,
          opacity: disabled || busy ? 0.55 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={subtle ? colors.accent : colors.accentText} />
      ) : (
        <Label bold color={subtle ? colors.accent : colors.accentText}>
          {title}
        </Label>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Label size={11} bold muted>
        {label.toUpperCase()}
      </Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        {...props}
        style={[
          styles.field,
          {
            color: colors.ink,
            borderColor: colors.line,
            backgroundColor: colors.card,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 15,
        minHeight: 44,
        justifyContent: "center",
        borderRadius: 24,
        backgroundColor: selected ? colors.accent : colors.card,
      }}
    >
      <Label
        size={12}
        bold={selected}
        color={selected ? colors.accentText : colors.muted}
      >
        {label}
      </Label>
    </Pressable>
  );
}
export function SeverityIcon({ severity }: { severity: Severity }) {
  const { colors } = useTheme();
  const Icon = Icons[severity] || Icons.minor;
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 11,
        backgroundColor: colors[`${severity}Bg`] || colors.soft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon
        size={20}
        color={colors[severity] || colors.accent}
        strokeWidth={1.7}
      />
    </View>
  );
}
export function Empty({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <Label bold size={18}>
        {title}
      </Label>
      <Label muted>{message}</Label>
    </Card>
  );
}
const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 22, borderWidth: 1, gap: 10 },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  field: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    padding: 15,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
  },
});
