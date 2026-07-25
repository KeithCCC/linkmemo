import { ApiError } from "./errors.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleTokenTransport {
  constructor({ fetch: fetchImpl = globalThis.fetch }) { this.fetch = fetchImpl; }

  async post(values) {
    let response;
    try {
      response = await this.fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(values) });
    } catch {
      throw new ApiError("UPSTREAM", "Google OAuth is unavailable", 502);
    }
    if (!response.ok) throw new ApiError("UPSTREAM", "Google OAuth request failed", 502);
    return response.json();
  }

  exchangeCode(code, { clientId, clientSecret, redirectUri }) {
    return this.post({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" });
  }

  refresh(refreshToken, { clientId, clientSecret }) {
    return this.post({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" });
  }
}
