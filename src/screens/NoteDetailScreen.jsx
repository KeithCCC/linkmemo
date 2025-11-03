// src/screens/NoteDetailScreen.jsx
import { useParams, Link } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import React, { useEffect } from "react";
import MarkdownIt from "markdown-it";
import { addRecentNote } from "../recentNotes";

export default function NoteDetailScreen() {
  const { id } = useParams();
  const { getNoteById, notes } = useNotesContext();
  const note = getNoteById(id);

  useEffect(() => {
    if (note) {
      addRecentNote({ id: note.id, title: note.title || "Untitled" });
    }
  }, [note && note.id]);

  if (!note) {
    return <h2 className="p-4 text-red-500">ノートが見つかりませんでした（ID: {id}）</h2>;
  }

  // 🔹 [[リンク]] を <a> に差し替える
  const convertWikiLinksToHTML = (text) => {
    return text.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
      const target = notes.find(n => n.title === title);
      if (target) {
        return `<a href="/note/${target.id}" class="text-blue-600 underline">${title}</a>`;
      } else {
        return `<span class="text-gray-500">[[${title}]]</span>`;
      }
    });
  };

  // 🔧 Markdownパーサー
  const md = new MarkdownIt({
    breaks: true,         // 改行有効
    linkify: true,        // URL自動リンク
  });

  const contentHTML = md.render(convertWikiLinksToHTML(note.content));

  // 🔁 被リンクノートを抽出
  const backlinks = notes.filter(n => n.backlinks?.includes(note.id));

  return (
    <div className="p-4 py-2 space-y-6">
      <div>
        <h1 className="note-title">
            {note.title} {note.id}
              {/* {noteIdRef.current ? `ノート編集（ID: ${noteIdRef.current}）` : "新規ノート作成"} */}
        </h1>
        <Link
          to={`/edit/${note.id}`}
          className="inline-block mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          ✏️ 編集する
        </Link>

        <div
          className="prose dark:prose-invert prose-sm max-w-none border border-gray-300 dark:border-zinc-700 p-3 mt-4 rounded bg-zinc-100 dark:bg-zinc-800 overflow-auto"
          style={{ height: "calc(100vh - 300px)" }}
          dangerouslySetInnerHTML={{ __html: contentHTML }}
        />
      </div>

      {backlinks.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">🔁 このノートを参照しているノート</h2>
          <ul className="list-disc list-inside text-blue-700">
            {backlinks.map(bn => (
              <li key={bn.id}>
                <Link to={`/note/${bn.id}`} className="underline hover:text-blue-900">
                  {bn.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
