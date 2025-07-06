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
    const newNote = {
      id: Date.now(),
      title: '',
      content: '',
      tags: [],
      updatedAt: new Date().toISOString().split('T')[0],
    }
    setNotes([...notes, newNote])
    return newNote.id
  }

  const updateNote = (id, updated) => {
    setNotes(notes.map(n => n.id === parseInt(id) ? { ...n, ...updated, updatedAt: new Date().toISOString().split('T')[0] } : n))
  }

  const getNoteById = (id) => notes.find(n => n.id === parseInt(id))

  return { notes, createNote, updateNote, getNoteById }
}
