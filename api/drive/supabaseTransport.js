import { ApiError } from "./errors.js";

function required(env, key) {
  if (!env?.[key]) throw new ApiError("CONFIGURATION", `Missing ${key}`, 500);
  return env[key];
}

export class SupabaseTransport {
  constructor({ env, fetch: fetchImpl = globalThis.fetch }) {
    this.url = required(env, "SUPABASE_URL").replace(/\/$/, "");
    this.serviceKey = required(env, "SUPABASE_SERVICE_ROLE_KEY");
    this.fetch = fetchImpl;
  }

  async request(path, options = {}) {
    let response;
    try {
      response = await this.fetch(`${this.url}${path}`, { ...options, headers: { apikey: this.serviceKey, ...options.headers } });
    } catch {
      throw new ApiError("UPSTREAM", "Supabase is unavailable", 502);
    }
    if (!response.ok) throw new ApiError("UPSTREAM", "Supabase request failed", 502);
    return response;
  }

  async verify(token) {
    const response = await this.fetch(`${this.url}/auth/v1/user`, { headers: { apikey: this.serviceKey, authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.id ? { id: data.id, email: data.email } : null;
  }

  async get(userId) {
    const response = await this.request(`/rest/v1/google_drive_connections?user_id=eq.${encodeURIComponent(userId)}&select=*`);
    return (await response.json())[0] ?? null;
  }

  async upsert({ userId, encryptedRefreshToken, grantedScope, folderId = null }) {
    await this.request("/rest/v1/google_drive_connections?on_conflict=user_id", {
      method: "POST",
      headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, encrypted_refresh_token: encryptedRefreshToken, granted_scope: grantedScope, ...(folderId === null ? {} : { folder_id: folderId }), change_page_token: null }),
    });
  }

  async patch(userId, patch) {
    await this.request(`/rest/v1/google_drive_connections?user_id=eq.${encodeURIComponent(userId)}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(patch) });
  }

  async updateRefreshToken(userId, encryptedRefreshToken) { return this.patch(userId, { encrypted_refresh_token: encryptedRefreshToken }); }
  async updatePageToken(userId, pageToken) { return this.patch(userId, { change_page_token: pageToken }); }
  async updateFolder(userId, folderId) { return this.patch(userId, { folder_id: folderId, change_page_token: null }); }
}
