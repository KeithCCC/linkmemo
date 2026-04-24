import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import { addRecentNote, getRecentNotes } from "../recentNotes";
import { updateNote as updateNoteRemote } from "../services/notesService";

const GROUP_PREFIX = "group:";
const WORKSPACE_TABS = [
  { key: "all", label: "All" },
  { key: "recent", label: "Recent" },
  { key: "tags", label: "Tags" },
  { key: "groups", label: "Groups" },
  { key: "focus", label: "Focus" },
];

const normalize = (s = "") => s.trim().toLowerCase();
const stripHash = (s = "") => s.replace(/^#/, "");
const isGroupTag = (t = "") => t.startsWith(GROUP_PREFIX) || t.includes(";");

const mineTags = (title = "", content = "") => {
  const re = /(?<![A-Za-z0-9_])#([A-Za-z0-9\u00C0-\uFFFF._/-]+)(?=\s|$|[,.!?:;)\]}<>])/gu;
  const set = new Set();
  for (const m of (`${title}\n${content}`).matchAll(re)) set.add(normalize(m[1]));
  return [...set];
};

const getNoteTags = (note) => {
  const saved = Array.isArray(note.tags)
    ? note.tags.map((t) => normalize(stripHash(t)))
    : typeof note.tags === "string" && stripHash(note.tags)
      ? [normalize(stripHash(note.tags))]
      : [];
  const mined = mineTags(note.title, note.content);
  return [...new Set([...saved, ...mined])];
};

const formatDate = (value) => {
  const d = value?.toDate ? value.toDate() : new Date(value);
  return d?.toLocaleString?.() || "-";
};

export default function NoteListScreen({ embedded = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { notes, updateNote, deleteNote } = useNotesContext();
  const allNotes = Array.isArray(notes) ? notes : [];
  const user = null;

  const [searchTerm, setSearchTerm] = useState(() => {
    try { return localStorage.getItem("list.searchTerm") || ""; } catch { return ""; }
  });
  const [tagStates, setTagStates] = useState(() => {
    try {
      const raw = localStorage.getItem("list.tagStates");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem("list.viewMode") || "card"; } catch { return "card"; }
  });
  const [workspaceTab, setWorkspaceTab] = useState(() => {
    try { return localStorage.getItem("list.workspaceTab") || "all"; } catch { return "all"; }
  });
  const [sortMode, setSortMode] = useState(() => {
    try { return localStorage.getItem("list.sortMode") || "updated"; } catch { return "updated"; }
  });
  const [sortDirection, setSortDirection] = useState(() => {
    try { return localStorage.getItem("list.sortDirection") || "desc"; } catch { return "desc"; }
  });
  const [autoDetectedView, setAutoDetectedView] = useState("list");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const containerClass = embedded ? "w-full" : "app-page";

  const listRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const checkWidth = () => setAutoDetectedView(window.innerWidth < 768 ? "card" : "list");
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => { try { localStorage.setItem("list.searchTerm", searchTerm); } catch {} }, [searchTerm]);
  useEffect(() => { try { localStorage.setItem("list.tagStates", JSON.stringify(tagStates)); } catch {} }, [tagStates]);
  useEffect(() => { try { localStorage.setItem("list.viewMode", viewMode); } catch {} }, [viewMode]);
  useEffect(() => { try { localStorage.setItem("list.workspaceTab", workspaceTab); } catch {} }, [workspaceTab]);
  useEffect(() => { try { localStorage.setItem("list.sortMode", sortMode); } catch {} }, [sortMode]);
  useEffect(() => { try { localStorage.setItem("list.sortDirection", sortDirection); } catch {} }, [sortDirection]);

  const isCardView = viewMode === "auto" ? autoDetectedView === "card" : viewMode === "card";
  const isDenseView = viewMode === "dense";

  const allTags = useMemo(() => {
    const set = new Set();
    allNotes.forEach((n) => getNoteTags(n).forEach((tag) => set.add(tag)));
    return [...set].sort();
  }, [allNotes]);

  const sortedNotes = useMemo(() => {
    const sorted = [...allNotes];

    if (sortMode === "tags") {
      sorted.sort((a, b) => {
        const tagA = [...getNoteTags(a)].sort()[0] || "\uffff";
        const tagB = [...getNoteTags(b)].sort()[0] || "\uffff";
        const c = tagA.localeCompare(tagB);
        if (c !== 0) return c;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      return sorted;
    }

    sorted.sort((a, b) => {
      const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return sortDirection === "asc" ? -diff : diff;
    });
    return sorted;
  }, [allNotes, sortMode, sortDirection]);

  const filteredNotes = useMemo(() => {
    const q = normalize(searchTerm);
    const includeTags = Object.entries(tagStates).filter(([, v]) => v === "include").map(([k]) => normalize(stripHash(k)));
    const excludeTags = Object.entries(tagStates).filter(([, v]) => v === "exclude").map(([k]) => normalize(stripHash(k)));

    return sortedNotes.filter((note) => {
      const title = normalize(note.title || "");
      const content = normalize(note.content || "");
      const tags = new Set(getNoteTags(note));

      const textHit = !q || title.includes(q) || content.includes(q) || [...tags].some((t) => t.includes(q));
      const includeOk = includeTags.every((tag) => tags.has(tag));
      const excludeOk = !excludeTags.some((tag) => tags.has(tag));

      return textHit && includeOk && excludeOk;
    });
  }, [sortedNotes, searchTerm, tagStates]);

  const workspaceFilteredNotes = useMemo(() => {
    const recentSet = new Set(getRecentNotes().map((n) => n.id?.toString()));
    return filteredNotes.filter((note) => {
      const tags = getNoteTags(note);
      if (workspaceTab === "recent") return recentSet.has(note.id?.toString());
      if (workspaceTab === "tags") return tags.length > 0;
      if (workspaceTab === "groups") return tags.some((t) => isGroupTag(t));
      if (workspaceTab === "focus") return Boolean(note.focus);
      return true;
    });
  }, [filteredNotes, workspaceTab]);

  useEffect(() => {
    if (location?.state?.focusFirst) {
      requestAnimationFrame(() => {
        const first = listRef.current?.querySelector('a[href^="/edit/"]');
        if (first) first.focus();
        navigate(location.pathname, { replace: true, state: {} });
      });
    }
  }, [location, navigate, workspaceFilteredNotes.length]);

  const cycleViewMode = () => {
    setViewMode((prev) => {
      if (prev === "card") return "list";
      if (prev === "list") return "dense";
      if (prev === "dense") return "auto";
      return "card";
    });
  };

  const cycleTagState = (tag) => {
    setTagStates((prev) => {
      const cur = prev[tag] || "none";
      const next = cur === "none" ? "include" : cur === "include" ? "exclude" : "none";
      return { ...prev, [tag]: next };
    });
  };

  useEffect(() => {
    const onFocusSearch = () => searchInputRef.current?.focus();
    const onCycleView = () => cycleViewMode();
    const onToggleFocusFirst = () => {
      const first = workspaceFilteredNotes[0];
      if (first) handleToggleFocus(first);
    };

    window.addEventListener("asuka-list-focus-search", onFocusSearch);
    window.addEventListener("asuka-list-cycle-view", onCycleView);
    window.addEventListener("asuka-list-toggle-focus-first", onToggleFocusFirst);

    return () => {
      window.removeEventListener("asuka-list-focus-search", onFocusSearch);
      window.removeEventListener("asuka-list-cycle-view", onCycleView);
      window.removeEventListener("asuka-list-toggle-focus-first", onToggleFocusFirst);
    };
  }, [workspaceFilteredNotes]);

  const handleToggleFocus = async (note) => {
    const prevFocus = Boolean(note.focus);
    const nextFocus = !prevFocus;

    try { updateNote(note.id, { focus: nextFocus }); } catch {}

    if (user?.uid) {
      try {
        await updateNoteRemote(user.uid, note.id, { focus: nextFocus });
      } catch {
        try { updateNote(note.id, { focus: prevFocus }); } catch {}
      }
    }
  };

  const tagClass = (state) =>
    state === "include"
      ? "bg-blue-600 text-white border-blue-600"
      : state === "exclude"
        ? "bg-red-500 text-white border-red-500"
        : "app-chip border-[var(--app-border)]";

  const renderNoteActions = (note) => (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => handleToggleFocus(note)}
        className={`rounded-full border px-3 py-1 text-xs ${note.focus ? "border-orange-700 bg-orange-600 text-white" : "border-orange-500 text-orange-600 hover:bg-orange-100"}`}
      >
        {note.focus ? "Focused" : "Focus"}
      </button>
      <button
        onClick={async () => {
          if (confirm("Delete this note?")) {
            try { await deleteNote(note.id); } catch {}
          }
        }}
        className="rounded-full bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
      >
        Delete
      </button>
    </div>
  );

  const renderNotes = (notesForView) => {
    if (notesForView.length === 0) {
      return (
        <div className="app-empty-state">
          <div className="text-lg font-semibold">No notes match the current view.</div>
          <p className="mt-2 app-muted-text">Try a different search, clear filters, or create a new note to get started.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/edit/new" className="app-primary-button">Create your first note</Link>
            <button
              onClick={() => {
                setSearchTerm("");
                setTagStates({});
                setWorkspaceTab("all");
              }}
              className="app-secondary-button"
            >
              Reset filters
            </button>
          </div>
        </div>
      );
    }

    if (isDenseView) {
      return (
        <ul className="space-y-2" ref={listRef}>
          {notesForView.map((note) => {
            const tags = getNoteTags(note).slice(0, 2);
            return (
              <li key={note.id} className="rounded-2xl border app-panel px-3 py-3 app-panel-hover">
                <div className="flex items-center gap-3">
                  <Link
                    className="flex-1 truncate text-sm font-semibold text-blue-700"
                    title={note.title || "Untitled"}
                    to={`/edit/${note.id}`}
                    onClick={() => addRecentNote({ id: note.id, title: note.title || "Untitled" })}
                  >
                    {note.title || "Untitled"}
                  </Link>
                  <span className="whitespace-nowrap text-xs app-muted-text">{formatDate(note.updatedAt)}</span>
                  <button
                    onClick={() => handleToggleFocus(note)}
                    className={`rounded-full border px-3 py-1 text-[10px] ${note.focus ? "border-orange-700 bg-orange-600 text-white" : "border-orange-500 text-orange-600 hover:bg-orange-100"}`}
                  >
                    Focus
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <button key={t} onClick={() => cycleTagState(t)} className="app-chip rounded-full px-2 py-1 text-[10px]">
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      );
    }

    if (isCardView) {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" ref={listRef}>
          {notesForView.map((note) => {
            const tags = getNoteTags(note).slice(0, 5);
            return (
              <article key={note.id} className="rounded-2xl border app-panel p-4 shadow-md app-panel-hover">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Link
                    className="flex-1 truncate text-lg font-bold text-blue-700"
                    title={note.title || "Untitled"}
                    to={`/edit/${note.id}`}
                    onClick={() => addRecentNote({ id: note.id, title: note.title || "Untitled" })}
                  >
                    {note.title || "Untitled"}
                  </Link>
                  {note.focus && <span className="rounded-full bg-orange-200 px-3 py-1 text-xs font-semibold text-orange-900">Focus</span>}
                </div>
                <div className="mb-3 text-xs app-muted-text">Updated: {formatDate(note.updatedAt)}</div>
                {tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <button key={t} onClick={() => cycleTagState(t)} className="app-chip rounded-full px-2 py-1 text-xs">
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
                {renderNoteActions(note)}
              </article>
            );
          })}
        </div>
      );
    }

    return (
      <ul className="space-y-3" ref={listRef}>
        {notesForView.map((note) => {
          const tags = getNoteTags(note).slice(0, 4);
          return (
            <li key={note.id} className="rounded-2xl border app-panel p-4 app-panel-hover">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    className="block truncate text-base font-semibold text-blue-700"
                    title={note.title || "Untitled"}
                    to={`/edit/${note.id}`}
                    onClick={() => addRecentNote({ id: note.id, title: note.title || "Untitled" })}
                  >
                    {note.title || "Untitled"}
                  </Link>
                  <div className="mt-2 text-xs app-muted-text">Updated: {formatDate(note.updatedAt)}</div>
                </div>
                {renderNoteActions(note)}
              </div>
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <button key={t} onClick={() => cycleTagState(t)} className="app-chip rounded-full px-2 py-1 text-xs">
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const visibleTags = useMemo(() => {
    const lower = stripHash(searchTerm).toLowerCase();
    return allTags.filter((tag) => {
      const state = tagStates[tag] || "none";
      const matches = lower && tag.toLowerCase().startsWith(lower);
      const selected = state !== "none";
      return matches || selected;
    });
  }, [allTags, searchTerm, tagStates]);

  return (
    <div className={containerClass}>
      <section className="app-reading-surface p-5 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <div className="app-section-title mb-2">Workspace</div>
            <h1 className="text-3xl font-black tracking-tight">Notes</h1>
            <p className="mt-2 max-w-2xl app-muted-text">
              Capture fast, find notes quickly, and return to recent work without digging through controls.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={cycleViewMode} className="app-secondary-button text-sm" title="Cycle through card, list, dense, and auto views">
              {viewMode === "auto"
                ? "View: Auto"
                : viewMode === "card"
                  ? "View: Cards"
                  : viewMode === "dense"
                    ? "View: Dense"
                    : "View: List"}
            </button>
            <Link to="/edit/new" className="app-primary-button text-sm">
              Create note
            </Link>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {WORKSPACE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setWorkspaceTab(tab.key)}
              className={`app-pill-button text-sm ${workspaceTab === tab.key ? "is-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative mb-4 w-full">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search titles, content, or tags like #todo #env"
            className="w-full rounded-xl border app-input px-4 py-3 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 app-muted-text hover:text-gray-900"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-sm app-muted-text">Sort by</label>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="rounded-xl border app-input px-3 py-2 text-sm">
            <option value="updated">Updated</option>
            <option value="tags">Tags</option>
          </select>
          {sortMode === "updated" && (
            <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value)} className="rounded-xl border app-input px-3 py-2 text-sm">
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          )}
        </div>

        {visibleTags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <button
                key={tag}
                onClick={() => cycleTagState(tag)}
                className={`rounded-full border px-3 py-1 text-sm transition ${tagClass(tagStates[tag] || "none")}`}
                title="Toggle include, exclude, or neutral tag filter"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4">
          <button onClick={() => setShowMoreFilters((prev) => !prev)} className="app-ghost-button text-sm">
            {showMoreFilters ? "Hide advanced filters" : "Show advanced filters"}
          </button>
        </div>

        {showMoreFilters && (
          <section className="mb-5 rounded-2xl border app-surface p-4">
            <div className="mb-3 text-sm font-semibold">Advanced filters</div>
            <div className="mb-3 text-xs app-muted-text">Included tags narrow the list. Excluded tags hide matching notes.</div>
            {allTags.length > 0 && (
              <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => cycleTagState(tag)}
                    className={`rounded-full border px-3 py-1 text-sm transition ${tagClass(tagStates[tag] || "none")}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {renderNotes(workspaceFilteredNotes)}

        <div className="mt-8 flex justify-start">
          <Link to="/settings" className="app-ghost-button text-sm">Open the guide</Link>
        </div>
      </section>
    </div>
  );
}
