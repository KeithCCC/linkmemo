import { useState, useEffect } from 'react'

export function useNotes() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('notes')
    return saved ? JSON.parse(saved) : [
      { id: 1, title: '会議メモ', content: '会議内容...', tags: ['会議'], updatedAt: '2025-07-06' },
    ]
  })

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes))
  }, [notes])

  const createNote = () => {
    const now = new Date().toISOString().split('T')[0];
    const newNote = {
      id: Date.now(),
      title: '',
      content: '',
      tags: [],
      backlinks: [],
      createdAt: now,
      updatedAt: now,
    };
    setNotes([...notes, newNote]);
    return newNote.id;
  }

  const updateNote = (id, updated) => {
  const numericId = parseInt(id);
  const now = new Date().toISOString().split('T')[0];

  const oldNote = notes.find(n => n.id === numericId);
  if (!oldNote) return;

  const extractLinkedTitles = (content) => {
    const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    return matches.map(m => m.slice(2, -2)); // [[title]] → title
  };

  const oldLinks = extractLinkedTitles(oldNote.content);
  const newLinks = extractLinkedTitles(updated.content);

  // タイトルからリンク先ノートを取得
  const findNoteByTitle = (title) =>
    notes.find(n => n.title === title && n.id !== numericId);

  // backlinks 更新用のノート配列
  const updatedNotes = notes.map(note => {
    // backlink対象ノートではない → そのまま返す
    if (note.id === numericId) return note;

    const titleMatched = oldLinks.includes(note.title) || newLinks.includes(note.title);

    if (!titleMatched) return note;

    const backlinks = new Set(note.backlinks || []);

    // 古いリンクは削除
    if (oldLinks.includes(note.title)) backlinks.delete(numericId);
    // 新しいリンクは追加
    if (newLinks.includes(note.title)) backlinks.add(numericId);

    return { ...note, backlinks: Array.from(backlinks) };
  });

  // 編集対象ノートも更新して追加
  const updatedNote = {
    ...oldNote,
    ...updated,
    updatedAt: now,
  };

  setNotes(
    updatedNotes.map(n => n.id === numericId ? updatedNote : n)
  );
};

  const getNoteById = (id) => notes.find(n => n.id === parseInt(id))

  return { notes, createNote, updateNote, getNoteById }
}
