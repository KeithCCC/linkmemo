import { createHmac, timingSafeEqual } from "node:crypto";

function signature(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createOAuthState({ userId, secret, now = Math.floor(Date.now() / 1000), ttlSeconds = 600 }) {
  if (!userId || !secret) throw new Error("OAuth state configuration is missing");
  const payload = Buffer.from(JSON.stringify({ userId, exp: now + ttlSeconds })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyOAuthState({ state, secret, now = Math.floor(Date.now() / 1000) }) {
  if (typeof state !== "string" || !secret) throw new Error("Invalid OAuth state");
  const [payload, receivedSignature, extra] = state.split(".");
  if (!payload || !receivedSignature || extra) throw new Error("Invalid OAuth state");
  const expectedSignature = signature(payload, secret);
  if (receivedSignature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) {
    throw new Error("Invalid OAuth state");
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed.userId !== "string" || !Number.isFinite(parsed.exp)) throw new Error();
    if (parsed.exp < now) throw new Error("Expired OAuth state");
    return { userId: parsed.userId };
  } catch (error) {
    if (error.message === "Expired OAuth state") throw error;
    throw new Error("Invalid OAuth state");
  }
}
