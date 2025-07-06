// src/context/NotesContext.jsx
import { createContext, useContext } from "react";

const NotesContext = createContext();

export const useNotesContext = () => useContext(NotesContext);

export const NotesProvider = ({ children }) => {
  // 仮のノート一覧（IDは文字列）
  const mockNotes = [
    { id: "1", title: "初めてのメモ", content: "これは最初のメモです。" },
    { id: "2", title: "二つ目のノート", content: "Reactメモ帳アプリ作成中！" },
  ];

  const getNoteById = (id) => mockNotes.find((note) => note.id === id);

return (
  <NotesContext.Provider value={{ getNoteById, notes: mockNotes }}>
    {children}
  </NotesContext.Provider>
);

};
