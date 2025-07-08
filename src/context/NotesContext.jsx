import { createContext, useContext, useEffect, useState } from "react";

const NotesContext = createContext();

export const useNotesContext = () => useContext(NotesContext);

const STORAGE_KEY = "notes";

export const NotesProvider = ({ children }) => {
  // 初期読み込み：localStorage → state
  const [notes, setNotes] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [
      { id: "1", title: "初めてのメモ", content: "これは最初のメモです。" },
    ];
  });

  // notesが更新されたときlocalStorageにも保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const getNoteById = (id) => notes.find((note) => note.id === id);

  const addNote = (note) => {
    const newNote = {
      ...note,
      id: Date.now().toString(),
    };
    setNotes((prev) => [...prev, newNote]);
  };

  const updateNote = (id, updated) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...updated } : note))
    );
  };

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        getNoteById,
        addNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
