import { ApiError } from "./errors.js";

const BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FIELDS = "id,name,mimeType,parents,trashed,createdTime,modifiedTime";

function encodePath(value) { return encodeURIComponent(value); }

export class GoogleDriveTransport {
  constructor({ accessToken, fetch: fetchImpl = globalThis.fetch }) {
    if (!accessToken || !fetchImpl) throw new ApiError("CONFIGURATION", "Google Drive transport is not configured", 500);
    this.accessToken = accessToken;
    this.fetch = fetchImpl;
  }

  async request(url, options = {}) {
    let response;
    try {
      response = await this.fetch(url, { ...options, headers: { authorization: `Bearer ${this.accessToken}`, ...options.headers } });
    } catch {
      throw new ApiError("UPSTREAM", "Google Drive is unavailable", 502);
    }
    if (response.status === 404) return null;
    if (response.status === 401 || response.status === 403) throw new ApiError("UPSTREAM", "Google Drive rejected the request", 502);
    if (response.status === 429) throw new ApiError("RATE_LIMIT", "Google Drive rate limit reached", 429);
    if (!response.ok) throw new ApiError("UPSTREAM", "Google Drive request failed", 502);
    return response;
  }

  async json(url, options) {
    const response = await this.request(url, options);
    return response ? response.json() : null;
  }

  async getFile(id) {
    return this.json(`${BASE}/files/${encodePath(id)}?${new URLSearchParams({ fields: FIELDS, supportsAllDrives: "true" })}`);
  }

  async listChildren(parentId) {
    const children = [];
    let pageToken;
    do {
      const params = new URLSearchParams({ q: `'${String(parentId).replaceAll("'", "\\'")}' in parents and trashed = false`, fields: `files(${FIELDS}),nextPageToken`, pageSize: "1000", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
      if (pageToken) params.set("pageToken", pageToken);
      const data = await this.json(`${BASE}/files?${params}`);
      children.push(...(data?.files ?? []));
      pageToken = data?.nextPageToken;
    } while (pageToken);
    return children;
  }

  async downloadFile(id) {
    const response = await this.request(`${BASE}/files/${encodePath(id)}?alt=media`);
    return response.text();
  }

  async exportFile(id, mimeType) {
    const response = await this.request(`${BASE}/files/${encodePath(id)}/export?${new URLSearchParams({ mimeType })}`);
    return response.text();
  }

  async createFile({ name, markdown, parentId, mimeType = "text/markdown", operationId }) {
    const params = new URLSearchParams({ uploadType: "multipart", supportsAllDrives: "true", fields: FIELDS });
    return this.multipart("POST", `${UPLOAD}/files?${params}`, { name, parents: [parentId], mimeType, ...(operationId ? { appProperties: { notehubOperationId: operationId } } : {}) }, markdown);
  }

  async updateFile(id, { name, markdown, mimeType }) {
    if (markdown === undefined) return this.json(`${BASE}/files/${encodePath(id)}?supportsAllDrives=true`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    return this.multipart("PATCH", `${UPLOAD}/files/${encodePath(id)}?uploadType=multipart&supportsAllDrives=true`, { ...(name === undefined ? {} : { name }), mimeType }, markdown);
  }

  async multipart(method, url, metadata, content) {
    const boundary = `notehub-${crypto.randomUUID()}`;
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: text/markdown; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
    return this.json(url, { method, headers: { "content-type": `multipart/related; boundary=${boundary}` }, body });
  }

  async moveFile(id, parentId) {
    const current = await this.getFile(id);
    if (!current) return null;
    const params = new URLSearchParams({ addParents: parentId, removeParents: (current.parents ?? []).join(","), supportsAllDrives: "true" });
    return this.json(`${BASE}/files/${encodePath(id)}?${params}`, { method: "PATCH" });
  }

  async trashFile(id) {
    return this.json(`${BASE}/files/${encodePath(id)}?supportsAllDrives=true`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ trashed: true }) });
  }

  async createFolder({ name, parentId, operationId }) {
    const params = new URLSearchParams({ supportsAllDrives: "true", fields: FIELDS });
    return this.json(`${BASE}/files?${params}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, parents: [parentId], mimeType: "application/vnd.google-apps.folder", ...(operationId ? { appProperties: { notehubOperationId: operationId } } : {}) }) });
  }

  async findFileByOperation(parentId, operationId) {
    const parent = String(parentId).replaceAll("'", "\\'");
    const marker = String(operationId).replaceAll("'", "\\'");
    const q = `'${parent}' in parents and trashed = false and appProperties has { key='notehubOperationId' and value='${marker}' }`;
    const params = new URLSearchParams({ q, fields: `files(${FIELDS})`, pageSize: "1", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
    return (await this.json(`${BASE}/files?${params}`))?.files?.[0] ?? null;
  }

  async listChanges(pageToken) {
    const params = new URLSearchParams({ pageToken, fields: `changes(fileId,file(${FIELDS}),removed),nextPageToken,newStartPageToken`, supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
    return this.json(`${BASE}/changes?${params}`);
  }

  async getStartPageToken() {
    const data = await this.json(`${BASE}/changes/startPageToken?${new URLSearchParams({ supportsAllDrives: "true" })}`);
    if (!data?.startPageToken) throw new ApiError("UPSTREAM", "Google did not return a change page token", 502);
    return data.startPageToken;
  }
}
