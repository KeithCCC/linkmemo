import { describe, expect, test } from "vitest";
import { createOAuthState, verifyOAuthState } from "../../api/drive/oauthState.js";

describe("OAuth state", () => {
  test("signs an expiring state bound to the authenticated Supabase user", () => {
    const state = createOAuthState({ userId: "user-1", secret: "state-secret", now: 1000, ttlSeconds: 60 });

    expect(verifyOAuthState({ state, secret: "state-secret", now: 1059 })).toEqual({ userId: "user-1" });
  });

  test("rejects a tampered or expired state", () => {
    const state = createOAuthState({ userId: "user-1", secret: "state-secret", now: 1000, ttlSeconds: 1 });

    expect(() => verifyOAuthState({ state: `${state}x`, secret: "state-secret", now: 1000 })).toThrow("Invalid OAuth state");
    expect(() => verifyOAuthState({ state, secret: "state-secret", now: 1002 })).toThrow("Expired OAuth state");
  });
});
