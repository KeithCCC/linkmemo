const DATABASE_VERSION = 1;
const STORE = { notes: "notes", folders: "folders", outbox: "outbox", metadata: "metadata" };

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase(name, indexedDb) {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(name, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE.notes)) database.createObjectStore(STORE.notes, { keyPath: "id" });
      if (!database.objectStoreNames.contains(STORE.folders)) database.createObjectStore(STORE.folders, { keyPath: "id" });
      if (!database.objectStoreNames.contains(STORE.outbox)) database.createObjectStore(STORE.outbox, { keyPath: "sequence", autoIncrement: true });
      if (!database.objectStoreNames.contains(STORE.metadata)) database.createObjectStore(STORE.metadata, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB database initialization failed"));
    request.onblocked = () => reject(new Error("IndexedDB database initialization was blocked"));
  });
}

function isTemporary(id) { return typeof id === "string" && id.startsWith("local:"); }

export class NotehubRepository {
  constructor({ name = "notehub-drive", indexedDb = globalThis.indexedDB, beforeTransactionCommit } = {}) {
    if (!indexedDb) throw new Error("IndexedDB is unavailable");
    this.database = openDatabase(name, indexedDb);
    this.beforeTransactionCommit = beforeTransactionCommit;
  }

  async transaction(names, work) {
    const database = await this.database;
    const transaction = database.transaction(names, "readwrite");
    const stores = Object.fromEntries(names.map((name) => [name, transaction.objectStore(name)]));
    try {
      const result = await work(stores);
      this.beforeTransactionCommit?.();
      await transactionDone(transaction);
      return result;
    } catch (error) {
      try { transaction.abort(); } catch { /* transaction may already be finished */ }
      throw error;
    }
  }

  async read(store, key) {
    const database = await this.database;
    const transaction = database.transaction(store, "readonly");
    const result = await requestResult(transaction.objectStore(store).get(key));
    await transactionDone(transaction);
    return result;
  }

  async list(store) {
    const database = await this.database;
    const transaction = database.transaction(store, "readonly");
    const result = await requestResult(transaction.objectStore(store).getAll());
    await transactionDone(transaction);
    return result;
  }

  async put(store, value) {
    await this.transaction([store], async (stores) => { stores[store].put(value); });
    return value;
  }

  async remove(store, key) { await this.transaction([store], async (stores) => { stores[store].delete(key); }); }

  listNotes() { return this.list(STORE.notes); }
  getNote(id) { return this.read(STORE.notes, id); }
  upsertNote(note) { return this.put(STORE.notes, note); }
  removeNote(id) { return this.remove(STORE.notes, id); }
  listFolders() { return this.list(STORE.folders); }
  getFolder(id) { return this.read(STORE.folders, id); }
  upsertFolder(folder) { return this.put(STORE.folders, folder); }
  removeFolder(id) { return this.remove(STORE.folders, id); }

  async replaceAll({ notes, folders }) {
    return this.transaction([STORE.notes, STORE.folders], async (stores) => {
      stores.notes.clear(); stores.folders.clear();
      notes.forEach((note) => stores.notes.put(note));
      folders.forEach((folder) => stores.folders.put(folder));
    });
  }

  async replaceRemoteCache({ notes, folders }) {
    return this.transaction([STORE.notes, STORE.folders, STORE.outbox], async (stores) => {
      const [currentNotes, currentFolders, outbox] = await Promise.all([requestResult(stores.notes.getAll()), requestResult(stores.folders.getAll()), requestResult(stores.outbox.getAll())]);
      const pendingIds = new Set(outbox.map((entry) => entry.id));
      const pendingParents = new Set(outbox.map((entry) => entry.payload?.parentId).filter(isTemporary));
      const protectedFolderIds = new Set(outbox.filter((entry) => entry.type === "folder.trash").map((entry) => entry.id));
      let added = true;
      while (added) {
        added = false;
        currentFolders.forEach((folder) => {
          if (protectedFolderIds.has(folder.parentId) && !protectedFolderIds.has(folder.id)) {
            protectedFolderIds.add(folder.id);
            added = true;
          }
        });
      }
      const protectedNoteIds = new Set(currentNotes.filter((note) => protectedFolderIds.has(note.parentId)).map((note) => note.id));
      const preserve = (item, kind) =>
        isTemporary(item.id) ||
        item.trashed ||
        pendingIds.has(item.id) ||
        pendingParents.has(item.parentId) ||
        (kind === "folder" ? protectedFolderIds.has(item.id) : protectedNoteIds.has(item.id));
      const preservedNotes = currentNotes.filter((note) => preserve(note, "note"));
      const preservedFolders = currentFolders.filter((folder) => preserve(folder, "folder"));
      const preservedNoteIds = new Set(preservedNotes.map((note) => note.id));
      const preservedFolderIds = new Set(preservedFolders.map((folder) => folder.id));
      const mergedNotes = [...notes.filter((note) => !preservedNoteIds.has(note.id)), ...preservedNotes];
      const mergedFolders = [...folders.filter((folder) => !preservedFolderIds.has(folder.id)), ...preservedFolders];
      stores.notes.clear(); stores.folders.clear();
      mergedNotes.forEach((note) => stores.notes.put(note));
      mergedFolders.forEach((folder) => stores.folders.put(folder));
    });
  }

