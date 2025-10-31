// src/screens/NoteListScreen.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import { useAuthContext } from "../context/AuthContext";
import { addRecentNote } from "../recentNotes";

// 正規化（大小無視）
const normalize = (s = "") => s.trim().toLowerCase();

// タイトル＋本文から #タグ を抽出（日本語・全角＃・句読点終端OK）
const mineTags = (title = "", content = "") => {
  // 単語途中の # を回避、全角＃もサポート、句読点・括弧・空白・行末で終端
  const re =
    /(?<![A-Za-z0-9_])[#＃]([A-Za-z0-9\u00C0-\uFFFF._/-]+)(?=\s|$|[、。,.!?:;)\]}<>])/gu;
  const set = new Set();
  for (const m of (`${title}\n${content}`).matchAll(re)) set.add(normalize(m[1]));
  return [...set];
};

export default function NoteListScreen({ embedded = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { notes, refreshNotes } = useNotesContext();
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
  const [lastKeyPressed, setLastKeyPressed] = useState("");
  const listRef = useRef(null);

  // Firestore を使っている場合だけ明示リフレッシュ（存在チェック安全化）
  useEffect(() => {
    if (user?.uid && typeof refreshNotes === "function") {
      refreshNotes().catch(() => {});
    }
  }, [user?.uid, refreshNotes]);

  // すべてのタグ（保存済み tags + 本文/タイトル抽出）を集約
  const allTags = useMemo(() => {
    const set = new Set();
    allNotes.forEach(n => {
      const saved = Array.isArray(n.tags) ? n.tags.map(normalize) : [];
      const mined = mineTags(n.title, n.content);
      [...saved, ...mined].forEach(t => set.add(t));
    });
    return [...set].sort();
  }, [allNotes]);

  // 三値トグル：none → include → exclude → none
  const cycleTagState = (tag) => {
    setTagStates(prev => {
      const cur = prev[tag] || "none";
      const next = cur === "none" ? "include" : cur === "include" ? "exclude" : "none";
      return { ...prev, [tag]: next };
    });
  };

  // タグピル見た目
  const tagClass = (state) =>
    state === "include"
      ? "bg-blue-600 text-white border-blue-600"
      : state === "exclude"
      ? "bg-red-500 text-white border-red-500"
      : "bg-gray-100 text-gray-700 border-gray-300";

  // 検索欄とトグルの両立（トグルが有効なら検索語なし優先）
  const anyToggleActive = Object.values(tagStates).some(s => s !== "none");

  // persist filters
  useEffect(() => {
    try { localStorage.setItem("list.searchTerm", searchTerm); } catch {}
  }, [searchTerm]);
  useEffect(() => {
    try { localStorage.setItem("list.tagStates", JSON.stringify(tagStates)); } catch {}
  }, [tagStates]);

  // 一覧の並び順：更新降順
  const sortedNotes = useMemo(() => {
    return [...allNotes].sort((a, b) => {
      const A = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
      const B = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
      return (B?.getTime?.() || 0) - (A?.getTime?.() || 0);
    });
  }, [allNotes]);

  // 🔎 フィルタ本体
  const filteredNotes = useMemo(() => {
    const q = anyToggleActive ? "" : (searchTerm || "");
    const isTagQuery = q.trim().startsWith("#");

    // 検索欄でのタグ指定（AND）
    const requiredTags = isTagQuery
      ? q.trim().split(/\s+/).map(t => normalize(t.replace(/^#/, ""))).filter(Boolean)
      : [];

    // トグルでの include / exclude
    const includeTags = Object.keys(tagStates).filter(t => tagStates[t] === "include");
    const excludeTags = Object.keys(tagStates).filter(t => tagStates[t] === "exclude");

    return sortedNotes.filter(n => {
      const title = n.title || "";
      const content = n.content || "";
      const saved = Array.isArray(n.tags) ? n.tags.map(normalize) : [];
      const mined = mineTags(title, content);
      const tagSet = new Set([...saved, ...mined]);

      // 1) 検索欄（#タグ or 通常語）
      let textHit = true;
      if (isTagQuery) {
        textHit = requiredTags.every(t => tagSet.has(t)); // AND
      } else if (q) {
        const needle = normalize(q);
        textHit =
          normalize(title).includes(needle) ||
          normalize(content).includes(needle) ||
          [...tagSet].some(t => t.includes(needle));
      }

      // 2) トグル（include / exclude）
      const includeOk = includeTags.every(t => tagSet.has(t));
      const excludeOk = !excludeTags.some(t => tagSet.has(t));

      return textHit && includeOk && excludeOk;
    });
  }, [sortedNotes, searchTerm, tagStates, anyToggleActive]);

  // 検索欄上に、候補タグ（typeahead + 選択中）を表示
  const visibleTags = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return allTags.filter(tag => {
      const state = tagStates[tag] || "none";
      const matches = lower && tag.toLowerCase().startsWith(lower);
      const selected = state !== "none";
      return matches || selected;
    });
  }, [allTags, searchTerm, tagStates]);

  // If requested via navigation state, focus the first note link
  useEffect(() => {
    if (location?.state?.focusFirst) {
      requestAnimationFrame(() => {
        const first = listRef.current?.querySelector('a[href^="/edit/"]');
        if (first) first.focus();
        // Clear the state so it doesn't persist on back/forward
        navigate(location.pathname, { replace: true, state: {} });
      });
    }
  }, [location, navigate, filteredNotes.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      setLastKeyPressed(`Ctrl: ${e.ctrlKey}, Shift: ${e.shiftKey}, Key: ${e.key}`);
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
    console.log("Nav item clicked");
    setIsNavVisible(false);
    console.log("isNavVisible set to false");
    localStorage.setItem("isNavVisible", false);
    console.log("isNavVisible saved to localStorage");
  };

  const containerClass = embedded ? "text-left p-2" : "max-w-3xl mr-auto text-left p-4";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">ノート一覧 🗂️</h1>
        <Link
          to="/edit/new"
          className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
        >
          新規作成
        </Link>
      </div>

      {/* 🔎 キーワード検索（×で即クリア） */}
      <div className={embedded ? "sticky top-0 z-10 bg-white pb-2" : ""}>
        <div className="relative w-full mb-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="キーワード検索（タイトル・本文・タグ） / 例：#todo #env"
          className="w-full border border-gray-300 rounded px-3 py-2 pr-10"
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
        <div className="mb-4 border rounded bg-white p-2">
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

      {/* 📄 ノート一覧 */}
      {filteredNotes.length === 0 ? (
        <p className="text-gray-500 italic">検索結果が見つかりませんでした…</p>
      ) : (
        <ul className="space-y-2" ref={listRef}>
          {filteredNotes.map((note) => {
            const saved = Array.isArray(note.tags) ? note.tags : [];
            const mined = mineTags(note.title, note.content);
            const tags = [...new Set([...saved, ...mined])];

            return (
              <li key={note.id} className="p-3 border rounded hover:bg-gray-50">
                <div className="font-semibold">
                  <Link
                    className="text-blue-600"
                    to={`/edit/${note.id}`}
                    onClick={() => addRecentNote({ id: note.id, title: note.title || "Untitled" })}
                  >
                    {note.title}
                  </Link>
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
                        className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
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

      {/* ナビゲーションメニュー */}
      {isNavVisible && (
        <nav className="fixed top-0 left-0 h-full w-64 bg-yellow-100 p-4 shadow-md">
          <h2 className="text-lg font-semibold mb-4">メニュー</h2>
          <ul className="space-y-2">
            <li>
              <Link to="/" className="block p-2 rounded hover:bg-yellow-200" onClick={handleNavItemClick}>
                ホーム
              </Link>
            </li>
            <li>
              <Link to="/settings" className="block p-2 rounded hover:bg-yellow-200" onClick={handleNavItemClick}>
                設定
              </Link>
            </li>
            <li>
              <Link to="/profile" className="block p-2 rounded hover:bg-yellow-200" onClick={handleNavItemClick}>
                プロフィール
              </Link>
            </li>
          </ul>
        </nav>
      )}

      {/* デバッグ用：最後に押したキーを表示 */}
      <div className="fixed bottom-4 right-4 bg-white border rounded shadow p-3 text-sm">
        最後に押したキー: {lastKeyPressed}
      </div>
    </div>
  );
}

