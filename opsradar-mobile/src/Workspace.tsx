import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  Activity,
  AccessRequest,
  AlertItem,
  Page,
  Preferences,
  Resource,
  Severity,
} from "./api";
import {
  Button,
  Card,
  Chip,
  Empty,
  Field,
  Icons,
  Label,
  SeverityIcon,
} from "./components";
import { useSession } from "./context";
import { Appearance, useTheme } from "./theme";
import { AuthScreen, EnrollmentScreen } from "./AuthScreen";
import { listenForPush, registerPush } from "./notifications";
type Route = {
  name:
    | "inbox"
    | "detail"
    | "activity"
    | "access"
    | "catalogue"
    | "request"
    | "pending"
    | "settings"
    | "enroll";
  id?: number;
  resource?: Resource;
};
type Access = {
  is_admin: boolean;
  groups: { id: number; name: string }[];
  servers: { id: number; name: string }[];
  scoped_permission_count: number;
};
const severities: Severity[] = ["critical", "major", "minor", "trivial"];
const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleString() : "Not available";
export default function Workspace() {
  const { api, session, ready, enrollment, setEnrollment } = useSession();
  const { colors, dark, appearance, setAppearance } = useTheme();
  const [stack, setStack] = useState<Route[]>([{ name: "inbox" }]);
  const route = stack[stack.length - 1];
  const [tick, setTick] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [severity, setSeverity] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [serverFilter, setServerFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [resourceFilters, setResourceFilters] = useState({
    server: "",
    group: "",
  });
  const [type, setType] = useState<"group" | "server">("group");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [detail, setDetail] = useState<AlertItem | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [access, setAccess] = useState<Access | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({
    critical: true,
    major: true,
    minor: false,
    trivial: false,
  });
  const [total, setTotal] = useState(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const go = useCallback((next: Route, root = false) => {
    setError("");
    setNotice("");
    setPage(1);
    setSearch("");
    setQuery("");
    setStack((old) => (root ? [next] : [...old, next]));
  }, []);
  const back = useCallback(() => {
    setError("");
    setPage(1);
    setStack((old) => (old.length > 1 ? old.slice(0, -1) : old));
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setResourceFilters({
        server: serverFilter.trim(),
        group: groupFilter.trim(),
      });
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, serverFilter, groupFilter]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, back]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setTick((n) => n + 1);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (
      !session ||
      enrollment ||
      !["inbox", "detail", "activity", "access"].includes(route.name)
    )
      return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") setTick((n) => n + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, [Boolean(session), enrollment, route.name]);
  useEffect(() => {
    if (!session) {
      setAlerts([]);
      setActivity([]);
      setRequests([]);
      setAccess(null);
      setDetail(null);
      go({ name: "inbox" }, true);
    }
  }, [Boolean(session), go]);
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    listenForPush((data) => {
      if (cancelled) return;
      if (typeof data.alert_id === "number")
        go({ name: "detail", id: data.alert_id });
      else if (data.kind === "access") go({ name: "access" });
    })
      .then((fn) => {
        if (cancelled) fn();
        else dispose = fn;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [Boolean(session), go]);
  useEffect(() => {
    if (!session || enrollment) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    async function load() {
      if (route.name === "inbox") {
        const v = await api.request<Page<AlertItem>>(
          `/alerts?page=${page}&pageSize=20&status=${status}&q=${encodeURIComponent(query)}${severity === "all" ? "" : "&severity=" + severity}&server=${encodeURIComponent(resourceFilters.server)}&group=${encodeURIComponent(resourceFilters.group)}`,
        );
        if (!cancelled) {
          setAlerts(v.items);
          setTotal(v.total);
        }
      }
      if (route.name === "detail") {
        setDetail(null);
        const v = await api.request<AlertItem>(`/mobile/alerts/${route.id}`);
        if (!cancelled) setDetail(v);
      }
      if (route.name === "activity") {
        const v = await api.request<Page<Activity>>(
          `/mobile/activity?page=${page}`,
        );
        if (!cancelled) {
          setActivity(v.items);
          setTotal(v.total);
        }
      }
      if (route.name === "access") {
        const [a, r] = await Promise.all([
          api.request<Access>("/mobile/access"),
          api.request<(AccessRequest & { user_id: number })[]>(
            "/access-requests",
          ),
        ]);
        if (!cancelled) {
          setAccess(a);
          setRequests(r.filter((v) => v.user_id === session!.user.user_id));
        }
      }
      if (route.name === "catalogue") {
        const v = await api.request<Page<Resource>>(
          `/mobile/resources?type=${type}&page=${page}&q=${encodeURIComponent(query)}`,
        );
        if (!cancelled) {
          setResources(v.items);
          setTotal(v.total);
        }
      }
      if (route.name === "settings") {
        const v = await api.request<Preferences>("/notification-prefs");
        if (!cancelled) setPrefs(v);
      }
    }
    load()
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    Boolean(session),
    enrollment,
    api,
    route.name,
    route.id,
    tick,
    page,
    status,
    severity,
    resourceFilters,
    query,
    type,
  ]);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const pages = (size: number) => (
    <View style={styles.row}>
      <Chip
        label="Previous"
        onPress={() => setPage((n) => Math.max(1, n - 1))}
      />
      <Label muted size={12}>
        Page {page}
      </Label>
      <Chip
        label="Next"
        onPress={() => {
          if (page * size < total) setPage((n) => n + 1);
        }}
      />
    </View>
  );
  const titles = {
    inbox: "Your workspace.",
    detail: "Alert details",
    activity: "Activity",
    access: "Your access.",
    catalogue: "Find your signals.",
    request: "Request access",
    pending: "Request sent.",
    settings: "Make it yours.",
    enroll: "Protect your account.",
  };
  if (!ready)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  return (
    <LinearGradient colors={[colors.bg, colors.end]} style={styles.fill}>
      <StatusBar style={dark ? "light" : "dark"} />
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <View style={styles.row}>
              <Label muted size={12}>
                OpsRadar / {session?.user.username || "Personal"}
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${dark ? "light" : "dark"} appearance`}
                onPress={() => setAppearance(dark ? "Light" : "Dark")}
                style={[styles.themeButton, { backgroundColor: colors.card }]}
              >
                {dark ? (
                  <Icons.sun color={colors.accent} size={20} />
                ) : (
                  <Icons.moon color={colors.accent} size={20} />
                )}
              </Pressable>
            </View>
            {session && !enrollment && (
              <>
                <Label size={29} bold>
                  {titles[route.name]}
                </Label>
                <Label size={12} muted>
                  Stay close to what matters.
                </Label>
              </>
            )}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            refreshControl={
              session ? (
                <RefreshControl
                  refreshing={loading}
                  onRefresh={() => setTick((n) => n + 1)}
                  tintColor={colors.accent}
                />
              ) : undefined
            }
          >
            {!session ? (
              <AuthScreen />
            ) : enrollment || route.name === "enroll" ? (
              <EnrollmentScreen
                onDone={() => {
                  setEnrollment(false);
                  go({ name: "inbox" }, true);
                }}
              />
            ) : (
              <>
                {stack.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={back}
                    style={styles.inline}
                  >
                    <Icons.back size={18} color={colors.accent} />
                    <Label color={colors.accent}>Back</Label>
                  </Pressable>
                )}
                {!!error && (
                  <Card accessibilityRole="alert">
                    <Label color={colors.critical}>{error}</Label>
                    <Button
                      title="Try again"
                      subtle
                      onPress={() => setTick((n) => n + 1)}
                    />
                  </Card>
                )}
                {!!notice && (
                  <Card>
                    <Label>{notice}</Label>
                  </Card>
                )}
                {route.name === "inbox" && (
                  <>
                    <Card>
                      <View style={styles.row}>
                        <Label size={10} muted bold>
                          MATCHING ALERTS
                        </Label>
                        <Icons.bell size={20} color={colors.accent} />
                      </View>
                      <Label size={46} bold>
                        {total}
                      </Label>
                      <Label muted size={11}>
                        Only alerts you are authorized to view
                      </Label>
                    </Card>
                    <View style={styles.wrap}>
                      <Chip
                        label="For you"
                        selected={status === "active"}
                        onPress={() => {
                          setStatus("active");
                          setPage(1);
                        }}
                      />
                      <Chip
                        label="Activity"
                        onPress={() => go({ name: "activity" })}
                      />
                      <Chip
                        label="Filters"
                        selected={showFilters}
                        onPress={() => setShowFilters((v) => !v)}
                      />
                    </View>
                    {showFilters && (
                      <>
                        <View style={styles.wrap}>
                          {["active", "resolved", "all"].map((value) => (
                            <Chip
                              key={value}
                              label={value[0].toUpperCase() + value.slice(1)}
                              selected={status === value}
                              onPress={() => {
                                setStatus(value);
                                setPage(1);
                              }}
                            />
                          ))}
                        </View>
                        <Field
                          label="Search alerts"
                          value={search}
                          onChangeText={setSearch}
                          placeholder="Message contains…"
                        />
                        <View style={styles.wrap}>
                          {["all", ...severities].map((v) => (
                            <Chip
                              key={v}
                              label={
                                v === "all"
                                  ? "All severities"
                                  : v[0].toUpperCase() + v.slice(1)
                              }
                              selected={severity === v}
                              onPress={() => {
                                setSeverity(v);
                                setPage(1);
                              }}
                            />
                          ))}
                        </View>
                        <Field
                          label="Server filter (exact name)"
                          value={serverFilter}
                          onChangeText={setServerFilter}
                          placeholder="Any server"
                        />
                        <Field
                          label="Group filter (exact name)"
                          value={groupFilter}
                          onChangeText={setGroupFilter}
                          placeholder="Any group"
                        />
                        <Button
                          title="Clear filters"
                          subtle
                          onPress={() => {
                            setSearch("");
                            setSeverity("all");
                            setServerFilter("");
                            setGroupFilter("");
                            setStatus("active");
                            setPage(1);
                          }}
                        />
                      </>
                    )}
                    {alerts.map((a) => (
                      <Pressable
                        key={a.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${a.severity} alert: ${a.message}`}
                        onPress={() => go({ name: "detail", id: a.id })}
                      >
                        <Card>
                          <View style={styles.alertRow}>
                            <SeverityIcon severity={a.severity} />
                            <View style={styles.copy}>
                              <Label size={10} bold color={colors[a.severity]}>
                                {a.severity.toUpperCase()} ·{" "}
                                {a.status.toUpperCase()}
                              </Label>
                              <Label bold>{a.message}</Label>
                              <Label muted size={11}>
                                {a.server} · {formatTime(a.timestamp)}
                              </Label>
                            </View>
                          </View>
                        </Card>
                      </Pressable>
                    ))}
                    {!loading && !alerts.length && !error && (
                      <Empty
                        title="All quiet here."
                        message="No matching alerts. Request access if you have no approved resources."
                      />
                    )}
                    {pages(20)}
                  </>
                )}
                {route.name === "detail" && detail && (
                  <>
                    <Card>
                      <View style={styles.inline}>
                        <SeverityIcon severity={detail.severity} />
                        <Label color={colors[detail.severity]} bold size={11}>
                          {detail.severity.toUpperCase()} ·{" "}
                          {detail.status.toUpperCase()}
                        </Label>
                      </View>
                      <Label size={24} bold>
                        {detail.message}
                      </Label>
                      <Label muted size={12}>
                        Last seen {formatTime(detail.timestamp)}
                      </Label>
                    </Card>
                    <Card>
                      <Label bold size={18}>
                        {detail.server}
                      </Label>
                      <Label muted>Application: {detail.app}</Label>
                      <Label muted>Group: {detail.group}</Label>
                      <Label muted>Country: {detail.country}</Label>
                    </Card>
                    <Card>
                      <Label bold>Timeline</Label>
                      <Label muted>
                        First detected: {formatTime(detail.created_at)}
                      </Label>
                      {detail.resolved_at && (
                        <Label muted>
                          Resolved: {formatTime(detail.resolved_at)}
                        </Label>
                      )}
                    </Card>
                    <Label muted size={12}>
                      Read-only detail. Reading this alert does not resolve it.
                    </Label>
                  </>
                )}
                {route.name === "activity" && (
                  <>
                    {activity.map((n) => (
                      <Pressable
                        key={n.id}
                        accessibilityRole="button"
                        onPress={() =>
                          run(async () => {
                            await api.request(
                              `/notifications/${n.id}/read`,
                              "POST",
                            );
                            go(
                              n.alert_id
                                ? { name: "detail", id: n.alert_id }
                                : { name: "access" },
                            );
                          })
                        }
                      >
                        <Card>
                          <View style={styles.alertRow}>
                            <SeverityIcon severity={n.severity} />
                            <View style={styles.copy}>
                              <Label bold={!n.is_read}>{n.message}</Label>
                              <Label muted size={11}>
                                {n.is_read ? "Read" : "Unread"} ·{" "}
                                {formatTime(n.created_at)}
                              </Label>
                            </View>
                          </View>
                        </Card>
                      </Pressable>
                    ))}
                    {!loading && !activity.length && !error && (
                      <Empty
                        title="No updates yet."
                        message="Alert and access-request updates appear here."
                      />
                    )}
                    {pages(30)}
                  </>
                )}
                {route.name === "access" && (
                  <>
                    <Button
                      title="＋ Request access"
                      onPress={() => go({ name: "catalogue" })}
                    />
                    {access?.is_admin && (
                      <Label muted>
                        You are an administrator and can view all resources.
                      </Label>
                    )}
                    {access?.groups.map((g) => (
                      <Card key={`g${g.id}`}>
                        <Label bold size={19}>
                          {g.name}
                        </Label>
                        <Label muted>Group · Granted</Label>
                      </Card>
                    ))}
                    {access?.servers.map((s) => (
                      <Card key={`s${s.id}`}>
                        <Label bold size={19}>
                          {s.name}
                        </Label>
                        <Label muted>Server · Granted</Label>
                      </Card>
                    ))}
                    {!!access?.scoped_permission_count && (
                      <Label muted>
                        {access.scoped_permission_count} additional scoped
                        permission(s) apply to your alerts.
                      </Label>
                    )}
                    {!loading &&
                      access &&
                      !access.groups.length &&
                      !access.servers.length &&
                      !access.scoped_permission_count && (
                        <Empty
                          title="Choose your signals."
                          message="Request a group or server to see its alerts after approval."
                        />
                      )}
                    <Label bold size={18}>
                      Your requests
                    </Label>
                    {requests.map((r) => (
                      <Card key={r.request_id}>
                        <Label bold>{r.resource_name}</Label>
                        <Label
                          color={
                            r.status === "approved"
                              ? colors.trivial
                              : colors.muted
                          }
                        >
                          {r.resource_type} · {r.status}
                        </Label>
                        {r.notes && (
                          <Label muted size={12}>
                            {r.notes}
                          </Label>
                        )}
                      </Card>
                    ))}
                  </>
                )}
                {route.name === "catalogue" && (
                  <>
                    <Field
                      label="Find resources"
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search by name"
                    />
                    <View style={styles.wrap}>
                      {(["group", "server"] as const).map((v) => (
                        <Chip
                          key={v}
                          label={v === "group" ? "Groups" : "Servers"}
                          selected={type === v}
                          onPress={() => {
                            setType(v);
                            setPage(1);
                          }}
                        />
                      ))}
                    </View>
                    {resources.map((r) => (
                      <Pressable
                        key={`${r.type}${r.id}`}
                        accessibilityRole="button"
                        onPress={() => {
                          setReason("");
                          go({ name: "request", resource: r });
                        }}
                      >
                        <Card>
                          <View style={styles.row}>
                            <View style={styles.copy}>
                              <Label bold size={18}>
                                {r.name}
                              </Label>
                              <Label muted size={12}>
                                {r.type} · Request access
                              </Label>
                            </View>
                            <Icons.next size={20} color={colors.accent} />
                          </View>
                        </Card>
                      </Pressable>
                    ))}
                    {!loading && !resources.length && !error && (
                      <Empty
                        title="No matching resources."
                        message="Try another name or ask your administrator to create the resource."
                      />
                    )}
                    {pages(30)}
                  </>
                )}
                {route.name === "request" && (
                  <>
                    <Card>
                      <Label bold size={22}>
                        {route.resource?.name}
                      </Label>
                      <Label muted>
                        {route.resource?.type} · Requested view access
                      </Label>
                    </Card>
                    <Field
                      label="Reason (optional)"
                      value={reason}
                      onChangeText={setReason}
                      multiline
                      maxLength={1000}
                      style={{ minHeight: 100, textAlignVertical: "top" }}
                    />
                    <Label muted>
                      Access begins only after your administrator approves the
                      request in the web portal.
                    </Label>
                    <Button
                      title="Send access request"
                      busy={busy}
                      onPress={() =>
                        run(async () => {
                          await api.request("/access-requests", "POST", {
                            resource_type: route.resource?.type,
                            resource_id: route.resource?.id,
                            notes: reason,
                          });
                          go({ name: "pending", resource: route.resource });
                        })
                      }
                    />
                  </>
                )}
                {route.name === "pending" && (
                  <>
                    <Card>
                      <Icons.shield size={36} color={colors.accent} />
                      <Label bold size={25}>
                        You are on the list.
                      </Label>
                      <Label>{route.resource?.name}</Label>
                      <Label bold color={colors.accent}>
                        Pending approval
                      </Label>
                      <Label muted>
                        Your administrator reviews this in the web portal. A
                        request alone does not grant access.
                      </Label>
                    </Card>
                    <Button
                      title="View my access"
                      onPress={() => go({ name: "access" }, true)}
                    />
                    <Button
                      title="Back to alerts"
                      subtle
                      onPress={() => go({ name: "inbox" }, true)}
                    />
                  </>
                )}
                {route.name === "settings" && (
                  <>
                    <Card>
                      <Label bold size={19}>
                        {session.user.username}
                      </Label>
                      <Label muted size={12}>
                        {session.user.email}
                      </Label>
                    </Card>
                    <Card>
                      <Label bold>Appearance</Label>
                      <View style={styles.wrap}>
                        {(["Light", "Dark", "System"] as Appearance[]).map(
                          (v) => (
                            <Chip
                              key={v}
                              label={v}
                              selected={appearance === v}
                              onPress={() => setAppearance(v)}
                            />
                          ),
                        )}
                      </View>
                      <Label muted size={11}>
                        {appearance === "System"
                          ? "Following your device appearance."
                          : "Choose a look that works for you."}
                      </Label>
                    </Card>
                    <Card>
                      <Label size={11} muted bold>
                        NOTIFICATION SEVERITIES
                      </Label>
                      {severities.map((v) => (
                        <View key={v} style={styles.row}>
                          <View style={styles.inline}>
                            <SeverityIcon severity={v} />
                            <Label>{v[0].toUpperCase() + v.slice(1)}</Label>
                          </View>
                          <Switch
                            accessibilityLabel={`${v} notifications`}
                            value={Boolean(prefs[v])}
                            disabled={busy}
                            trackColor={{
                              false: colors.soft,
                              true: colors.accent,
                            }}
                            thumbColor={
                              prefs[v] ? colors.accentText : colors.muted
                            }
                            onValueChange={(value) =>
                              run(async () => {
                                setPrefs(
                                  await api.request<Preferences>(
                                    "/notification-prefs",
                                    "PUT",
                                    { ...prefs, [v]: value },
                                  ),
                                );
                              })
                            }
                          />
                        </View>
                      ))}
                    </Card>
                    <Label muted size={12}>
                      Preferences affect notifications, not alert visibility.
                    </Label>
                    <Button
                      title="Enable notifications on this device"
                      subtle
                      busy={busy}
                      onPress={() =>
                        run(async () => setNotice(await registerPush(api)))
                      }
                    />
                    <Button
                      title="Set up authenticator"
                      subtle
                      onPress={() => go({ name: "enroll" })}
                    />
                    <Button
                      title="Sign out"
                      subtle
                      busy={busy}
                      onPress={() =>
                        run(async () => {
                          await api.logout();
                          setEnrollment(false);
                        })
                      }
                    />
                  </>
                )}
                {loading && (
                  <ActivityIndicator
                    color={colors.accent}
                    style={{ marginVertical: 10 }}
                  />
                )}
              </>
            )}
          </ScrollView>
          {session && !enrollment && (
            <View style={styles.navShell}>
              <View
                style={[
                  styles.nav,
                  { backgroundColor: colors.card, borderColor: colors.line },
                ]}
              >
                {(
                  [
                    { name: "inbox", label: "Alerts", icon: Icons.bell },
                    { name: "access", label: "Access", icon: Icons.access },
                    {
                      name: "settings",
                      label: "Settings",
                      icon: Icons.settings,
                    },
                  ] as const
                ).map((tab) => {
                  const selected =
                    tab.name === route.name ||
                    (tab.name === "inbox" &&
                      ["detail", "activity"].includes(route.name)) ||
                    (tab.name === "access" &&
                      ["catalogue", "request", "pending"].includes(route.name));
                  return (
                    <Pressable
                      key={tab.name}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => go({ name: tab.name }, true)}
                      style={[
                        styles.navTab,
                        {
                          backgroundColor: selected
                            ? colors.soft
                            : "transparent",
                        },
                      ]}
                    >
                      <tab.icon
                        size={18}
                        color={selected ? colors.accent : colors.muted}
                      />
                      <Label
                        size={11}
                        color={selected ? colors.accent : colors.muted}
                      >
                        {tab.label}
                      </Label>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 22, gap: 8 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 13,
    flexGrow: 1,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1, gap: 4 },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  navShell: { paddingHorizontal: 16, paddingBottom: 10 },
  nav: {
    flexDirection: "row",
    borderWidth: 1,
    padding: 7,
    borderRadius: 30,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  navTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 23,
    minHeight: 48,
  },
});
