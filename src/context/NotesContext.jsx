import { createContext, useContext, useState } from "react";

const NotesContext = createContext();

export const useNotesContext = () => useContext(NotesContext);

export const NotesProvider = ({ children }) => {
  const [notes, setNotes] = useState([
    { id: "1", title: "初めてのメモ", content: "これは最初のメモです。" },
    { id: "2", title: "2つ目のノート", content: "Reactメモ帳アプリ作成中！" },
  ]);

  // ノート取得
  const getNoteById = (id) => notes.find((note) => note.id === id);

  // ノート追加
  const addNote = (note) => {
    const newNote = {
      ...note,
      id: Date.now().toString(), // 一意のIDを生成
    };
    setNotes((prev) => [...prev, newNote]);
  };

  // ノート更新
  const updateNote = (id, updated) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...updated } : note))
    );
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        getNoteById,
        addNote,
        updateNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
