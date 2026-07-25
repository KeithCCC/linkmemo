import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ApiError } from "./errors.js";

const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey(encodedKey) {
  let key;
  try {
    key = Buffer.from(encodedKey, "base64");
  } catch {
    throw new ApiError("CONFIGURATION", "DRIVE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes", 500);
  }

  if (typeof encodedKey !== "string" || key.length !== 32) {
    throw new ApiError("CONFIGURATION", "DRIVE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes", 500);
  }
  return key;
}

export function encryptRefreshToken(token, encodedKey) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(encodedKey), iv);
  const encrypted = Buffer.concat([cipher.update(String(token), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptRefreshToken(ciphertext, encodedKey) {
  let packed;
  try {
    packed = Buffer.from(ciphertext, "base64url");
  } catch {
    throw new ApiError("CONFIGURATION", "Malformed encrypted refresh token", 500);
  }
  if (typeof ciphertext !== "string" || !/^[A-Za-z0-9_-]+$/.test(ciphertext) || packed.length <= IV_BYTES + TAG_BYTES) {
    throw new ApiError("CONFIGURATION", "Malformed encrypted refresh token", 500);
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(encodedKey), packed.subarray(0, IV_BYTES));
    decipher.setAuthTag(packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([decipher.update(packed.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("CONFIGURATION", "Malformed encrypted refresh token", 500);
  }
}
