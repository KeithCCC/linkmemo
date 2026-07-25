const DATABASE_VERSION = 1;
const STORE = {
  notes: "notes",
  folders: "folders",
  outbox: "outbox",
  metadata: "metadata",
};

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

export class NotehubRepository {
  constructor({ name = "notehub-drive", indexedDb = globalThis.indexedDB } = {}) {
    if (!indexedDb) throw new Error("IndexedDB is unavailable");
    this.database = openDatabase(name, indexedDb);
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
    const database = await this.database;
    const transaction = database.transaction(store, "readwrite");
    await requestResult(transaction.objectStore(store).put(value));
    await transactionDone(transaction);
    return value;
  }

  async remove(store, key) {
    const database = await this.database;
    const transaction = database.transaction(store, "readwrite");
    await requestResult(transaction.objectStore(store).delete(key));
    await transactionDone(transaction);
  }

  listNotes() { return this.list(STORE.notes); }
  getNote(id) { return this.read(STORE.notes, id); }
  upsertNote(note) { return this.put(STORE.notes, note); }
  removeNote(id) { return this.remove(STORE.notes, id); }
  listFolders() { return this.list(STORE.folders); }
  getFolder(id) { return this.read(STORE.folders, id); }
  upsertFolder(folder) { return this.put(STORE.folders, folder); }
  removeFolder(id) { return this.remove(STORE.folders, id); }

  async replaceAll({ notes, folders }) {
    const database = await this.database;
    const transaction = database.transaction([STORE.notes, STORE.folders], "readwrite");
    const noteStore = transaction.objectStore(STORE.notes);
    const folderStore = transaction.objectStore(STORE.folders);
    noteStore.clear();
    folderStore.clear();
    for (const note of notes) noteStore.put(note);
    for (const folder of folders) folderStore.put(folder);
    await transactionDone(transaction);
  }

  async enqueue(operation) {
    const database = await this.database;
    const transaction = database.transaction(STORE.outbox, "readwrite");
    const entry = { ...operation, id: operation.id ?? crypto.randomUUID() };
    const sequence = await requestResult(transaction.objectStore(STORE.outbox).add(entry));
    await transactionDone(transaction);
    return { ...entry, sequence };
  }

  listOutbox() { return this.list(STORE.outbox); }
  getOutbox(sequence) { return this.read(STORE.outbox, sequence); }
  removeOutbox(sequence) { return this.remove(STORE.outbox, sequence); }

  async replaceOutbox(entry) {
    return this.put(STORE.outbox, entry);
  }

  async getMetadata(key) {
    return (await this.read(STORE.metadata, key))?.value;
  }

  setMetadata(key, value) { return this.put(STORE.metadata, { key, value }); }
}

export const notehubRepository = new NotehubRepository();
