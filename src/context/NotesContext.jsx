import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuthContext } from "./AuthContext";
import { createUxDriveService, uxLegacyNotesService } from "../services/dummyNotesService";

// Default services deliberately stay in-browser while external connections are
// paused.  Production Drive and Legacy adapters remain server-side work for a
// later re-enable, but must not be imported into this client bundle.
const defaultDriveService = createUxDriveService();
const defaultLegacyService = uxLegacyNotesService;

export const NotesContext = createContext(null);
export const useNotesContext = () => useContext(NotesContext);

export const extractAllTags = (notes = []) => {
  const tags = new Set();
  const hashtag = /(?:^|\s)#([^\s#]+)/gu;
  notes.forEach((note) => {
    for (const match of String(note.content ?? "").matchAll(hashtag)) tags.add(match[1]);
    (Array.isArray(note.tags) ? note.tags : []).forEach((tag) => tags.add(tag));
  });
  return [...tags].sort();
};

export function descendantFolderIds(folders = [], folderId) {
  const ids = new Set(folderId ? [folderId] : []);
  let added = true;
  while (added) {
    added = false;
    folders.forEach((folder) => {
      if (ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        added = true;
      }
    });
  }
  return ids;
}

export function folderPath(folders = [], folderId) {
  if (!folderId) return "Notehub";
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const names = [];
  const seen = new Set();
  let current = byId.get(folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = byId.get(current.parentId);
  }
  return ["Notehub", ...names].join(" / ");
}

export function classifySyncError(error, online = globalThis.navigator?.onLine !== false) {
  if (!online) return { code: "OFFLINE", title: "You are offline", action: "Retry when online" };
  const code = error?.code ?? "SYNC";
  if (code === "AUTH") return { code, title: "Sign-in expired", action: "Sign in again" };
  if (code === "CONFIGURATION" || code === "NOT_FOUND") return { code, title: "Choose a Notehub folder", action: "Open Drive settings" };
  if (code === "BOUNDARY") return { code, title: "Item is outside Notehub", action: "Choose an item inside Notehub" };
  if (code === "RATE_LIMIT" || code === "UPSTREAM") return { code, title: code === "RATE_LIMIT" ? "Google Drive is rate-limiting sync" : "Google Drive is unavailable", action: "Retry sync" };
  return { code, title: "Sync needs attention", action: "Retry sync" };
}

async function settled(action) {
  try {
    return await action();
  } catch {
    return null;
  }
}

