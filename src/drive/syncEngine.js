import { normalizeDriveFile } from "./noteModel.js";
import { serializeMarkdown } from "./markdown.js";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const CHANGE_TOKEN = "changePageToken";

function itemId(item) { return item?.fileId ?? item?.id; }
function temporaryId() { return `local:${crypto.randomUUID()}`; }
function folderFromDrive(item) { return { id: itemId(item), name: item.name, parentId: item.parents?.[0] ?? null }; }

function noteFromDrive(item, previous) {
  const normalized = normalizeDriveFile({ ...item, fileId: itemId(item) });
  return {
    ...normalized,
    title: normalized.title || item.name || previous?.title || "Untitled",
    content: item.markdown === undefined ? (previous?.content ?? normalized.content) : normalized.content,
    parentId: item.parents?.[0] ?? previous?.parentId ?? null,
  };
}

export class NotehubSyncEngine {
  constructor({ repository, client } = {}) {
    if (!repository || !client) throw new Error("repository and client are required");
    this.repository = repository;
    this.client = client;
    this.notes = [];
    this.folders = [];
    this.state = "offline";
    this.error = null;
    this.listeners = new Set();
    this.exclusive = Promise.resolve();
  }

  runExclusive(task) {
    const run = this.exclusive.then(task, task);
    this.exclusive = run.catch(() => undefined);
    return run;
  }

  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  snapshot() { return { state: this.state, error: this.error, notes: this.notes, folders: this.folders }; }
  publish() { const snapshot = this.snapshot(); this.listeners.forEach((listener) => listener(snapshot)); }
  setState(state, error = null) { this.state = state; this.error = error; this.publish(); }

  async refreshCache() {
    const [notes, folders] = await Promise.all([this.repository.listNotes(), this.repository.listFolders()]);
    this.notes = notes.filter((note) => !note.trashed);
    this.folders = folders;
    this.publish();
  }

  hydrate() { return this.runExclusive(() => this.hydrateImpl()); }
  async hydrateImpl() {
    await this.refreshCache();
    const pending = (await this.repository.listOutbox()).length > 0;
    const offline = globalThis.navigator?.onLine === false;
    this.setState(offline ? "offline" : (pending ? "pending" : (await this.repository.getMetadata("connectionState")) ?? "offline"));
    return this.snapshot();
  }

  sync() { return this.runExclusive(() => this.syncImpl()); }
  async syncImpl() {
    this.setState("syncing");
    try {
      await this.flushImpl({ preserveState: true });
      if (await this.repository.getMetadata(CHANGE_TOKEN)) {
        try { await this.pullChanges(); }
        catch { await this.fullTreeAndEstablishCursor(); }
      } else {
        await this.fullTreeAndEstablishCursor();
      }
      await this.refreshCache();
      await this.repository.setMetadata("connectionState", "synced");
      this.setState("synced");
    } catch (error) {
      this.setState("error", error);
      throw error;
    }
  }

  async hydrateRemote(item) {
    if (item.mimeType === FOLDER_MIME_TYPE) return item;
    const hydrated = await this.client.readFile(itemId(item));
    return { ...item, ...hydrated, id: itemId(hydrated) ?? itemId(item), parents: hydrated.parents ?? item.parents };
  }

  async fullTreeAndEstablishCursor() {
    const { items = [] } = await this.client.tree();
    const hydrated = await Promise.all(items.map((item) => this.hydrateRemote(item)));
    const notes = hydrated.filter((item) => item.mimeType !== FOLDER_MIME_TYPE).map((item) => noteFromDrive(item));
    const folders = hydrated.filter((item) => item.mimeType === FOLDER_MIME_TYPE).map(folderFromDrive);
    await this.repository.replaceRemoteCache({ notes, folders });
    await this.pullChanges();
  }

  async pullChanges() {
    const [notes, folders] = await Promise.all([this.repository.listNotes(), this.repository.listFolders()]);
    const { changes = [], pageToken } = await this.client.changes([...notes, ...folders].map((item) => item.id));
    for (const change of changes) await this.applyChange(change);
    if (pageToken) await this.repository.setMetadata(CHANGE_TOKEN, pageToken);
  }

  async applyChange(change) {
    const id = itemId(change);
    if (change.removed) {
      await Promise.all([this.repository.removeNote(id), this.repository.removeFolder(id)]);
      return;
    }
    const item = await this.hydrateRemote(change.file ?? change);
    if (item.mimeType === FOLDER_MIME_TYPE) await this.repository.upsertFolder(folderFromDrive(item));
    else await this.repository.upsertNote(noteFromDrive(item, await this.repository.getNote(itemId(item))));
  }

  markPending() { this.setState("pending"); }

