export type Severity = "critical" | "major" | "minor" | "trivial";
export type User = {
  user_id: number;
  username: string;
  email: string;
  is_admin: boolean;
};
export type Session = { token: string; refresh_token: string; user: User };
export type AlertItem = {
  id: number;
  message: string;
  severity: Severity;
  status: "active" | "resolved";
  server: string;
  group: string;
  app: string;
  country: string;
  timestamp: string;
  created_at?: string;
  resolved_at?: string;
};
export type Page<T> = { items: T[]; total: number; page: number };
export type Resource = { id: number; name: string; type: "group" | "server" };
export type AccessRequest = {
  request_id: number;
  resource_type: string;
  resource_name: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  createdAt: string;
};
export type Activity = {
  id: number;
  alert_id: number | null;
  kind: string;
  message: string;
  severity: Severity;
  is_read: boolean;
  created_at: string;
};
export type Preferences = Record<Severity, boolean>;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export class ApiClient {
  session: Session | null = null;
  private refreshing: Promise<void> | null = null;
  constructor(
    public base: string,
    private persist: (session: Session | null) => Promise<void>,
  ) {}
  private async send(
    path: string,
    method: string,
    body: unknown,
    token?: string,
  ) {
    let response: Response;
    try {
      response = await fetch(this.base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ApiError(
        "Cannot reach OpsRadar. Check the server address and your connection.",
        0,
      );
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fallback =
        response.status === 404 && path === "/mobile/sessions"
          ? "Mobile sign-in is unavailable on this server. Ask your administrator to update OpsRadar, then sign in again."
          : `Request failed (HTTP ${response.status}). Please try again.`;
      throw new ApiError(
        typeof data.error === "string" ? data.error : fallback,
        response.status,
      );
    }
    return data;
  }
  async publicRequest(path: string, body?: unknown, token?: string) {
    return this.send(path, "POST", body, token);
  }
  async accept(token: string) {
    const session = await this.send(
      "/mobile/sessions",
      "POST",
      undefined,
      token,
    );
    this.session = session;
    await this.persist(session);
  }
  async clear() {
    this.session = null;
    await this.persist(null);
  }
  private async refresh() {
    if (!this.session) throw new ApiError("Please sign in again.", 401);
    const old = this.session;
    try {
      const next = await this.send("/mobile/sessions/refresh", "POST", {
        refresh_token: old.refresh_token,
      });
      // A logout while refresh is in flight must not restore the signed-out session.
      if (this.session !== old) return;
      this.session = next;
      await this.persist(next);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await this.clear();
      throw e;
    }
  }
  async request<T = any>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    const token = this.session?.token;
    try {
      return await this.send(path, method, body, token);
    } catch (e) {
      if (
        !(e instanceof ApiError) ||
        ![401, 403].includes(e.status) ||
        !this.session
      )
        throw e;
      if (!this.refreshing)
        this.refreshing = this.refresh().finally(() => {
          this.refreshing = null;
        });
      await this.refreshing;
      if (!this.session) throw new ApiError("Please sign in again.", 401);
      return this.send(path, method, body, this.session.token);
    }
  }
  async logout() {
    try {
      if (this.session) await this.request("/mobile/sessions/logout", "POST");
    } finally {
      await this.clear();
    }
  }
}