export const NotesProvider = ({
  children,
  driveService = defaultDriveService,
  legacyService = defaultLegacyService,
  connectionClient = driveService?.client,
}) => {
  const auth = useAuthContext();
  const user = auth?.user;
  const [driveNotes, setDriveNotes] = useState([]);
  const [legacyNotes, setLegacyNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [syncState, setSyncState] = useState("offline");
  const [syncError, setSyncError] = useState(null);
  const [connection, setConnection] = useState({ connected: false, folderId: null, loading: true, error: null });
  const [currentWorkspace, setCurrentWorkspace] = useState({ type: "all", folderId: null });
  const connectionRef = useRef(connection);

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  const applySnapshot = useCallback((snapshot = {}) => {
    if (Array.isArray(snapshot.notes)) setDriveNotes(snapshot.notes);
    if (Array.isArray(snapshot.folders)) setFolders(snapshot.folders);
    if (snapshot.state) setSyncState(snapshot.state);
    setSyncError(snapshot.error ?? null);
  }, []);

  const syncNow = useCallback(async () => {
    if (globalThis.navigator?.onLine === false) {
      setSyncState("offline");
      setSyncError(Object.assign(new Error("Browser is offline"), { code: "OFFLINE" }));
      return null;
    }
    try {
      const snapshot = await driveService.sync();
      applySnapshot(snapshot);
      return snapshot;
    } catch (error) {
      setSyncState("error");
      setSyncError(error);
      return null;
    }
  }, [applySnapshot, driveService]);

  const refreshConnection = useCallback(async () => {
    if (!connectionClient?.connection) {
      const next = { connected: false, folderId: null, loading: false, error: null };
      setConnection(next);
      return next;
    }
    try {
      const result = await connectionClient.connection();
      const next = { ...result, loading: false, error: null };
      setConnection(next);
      return next;
    } catch (error) {
      const next = { connected: false, folderId: null, loading: false, error };
      setConnection(next);
      return next;
    }
  }, [connectionClient]);

  useEffect(() => {
    if (!user?.uid) {
      setDriveNotes([]);
      setLegacyNotes([]);
      setFolders([]);
      setSyncState("offline");
      setSyncError(null);
      setConnection({ connected: false, folderId: null, loading: false, error: null });
      return undefined;
    }

    let active = true;
    const unsubscribe = driveService.subscribe?.((snapshot) => {
      if (active) applySnapshot(snapshot);
    }) ?? (() => {});

    const start = async () => {
      const cached = await driveService.hydrate();
      if (!active) return;
      applySnapshot(cached);
      const [nextConnection, legacy] = await Promise.all([
        refreshConnection(),
        settled(() => legacyService.list(user.uid)),
      ]);
      if (!active) return;
      setLegacyNotes((legacy ?? []).map((note) => ({ ...note, source: "legacy", editable: false })));
      if (nextConnection?.connected && nextConnection?.folderId && globalThis.navigator?.onLine !== false) await syncNow();
    };
    start().catch((error) => {
      if (active) {
        setSyncState("error");
        setSyncError(error);
      }
    });

    const onOffline = () => {
      setSyncState("offline");
      setSyncError(Object.assign(new Error("Browser is offline"), { code: "OFFLINE" }));
    };
    const onOnline = () => {
      if (connectionRef.current?.connected && connectionRef.current?.folderId) void syncNow();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [applySnapshot, driveService, legacyService, refreshConnection, syncNow, user?.uid]);

  const selectWorkspace = useCallback((workspace) => {
    setCurrentWorkspace({
      type: workspace?.type ?? "all",
      folderId: workspace?.type === "folder" ? workspace.folderId : null,
    });
  }, []);

  const currentFolder = currentWorkspace.type === "folder"
    ? folders.find((folder) => folder.id === currentWorkspace.folderId) ?? null
    : null;

  const visibleNotes = useMemo(() => {
    if (currentWorkspace.type === "legacy") return legacyNotes;
    if (currentWorkspace.type === "tags") return driveNotes.filter((note) => Array.isArray(note.tags) && note.tags.length > 0);
    if (currentWorkspace.type === "focus") return driveNotes.filter((note) => note.focus);
    if (currentWorkspace.type === "folder") {
      const ids = descendantFolderIds(folders, currentWorkspace.folderId);
      return driveNotes.filter((note) => ids.has(note.parentId));
    }
    return driveNotes;
  }, [currentWorkspace, driveNotes, folders, legacyNotes]);

  const autoFlush = useCallback(() => {
    if (globalThis.navigator?.onLine !== false && connectionRef.current?.connected && connectionRef.current?.folderId) {
      void driveService.flushOutbox().catch((error) => {
        setSyncState("error");
        setSyncError(error);
      });
    }
  }, [driveService]);

  const mutate = useCallback(async (method, ...args) => {
    const result = await driveService[method](...args);
    applySnapshot(driveService.snapshot?.());
    autoFlush();
    return result;
  }, [applySnapshot, autoFlush, driveService]);

  const createDriveNote = useCallback((input = {}) => mutate("createNote", {
    ...input,
    parentId: input.parentId ?? currentWorkspace.folderId ?? null,
  }), [currentWorkspace.folderId, mutate]);
  const updateDriveNote = useCallback((id, patch) => mutate("updateNote", id, patch), [mutate]);
  const moveDriveNote = useCallback((id, parentId) => mutate("moveNote", id, parentId), [mutate]);
  const trashDriveNote = useCallback((id) => mutate("trashNote", id), [mutate]);
  const createDriveFolder = useCallback((input) => mutate("createFolder", input), [mutate]);
  const renameDriveFolder = useCallback((id, name) => mutate("renameFolder", id, name), [mutate]);
  const moveDriveFolder = useCallback((id, parentId) => mutate("moveFolder", id, parentId), [mutate]);
  const trashDriveFolder = useCallback((id) => mutate("trashFolder", id), [mutate]);

  const copyLegacyToNotehub = useCallback(async (legacyId, parentId = currentWorkspace.folderId ?? null) => {
    const note = await legacyService.get?.(user?.uid, legacyId) ?? legacyNotes.find((item) => item.id === legacyId);
    if (!note) return null;
    const id = await mutate("createNote", { title: note.title, content: note.content, parentId });
    if (driveService.updateNote && ((note.tags?.length ?? 0) > 0 || note.focus)) {
      await mutate("updateNote", id, { tags: note.tags ?? [], focus: Boolean(note.focus) });
    }
    return id;
  }, [currentWorkspace.folderId, driveService, legacyNotes, legacyService, mutate, user?.uid]);

  const saveDriveConnection = useCallback(async (folderId) => {
    try {
      const next = await connectionClient.updateConnection(folderId);
      setConnection({ ...next, loading: false, error: null });
      await syncNow();
      return next;
    } catch (error) {
      setConnection((current) => ({ ...current, loading: false, error }));
      throw error;
    }
  }, [connectionClient, syncNow]);

  const startDriveOAuth = useCallback(async () => connectionClient.oauthStart(), [connectionClient]);

  const allNotes = useMemo(() => [...driveNotes, ...legacyNotes], [driveNotes, legacyNotes]);
  const getNoteById = useCallback((id) => allNotes.find((note) => String(note.id) === String(id)), [allNotes]);

  const value = {
    notes: allNotes,
    driveNotes,
    legacyNotes,
    visibleNotes,
    folders,
    connection,
    syncState,
    syncError,
    syncErrorInfo: syncError ? classifySyncError(syncError) : null,
    currentWorkspace,
    currentFolder,
    currentFolderPath: folderPath(folders, currentFolder?.id),
    selectWorkspace,
    getNoteById,
    getSortedNotes: () => visibleNotes,
    createDriveNote,
    updateDriveNote,
    moveDriveNote,
    trashDriveNote,
    createDriveFolder,
    renameDriveFolder,
    moveDriveFolder,
    trashDriveFolder,
    copyLegacyToNotehub,
    refreshConnection,
    saveDriveConnection,
    startDriveOAuth,
    syncNow,
    retrySync: syncNow,
    refreshNotes: syncNow,
    addNote: createDriveNote,
    updateNote: updateDriveNote,
    deleteNote: trashDriveNote,
    lastDeletedNoteId: null,
  };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};
