import { useParams, Link } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import React, { useEffect } from "react";
import MarkdownIt from "markdown-it";
import { addRecentNote } from "../recentNotes";
import { buildEditHref } from "../noteRoutes";

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
    return (
      <div className="app-page-tight">
        <section className="app-reading-surface p-6 sm:p-8">
          <div className="app-doc">
            <div className="app-section-title mb-3">Missing note</div>
            <h1 className="note-title text-red-500">This note could not be found.</h1>
            <p className="mt-3 app-muted-text">
              The note ID <code>{id}</code> does not exist in the current workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/" className="app-primary-button">Back to notes</Link>
              <Link to="/edit/new" className="app-secondary-button">Create a new note</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const convertWikiLinksToHTML = (text) => {
    return text.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
      const target = notes.find((n) => n.title === title);
      if (target) {
        return `<a href="${buildEditHref(target.id)}" class="text-blue-600 underline">${title}</a>`;
      }
      return `<span class="text-gray-500">[[${title}]]</span>`;
    });
  };

  const md = new MarkdownIt({
    breaks: true,
    linkify: true,
  });

  const defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex("href");
    if (hrefIndex >= 0) {
      const href = token.attrs[hrefIndex][1];
      if (href.startsWith("http://") || href.startsWith("https://")) {
        token.attrPush(["target", "_blank"]);
        token.attrPush(["rel", "noopener noreferrer"]);
      }
    }
    return defaultRender(tokens, idx, options, env, self);
  };

  const contentHTML = md.render(convertWikiLinksToHTML(note.content));
  const backlinks = notes.filter((n) => n.backlinks?.includes(note.id));

  return (
    <div className="app-page-tight">
      <section className="app-reading-surface p-6 sm:p-8">
        <div className="app-doc space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="app-section-title mb-2">Note detail</div>
              <h1 className="note-title">{note.title}</h1>
              <div className="mt-2 text-sm app-muted-text">ID: {note.id}</div>
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Link to={`/edit/${note.id}`} className="app-primary-button text-sm">
                Edit note
              </Link>
              <a href="/asuka-clipper.zip" download="asuka-clipper.zip" className="app-secondary-button text-sm">
                Download web clipper
              </a>
            </div>
          </div>

          <div
            className="prose dark:prose-invert max-w-none rounded-2xl border app-panel p-5 sm:p-6 overflow-auto"
            style={{ maxHeight: "calc(100vh - 260px)" }}
            dangerouslySetInnerHTML={{ __html: contentHTML }}
          />

          {backlinks.length > 0 && (
            <div className="rounded-2xl border app-panel p-5">
              <h2 className="text-lg font-semibold mb-3">Backlinks</h2>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                {backlinks.map((bn) => (
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
      </section>
    </div>
  );
}
