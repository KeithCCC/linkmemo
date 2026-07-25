import { describe, expect, test } from "vitest";
import { createOAuthHandlers } from "../../api/drive/handlers.js";

const env = {
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_REDIRECT_URI: "https://app.example/api/drive/oauth/callback",
  GOOGLE_OAUTH_STATE_SECRET: "state-secret",
  DRIVE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  APP_ORIGIN: "https://app.example",
};

describe("OAuth BFF handlers", () => {
  test("creates an offline Drive authorization URL bound to the authenticated user", async () => {
    const handlers = createOAuthHandlers({ env, auth: { verify: async () => ({ id: "user-1", email: "person@example.com" }) } });
    const response = await handlers.start({ headers: { authorization: "Bearer valid" } });

    expect(response.status).toBe(200);
    const url = new URL(response.body.authorizationUrl);
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("scope")).toBe("openid email https://www.googleapis.com/auth/drive");
    expect(response.body.authorizationUrl).not.toContain("user-1");
  });

  test("validates callback state, stores only an encrypted refresh token, and redirects", async () => {
    const saved = [];
    const handlers = createOAuthHandlers({
      env,
      auth: { verify: async () => ({ id: "user-1", email: "person@example.com" }) },
      tokens: { exchangeCode: async () => ({ refresh_token: "google-refresh", scope: "openid email https://www.googleapis.com/auth/drive" }) },
      connections: { upsert: async (connection) => saved.push(connection) },
      now: () => 1000,
    });
    const start = await handlers.start({ headers: { authorization: "Bearer valid" } });
    const state = new URL(start.body.authorizationUrl).searchParams.get("state");
    const response = await handlers.callback({ query: { state, code: "code" } });

    expect(response).toEqual({ status: 302, headers: { location: "https://app.example/settings?drive=connected" }, body: null });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ userId: "user-1", grantedScope: "openid email https://www.googleapis.com/auth/drive" });
    expect(saved[0].encryptedRefreshToken).not.toContain("google-refresh");
  });
});
