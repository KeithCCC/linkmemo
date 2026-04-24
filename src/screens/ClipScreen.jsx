// src/screens/ClipScreen.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useNotesContext } from '../context/NotesContext';
import { createNote } from '../services/notesService';

export default function ClipScreen() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { addNote, refreshNotes } = useNotesContext();

  const [status, setStatus] = useState('Preparing clip...');
  const [debugInfo, setDebugInfo] = useState('');
  const didRunRef = useRef(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const url = params.get('url') || '';
  const titleParam = params.get('title') || '';
  const tagsParam = params.get('tags') || '';
  const contentParam = params.get('content') || '';
  const contentIdParam = params.get('contentId') || '';
  const sourceParam = params.get('source') || '';

  // Debug logging
  useEffect(() => {
    const debug = [
      `URL: ${url}`,
      `Title: ${titleParam}`,
      `Source: ${sourceParam}`,
      `Content Param Length: ${contentParam?.length || 0}`,
      `Content ID Param: ${contentIdParam}`,
      `Content Preview: ${contentParam?.substring(0, 100)}...`,
      `Content End: ...${contentParam?.substring(contentParam?.length - 100)}`
    ].join('\n');
    
    setDebugInfo(debug);
    console.log('=== ClipScreen Debug ===');
    console.log(debug);
  }, [url, titleParam, sourceParam, contentParam, contentIdParam]);

  // Parse tags from query or default based on source
  const tags = useMemo(() => {
    let defaultTags = ['clipping'];
    
    // Add specific tags based on source
    if (sourceParam === 'chatgpt-ext') {
      defaultTags = ['chatgpt', 'clipping'];
    } else if (sourceParam === 'chatgpt') {
      defaultTags = ['chatgpt'];
    }
    
    const list = tagsParam
      ? tagsParam.split(',').map(s => s.trim()).filter(Boolean)
      : defaultTags;
    // Ensure unique, lowercase-like normalization (UI normalizes anyway)
    return Array.from(new Set(list));
  }, [tagsParam, sourceParam]);

  useEffect(() => {
    const run = async () => {
      if (didRunRef.current) return;
      if (!user?.uid) {
        setStatus('Please log in to clip.');
        return;
      }
      if (!url && !contentParam && !contentIdParam) {
        setStatus('Missing url or content parameter.');
        return;
      }
      didRunRef.current = true;
      try {
        const now = new Date().toISOString();
        const title = titleParam || url || 'Clipped Content';
        
        let finalContent = contentParam;
        
        // If contentId is provided, retrieve content from extension storage
        if (contentIdParam && !finalContent) {
          try {
            // Try to get content from Chrome extension storage
            // Don't specify extension ID - let Chrome handle it
            const result = await new Promise((resolve, reject) => {
              if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
                try {
                  chrome.runtime.sendMessage(
                    { action: 'getStoredContent', contentId: contentIdParam },
                    (response) => {
                      if (chrome.runtime.lastError) {
                        console.warn('Chrome runtime error:', chrome.runtime.lastError);
                        resolve(null);
                      } else {
                        resolve(response);
                      }
                    }
                  );
                } catch (err) {
                  console.warn('Failed to send message to extension:', err);
                  resolve(null);
                }
              } else {
                console.log('Chrome extension API not available');
                resolve(null);
              }
            });
            
            if (result && result.content) {
              finalContent = result.content;
              console.log('Retrieved content from extension storage:', finalContent.length, 'chars');
            } else {
              console.warn('Could not retrieve stored content from extension');
              // Don't return - continue with content from URL if available
            }
          } catch (error) {
            console.error('Failed to retrieve stored content:', error);
            // Don't return - continue with content from URL if available
          }
        }
        
        console.log('Final content length:', finalContent?.length);
        console.log('Creating note with content length:', finalContent?.length);
        
        let body;
        if (finalContent) {
          // Content-based clipping (e.g., ChatGPT response)
          const linkLine = url ? `\n\nSource: [${url}](${url})` : '';
          const tagLine = tags.map(tag => `#${tag}`).join(' ');
          body = `# ${title}\n\n${finalContent}${linkLine}\n\n${tagLine}`;
        } else {
          // URL-based clipping (traditional)
          const linkLine = title && url ? `[${title}](${url})` : (url || "");
          const tagLine = tags.map(tag => `#${tag}`).join(' ');
          body = `# ${title}\n\n${linkLine}\n\n${tagLine}`;
        }
        
        console.log('Final body length:', body.length);
        console.log('Body preview:', body.substring(0, 200));
        console.log('Body end:', body.substring(body.length - 200));
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
  }, [user?.uid, url, titleParam, contentParam, contentIdParam, sourceParam, tags, addNote, refreshNotes, navigate]);

  return (
    <div className="app-page-tight">
      <section className="app-reading-surface p-6 sm:p-8">
        <div className="app-doc">
          <div className="app-section-title mb-3">Web clipper</div>
          <h1 className="text-2xl font-black tracking-tight">Clip content into ASUKA</h1>
          <p className="mt-3 app-muted-text">
            Source URL: <span className="font-medium text-[var(--app-text)]">{url || "(none)"}</span>
          </p>
          <div className="mt-4 rounded-2xl border app-panel p-4">
            <div className="text-sm font-semibold">Status</div>
            <div className="mt-2 text-base">{status}</div>
          </div>

          {!user?.uid && (
            <div className="mt-5 rounded-2xl border bg-amber-50 p-4 text-sm text-amber-950">
              Sign in from the sidebar header, then retry the clip action.
            </div>
          )}

          {import.meta.env.DEV && (
            <details className="mt-5 rounded-2xl border bg-gray-50 p-4 text-gray-900">
              <summary className="cursor-pointer text-sm font-semibold">Debug details</summary>
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-xs">{debugInfo}</pre>
            </details>
          )}
        </div>
      </section>
    </div>
  );
}
