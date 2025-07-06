import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNotesContext } from '../context/NotesContext'

export default function NoteEditScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createNote, updateNote, getNoteById } = useNotesContext()

  const [note, setNote] = useState({ title: '', content: '' })

  useEffect(() => {
    if (id === 'new') {
      const newId = createNote()
      navigate(`/edit/${newId}`, { replace: true })
    } else {
      const existing = getNoteById(id)
      if (existing) setNote(existing)
    }
  }, [id])

  const handleSave = () => {
    updateNote(id, note)
    navigate(`/note/${id}`)
  }

  return (
    <div className="p-4">
      <input
        type="text"
        placeholder="タイトル"
        className="border p-2 w-full"
        value={note.title}
        onChange={(e) => setNote({ ...note, title: e.target.value })}
      />
      <textarea
        className="border p-2 w-full mt-2 h-40"
        placeholder="本文"
        value={note.content}
        onChange={(e) => setNote({ ...note, content: e.target.value })}
      />
      <button onClick={handleSave} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
        保存
      </button>
    </div>
  )
}
