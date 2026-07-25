import { describe, expect, test } from "vitest";
import { refreshAccessToken } from "../../server/drive/tokens.js";
import { encryptRefreshToken } from "../../server/drive/crypto.js";

describe("Google access-token refresh", () => {
  test("decrypts the stored token and persists Google refresh-token rotation", async () => {
    const key = Buffer.alloc(32, 3).toString("base64");
    const updates = [];
    const accessToken = await refreshAccessToken({
      connection: { encryptedRefreshToken: encryptRefreshToken("old", key) },
      encryptionKey: key,
      tokens: { refresh: async (value) => ({ access_token: `access-${value}`, refresh_token: "rotated" }) },
      connections: { updateRefreshToken: async (value) => updates.push(value) },
    });
    expect(accessToken).toBe("access-old");
    expect(updates).toHaveLength(1);
    expect(updates[0]).not.toContain("rotated");
  });
});
