import { assertDescendantOfRoot } from "./ancestry.js";
import { ApiError } from "./errors.js";

const FOLDER = "application/vnd.google-apps.folder";
const GOOGLE_DOC = "application/vnd.google-apps.document";
const EDITABLE_TYPES = new Set(["text/markdown", "text/plain"]);
const SUPPORTED_TYPES = new Set([...EDITABLE_TYPES, GOOGLE_DOC]);

function isFolder(file) {
  return file?.mimeType === FOLDER;
}

function isSupported(file) {
  return isFolder(file) || SUPPORTED_TYPES.has(file?.mimeType);
}

export class DriveService {
  constructor({ drive, rootId }) {
    if (!drive || !rootId) throw new ApiError("CONFIGURATION", "Drive connection is not configured", 500);
    this.drive = drive;
    this.rootId = rootId;
  }

  async assertItem(id, options) {
    return assertDescendantOfRoot(this.drive, id, this.rootId, options);
  }

  async assertFolder(id) {
    const item = await this.assertItem(id);
    if (!isFolder(item)) throw new ApiError("BOUNDARY", "Destination must be a Notehub folder", 403);
    return item;
  }

  async tree() {
    await this.assertFolder(this.rootId);
    const queue = [this.rootId];
    const result = [];
    const seenFolders = new Set();
    while (queue.length) {
      const parentId = queue.shift();
      if (seenFolders.has(parentId)) continue;
      seenFolders.add(parentId);
      const children = await this.drive.listChildren(parentId);
      for (const child of children ?? []) {
        if (!child || child.trashed || !isSupported(child)) continue;
        result.push(child);
        if (isFolder(child)) queue.push(child.id);
      }
    }
    return result;
  }

  async read(id) {
    const file = await this.assertItem(id, { allowRoot: false });
    if (!SUPPORTED_TYPES.has(file.mimeType)) throw new ApiError("NOT_FOUND", "Unsupported Drive file", 404);
    const markdown = file.mimeType === GOOGLE_DOC
      ? await this.drive.exportFile(id, "text/markdown")
      : await this.drive.downloadFile(id);
    return { ...file, markdown, editable: file.mimeType === "text/markdown" };
  }

  async createFile({ name, markdown, parentId = this.rootId }) {
    await this.assertFolder(parentId);
    return this.drive.createFile({ name, markdown, parentId, mimeType: "text/markdown" });
  }

  async updateFile(id, { markdown, name }) {
    const file = await this.assertItem(id, { allowRoot: false });
    if (file.mimeType !== "text/markdown") throw new ApiError("READ_ONLY", "Only raw Markdown files can be updated", 409);
    return this.drive.updateFile(id, { ...(markdown === undefined ? {} : { markdown }), ...(name === undefined ? {} : { name }), mimeType: "text/markdown" });
  }

  async moveFile(id, parentId) {
    const file = await this.assertItem(id, { allowRoot: false });
    if (!EDITABLE_TYPES.has(file.mimeType)) throw new ApiError("READ_ONLY", "Google Docs are read-only", 409);
    await this.assertFolder(parentId);
    return this.drive.moveFile(id, parentId);
  }

  async trashFile(id) {
    const file = await this.assertItem(id, { allowRoot: false });
    if (file.mimeType !== "text/markdown") throw new ApiError("READ_ONLY", "Only raw Markdown notes can be trashed", 409);
    return this.drive.trashFile(id);
  }

  async changes({ pageToken, knownIds = [], persistPageToken }) {
    const known = new Set(knownIds);
    const changes = [];
    let token = pageToken ?? await this.drive.getStartPageToken();
    let finalToken;
    do {
      const page = await this.drive.listChanges(token);
      for (const change of page.changes ?? []) {
        if (change.removed) {
          if (known.has(change.fileId)) changes.push(change);
          continue;
        }
        try {
          const file = await this.assertItem(change.fileId, { allowRoot: false });
          if (isSupported(file)) changes.push({ ...change, file });
        } catch (error) {
          if (error.code !== "BOUNDARY" && error.code !== "NOT_FOUND") throw error;
        }
      }
      token = page.nextPageToken;
      finalToken = page.newStartPageToken ?? finalToken;
    } while (token);

    if (!finalToken) throw new ApiError("UPSTREAM", "Google did not return a change page token", 502);
    await persistPageToken?.(finalToken);
    return { changes, pageToken: finalToken };
  }

  async createFolder({ name, parentId = this.rootId }) {
    await this.assertFolder(parentId);
    return this.drive.createFolder({ name, parentId });
  }

  async renameFolder(id, name) {
    const folder = await this.assertFolder(id);
    if (folder.id === this.rootId) throw new ApiError("BOUNDARY", "The Notehub root folder cannot be renamed", 403);
    return this.drive.updateFile(id, { name });
  }

  async moveFolder(id, parentId) {
    const folder = await this.assertFolder(id);
    if (folder.id === this.rootId) throw new ApiError("BOUNDARY", "The Notehub root folder cannot be moved", 403);
    await this.assertFolder(parentId);
    if (id === parentId) throw new ApiError("BOUNDARY", "A folder cannot be moved into itself", 403);
    try {
      await assertDescendantOfRoot(this.drive, parentId, id, { allowRoot: false });
      throw new ApiError("BOUNDARY", "A folder cannot be moved into its descendant", 403);
    } catch (error) {
      if (error.code !== "BOUNDARY") throw error;
      if (error.message === "A folder cannot be moved into its descendant") throw error;
    }
    return this.drive.moveFile(id, parentId);
  }
}

export { EDITABLE_TYPES, FOLDER, GOOGLE_DOC, SUPPORTED_TYPES };