  async mutateAndEnqueue({ note, folder, removeNote, removeFolder, operation }) {
    const entry = { ...operation, id: operation.id ?? crypto.randomUUID() };
    return this.transaction([STORE.notes, STORE.folders, STORE.outbox], async (stores) => {
      if (note) stores.notes.put(note);
      if (folder) stores.folders.put(folder);
      if (removeNote) stores.notes.delete(removeNote);
      if (removeFolder) stores.folders.delete(removeFolder);
      const sequence = await requestResult(stores.outbox.add(entry));
      return { ...entry, sequence };
    });
  }

  async enqueue(operation) { return this.mutateAndEnqueue({ operation }); }
  listOutbox() { return this.list(STORE.outbox); }
  getOutbox(sequence) { return this.read(STORE.outbox, sequence); }
  removeOutbox(sequence) { return this.remove(STORE.outbox, sequence); }
  replaceOutbox(entry) { return this.put(STORE.outbox, entry); }

  async completeOutboxEntry(entry) {
    return this.transaction([STORE.notes, STORE.folders, STORE.outbox], async (stores) => {
      if (entry.type === "file.trash") stores.notes.delete(entry.id);
      if (entry.type === "folder.trash") {
        const [notes, folders] = await Promise.all([requestResult(stores.notes.getAll()), requestResult(stores.folders.getAll())]);
        const removedFolderIds = new Set([entry.id]);
        let added = true;
        while (added) {
          added = false;
          folders.forEach((folder) => {
            if (removedFolderIds.has(folder.parentId) && !removedFolderIds.has(folder.id)) {
              removedFolderIds.add(folder.id);
              added = true;
            }
          });
        }
        removedFolderIds.forEach((id) => stores.folders.delete(id));
        notes.filter((note) => removedFolderIds.has(note.parentId)).forEach((note) => stores.notes.delete(note.id));
      }
      stores.outbox.delete(entry.sequence);
    });
  }

  async completeTemporaryCreate({ kind, temporaryId, driveId, item, sequence }) {
    return this.transaction([STORE.notes, STORE.folders, STORE.outbox], async (stores) => {
      const [local, notes, folders, entries] = await Promise.all([
        requestResult((kind === "note" ? stores.notes : stores.folders).get(temporaryId)),
        requestResult(stores.notes.getAll()), requestResult(stores.folders.getAll()), requestResult(stores.outbox.getAll()),
      ]);
      const target = kind === "note" ? stores.notes : stores.folders;
      if (local) { target.delete(temporaryId); target.put({ ...item, ...local, id: driveId }); }
      if (kind === "folder") {
        notes.filter((note) => note.parentId === temporaryId).forEach((note) => stores.notes.put({ ...note, parentId: driveId }));
        folders.filter((folder) => folder.parentId === temporaryId).forEach((folder) => stores.folders.put({ ...folder, parentId: driveId }));
      }
      entries.forEach((entry) => {
        if (entry.sequence === sequence) return;
        const id = entry.id === temporaryId ? driveId : entry.id;
        const parentId = entry.payload?.parentId === temporaryId ? driveId : entry.payload?.parentId;
        if (id !== entry.id || parentId !== entry.payload?.parentId) stores.outbox.put({ ...entry, id, payload: { ...entry.payload, ...(entry.payload?.parentId === undefined ? {} : { parentId }) } });
      });
      stores.outbox.delete(sequence);
    });
  }

  async getMetadata(key) { return (await this.read(STORE.metadata, key))?.value; }
  setMetadata(key, value) { return this.put(STORE.metadata, { key, value }); }
}

export const notehubRepository = new NotehubRepository();
