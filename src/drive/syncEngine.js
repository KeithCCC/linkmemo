import { normalizeDriveFile } from "./noteModel.js";
import { serializeMarkdown } from "./markdown.js";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const CHANGE_TOKEN = "changePageToken";

function itemId(item) {
  return item?.fileId ?? item?.id;
}

function folderFromDrive(item) {
  return { id: itemId(item), name: item.name, parentId: item.parents?.[0] ?? null };
}

function noteFromDrive(item, previous) {
  const normalized = normalizeDriveFile({ ...item, fileId: itemId(item) });
  return {
    ...normalized,
    title: normalized.title || item.name || previous?.title || "Untitled",
    content: item.markdown === undefined ? (previous?.content ?? normalized.content) : normalized.content,
    parentId: item.parents?.[0] ?? previous?.parentId ?? null,
  };
}

function localId() {
  return `local:${crypto.randomUUID()}`;
}

export class NotehubSyncEngine {
  constructor({ repository, client } = {}) {
    if (!repository) throw new Error("repository is required");
    if (!client) throw new Error("client is required");
    this.repository = repository;
    this.client = client;
    this.notes = [];
    this.folders = [];
    this.state = "offline";
    this.error = null;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot() {
    return { state: this.state, error: this.error, notes: this.notes, folders: this.folders };
  }

  publish() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  setState(state, error = null) {
    this.state = state;
    this.error = error;
    this.publish();
  }

  async refreshCache() {
    [this.notes, this.folders] = await Promise.all([this.repository.listNotes(), this.repository.listFolders()]);
    this.publish();
  }

  async hydrate() {
    await this.refreshCache();
    const connectionState = await this.repository.getMetadata("connectionState");
    this.setState(connectionState ?? "offline");
    return this.snapshot();
  }

  async sync() {
    this.setState("syncing");
    try {
      await this.flushOutbox({ preserveState: true });
      const pageToken = await this.repository.getMetadata(CHANGE_TOKEN);
      if (!pageToken) {
        const { items = [] } = await this.client.tree();
        const notes = items.filter((item) => item.mimeType !== FOLDER_MIME_TYPE).map((item) => noteFromDrive(item));
        const folders = items.filter((item) => item.mimeType === FOLDER_MIME_TYPE).map(folderFromDrive);
        await this.repository.replaceAll({ notes, folders });
        await this.pullChanges();
      } else {
        await this.pullChanges();
      }
      await this.refreshCache();
      await this.repository.setMetadata("connectionState", "synced");
      this.setState("synced");
    } catch (error) {
      this.setState("error", error);
      throw error;
    }
  }

  async applyChange(change) {
    const id = itemId(change);
    if (change.removed) {
      await Promise.all([this.repository.removeNote(id), this.repository.removeFolder(id)]);
      return;
    }
    const item = change.file ?? change;
    if (item.mimeType === FOLDER_MIME_TYPE) await this.repository.upsertFolder(folderFromDrive(item));
    else await this.repository.upsertNote(noteFromDrive(item, await this.repository.getNote(itemId(item))));
  }

  async pullChanges() {
    const { changes = [], pageToken } = await this.client.changes((await this.repository.listNotes()).map((note) => note.id));
    for (const change of changes) await this.applyChange(change);
    if (pageToken) await this.repository.setMetadata(CHANGE_TOKEN, pageToken);
  }

  async enqueue(operation) {
    await this.repository.enqueue(operation);
    await this.refreshCache();
    this.setState("pending");
  }

  async createNote({ title = "Untitled", content = "", parentId = null, name, markdown } = {}) {
    const id = localId();
    const now = new Date().toISOString();
    const note = { id, title, content, tags: [], focus: false, source: "drive-markdown", editable: true, parentId, createdAt: now, updatedAt: now, warning: null };
    await this.repository.upsertNote(note);
    await this.enqueue({ type: "file.create", id, payload: { name: name ?? `${title}.md`, markdown: markdown ?? serializeMarkdown({ metadata: note, body: content }), parentId } });
    return id;
  }

  async updateNote(id, patch) {
    const note = await this.repository.getNote(id);
    if (!note || note.source === "drive-doc" || note.editable === false) return;
    const updated = { ...note, ...patch, updatedAt: new Date().toISOString() };
    await this.repository.upsertNote(updated);
    const payload = {
      markdown: serializeMarkdown({ metadata: updated, body: updated.content }),
      ...(patch.title === undefined ? {} : { name: patch.title }),
    };
    await this.enqueue({ type: "file.update", id, payload });
  }

  async moveNote(id, parentId) {
    const note = await this.repository.getNote(id);
    if (!note || note.source === "drive-doc" || note.editable === false) return;
    await this.repository.upsertNote({ ...note, parentId });
    await this.enqueue({ type: "file.move", id, payload: { parentId } });
  }

  async trashNote(id) {
    const note = await this.repository.getNote(id);
    if (!note || note.source === "drive-doc" || note.editable === false) return;
    await this.repository.removeNote(id);
    await this.enqueue({ type: "file.trash", id, payload: {} });
  }

  async createFolder({ name, parentId = null } = {}) {
    const id = localId();
    await this.repository.upsertFolder({ id, name, parentId });
    await this.enqueue({ type: "folder.create", id, payload: { name, parentId } });
    return id;
  }

  async renameFolder(id, name) {
    const folder = await this.repository.getFolder(id);
    if (!folder) return;
    await this.repository.upsertFolder({ ...folder, name });
    await this.enqueue({ type: "folder.rename", id, payload: { name } });
  }

  async moveFolder(id, parentId) {
    const folder = await this.repository.getFolder(id);
    if (!folder) return;
    await this.repository.upsertFolder({ ...folder, parentId });
    await this.enqueue({ type: "folder.move", id, payload: { parentId } });
  }

  async flushOutbox({ preserveState = false } = {}) {
    try {
      for (const queued of await this.repository.listOutbox()) {
        const entry = await this.repository.getOutbox(queued.sequence);
        if (!entry) continue;
        const result = await this.execute(entry);
        if (entry.type === "file.create") await this.replaceTemporaryNote(entry.id, itemId(result), result);
        if (entry.type === "folder.create") await this.replaceTemporaryFolder(entry.id, itemId(result), result);
        await this.repository.removeOutbox(entry.sequence);
      }
      await this.refreshCache();
      if (!preserveState) this.setState("synced");
    } catch (error) {
      this.setState("error", error);
      throw error;
    }
  }

  async execute(entry) {
    switch (entry.type) {
      case "file.create": return this.client.createFile(entry.payload);
      case "file.update": return this.client.updateFile(entry.id, entry.payload);
      case "file.move": return this.client.moveFile(entry.id, entry.payload.parentId);
      case "file.trash": return this.client.trashFile(entry.id);
      case "folder.create": return this.client.createFolder(entry.payload);
      case "folder.rename": return this.client.renameFolder(entry.id, entry.payload.name);
      case "folder.move": return this.client.moveFolder(entry.id, entry.payload.parentId);
      default: throw new Error(`Unknown outbox operation: ${entry.type}`);
    }
  }

  async rewriteOutboxReferences(temporaryId, driveId) {
    for (const entry of await this.repository.listOutbox()) {
      const id = entry.id === temporaryId ? driveId : entry.id;
      const parentId = entry.payload?.parentId === temporaryId ? driveId : entry.payload?.parentId;
      if (id !== entry.id || parentId !== entry.payload?.parentId) await this.repository.replaceOutbox({ ...entry, id, payload: { ...entry.payload, ...(entry.payload?.parentId === undefined ? {} : { parentId }) } });
    }
  }

  async replaceTemporaryNote(temporaryId, driveId, response) {
    if (!driveId) throw new Error("Drive did not return a fileId for the created note");
    const local = await this.repository.getNote(temporaryId);
    if (local) {
      await this.repository.removeNote(temporaryId);
      await this.repository.upsertNote({ ...noteFromDrive(response, local), ...local, id: driveId });
    }
    await this.rewriteOutboxReferences(temporaryId, driveId);
  }

  async replaceTemporaryFolder(temporaryId, driveId, response) {
    if (!driveId) throw new Error("Drive did not return a fileId for the created folder");
    const local = await this.repository.getFolder(temporaryId);
    if (local) {
      await this.repository.removeFolder(temporaryId);
      await this.repository.upsertFolder({ ...folderFromDrive(response), ...local, id: driveId });
    }
    await this.rewriteOutboxReferences(temporaryId, driveId);
  }
}
