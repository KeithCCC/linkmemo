import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import { useAuthContext } from "../context/AuthContext";
import { addRecentNote, getRecentNotes } from "../recentNotes";
import { updateNote as updateNoteRemote } from "../supabaseNotesService";

const GROUP_PREFIX = "group:";
const WORKSPACE_TABS = [
  { key: "all", label: "すべて" },
  { key: "recent", label: "最近" },
  { key: "tags", label: "タグ" },
  { key: "groups", label: "グループ" },
  { key: "focus", label: "フォーカス" },
];

const normalize = (s = "") => s.trim().toLowerCase();
const stripHash = (s = "") => s.replace(/^[#＃]/, "");
const isGroupTag = (t = "") => t.startsWith(GROUP_PREFIX) || t.includes(";");
const expandTagComponents = (t = "") => {
  const base = normalize(stripHash(t));
  if (!base) return [];
  if (base.includes(";")) {
    return base.split(";").map((p) => normalize(stripHash(p))).filter(Boolean);
  }
  return [base];
};

const mineTags = (title = "", content = "") => {
  const re = /(?<![A-Za-z0-9_])[#＃]([A-Za-z0-9\u00C0-\uFFFF._/-]+)(?=\s|$|[、。,.!?:;)\]}<>])/gu;
  const set = new Set();
  for (const m of (`${title}\n${content}`).matchAll(re)) set.add(normalize(m[1]));
  return [...set];
};

function getNoteTags(note) {
  const saved = Array.isArray(note.tags)
    ? note.tags.map((t) => normalize(stripHash(t)))
    : typeof note.tags === "string" && stripHash(note.tags)
      ? [normalize(stripHash(note.tags))]
      : [];
  const mined = mineTags(note.title, note.content);
  const savedExpanded = saved.flatMap(expandTagComponents);
  return [...new Set([...saved, ...mined, ...savedExpanded])];
}

function formatDate(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  return d?.toLocaleString?.() || "-";
}

export default function NoteListScreen({ embedded = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { notes, refreshNotes, updateNote, deleteNote } = useNotesContext();
  const { user } = useAuthContext();
  const allNotes = Array.isArray(notes) ? notes : [];

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
    try {
      const saved = localStorage.getItem("list.workspaceTab") || "all";
      return WORKSPACE_TABS.some((t) => t.key === saved) ? saved : "all";
    } catch {
      return "all";
    }
  });
  const [sortMode, setSortMode] = useState(() => {
    try { return localStorage.getItem("list.sortMode") || "updated"; } catch { return "updated"; }
  });
  const [sortDirection, setSortDirection] = useState(() => {
    try { return localStorage.getItem("list.sortDirection") || "desc"; } catch { return "desc"; }
  });
  const [autoDetectedView, setAutoDetectedView] = useState("list");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const listRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const checkWidth = () => {
      setAutoDetectedView(window.innerWidth < 768 ? "card" : "list");
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => {
    if (user?.uid && typeof refreshNotes === "function") {
      refreshNotes().catch(() => {});
    }
  }, [user?.uid, refreshNotes]);

  useEffect(() => {
    try { localStorage.setItem("list.searchTerm", searchTerm); } catch {}
  }, [searchTerm]);

  useEffect(() => {
    try { localStorage.setItem("list.tagStates", JSON.stringify(tagStates)); } catch {}
  }, [tagStates]);

  useEffect(() => {
    try { localStorage.setItem("list.viewMode", viewMode); } catch {}
  }, [viewMode]);

  useEffect(() => {
    try { localStorage.setItem("list.workspaceTab", workspaceTab); } catch {}
  }, [workspaceTab]);

  useEffect(() => {
    try { localStorage.setItem("list.sortMode", sortMode); } catch {}
  }, [sortMode]);

  useEffect(() => {
    try { localStorage.setItem("list.sortDirection", sortDirection); } catch {}
  }, [sortDirection]);

  const isCardView = viewMode === "auto" ? autoDetectedView === "card" : viewMode === "card";
  const isDenseView = viewMode === "dense";

  const allTags = useMemo(() => {
    const set = new Set();
    allNotes.forEach((n) => {
      getNoteTags(n).forEach((tag) => set.add(tag));
    });
    return [...set].sort();
  }, [allNotes]);

  const cycleTagState = (tag) => {
    setTagStates((prev) => {
      const cur = prev[tag] || "none";
      const next = cur === "none" ? "include" : cur === "include" ? "exclude" : "none";
      return { ...prev, [tag]: next };
    });
  };

  const tagClass = (state) =>
    state === "include"
      ? "bg-blue-600 text-white border-blue-600"
      : state === "exclude"
        ? "bg-red-500 text-white border-red-500"
        : "app-chip border-[var(--app-border)]";

  const includeSelectedTags = useMemo(
    () =>
      Object.entries(tagStates || {})
        .filter(([, v]) => v === "include")
        .map(([k]) => normalize(stripHash(k)))
        .filter(Boolean),
    [tagStates]
  );

  const includeGroupTags = useMemo(
    () => includeSelectedTags.filter((t) => isGroupTag(t)),
    [includeSelectedTags]
  );

  const groupTagCount = useMemo(
    () => allTags.filter((t) => isGroupTag(t)).length,
    [allTags]
  );

  const sortedNotes = useMemo(() => {
    const sorted = [...allNotes];

    if (sortMode === "tags") {
      sorted.sort((a, b) => {
        const tagA = [...getNoteTags(a)].sort((x, y) => x.localeCompare(y, "ja"))[0] || "\uffff";
        const tagB = [...getNoteTags(b)].sort((x, y) => x.localeCompare(y, "ja"))[0] || "\uffff";
        const c = tagA.localeCompare(tagB, "ja");
        if (c !== 0) return c;
        const A = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
        const B = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
        return (B?.getTime?.() || 0) - (A?.getTime?.() || 0);
      });
      return sorted;
    }

    sorted.sort((a, b) => {
      const A = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
      const B = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
      const diff = (B?.getTime?.() || 0) - (A?.getTime?.() || 0);
      return sortDirection === "asc" ? -diff : diff;
    });
    return sorted;
  }, [allNotes, sortMode, sortDirection]);

  const queryFilteredNotes = useMemo(() => {
    const q = (searchTerm || "");
    const isTagQuery = q.trim().startsWith("#");

    const requiredTags = isTagQuery
      ? q.trim().split(/\s+/).map((t) => normalize(stripHash(t))).filter(Boolean)
      : [];

    const universe = new Set(allTags);
    const pairs = Object.entries(tagStates || {}).map(([k, v]) => [normalize(stripHash(k)), v]);
    const includeTagsRaw = pairs
      .filter(([k, v]) => v === "include" && k && universe.has(k))
      .map(([k]) => k);
    const excludeTags = pairs
      .filter(([k, v]) => v === "exclude" && k && universe.has(k))
      .map(([k]) => k);

    const expandedIncludeTags = includeTagsRaw.flatMap((t) => expandTagComponents(t));

    return sortedNotes.filter((note) => {
      const title = note.title || "";
      const content = note.content || "";
      const tagSet = new Set(getNoteTags(note));

      let textHit = true;
      if (isTagQuery) {
        textHit = requiredTags.every((t) => tagSet.has(t));
      } else if (q) {
        const needle = normalize(q);
        textHit =
          normalize(title).includes(needle) ||
          normalize(content).includes(needle) ||
          [...tagSet].some((t) => t.includes(needle));
      }

      const includeOk = expandedIncludeTags.every((t) => tagSet.has(t));
      const excludeOk = !excludeTags.some((t) => tagSet.has(t));
      return textHit && includeOk && excludeOk;
    });
  }, [sortedNotes, searchTerm, tagStates, allTags]);

  const workspaceFilteredNotes = useMemo(() => {
    const recentSet = new Set(getRecentNotes().map((n) => n.id?.toString()));
    return queryFilteredNotes.filter((note) => {
      const tags = getNoteTags(note);
      if (workspaceTab === "recent") return recentSet.has(note.id?.toString());
      if (workspaceTab === "tags") return tags.length > 0;
      if (workspaceTab === "groups") return tags.some((t) => isGroupTag(t));
      if (workspaceTab === "focus") return Boolean(note.focus);
      return true;
    });
  }, [queryFilteredNotes, workspaceTab]);

  const visibleTags = useMemo(() => {
    const lower = stripHash(searchTerm).toLowerCase();
    return allTags.filter((tag) => {
      const state = tagStates[tag] || "none";
      const matches = lower && tag.toLowerCase().startsWith(lower);
      const selected = state !== "none";
      return matches || selected;
    });
  }, [allTags, searchTerm, tagStates]);

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

  const handleGroup = async () => {
    if (includeSelectedTags.length === 0) return;
    if (groupTagCount >= 256) {
      alert("グループタグの上限(256)に達しました。");
      return;
    }

    const groupName = includeSelectedTags.map((t) => `#${stripHash(t)}`).sort().join(";");
    const newGroupTag = groupName || `${GROUP_PREFIX}${Date.now()}`;
    const groupKey = normalize(stripHash(newGroupTag));
    const includeSet = new Set(includeSelectedTags.map((t) => normalize(stripHash(t))));

    const updates = [];
    allNotes.forEach((note) => {
      const saved = Array.isArray(note.tags)
        ? note.tags
        : typeof note.tags === "string" && note.tags.trim()
          ? [note.tags.trim()]
          : [];
      const savedNorm = saved.map((t) => normalize(stripHash(t)));
      const mined = mineTags(note.title, note.content);
      const savedExpanded = savedNorm.flatMap(expandTagComponents);
      const tagUniverse = new Set([...savedNorm, ...mined, ...savedExpanded]);
      const hit = [...includeSet].some((t) => tagUniverse.has(t));
      if (!hit) return;

      const nextTagsSet = new Set(saved);
      if (!savedNorm.includes(groupKey)) {
        nextTagsSet.add(newGroupTag);
      }
      updates.push({ id: note.id, tags: [...nextTagsSet] });
    });

    updates.forEach(({ id, tags }) => {
      try { updateNote(id, { tags }); } catch {}
    });

    if (user?.uid) {
      for (const { id, tags } of updates) {
        try { await updateNoteRemote(user.uid, id, { tags }); } catch {}
      }
    }

    if (updates.length > 0) {
      setTagStates((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (next[k] === "include") next[k] = "none";
        });
        if (groupKey) next[groupKey] = "include";
        return next;
      });
    }
  };

  const handleDismiss = async () => {
    if (includeGroupTags.length === 0) return;
    const targets = new Set(includeGroupTags.map((t) => normalize(stripHash(t))));
    const updates = [];

    allNotes.forEach((note) => {
      const saved = Array.isArray(note.tags)
        ? note.tags
        : typeof note.tags === "string" && note.tags.trim()
          ? [note.tags.trim()]
          : [];
      const savedNorm = saved.map((t) => normalize(stripHash(t)));
      let changed = false;
      const filtered = saved.filter((tag, idx) => {
        const norm = savedNorm[idx];
        if (targets.has(norm)) {
          changed = true;
          return false;
        }
        return true;
      });
      if (changed) updates.push({ id: note.id, tags: filtered });
    });

    updates.forEach(({ id, tags }) => {
      try { updateNote(id, { tags }); } catch {}
    });

    if (user?.uid) {
      for (const { id, tags } of updates) {
        try { await updateNoteRemote(user.uid, id, { tags }); } catch {}
      }
    }

    if (updates.length > 0) {
      setTagStates((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          const norm = normalize(stripHash(k));
          if (targets.has(norm)) next[k] = "none";
        });
        return next;
      });
    }
  };

  const handleToggleFocus = async (note) => {
    const prevFocus = Boolean(note.focus);
    const nextFocus = !prevFocus;

    try { updateNote(note.id, { focus: nextFocus }); } catch {}

    if (user?.uid) {
      try {
        await updateNoteRemote(user.uid, note.id, { focus: nextFocus });
      } catch (err) {
        try { updateNote(note.id, { focus: prevFocus }); } catch {}
        console.error("Focus update failed:", err);
      }
    }
  };

  const containerClass = embedded ? "text-left p-1 sm:p-2" : "w-full text-left p-3 px-4 sm:px-6 lg:px-8";

  const renderNotes = (notesForView) => {
    if (notesForView.length === 0) {
      return (
        <p className="app-muted-text italic">
          条件に一致するノートがありません。検索条件を変更するか「新規作成」から追加してください。
        </p>
      );
    }

    if (isDenseView) {
      return (
        <ul className="space-y-1" ref={listRef}>
          {notesForView.map((note) => {
            const tags = getNoteTags(note).slice(0, 2);
            return (
              <li key={note.id} className="px-2 py-1.5 border rounded app-panel app-panel-hover">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    className="text-blue-700 text-sm font-semibold truncate flex-1"
                    title={note.title || "Untitled"}
                    to={`/edit/${note.id}`}
                    onClick={() => addRecentNote({ id: note.id, title: note.title || "Untitled" })}
                  >
                    {note.title || "Untitled"}
                  </Link>
                  <span className="text-xs app-muted-text whitespace-nowrap">{formatDate(note.updatedAt)}</span>
                  <button
                    onClick={() => handleToggleFocus(note)}
                    className={`text-[10px] rounded border px-1.5 py-0.5 ${note.focus ? "border-orange-700 bg-orange-600 text-white" : "border-orange-500 text-orange-600 hover:bg-orange-100"}`}
                  >
                    Focus
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => cycleTagState(t)}
                        className="text-[10px] app-chip px-1.5 py-0.5 rounded app-panel-hover"
                      >
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" ref={listRef}>
          {notesForView.map((note) => {
            const tags = getNoteTags(note).slice(0, 5);
            return (
              <div key={note.id} className="p-4 border rounded-lg app-panel app-panel-hover shadow-md">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link
                    className="text-blue-700 font-bold text-lg flex-1 truncate"
                    title={note.title || "Untitled"}
                    to={`/edit/${note.id}`}
                    onClick={() => addRecentNote({ id: note.id, title: note.title || "Untitled" })}
                  >
                    {note.title || "Untitled"}
                  </Link>
                  <button
                    onClick={() => handleToggleFocus(note)}
                    className={`text-xs rounded border px-2 py-1 ${note.focus ? "border-orange-700 bg-orange-600 text-white" : "border-orange-500 text-orange-600 hover:bg-orange-100"}`}
                    title="Focus を切り替え"
                  >
                    Focus
                  </button>
                </div>

                <div className="mb-3 flex flex-wrap gap-2 text-xs app-muted-text">
                  <span className="px-2 py-1 app-chip rounded-full">更新日: {formatDate(note.updatedAt)}</span>
                  {note.focus && <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded-full">Focus</span>}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => cycleTagState(t)}
                        className="text-xs app-chip px-2 py-1 rounded app-panel-hover"
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={async () => {
                    if (confirm("このノートを削除してもよろしいですか？")) {
                      try { await deleteNote(note.id); } catch {}
                    }
                  }}
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700"
                  aria-label={`ノート「${note.title || "Untitled"}」を削除`}
                >
                  削除
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <ul className="space-y-2" ref={listRef}>
        {notesForView.map((note) => {
          const tags = getNoteTags(note).slice(0, 4);
          return (
            <li key={note.id} className="p-3 border rounded app-panel app-panel-hover">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold min-w-0 flex-1">
                  <Link
                    className="text-blue-700 truncate block"
                    title={note.title || "Untitled"}
                    to={`/edit/${note.id}`}
                    onClick={() => addRecentNote({ id: note.id, title: note.title || "Untitled" })}
                  >
                    {note.title || "Untitled"}
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleFocus(note)}
                    className={`text-xs rounded border px-2 py-1 ${note.focus ? "border-orange-700 bg-orange-600 text-white" : "border-orange-500 text-orange-600 hover:bg-orange-100"}`}
                  >
                    Focus
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("このノートを削除してもよろしいですか？")) {
                        try { await deleteNote(note.id); } catch {}
                      }
                    }}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>

              <div className="mt-1 flex flex-wrap gap-2 text-xs app-muted-text">
                <span className="px-2 py-1 app-chip rounded-full">更新日: {formatDate(note.updatedAt)}</span>
                {note.focus && <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded-full">Focus</span>}
                {tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => cycleTagState(t)}
                    className="px-2 py-1 app-chip rounded-full app-panel-hover"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-xl font-bold">ノート一覧</h1>
        <div className="flex gap-2">
          <button
            onClick={cycleViewMode}
            className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
            title="表示切替: カード / リスト / 高密度 / 自動"
          >
            {viewMode === "auto"
              ? "🔄 自動"
              : viewMode === "card"
                ? "🗂️ カード"
                : viewMode === "dense"
                  ? "📑 高密度"
                  : "📋 リスト"}
          </button>
          <Link to="/edit/new" className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700">
            新規作成
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setWorkspaceTab(tab.key)}
            className={`px-3 py-1.5 rounded-full border text-sm ${workspaceTab === tab.key ? "bg-blue-600 text-white border-blue-600" : "app-surface app-panel-hover app-muted-text"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative w-full mb-3">
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="検索（タイトル・本文・タグ） 例: #todo #env"
          className="w-full rounded px-3 py-2 pr-10 border app-input"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 app-muted-text hover:text-gray-900"
            aria-label="検索をクリア"
          >
            ×
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm app-muted-text">並び替え</label>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          className="px-2 py-1 rounded border app-input text-sm"
        >
          <option value="updated">更新日</option>
          <option value="tags">タグ</option>
        </select>
        {sortMode === "updated" && (
          <select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value)}
            className="px-2 py-1 rounded border app-input text-sm"
          >
            <option value="desc">新しい順</option>
            <option value="asc">古い順</option>
          </select>
        )}
      </div>

      {visibleTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <button
              key={tag}
              onClick={() => cycleTagState(tag)}
              className={`px-3 py-1 text-sm rounded-full border transition ${tagClass(tagStates[tag] || "none")}`}
              title="クリックで include → exclude → 解除"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={() => setShowMoreFilters((prev) => !prev)}
          className="text-sm underline app-muted-text hover:text-gray-900"
        >
          {showMoreFilters ? "その他を閉じる" : "その他"}
        </button>
      </div>

      {showMoreFilters && (
        <section className="mb-5 border rounded-lg app-surface p-3">
          <div className="text-sm font-semibold mb-2">グループ操作</div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={handleGroup}
              disabled={includeSelectedTags.length === 0 || groupTagCount >= 256}
              className={`px-3 py-1 text-sm rounded border ${
                includeSelectedTags.length === 0 || groupTagCount >= 256
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "app-chip app-panel-hover app-muted-text"
              }`}
              title="選択中(include)のタグをグループ化"
            >
              グループ化
            </button>
            <button
              onClick={handleDismiss}
              disabled={includeGroupTags.length === 0}
              className={`px-3 py-1 text-sm rounded border ${
                includeGroupTags.length === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "app-chip app-panel-hover app-muted-text"
              }`}
              title="選択中のグループタグを全ノートから解除"
            >
              グループ解除
            </button>
          </div>

          {allTags.length > 0 && (
            <>
              <div className="text-xs app-muted-text mb-2">全タグ</div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => cycleTagState(tag)}
                    className={`px-3 py-1 text-sm rounded-full border transition ${tagClass(tagStates[tag] || "none")}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {renderNotes(workspaceFilteredNotes)}

      <div className="mt-6">
        <Link to="/settings" className="underline text-sm">使い方へ</Link>
      </div>
    </div>
  );
}
