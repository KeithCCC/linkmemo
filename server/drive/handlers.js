import { authenticateRequest } from "./auth.js";
import { encryptRefreshToken } from "./crypto.js";
import { ApiError } from "./errors.js";
import { createOAuthState, verifyOAuthState } from "./oauthState.js";

const DRIVE_SCOPE = "openid email https://www.googleapis.com/auth/drive";

function requireEnv(env, ...keys) {
  for (const key of keys) if (!env?.[key]) throw new ApiError("CONFIGURATION", `Missing ${key}`, 500);
}

function settingsUrl(origin) {
  if (!origin) throw new ApiError("CONFIGURATION", "Missing APP_ORIGIN", 500);
  return new URL("/settings?drive=connected", origin).toString();
}

export function toErrorResponse(error) {
  const known = error instanceof ApiError ? error : new ApiError("UPSTREAM", "Drive service is unavailable", 502);
  return { status: known.status, body: { error: { code: known.code, message: known.message } } };
}

export function createOAuthHandlers({ env, auth, tokens, connections, now = () => Math.floor(Date.now() / 1000) }) {
  return {
    async start(request) {
      try {
        requireEnv(env, "GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_REDIRECT_URI", "GOOGLE_OAUTH_STATE_SECRET");
        const user = await authenticateRequest(request, auth, { allowedEmail: env.DRIVE_ALLOWED_EMAIL });
        const state = createOAuthState({ userId: user.id, secret: env.GOOGLE_OAUTH_STATE_SECRET, now: now() });
        const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        url.search = new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID,
          redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
          response_type: "code",
          scope: DRIVE_SCOPE,
          access_type: "offline",
          prompt: "consent",
          state,
        }).toString();
        return { status: 200, body: { authorizationUrl: url.toString() } };
      } catch (error) {
        return toErrorResponse(error);
      }
    },

    async callback(request) {
      try {
        requireEnv(env, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI", "GOOGLE_OAUTH_STATE_SECRET", "DRIVE_TOKEN_ENCRYPTION_KEY", "APP_ORIGIN");
        const { userId } = verifyOAuthState({ state: request?.query?.state, secret: env.GOOGLE_OAUTH_STATE_SECRET, now: now() });
        const code = request?.query?.code;
        if (!code) throw new ApiError("AUTH", "Google authorization code is missing", 400);
        const token = await tokens.exchangeCode(code, { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI });
        if (!token?.refresh_token) throw new ApiError("UPSTREAM", "Google did not return a refresh token", 502);
        await connections.upsert({
          userId,
          encryptedRefreshToken: encryptRefreshToken(token.refresh_token, env.DRIVE_TOKEN_ENCRYPTION_KEY),
          grantedScope: token.scope ?? DRIVE_SCOPE,
        });
        return { status: 302, headers: { location: settingsUrl(env.APP_ORIGIN) }, body: null };
      } catch (error) {
        return toErrorResponse(error);
      }
    },
  };
}

export { DRIVE_SCOPE };
