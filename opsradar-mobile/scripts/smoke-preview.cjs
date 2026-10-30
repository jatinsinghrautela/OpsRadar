// End-to-end test against ONLY the optional isolated dev-local stack (never Docker data).
const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const { chromium, expect } = require("@playwright/test");
async function main() {
  const root = path.resolve(__dirname, "../..");
  const temp = path.join(root, ".cache", "tmp");
  process.env.TEMP = process.env.TMP = temp;
  const credentials = JSON.parse(
    fs.readFileSync(
      path.join(root, ".cache/dev-local/credentials.json"),
      "utf8",
    ),
  );
  const jwt = require("../../opsradar-backend/node_modules/jsonwebtoken");
  const admin = await fetch("http://localhost:5050/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
  }).then((r) => r.json());
  const payload = jwt.verify(
    admin.change_token || admin.token,
    credentials.jwtSecret,
  );
  const adminToken = jwt.sign(
    { user_id: payload.user_id, is_admin: true },
    credentials.jwtSecret,
    { expiresIn: "10m" },
  );
  async function adminRequest(route, method = "GET", body) {
    const r = await fetch("http://localhost:5050" + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + adminToken,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json();
    assert.ok(r.ok, data.error);
    return data;
  }
  // The bootstrap account must finish password change before its token can access application routes.
  if (admin.change_token) {
    const changed = await fetch("http://localhost:5050/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + admin.change_token,
      },
      body: JSON.stringify({ new_password: credentials.password }),
    });
    assert.ok(changed.ok);
  }
  const groupName = "Mobile QA " + Date.now();
  await adminRequest("/groups", "POST", {
    group_name: groupName,
    description: "Isolated mobile smoke test",
  });
  const browser = await chromium.launch({
    executablePath:
      process.env.OPSRADAR_BROWSER ||
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
    args: ["--disable-gpu"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("http://localhost:8082");
    await page
      .getByLabel("Username", { exact: true })
      .fill(credentials.previewUsername);
    await page
      .getByLabel("Password", { exact: true })
      .fill(credentials.previewPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "Skip for now", exact: true })
      .click();
    await expect(
      page.getByText("MATCHING ALERTS", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Payment service unavailable", { exact: true }),
    ).toBeVisible();
    const shots = path.join(root, "opsradar-mobile", "screenshots");
    fs.mkdirSync(shots, { recursive: true });
    await page.screenshot({
      path: path.join(shots, "prism-light-inbox.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "critical alert: Payment service unavailable",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Alert details", { exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Switch to light appearance" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Switch to light appearance" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Settings", exact: true }).click();
    await page.screenshot({
      path: path.join(shots, "prism-dark-settings.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "Enable notifications on this device",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(
        "Push is disabled on this server. Your inbox still works.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Access", exact: true }).click();
    await page
      .getByRole("button", { name: "＋ Request access", exact: true })
      .click();
    await page.getByText(groupName, { exact: true }).click();
    await page
      .getByLabel("Reason (optional)", { exact: true })
      .fill("Testing the real access workflow.");
    await page
      .getByRole("button", { name: "Send access request", exact: true })
      .click();
    await expect(
      page.getByText("Pending approval", { exact: true }),
    ).toBeVisible();
    const requests = await adminRequest("/access-requests");
    const pending = requests.find(
      (r) => r.resource_name === groupName && r.status === "pending",
    );
    assert.ok(pending);
    await adminRequest(
      "/access-requests/" + pending.request_id + "/approve",
      "POST",
      {},
    );
    await page
      .getByRole("button", { name: "View my access", exact: true })
      .click();
    await expect(
      page.getByText("group · approved", { exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: login, scoped inbox/details, persisted dark theme, disabled push, request -> admin approval -> granted access, logout; no browser runtime errors.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
