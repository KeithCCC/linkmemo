export class DriveClientError extends Error {
  constructor({ code = "UPSTREAM", message = "Drive request failed", status = 502 } = {}) {
    super(message);
    this.name = "DriveClientError";
    this.code = code;
    this.status = status;
  }
}

export class DriveBffClient {
  constructor({ getAccessToken, fetch = globalThis.fetch, baseUrl = "/api/drive" } = {}) {
    if (typeof getAccessToken !== "function") throw new Error("getAccessToken is required");
    if (typeof fetch !== "function") throw new Error("fetch is unavailable");
    this.getAccessToken = getAccessToken;
    this.fetch = fetch;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request(path, { method = "GET", body } = {}) {
    const token = await this.getAccessToken();
    if (!token) throw new DriveClientError({ code: "AUTH", message: "Supabase access token is unavailable", status: 401 });
    const headers = token ? { authorization: `Bearer ${token}` } : {};
    if (body !== undefined) headers["content-type"] = "application/json";
    const response = await this.fetch(`${this.baseUrl}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const payload = await response.json();
    if (!response.ok) throw new DriveClientError({ code: payload?.error?.code, message: payload?.error?.message, status: response.status });
    return payload;
  }

  connection() { return this.request("/connection"); }
  updateConnection(folderId) { return this.request("/connection", { method: "PATCH", body: { folderId } }); }
  tree() { return this.request("/tree"); }
  changes(knownIds) { return this.request("/changes", { method: "POST", body: { knownIds } }); }
  readFile(id) { return this.request(`/file/read?id=${encodeURIComponent(id)}`); }
  createFile(body) { return this.request("/file/create", { method: "POST", body }); }
  updateFile(id, body) { return this.request(`/file/update?id=${encodeURIComponent(id)}`, { method: "PATCH", body }); }
  moveFile(id, parentId) { return this.request(`/file/move?id=${encodeURIComponent(id)}`, { method: "PATCH", body: { parentId } }); }
  trashFile(id) { return this.request(`/file/trash?id=${encodeURIComponent(id)}`, { method: "DELETE" }); }
  createFolder(body) { return this.request("/folder/create", { method: "POST", body }); }
  renameFolder(id, name) { return this.request(`/folder/rename?id=${encodeURIComponent(id)}`, { method: "PATCH", body: { name } }); }
  moveFolder(id, parentId) { return this.request(`/folder/move?id=${encodeURIComponent(id)}`, { method: "PATCH", body: { parentId } }); }
}
