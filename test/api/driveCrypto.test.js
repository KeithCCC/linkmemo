import { describe, expect, test } from "vitest";
import { decryptRefreshToken, encryptRefreshToken } from "../../server/drive/crypto.js";

const key = Buffer.alloc(32, 7).toString("base64");

describe("Google Drive refresh-token encryption", () => {
  test("round-trips a refresh token using AES-256-GCM", () => {
    const ciphertext = encryptRefreshToken("refresh-token-secret", key);

    expect(ciphertext).not.toContain("refresh-token-secret");
    expect(decryptRefreshToken(ciphertext, key)).toBe("refresh-token-secret");
  });

  test("rejects invalid key material and malformed ciphertext", () => {
    expect(() => encryptRefreshToken("token", Buffer.alloc(31).toString("base64"))).toThrow(
      "DRIVE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes"
    );
    expect(() => decryptRefreshToken("not-a-valid-ciphertext", key)).toThrow("Malformed encrypted refresh token");
  });
});
