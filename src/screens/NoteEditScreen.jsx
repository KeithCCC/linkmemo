// src/screens/NoteEditScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useNotesContext } from "../context/NotesContext";
import { getNoteById, createNote, updateNote } from "../notesService";
import MarkdownIt from "markdown-it";
const md = new MarkdownIt({ breaks: true });



// 共通：候補付きエディタ（左ペイン） --------------------------------------
function EditorWithSuggestions({
  content,
  onChange,
  onScroll,
  textareaRef,
  wrapperRef,
  handleKeyDown,
  linkSuggestions,
  suggestPos,
  selectedSuggestion,
  insertSuggestion,
  fontSizeCls,
}) {
  return (
    <div className="flex-1 relative" ref={wrapperRef}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onScroll={onScroll}
        className={`w-full border-none outline-none px-2 py-1 ${fontSizeCls} leading-tight bg-transparent`}
        style={{ height: "calc(100vh - 300px)" }}
        placeholder="内容を入力..."
      />
      {linkSuggestions.length > 0 && (
        <div
          className="absolute z-50 w-72 max-h-56 overflow-y-auto bg-white border shadow rounded-sm"
          style={{ left: `${suggestPos.left}px`, top: `${suggestPos.top}px` }}
        >
          {linkSuggestions.map((note, idx) => (
            <div
              key={note.id}
              className={`px-2 py-1 cursor-pointer ${idx === selectedSuggestion ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                }`}
              onMouseDown={() => insertSuggestion(note.title)}
              title={note.title}
            >
              {note.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 画面本体 -------------------------------------------------------------------
export default function NoteEditScreen({ user: userProp }) {
  const { addNote, deleteNote } = useNotesContext();
  const { user: userCtx } = useAuthContext();
  const user = userProp || userCtx;

  const { notes } = useNotesContext();
  const allNotes = Array.isArray(notes) ? notes : [];

  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();

  // Refs
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const wrapperRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const noteIdRef = useRef(isNew ? null : id);
  const isSyncingScroll = useRef(false);

  // UI state
  const [content, setContent] = useState("");
  const [mode, setMode] = useState(() => localStorage.getItem("noteViewMode") || "edit");

  const titleToId = useCallback(
    (t) => {
      const hit = allNotes.find((n) => (n.title || "").trim().toLowerCase() === t.trim().toLowerCase());
      return hit ? hit.id : null;
    },
    [allNotes]
  );


  // 文字サイズ（Tailwind の動的クラス対策でマップに変換）
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("noteFontSize") || "base");
  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem("noteFontSize", size);
  };
  const fontSizeCls = useMemo(
    () =>
    ({
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
    }[fontSize] || "text-base"),
    [fontSize]
  );

  const renderMarkdown = useCallback(
    (txt) => {
      // まずMarkdownをHTML化
      let html = md.render(txt || "");

      // [[タイトル]] をリンクに置換
      html = html.replace(/\[\[([^\]]+)\]\]/g, (_, p1) => {
        const noteId = titleToId(p1);
        return noteId
          ? `<a href="/edit/${noteId}" class="text-blue-600 underline">${p1}</a>`
          : `<span class="text-gray-400">[[${p1}]]</span>`;
      });

      return html;
    },
    [titleToId]
  );

  // [[ サジェスト
  const [linkQuery, setLinkQuery] = useState("");
  const [linkSuggestions, setLinkSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [suggestPos, setSuggestPos] = useState({ left: 0, top: 0 });

  // ユーティリティ -----------------------------------------------------------
  const deriveTitle = useCallback((txt) => {
    const first = (txt || "").split(/\r?\n/).find((l) => l.trim().length > 0) || "";
    return first.replace(/^#\s*/, "").trim() || "Untitled";
  }, []);



  // const renderMarkdown = useCallback(
  //   (txt) => {
  //     const withLinks = (txt || "").replace(/\[\[([^\]]+)\]\]/g, (m, p1) => {
  //       const noteId = titleToId(p1);
  //       return noteId
  //         ? `<a href="/edit/${noteId}" class="text-blue-600 underline">[[${p1}]]</a>`
  //         : `[[${p1}]]`;
  //     });
  //     const escaped = withLinks.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  //     return escaped.replace(/\n/g, "<br/>");
  //   },
  //   [titleToId]
  // );

  const computeCaretPosition = useCallback(() => {
    const ta = textareaRef.current;
    const wrap = wrapperRef.current;
    if (!ta || !wrap) return { left: 0, top: 0 };

    const cs = window.getComputedStyle(ta);
    const div = document.createElement("div");

    const props = [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "letterSpacing",
      "textTransform",
      "textAlign",
      "lineHeight",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "whiteSpace",
    ];
    props.forEach((p) => (div.style[p] = cs[p]));

    div.style.whiteSpace = "pre-wrap";
    div.style.wordBreak = "break-word";
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.boxSizing = "border-box";
    div.style.width = ta.clientWidth + "px";
    div.style.left = "0";
    div.style.top = "0";
    div.style.overflow = "hidden";

    const before = ta.value.substring(0, ta.selectionStart);
    div.textContent = before;
    const span = document.createElement("span");
    span.textContent = "\u200b";
    div.appendChild(span);

    wrap.appendChild(div);
    const spanRect = span.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();

    let left = spanRect.left - wrapRect.left - ta.scrollLeft + ta.offsetLeft;
    let top = spanRect.top - wrapRect.top - ta.scrollTop + ta.offsetTop;

    wrap.removeChild(div);

    const lh = parseFloat(cs.lineHeight) || 18;
    top = top + lh + 4;

    const dropdownWidth = 288;
    const maxLeft = Math.max(0, wrap.clientWidth - dropdownWidth - 8);
    left = Math.min(Math.max(0, left), maxLeft);

    return { left, top };
  }, []);

  // 入力時処理：[[ サジェスト & 自動保存スケジュール --------------------------
  const handleContentChange = useCallback(
    (e) => {
      const newContent = e.target.value;
      setContent(newContent);

      // [[… の検出
      const cursorPos = e.target.selectionStart ?? newContent.length;
      const beforeCursor = newContent.slice(0, cursorPos);
      const m = beforeCursor.match(/\[\[([^\]]*)$/);
      const q = m ? m[1].toLowerCase() : null;

      if (q !== null) {
        setLinkQuery(q);
        const sugg = allNotes
          .filter((n) => (n.title || "").toLowerCase().includes(q))
          .slice(0, 10);
        setLinkSuggestions(sugg);
        setSelectedSuggestion(0);
        setSuggestPos(computeCaretPosition());
      } else {
        setLinkQuery("");
        setLinkSuggestions([]);
      }

      // 自動保存タイマー
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        if (!user?.uid) return;

        if (!noteIdRef.current) {
          // 初回保存 → ID でルーティング差し替え
          const now = new Date().toISOString();
          const newNote = {
            title: deriveTitle(newContent),
            content: newContent,
            createdAt: now,
            updatedAt: now,
          };
          try {
            const newId = await createNote(user.uid, newNote);
            noteIdRef.current = newId;
            setMode("edit");
            localStorage.setItem("noteViewMode", "edit");
            navigate(`/edit/${newId}`, { replace: true });
          } catch (err) {
            console.error("初回保存失敗:", err);
          }
        } else {
          // 更新保存
          try {
            const now = new Date().toISOString();
            await updateNote(user.uid, noteIdRef.current, {
              title: deriveTitle(newContent),
              content: newContent,
              updatedAt: now,
            });
          } catch (err) {
            console.error("自動保存失敗:", err);
          }
        }
      }, 800);
    },
    [allNotes, computeCaretPosition, deriveTitle, navigate, user?.uid]
  );

  // 候補確定 ---------------------------------------------------------------
  const insertSuggestion = useCallback(
    (title) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const before = content.slice(0, cursorPos).replace(/\[\[[^\]]*$/, `[[${title}]]`);
      const after = content.slice(cursorPos);
      const updated = before + after;
      setContent(updated);
      setLinkSuggestions([]);
      setLinkQuery("");
      requestAnimationFrame(() => ta.focus());
    },
    [content]
  );

  // キーハンドラ（↑↓Enter/Esc） ------------------------------------------
  const handleKeyDown = useCallback(
    (e) => {
      if (linkSuggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((i) => (i + 1) % linkSuggestions.length);
        setSuggestPos(computeCaretPosition());
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion((i) => (i === 0 ? linkSuggestions.length - 1 : i - 1));
        setSuggestPos(computeCaretPosition());
      } else if (e.key === "Enter") {
        const hit = linkSuggestions[selectedSuggestion];
        if (hit) {
          e.preventDefault();
          insertSuggestion(hit.title);
        }
      } else if (e.key === "Escape") {
        setLinkSuggestions([]);
      }
    },
    [linkSuggestions, selectedSuggestion, computeCaretPosition, insertSuggestion]
  );

  // スクロール同期（split-right） ----------------------------------------
  const syncScroll = useCallback((fromRef, toRef) => {
    if (isSyncingScroll.current) return;
    const from = fromRef.current;
    const to = toRef.current;
    if (!from || !to) return;
    isSyncingScroll.current = true;
    const ratio = from.scrollTop / (from.scrollHeight - from.clientHeight || 1);
    to.scrollTop = ratio * (to.scrollHeight - to.clientHeight);
    isSyncingScroll.current = false;
  }, []);

  // ルート変更時の読み込み・初期化 ------------------------------------------
  useEffect(() => {
    setLinkSuggestions([]);
    setLinkQuery("");
    if (!isNew && user?.uid) {
      getNoteById(user.uid, id).then((note) => {
        if (!note) navigate("/", { replace: true });
        else setContent(note.content || "");
      });
    } else if (isNew) {
      setContent("");
    }
    setMode("edit");
    localStorage.setItem("noteViewMode", "edit");
  }, [id, isNew, user, navigate]);

  const previewHTML = useMemo(() => ({ __html: renderMarkdown(content) }), [content, renderMarkdown]);

  // UI ----------------------------------------------------------------------
  return (
    <div className="p-4 space-y-4">
      {/* タイトル行 */}
      <h1 className="note-title font-bold text-lg">
        {deriveTitle(content)}
        <span className="ml-2 text-sm text-gray-500">
          （ID: {noteIdRef.current ?? "未保存"}）
        </span>
      </h1>

      {/* ボタン群 */}
      {noteIdRef.current && (
        <div className="flex items-center justify-end gap-2">
          {/* 📄 テキスト保存 */}
          <button
            onClick={() => {
              const blob = new Blob([content], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${deriveTitle(content) || "note"}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="bg-gray-600 text-white px-3 py-0.5 text-sm rounded hover:bg-gray-700"
          >
            テキスト保存
          </button>
          {/* ❌ 削除 */}
          <button
            onClick={async () => {
              if (confirm("このノートを削除してもよろしいですか？")) {
                await deleteNote(noteIdRef.current);
                navigate("/", { replace: true });
              }
            }}
            className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700"
          >
            削除
          </button>
        </div>
      )}




      {/* ツールバー */}
      <div className="flex items-center gap-3 text-sm">
        {/* モード切替 */}
        <div className="flex items-center gap-2">
          <button
            className={`px-2 py-1 rounded ${mode === "edit" ? "font-bold underline" : ""}`}
            onClick={() => {
              setMode("edit");
              localStorage.setItem("noteViewMode", "edit");
            }}
          >
            ✏️ 編集
          </button>
          <button
            className={`px-2 py-1 rounded ${mode === "preview" ? "font-bold underline" : ""}`}
            onClick={() => {
              setMode("preview");
              localStorage.setItem("noteViewMode", "preview");
            }}
          >
            👁️ プレビュー
          </button>
          <button
            className={`px-2 py-1 rounded ${mode === "split-right" ? "font-bold underline" : ""}`}
            onClick={() => {
              setMode("split-right");
              localStorage.setItem("noteViewMode", "split-right");
            }}
          >
            ↔️ 分割（右）
          </button>
        </div>

        {/* 文字サイズ */}
        <div className="flex items-center gap-2">
          <span className="opacity-70">文字</span>
          <button onClick={() => changeFontSize("sm")} className={fontSize === "sm" ? "font-bold underline" : ""}>
            小
          </button>
          <button onClick={() => changeFontSize("base")} className={fontSize === "base" ? "font-bold underline" : ""}>
            標準
          </button>
          <button onClick={() => changeFontSize("lg")} className={fontSize === "lg" ? "font-bold underline" : ""}>
            大
          </button>
          <button onClick={() => changeFontSize("xl")} className={fontSize === "xl" ? "font-bold underline" : ""}>
            特大
          </button>
        </div>
      </div>

      {/* 本体 */}
      {mode === "edit" && (
        <EditorWithSuggestions
          content={content}
          onChange={handleContentChange}
          onScroll={() => {
            if (linkSuggestions.length) setSuggestPos(computeCaretPosition());
          }}
          textareaRef={textareaRef}
          wrapperRef={wrapperRef}
          handleKeyDown={handleKeyDown}
          linkSuggestions={linkSuggestions}
          suggestPos={suggestPos}
          selectedSuggestion={selectedSuggestion}
          insertSuggestion={insertSuggestion}
          fontSizeCls={fontSizeCls}
        />
      )}

      {mode === "preview" && (
        <div
          ref={previewRef}
          dangerouslySetInnerHTML={previewHTML}
          className={`prose prose-invert max-w-none ${fontSizeCls} bg-yellow-50/40 dark:bg-zinc-900/30 rounded-lg p-3 border`}
          style={{ minHeight: "40vh" }}
        />
      )}

      {mode === "split-right" && (
        <div className="flex h-full gap-4">
          <EditorWithSuggestions
            content={content}
            onChange={handleContentChange}
            onScroll={() => {
              if (linkSuggestions.length) setSuggestPos(computeCaretPosition());
              syncScroll(textareaRef, previewRef);
            }}
            textareaRef={textareaRef}
            wrapperRef={wrapperRef}
            handleKeyDown={handleKeyDown}
            linkSuggestions={linkSuggestions}
            suggestPos={suggestPos}
            selectedSuggestion={selectedSuggestion}
            insertSuggestion={insertSuggestion}
            fontSizeCls={fontSizeCls}
          />
          <div
            ref={previewRef}
            dangerouslySetInnerHTML={previewHTML}
            className={`flex-1 prose prose-invert max-w-none ${fontSizeCls} bg-yellow-50/40 dark:bg-zinc-900/30 rounded-lg p-3 border`}
            style={{ height: "calc(100vh - 300px)", overflow: "auto" }}
            onScroll={() => syncScroll(previewRef, textareaRef)}
          />
        </div>
      )}
    </div>
  );
}
