import { describe, expect, test } from "vitest";
import { createDriveApplication } from "../../api/drive/application.js";
import { encryptRefreshToken } from "../../api/drive/crypto.js";

const key = Buffer.alloc(32, 9).toString("base64");
const env = { DRIVE_TOKEN_ENCRYPTION_KEY: key, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" };

describe("Drive application boundary", () => {
  test("rejects unauthenticated non-callback endpoints with a safe JSON error", async () => {
    const app = createDriveApplication({ env, auth: { verify: async () => null }, connections: {}, tokens: {}, driveFactory: () => ({}) });
    await expect(app.tree({ headers: {} })).resolves.toEqual({ status: 401, body: { error: { code: "AUTH", message: "A valid Supabase bearer token is required" } } });
  });

  test("serves a stored-root tree after server-side token refresh", async () => {
    const app = createDriveApplication({
      env,
      auth: { verify: async () => ({ id: "u", email: "u@example.com" }) },
      connections: { get: async () => ({ folder_id: "root", encrypted_refresh_token: encryptRefreshToken("refresh", key) }), updateRefreshToken: async () => {}, updatePageToken: async () => {} },
      tokens: { refresh: async () => ({ access_token: "access" }) },
      driveFactory: () => ({ getFile: async () => ({ id: "root", mimeType: "application/vnd.google-apps.folder", parents: [] }), listChildren: async () => [] }),
    });
    await expect(app.tree({ headers: { authorization: "Bearer valid" } })).resolves.toEqual({ status: 200, body: { items: [] } });
  });

  test("does not treat arbitrary verbs as a selected-root update", async () => {
    const app = createDriveApplication({ env, auth: { verify: async () => ({ id: "u", email: "u@example.com" }) }, connections: { get: async () => null }, tokens: {}, driveFactory: () => ({}) });
    await expect(app.connection({ method: "POST", headers: { authorization: "Bearer valid" } })).resolves.toMatchObject({ status: 405, body: { error: { code: "METHOD_NOT_ALLOWED" } } });
  });
});