  createNote(input = {}) { return this.runExclusive(() => this.createNoteImpl(input)); }
  async createNoteImpl({ title = "Untitled", content = "", parentId = null, name, markdown } = {}) {
    const id = temporaryId();
    const now = new Date().toISOString();
    const note = { id, title, content, tags: [], focus: false, source: "drive-markdown", editable: true, parentId, createdAt: now, updatedAt: now, warning: null };
    const operationId = crypto.randomUUID();
    await this.repository.mutateAndEnqueue({ note, operation: { type: "file.create", id, operationId, payload: { name: name ?? `${title}.md`, markdown: markdown ?? serializeMarkdown({ metadata: note, body: content }), parentId, operationId } } });
    await this.refreshCache(); this.markPending();
    return id;
  }

  updateNote(id, patch) { return this.runExclusive(() => this.updateNoteImpl(id, patch)); }
  async updateNoteImpl(id, patch) {
    const note = await this.repository.getNote(id);
    if (!note || note.source === "drive-doc" || note.editable === false || note.trashed) return;
    const updated = { ...note, ...patch, updatedAt: new Date().toISOString() };
    await this.repository.mutateAndEnqueue({ note: updated, operation: { type: "file.update", id, payload: { markdown: serializeMarkdown({ metadata: updated, body: updated.content }), ...(patch.title === undefined ? {} : { name: patch.title }) } } });
    await this.refreshCache(); this.markPending();
  }

  moveNote(id, parentId) { return this.runExclusive(() => this.moveNoteImpl(id, parentId)); }
  async moveNoteImpl(id, parentId) {
    const note = await this.repository.getNote(id);
    if (!note || note.source === "drive-doc" || note.editable === false || note.trashed) return;
    await this.repository.mutateAndEnqueue({ note: { ...note, parentId }, operation: { type: "file.move", id, payload: { parentId } } });
    await this.refreshCache(); this.markPending();
  }

  trashNote(id) { return this.runExclusive(() => this.trashNoteImpl(id)); }
  async trashNoteImpl(id) {
    const note = await this.repository.getNote(id);
    if (!note || note.source === "drive-doc" || note.editable === false) return;
    await this.repository.mutateAndEnqueue({ note: { ...note, trashed: true, pendingTrash: true }, operation: { type: "file.trash", id, payload: {} } });
    await this.refreshCache(); this.markPending();
  }

  createFolder(input) { return this.runExclusive(() => this.createFolderImpl(input)); }
  async createFolderImpl({ name, parentId = null } = {}) {
    const id = temporaryId();
    const operationId = crypto.randomUUID();
    await this.repository.mutateAndEnqueue({ folder: { id, name, parentId }, operation: { type: "folder.create", id, operationId, payload: { name, parentId, operationId } } });
    await this.refreshCache(); this.markPending(); return id;
  }

  renameFolder(id, name) { return this.runExclusive(() => this.renameFolderImpl(id, name)); }
  async renameFolderImpl(id, name) {
    const folder = await this.repository.getFolder(id); if (!folder) return;
    await this.repository.mutateAndEnqueue({ folder: { ...folder, name }, operation: { type: "folder.rename", id, payload: { name } } });
    await this.refreshCache(); this.markPending();
  }

  moveFolder(id, parentId) { return this.runExclusive(() => this.moveFolderImpl(id, parentId)); }
  async moveFolderImpl(id, parentId) {
    const folder = await this.repository.getFolder(id); if (!folder) return;
    await this.repository.mutateAndEnqueue({ folder: { ...folder, parentId }, operation: { type: "folder.move", id, payload: { parentId } } });
    await this.refreshCache(); this.markPending();
  }

  flushOutbox() { return this.runExclusive(() => this.flushImpl()); }
  async flushImpl({ preserveState = false } = {}) {
    try {
      for (const queued of await this.repository.listOutbox()) {
        const entry = await this.repository.getOutbox(queued.sequence);
        if (!entry) continue;
        const result = await this.execute(entry);
        if (entry.type === "file.create") {
          const local = await this.repository.getNote(entry.id);
          const item = local ? { ...local, id: itemId(result), parentId: result.parents?.[0] ?? local.parentId, createdAt: result.createdTime ?? local.createdAt, updatedAt: result.modifiedTime ?? local.updatedAt } : { id: itemId(result) };
          await this.repository.completeTemporaryCreate({ kind: "note", temporaryId: entry.id, driveId: itemId(result), item, sequence: entry.sequence });
        } else if (entry.type === "folder.create") {
          await this.repository.completeTemporaryCreate({ kind: "folder", temporaryId: entry.id, driveId: itemId(result), item: folderFromDrive(result), sequence: entry.sequence });
        } else {
          await this.repository.completeOutboxEntry(entry);
        }
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
}
