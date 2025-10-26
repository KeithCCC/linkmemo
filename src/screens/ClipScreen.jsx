// src/screens/ClipScreen.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useNotesContext } from '../context/NotesContext';
import { createNote } from '../notesService';

export default function ClipScreen() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { addNote, refreshNotes } = useNotesContext();

  const [status, setStatus] = useState('Preparing clip...');
  const didRunRef = useRef(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const url = params.get('url') || '';
  const titleParam = params.get('title') || '';
  const tagsParam = params.get('tags') || '';

  // Parse tags from query or default to ["clipping" ]
  const tags = useMemo(() => {
    const list = tagsParam
      ? tagsParam.split(',').map(s => s.trim()).filter(Boolean)
      : ['clipping'];
    // Ensure unique, lowercase-like normalization (UI normalizes anyway)
    return Array.from(new Set(list));
  }, [tagsParam]);

  useEffect(() => {
    const run = async () => {
      if (didRunRef.current) return;
      if (!user?.uid) {
        setStatus('Please log in to clip.');
        return;
      }
      if (!url) {
        setStatus('Missing url parameter.');
        return;
      }
      didRunRef.current = true;
      try {
        const now = new Date().toISOString();
        const title = titleParam || url;
        // Use Markdown link format for the URL line
        const linkLine = title && url ? `[${title}](${url})` : (url || "");
        // Minimal markdown body with explicit #clipping tag
        const body = `# ${title}\n\n${linkLine}\n\n#clipping`;
        const note = {
          title,
          content: body,
          tags,
          createdAt: now,
          updatedAt: now,
        };
        const created = await createNote(user.uid, note);
        const newId = typeof created === 'string' ? created : created?.id;
        if (newId) {
          addNote({ id: newId, ...note });
          setStatus('Clipped. Redirecting...');
          // Best-effort refresh in background
          refreshNotes?.().catch(() => {});
          navigate(`/edit/${newId}`, { replace: true });
        } else {
          setStatus('Clipped, but could not get new id.');
        }
      } catch (e) {
        console.error('Clip failed', e);
        setStatus('Failed to clip. Check console.');
      }
    };
    run();
  }, [user?.uid, url, titleParam, tags, addNote, refreshNotes, navigate]);

  return (
    <div className="p-4">
      <div className="text-sm text-gray-600">URL: {url || '(none)'}</div>
      <div className="mt-2 font-medium">{status}</div>
      {!user?.uid && (
        <div className="mt-2">Please sign in from the header and retry.</div>
      )}
    </div>
  );
}
