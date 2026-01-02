import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import { getRecentNotes, RECENT_NOTES_EVENT } from "../recentNotes";
import { useAuthContext } from "../context/AuthContext";
import { updateNote as updateNoteRemote } from "../supabaseNotesService";

const GROUP_PREFIX = "group:";
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

export default function Navigation({ collapsed, setCollapsed, user: userProp, onLogin, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const { notes, addNote } = useNotesContext();
  const { user: ctxUser } = useAuthContext() || {};
  const user = userProp || ctxUser;

  const [recent, setRecent] = useState([]);
  const [showSecondary, setShowSecondary] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagStates, setTagStates] = useState({});

  useEffect(() => {
    const refresh = () => setRecent(getRecentNotes());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(RECENT_NOTES_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(RECENT_NOTES_EVENT, refresh);
    };
  }, []);

  const handleExportAllNotes = () => {
    const json = JSON.stringify(notes, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asuka-notes.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportNotes = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedNotes = JSON.parse(event.target.result);
        importedNotes.forEach((note) => {
          if (note.title && note.content) {
            addNote(note);
          }
        });
        alert("インポートが完了しました");
      } catch (err) {
        alert("インポートに失敗しました。形式をご確認ください");
      }
    };
    reader.readAsText(file);
  };

  // Filter and sort notes
  const allNotes = Array.isArray(notes) ? notes : [];
  
  const sortedNotes = useMemo(() => {
    return [...allNotes].sort((a, b) => {
      const A = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
      const B = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
      return (B?.getTime?.() || 0) - (A?.getTime?.() || 0);
    });
  }, [allNotes]);

  const filteredNotes = useMemo(() => {
    if (!searchTerm && Object.keys(tagStates).every(k => tagStates[k] === "none")) {
      return sortedNotes;
    }
    
    const needle = normalize(searchTerm);
    const pairs = Object.entries(tagStates || {})
      .map(([k, v]) => [normalize(stripHash(k)), v]);
    const includeTagsRaw = pairs
      .filter(([k, v]) => v === "include" && k)
      .map(([k]) => k);
    const excludeTags = pairs
      .filter(([k, v]) => v === "exclude" && k)
      .map(([k]) => k);
    
    const expandedIncludeTags = includeTagsRaw.flatMap((t) => expandTagComponents(t));
    
    return sortedNotes.filter(n => {
      const title = normalize(n.title || "");
      const content = normalize(n.content || "");
      const saved = Array.isArray(n.tags)
        ? n.tags.map(t => normalize(stripHash(t)))
        : (typeof n.tags === "string" && stripHash(n.tags)
            ? [normalize(stripHash(n.tags))]
            : []);
      const mined = mineTags(title, content);
      const savedExpanded = saved.flatMap(expandTagComponents);
      const tagSet = new Set([...saved, ...mined, ...savedExpanded]);
      
      let textHit = true;
      if (searchTerm) {
        textHit = title.includes(needle) || content.includes(needle) ||
                  [...tagSet].some(t => t.includes(needle));
      }
      
      const includeOk = expandedIncludeTags.every(t => tagSet.has(t));
      const excludeOk = !excludeTags.some(t => tagSet.has(t));
      
      return textHit && includeOk && excludeOk;
    });
  }, [sortedNotes, searchTerm, tagStates]);

  // Tag filtering logic
  const allTags = useMemo(() => {
    const set = new Set();
    allNotes.forEach(n => {
      const saved = Array.isArray(n.tags)
        ? n.tags.map(t => normalize(stripHash(t)))
        : (typeof n.tags === "string" && stripHash(n.tags)
            ? [normalize(stripHash(n.tags))]
            : []);
      const mined = mineTags(n.title, n.content);
      [...saved, ...mined].forEach(t => set.add(t));
    });
    return [...set].sort();
  }, [allNotes]);

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

  const cycleTagState = (tag) => {
    setTagStates(prev => {
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
      : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500";

  const visibleTags = useMemo(() => {
    const lower = stripHash(searchTerm).toLowerCase();
    return allTags.filter(tag => {
      const state = tagStates[tag] || "none";
      const matches = lower && tag.toLowerCase().startsWith(lower);
      const selected = state !== "none";
      return matches || selected;
    }).slice(0, 10); // Limit to 10 tags to save space
  }, [allTags, searchTerm, tagStates]);

  const handleGroup = async () => {
    if (includeSelectedTags.length === 0) return;
    if (groupTagCount >= 256) {
      alert("グループタグの上限(256)に達しました。");
      return;
    }
    const groupName = includeSelectedTags
      .map((t) => `#${stripHash(t)}`)
      .sort()
      .join(";");
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
        if (groupKey) {
          next[groupKey] = "include";
        }
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

  return (
    <aside
      className={`relative min-h-screen bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-500 shadow-sm text-gray-700 dark:text-gray-100 text-sm font-medium transition-all duration-300 flex flex-col ${collapsed ? "w-0 overflow-hidden" : "w-64"}`}
    >
      {!collapsed && (
        <>
          <div className="pt-4 px-3 space-y-1 flex-shrink-0">
            {/* User Auth Section */}
            <div className="flex items-center justify-between rounded bg-white/80 dark:bg-gray-800 px-3 py-2 text-xs mb-4">
              {user ? (
                <>
                  <span className="truncate max-w-[8rem]" title={user.displayName || user.email}>
                    [{user.displayName || user.email || "User"}]
                  </span>
                  <button
                    onClick={onLogout}
                    className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <button
                  onClick={onLogin}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 w-full text-center transition-colors"
                >
                  ログイン
                </button>
              )}
            </div>

            {/* Primary Navigation */}
          <nav className="space-y-0.5">
            <Link
              to="/"
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                isActive("/") 
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
            >
              <span className="text-base">📁</span>
              <span>一覧</span>
            </Link>
            
            <Link
              to="/edit/new"
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                isActive("/edit/new") 
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
            >
              <span className="text-base">✏️</span>
              <span>新規作成</span>
            </Link>
            
            <Link
              to="/settings"
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                isActive("/settings") 
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
            >
              <span className="text-base">⚙️</span>
              <span>Usage</span>
            </Link>
            </nav>

            {/* Secondary Navigation Toggle */}
            <div className="pt-2">
              <button
                onClick={() => setShowSecondary(!showSecondary)}
                className="flex items-center justify-between w-full px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <span className="uppercase tracking-wide font-semibold">詳細機能</span>
                <span className={`transition-transform duration-200 ${showSecondary ? "rotate-90" : ""}`}>
                  ›
                </span>
              </button>
              
              {showSecondary && (
                <nav className="space-y-0.5 mt-1">
                  <Link
                    to="/tiptap"
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      isActive("/tiptap") 
                        ? "bg-gray-100 dark:bg-gray-600 text-blue-600 dark:text-blue-400" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-600 opacity-75"
                    }`}
                  >
                    <span className="text-sm">🧪</span>
                    <span>TipTapテスト</span>
                  </Link>
                  
                  <button
                    onClick={handleExportAllNotes}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600 opacity-75 transition-colors"
                  >
                    <span className="text-sm">📤</span>
                    <span>エクスポート</span>
                  </button>
                  
                  <label className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 opacity-75 transition-colors">
                    <span className="text-sm">📥</span>
                    <span>インポート</span>
                    <input type="file" accept=".json" onChange={handleImportNotes} className="hidden" />
                  </label>
                  
                  <Link
                    to="/extension"
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      isActive("/extension") 
                        ? "bg-gray-100 dark:bg-gray-600 text-blue-600 dark:text-blue-400" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-600 opacity-75"
                    }`}
                  >
                    <span className="text-sm">🧩</span>
                    <span>拡張機能</span>
                  </Link>
                </nav>
              )}
            </div>
          </div>

          {/* Note List Section */}
          <div className="flex flex-col border-t border-gray-200 dark:border-gray-500 mt-3" style={{ height: 'calc(100vh - 280px)' }}>
            {/* Search Box */}
            <div className="px-3 py-3 flex-shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="クリア"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Tag Selection */}
            {visibleTags.length > 0 && (
              <div className="px-3 pb-2 flex-shrink-0">
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {visibleTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => cycleTagState(tag)}
                      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${tagClass(tagStates[tag] || "none")}`}
                      title="クリックで include → exclude → 解除"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Group and Dismiss Buttons */}
            <div className="px-3 pb-2 flex gap-2 flex-shrink-0">
              <button
                onClick={handleGroup}
                disabled={includeSelectedTags.length === 0 || groupTagCount >= 256}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                  includeSelectedTags.length === 0 || groupTagCount >= 256
                    ? "bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                }`}
                title="選択中(include)のタグをまとめてグループ化"
              >
                Group
              </button>
              <button
                onClick={handleDismiss}
                disabled={includeGroupTags.length === 0}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                  includeGroupTags.length === 0
                    ? "bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                }`}
                title="選択中のgroup:タグを全ノートから外す"
              >
                Dismiss
              </button>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-scroll px-3 pb-3 space-y-1">
              {filteredNotes.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-4">
                  {searchTerm ? "該当なし" : "ノートなし"}
                </div>
              ) : (
                filteredNotes.map((note) => {
                  // Extract tags for display
                  const saved = Array.isArray(note.tags) ? note.tags : [];
                  const mined = mineTags(note.title, note.content);
                  const allNoteTags = [...new Set([...saved.map(t => stripHash(t)), ...mined])].slice(0, 3);
                  
                  return (
                    <Link
                      key={note.id}
                      to={`/edit/${note.id}`}
                      className={`block px-3 py-2 rounded-lg transition-colors ${
                        isActive(`/edit/${note.id}`)
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      <div className="text-sm font-medium truncate">
                        {note.title || "無題"}
                      </div>
                      {allNoteTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {allNoteTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {note.updatedAt?.toDate
                          ? new Date(note.updatedAt.toDate()).toLocaleDateString('ja-JP')
                          : new Date(note.updatedAt).toLocaleDateString('ja-JP')}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
