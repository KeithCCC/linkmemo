import { createContext, useContext, useEffect, useState } from "react";
import { db } from '../firebase'; // ← 必要に応じてパス調整
import { collection, getDocs } from 'firebase/firestore';
import { useAuthContext } from './AuthContext'; // ← ログイン中のユーザーを使う前提

const NotesContext = createContext();
export const useNotesContext = () => useContext(NotesContext);

const STORAGE_KEY = "notes";

export const NotesProvider = ({ children }) => {
  const { user } = useAuthContext(); // ← これを追加！ 🔥
  const [notes, setNotes] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const now = new Date().toISOString();

    // createdAt / updatedAt を補完
    return parsed.map((note) => ({
      ...note,
      createdAt: note.createdAt || now,
      updatedAt: note.updatedAt || now,
    }));
  });

  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt"); // or "createdAt"
  const [sortOrder, setSortOrder] = useState("desc"); // or "asc"

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const getNoteById = (id) => notes.find((note) => note.id === id);

  const getSortedNotes = () => {
    const filtered = notes.filter(
      (note) =>
        note.title.toLowerCase().includes(searchText.toLowerCase()) ||
        note.content.toLowerCase().includes(searchText.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a[sortBy]);
      const dateB = new Date(b[sortBy]);

      if (isNaN(dateA) || isNaN(dateB)) return 0;
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return sorted;
  };

  useEffect(() => {
    if (user) return; // Firestore優先時はローカル保存しない
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, user]);

const addNote = (note) => {
  const now = new Date().toISOString();
  const newNote = {
    ...note,
    id: note.id, // ← Firebaseから渡されたIDを使う
    createdAt: note.createdAt || now,
    updatedAt: now,
  };
  setNotes((prev) => {
    // 既存IDのノートがあれば更新、なければ追加
    const exists = prev.some(n => n.id === newNote.id);
    return exists
      ? prev.map(n => (n.id === newNote.id ? newNote : n))
      : [...prev, newNote];
  });
};


  const updateNote = (id, updated) => {
    const now = new Date().toISOString();
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...updated, updatedAt: now } : note
      )
    );
  };

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  useEffect(() => {
    const fetchNotesFromFirestore = async () => {
      if (!user) return;

      const snapshot = await getDocs(collection(db, 'users', user.uid, 'notes'));
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotes(fetched);
    };

    fetchNotesFromFirestore();
  }, [user]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        searchText,
        setSearchText,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        getNoteById,
        getSortedNotes,
        addNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
