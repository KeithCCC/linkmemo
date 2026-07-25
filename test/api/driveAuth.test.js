import { describe, expect, test } from "vitest";
import { authenticateRequest } from "../../server/drive/auth.js";

describe("Drive endpoint authentication", () => {
  test("requires a server-validated Supabase bearer token", async () => {
    const auth = { verify: async (token) => token === "good" ? { id: "user-1", email: "person@example.com" } : null };

    await expect(authenticateRequest({ headers: {} }, auth)).rejects.toMatchObject({ code: "AUTH" });
    await expect(authenticateRequest({ headers: { authorization: "Bearer bad" } }, auth)).rejects.toMatchObject({ code: "AUTH" });
    await expect(authenticateRequest({ headers: { authorization: "Bearer good" } }, auth)).resolves.toEqual({ id: "user-1", email: "person@example.com" });
  });

  test("restricts Drive access to the configured allowed email", async () => {
    const auth = { verify: async () => ({ id: "user-1", email: "other@example.com" }) };
    await expect(authenticateRequest({ headers: { authorization: "Bearer token" } }, auth, { allowedEmail: "owner@example.com" })).rejects.toMatchObject({ code: "AUTH" });
  });
});
