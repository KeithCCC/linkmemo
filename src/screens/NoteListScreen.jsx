// src/screens/NoteListScreen.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import { useAuthContext } from "../context/AuthContext";
import { addRecentNote } from "../recentNotes";
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

// タイトル＋本文から #タグ を抽出（日本語・全角＃・句読点終端OK）
const mineTags = (title = "", content = "") => {
  const re = /(?<![A-Za-z0-9_])[#＃]([A-Za-z0-9\u00C0-\uFFFF._/-]+)(?=\s|$|[、。,.!?:;)\]}<>])/gu;
  const set = new Set();
  for (const m of (`${title}\n${content}`).matchAll(re)) set.add(normalize(m[1]));
  return [...set];
};

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
    } catch { return {}; }
  }); // { [tag]: "include" | "exclude" | "none" }
  const [isNavVisible, setIsNavVisible] = useState(() => {
    return localStorage.getItem("isNavVisible") === "true";
  });
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("list.viewMode") || "card";
    } catch { return "card"; }
  }); // "auto" | "card" | "list"
  const [autoDetectedView, setAutoDetectedView] = useState("list");
  const listRef = useRef(null);

  // Responsive breakpoint: switch to card view when width < 768px
  useEffect(() => {
    const checkWidth = () => {
      setAutoDetectedView(window.innerWidth < 768 ? "card" : "list");
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("list.viewMode", viewMode); } catch {}
  }, [viewMode]);

  const isCardView = viewMode === "auto" ? autoDetectedView === "card" : viewMode === "card";

  useEffect(() => {
    if (user?.uid && typeof refreshNotes === "function") {
      refreshNotes().catch(() => {});
    }
  }, [user?.uid, refreshNotes]);

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
      : "bg-gray-100 text-gray-700 border-gray-300";

  const anyToggleActive = Object.values(tagStates).some(s => s !== "none");
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

  useEffect(() => {
    try { localStorage.setItem("list.searchTerm", searchTerm); } catch {}
  }, [searchTerm]);
  useEffect(() => {
    try { localStorage.setItem("list.tagStates", JSON.stringify(tagStates)); } catch {}
  }, [tagStates]);

  const sortedNotes = useMemo(() => {
    return [...allNotes].sort((a, b) => {
      const A = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
      const B = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
      return (B?.getTime?.() || 0) - (A?.getTime?.() || 0);
    });
  }, [allNotes]);

  const filteredNotes = useMemo(() => {
    const q = (searchTerm || "");
    const isTagQuery = q.trim().startsWith("#");

    const requiredTags = isTagQuery
      ? q
          .trim()
          .split(/\s+/)
          .map(t => normalize(stripHash(t)))
          .filter(Boolean)
      : [];

    const universe = new Set(allTags);
    const pairs = Object.entries(tagStates || {})
      .map(([k, v]) => [normalize(stripHash(k)), v]);
    const includeTagsRaw = pairs
      .filter(([k, v]) => v === "include" && k && universe.has(k))
      .map(([k]) => k);
    const excludeTags = pairs
      .filter(([k, v]) => v === "exclude" && k && universe.has(k))
      .map(([k]) => k);

    const expandedIncludeTags = includeTagsRaw.flatMap((t) => expandTagComponents(t));

    return sortedNotes.filter(n => {
      const title = n.title || "";
      const content = n.content || "";
      const saved = Array.isArray(n.tags)
        ? n.tags.map(t => normalize(stripHash(t)))
        : (typeof n.tags === "string" && stripHash(n.tags)
            ? [normalize(stripHash(n.tags))]
            : []);
      const mined = mineTags(title, content);
      const savedExpanded = saved.flatMap(expandTagComponents);
      const tagSet = new Set([...saved, ...mined, ...savedExpanded]);

      let textHit = true;
      if (isTagQuery) {
        textHit = requiredTags.every(t => tagSet.has(t));
      } else if (q) {
        const needle = normalize(q);
        textHit =
          normalize(title).includes(needle) ||
          normalize(content).includes(needle) ||
          [...tagSet].some(t => t.includes(needle));
      }

      const includeOk = expandedIncludeTags.every(t => tagSet.has(t));
      const excludeOk = !excludeTags.some(t => tagSet.has(t));

      return textHit && includeOk && excludeOk;
    });
  }, [sortedNotes, searchTerm, tagStates, anyToggleActive, allTags]);

  const visibleTags = useMemo(() => {
    const lower = stripHash(searchTerm).toLowerCase();
    return allTags.filter(tag => {
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
  }, [location, navigate, filteredNotes.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "z") {
        e.preventDefault();
        setIsNavVisible((prev) => {
          const newState = !prev;
          localStorage.setItem("isNavVisible", newState);
          return newState;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleNavItemClick = () => {
    setIsNavVisible(false);
    localStorage.setItem("isNavVisible", false);
  };

  const containerClass = embedded ? "text-left p-1 sm:p-2" : "w-full text-left p-3 px-4 sm:px-6 lg:px-8";

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
    const groupKey = normalize(stripHash(newGroupTag)); // normalized key for filters/state
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
          next[groupKey] = "include"; // グループ作成後にそのタグをアクティブに
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
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">ノート一覧 🗂️</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(prev => prev === "card" ? "list" : prev === "list" ? "auto" : "card")}
            className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
            title="表示切替: カード / リスト / 自動"
          >
            {viewMode === "auto" ? "🔄 自動" : viewMode === "card" ? "🗂️ カード" : "📋 リスト"}
          </button>
          <Link
            to="/edit/new"
            className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
          >
            新規作成
          </Link>
        </div>
      </div>

      {/* 🔎 キーワード検索（×で即クリア） */}
      <div className={embedded ? "sticky top-0 z-10 bg-white dark:bg-[#3a3a3a] pb-2" : ""}>
        <div className="relative w-full mb-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="キーワード検索（タイトル・本文・タグ） / 例：#todo #env"
          className="w-full rounded px-3 py-2 pr-10 border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-zinc-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-300"
        />
        {(searchTerm) && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            aria-label="検索をクリア"
          >
            ×
          </button>
        )}
        </div>

      {/* すべてのタグ（約3行・スクロール可） */}
      {!embedded && allTags.length > 0 && (
        <div className="mb-4 border border-gray-200 dark:border-gray-500 rounded bg-white dark:bg-gray-700 p-2">
          <div className="text-xs text-gray-500 mb-2">すべてのタグ</div>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => cycleTagState(tag)}
                className={`px-3 py-1 text-sm rounded-full border transition ${tagClass(tagStates[tag] || "none")}`}
                title={`#${tag} を選択/トグル`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* 🏷️ タグ候補 & 三値トグル */}
      {visibleTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
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
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={handleGroup}
          disabled={includeSelectedTags.length === 0 || groupTagCount >= 256}
          className={`px-3 py-1 text-sm rounded border ${
            includeSelectedTags.length === 0 || groupTagCount >= 256
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          title="選択中(include)のタグをまとめてグループ化"
        >
          Group
        </button>
        <button
          onClick={handleDismiss}
          disabled={includeGroupTags.length === 0}
          className={`px-3 py-1 text-sm rounded border ${
            includeGroupTags.length === 0
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          title="選択中のgroup:タグを全ノートから外す"
        >
          Dismiss
        </button>
      </div>

      {/* 📄 ノート一覧 */}
      {filteredNotes.length === 0 ? (
        <p className="text-gray-500 italic">検索結果が見つかりませんでした…</p>
      ) : isCardView ? (
        // Card View for narrow screens (< 768px)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" ref={listRef}>
          {filteredNotes.map((note) => {
            const saved = Array.isArray(note.tags)
              ? note.tags.map(t => normalize(stripHash(t)))
              : (typeof note.tags === "string" && stripHash(note.tags)
                  ? [normalize(stripHash(note.tags))]
                  : []);
            const mined = mineTags(note.title, note.content);
            const tags = [...new Set([...saved, ...mined])];

            return (
              <div
                key={note.id}
                className="p-4 border border-zinc-300 dark:border-gray-500 rounded-lg bg-[#bdbdbd] dark:bg-[#bdbdbd] hover:bg-[#c8c8c8] dark:hover:bg-[#c8c8c8] shadow-md"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Link
                    className="text-blue-600 font-bold text-lg flex-1"
                    to={`/edit/${note.id}`}
                    onClick={() => addRecentNote({ id: note.id, title: note.title || "Untitled" })}
                  >
                    {note.title || "Untitled"}
                  </Link>
                  <button
                    onClick={async () => {
                      if (confirm("このノートを削除してもよろしいですか？")) {
                        try { await deleteNote(note.id); } catch {}
                      }
                    }}
                    className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 flex-shrink-0"
                    aria-label={`ノート「${note.title || "Untitled"}」を削除`}
                  >
                    削除
                  </button>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  更新日: {(note.updatedAt?.toDate ? note.updatedAt.toDate() : new Date(note.updatedAt)).toLocaleString()}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => cycleTagState(t)}
                        className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 text-zinc-900 dark:text-zinc-900"
                        title={`#${t} を選択`}
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // List View for wider screens (>= 768px)
        <ul className="space-y-2" ref={listRef}>
          {filteredNotes.map((note) => {
            const saved = Array.isArray(note.tags)
              ? note.tags.map(t => normalize(stripHash(t)))
              : (typeof note.tags === "string" && stripHash(note.tags)
                  ? [normalize(stripHash(note.tags))]
                  : []);
            const mined = mineTags(note.title, note.content);
            const tags = [...new Set([...saved, ...mined])];

            return (
              <li
                key={note.id}
                className="p-2 sm:p-3 border border-zinc-300 dark:border-gray-500 rounded bg-[#bdbdbd] dark:bg-[#bdbdbd] hover:bg-[#c8c8c8] dark:hover:bg-[#c8c8c8]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">
                    <Link
                      className="text-blue-600"
                      to={`/edit/${note.id}`}
                      onClick={() => addRecentNote({ id: note.id, title: note.title || "Untitled" })}
                    >
                      {note.title}
                    </Link>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm("このノートを削除してもよろしいですか？")) {
                        try { await deleteNote(note.id); } catch {}
                      }
                    }}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    aria-label={`ノート「${note.title || "Untitled"}」を削除`}
                  >
                    削除
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  更新日: {(note.updatedAt?.toDate ? note.updatedAt.toDate() : new Date(note.updatedAt)).toLocaleString()}
                </div>

                {tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => cycleTagState(t)}
                        className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 text-zinc-900 dark:text-zinc-900"
                        title={`#${t} を選択`}
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
      )}

      <div className="mt-6">
        <Link to="/settings" className="underline text-sm">設定へ</Link>
      </div>

      {isNavVisible && (
        <nav className="fixed top-0 left-0 h-full w-64 bg-yellow-100 p-4 shadow-md">
          <h2 className="text-lg font-semibold mb-4">メニュー</h2>
          <ul className="space-y-2">
            <li>
              <Link to="/" className="block p-2 rounded hover-bg-yellow-200" onClick={handleNavItemClick}>
                ホーム
              </Link>
            </li>
            <li>
              <Link to="/settings" className="block p-2 rounded hover-bg-yellow-200" onClick={handleNavItemClick}>
                設定
              </Link>
            </li>
            <li>
              <Link to="/profile" className="block p-2 rounded hover-bg-yellow-200" onClick={handleNavItemClick}>
                プロフィール
              </Link>
            </li>
          </ul>
        </nav>
      )}

    </div>
  );
}
