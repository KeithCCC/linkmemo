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

  // 外部リンクを新しいウィンドウで開く
  const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');
    if (hrefIndex >= 0) {
      const href = token.attrs[hrefIndex][1];
      // 外部リンク（http/httpsで始まる）の場合、target="_blank"を追加
      if (href.startsWith('http://') || href.startsWith('https://')) {
        token.attrPush(['target', '_blank']);
        token.attrPush(['rel', 'noopener noreferrer']);
      }
    }
    return defaultRender(tokens, idx, options, env, self);
  };

  const contentHTML = md.render(convertWikiLinksToHTML(note.content));

  // 🔁 被リンクノートを抽出
  const backlinks = notes.filter(n => n.backlinks?.includes(note.id));

  return (
    <div className="p-2 py-1 space-y-4">
      <div>
        <h1 className="note-title">
            {note.title} {note.id}
              {/* {noteIdRef.current ? `ノート編集（ID: ${noteIdRef.current}）` : "新規ノート作成"} */}
        </h1>
        <div className="flex gap-2 mt-2">
          <Link
            to={`/edit/${note.id}`}
            className="inline-block text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            ✏️ 編集する
          </Link>
          
          <a
            href="/asuka-clipper.zip"
            download="asuka-clipper.zip"
            className="inline-block text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            📥 Chrome拡張機能をダウンロード
          </a>
        </div>

        <div
          className="prose dark:prose-invert prose-sm max-w-none border border-gray-300 dark:border-gray-500 p-3 mt-4 rounded bg-gray-100 dark:bg-gray-600 overflow-auto"
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
