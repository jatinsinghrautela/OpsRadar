import React, { useState } from "react";
import { Pressable } from "react-native";
import { Button, Card, Field, Icons, Label } from "./components";
import { useSession } from "./context";
import { useTheme } from "./theme";
export function AuthScreen() {
  const { api, changeServer, setEnrollment } = useSession();
  const { colors } = useTheme();
  const [stage, setStage] = useState<"login" | "change" | "totp" | "reset">(
    "login",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editServer, setEditServer] = useState(false);
  const [url, setUrl] = useState(api.base);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function finish(data: any) {
    if (data.requires_password_change) {
      setToken(data.change_token);
      setPassword("");
      setStage("change");
      return;
    }
    if (data.requires_totp) {
      setToken(data.pre_auth_token);
      setCode("");
      setStage("totp");
      return;
    }
    if (!data.token) throw new Error("Sign in did not return a session.");
    await api.accept(data.token);
    setPassword("");
    setEnrollment(Boolean(data.must_enroll_totp));
  }
  async function submit() {
    if (stage === "reset") {
      await api.publicRequest("/password-reset-requests", { username });
      setStage("login");
      setNotice(
        "Reset requested. Contact your administrator for the temporary password.",
      );
      return;
    }
    if (stage === "change") {
      if (password.length < 8 || password !== confirm)
        throw new Error("Use at least 8 characters and matching passwords.");
      await finish(
        await api.publicRequest(
          "/change-password",
          { new_password: password },
          token,
        ),
      );
      return;
    }
    if (stage === "totp") {
      await finish(
        await api.publicRequest("/login/totp", {
          pre_auth_token: token,
          totp_code: code,
        }),
      );
      return;
    }
    await finish(await api.publicRequest("/login", { username, password }));
  }
  const titles = {
    login: "Welcome back.",
    change: "A fresh start.",
    totp: "One last step.",
    reset: "Need a reset?",
  };
  return (
    <>
      <Label size={29} bold>
        {titles[stage]}
      </Label>
      <Label muted>Your operations, always within reach.</Label>
      {!!error && (
        <Card accessibilityRole="alert">
          <Label color={colors.critical}>{error}</Label>
        </Card>
      )}
      {!!notice && (
        <Card>
          <Label>{notice}</Label>
        </Card>
      )}
      {stage === "login" && (
        <Card>
          <Icons.lock size={28} color={colors.accent} />
          <Label size={23} bold>
            A calmer view of your operations.
          </Label>
          <Label muted>
            Sign in to see alerts from your approved groups and servers.
          </Label>
        </Card>
      )}
      {["login", "reset"].includes(stage) && (
        <Field
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoComplete="username"
        />
      )}
      {["login", "change"].includes(stage) && (
        <Field
          label={stage === "change" ? "New password" : "Password"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={
            stage === "change" ? "new-password" : "current-password"
          }
        />
      )}
      {stage === "change" && (
        <Field
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />
      )}
      {stage === "totp" && (
        <Field
          label="Authenticator code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
        />
      )}
      {stage === "reset" && (
        <Label muted>
          An administrator provides a temporary password after reviewing your
          request. No email or SMS is sent.
        </Label>
      )}
      <Button
        title={
          {
            login: "Sign in",
            change: "Save password",
            totp: "Verify and continue",
            reset: "Send reset request",
          }[stage]
        }
        onPress={() => run(submit)}
        busy={busy}
      />
      <Button
        title={
          stage === "login" ? "Request a password reset" : "Back to sign in"
        }
        subtle
        onPress={() => {
          setError("");
          setStage(stage === "login" ? "reset" : "login");
        }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => setEditServer((v) => !v)}
        style={{ paddingVertical: 12 }}
      >
        <Label muted size={12}>
          Server: {api.base} · Change
        </Label>
      </Pressable>
      {editServer && (
        <>
          <Field
            label="OpsRadar API address"
            value={url}
            onChangeText={setUrl}
            keyboardType="url"
          />
          <Label muted size={12}>
            Use your computer’s LAN/VPN address on a phone. localhost points to
            the phone.
          </Label>
          <Button
            title="Connect to server"
            subtle
            busy={busy}
            onPress={() =>
              run(async () => {
                await changeServer(url);
                setEditServer(false);
                setNotice("Server connected. Sign in to continue.");
              })
            }
          />
        </>
      )}
    </>
  );
}
export function EnrollmentScreen({ onDone }: { onDone: () => void }) {
  const { api } = useSession();
  const { colors } = useTheme();
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (!secret) {
        const data = await api.request("/totp/setup");
        setSecret(data.secret);
      } else {
        await api.request("/totp/enable", "POST", { totp_code: code });
        onDone();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <Icons.shield size={32} color={colors.accent} />
        <Label bold size={23}>
          Protect your account.
        </Label>
        <Label muted>
          Add an authenticator for optional two-step verification.
        </Label>
      </Card>
      {!!error && <Label color={colors.critical}>{error}</Label>}
      {secret && (
        <>
          <Label>Enter this secret in your authenticator app:</Label>
          <Label bold style={{ userSelect: "text" }}>
            {secret}
          </Label>
          <Field
            label="Authenticator code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </>
      )}
      <Button
        title={secret ? "Enable authenticator" : "Set up authenticator"}
        onPress={submit}
        busy={busy}
      />
      <Button title="Skip for now" subtle onPress={onDone} />
    </>
  );
}
