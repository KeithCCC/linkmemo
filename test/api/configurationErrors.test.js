import { describe, expect, test } from "vitest";
import { createOAuthHandlers } from "../../server/drive/handlers.js";
import { createOAuthState } from "../../server/drive/oauthState.js";
import { vercelHandler } from "../../server/drive/runtime.js";

function responseRecorder() {
  return {
    statusCode: null,
    body: undefined,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.body = null; return this; },
  };
}

describe("configuration error boundary", () => {
  test("returns safe CONFIGURATION JSON when runtime Supabase settings are missing", async () => {
    const handler = vercelHandler("tree", ["GET"], { env: {} });
    const res = responseRecorder();
    await handler({ method: "GET", headers: {} }, res);
    expect(res).toMatchObject({ statusCode: 500, body: { error: { code: "CONFIGURATION" } } });
  });

  test("returns safe CONFIGURATION JSON when callback encryption key material is invalid", async () => {
    const env = {
      GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret", GOOGLE_OAUTH_REDIRECT_URI: "https://app/callback", GOOGLE_OAUTH_STATE_SECRET: "state", DRIVE_TOKEN_ENCRYPTION_KEY: "not-a-32-byte-key", APP_ORIGIN: "https://app",
    };
    const handlers = createOAuthHandlers({ env, tokens: { exchangeCode: async () => ({ refresh_token: "token" }) }, connections: { upsert: async () => {} } });
    const state = createOAuthState({ userId: "user", secret: env.GOOGLE_OAUTH_STATE_SECRET });
    await expect(handlers.callback({ query: { state, code: "code" } })).resolves.toMatchObject({ status: 500, body: { error: { code: "CONFIGURATION" } } });
  });

  test("returns safe CONFIGURATION JSON when OAuth state signing is not configured", async () => {
    const handlers = createOAuthHandlers({ env: { GOOGLE_CLIENT_ID: "client", GOOGLE_OAUTH_REDIRECT_URI: "https://app/callback", GOOGLE_OAUTH_STATE_SECRET: "" }, auth: { verify: async () => ({ id: "user" }) } });
    await expect(handlers.start({ headers: { authorization: "Bearer valid" } })).resolves.toMatchObject({ status: 500, body: { error: { code: "CONFIGURATION" } } });
  });
});
