// src/screens/NoteEditScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useNotesContext } from "../context/NotesContext";
import { getNoteById, createNote, updateNote as updateNoteRemote } from "../notesService";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import { addRecentNote } from "../recentNotes";
const md = new MarkdownIt({ breaks: true });
md.use(taskLists, { label: true, labelAfter: true });

// --- tag helpers: normalize, strip leading #/＃, mine from text ---
const normalize = (s = "") => s.trim().toLowerCase();
const stripHash = (s = "") => s.replace(/^[#＃]/, "");
const mineTagsFrom = (title = "", content = "") => {
  // Support ASCII/full-width hash; end at whitespace, punctuation, brackets, or EOL
  const re = /(?<![A-Za-z0-9_])[#＃]([A-Za-z0-9\u00C0-\uFFFF._\/-]+)(?=\s|$|[、。,!?:;)\]}<>])/gu;
  const set = new Set();
  for (const m of (`${title}\n${content}`).matchAll(re)) set.add(normalize(m[1]));
  return [...set];
};

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
  onPaste,
  onSelect,
  onKeyUp,
  onMouseUp,
}) {
  return (
    <div className="flex-1 relative" ref={wrapperRef}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onScroll={onScroll}
        onPaste={onPaste}
        onSelect={onSelect}
        onKeyUp={onKeyUp}
        onMouseUp={onMouseUp}
        className={`w-full border-none outline-none px-2 py-1 ${fontSizeCls} leading-tight bg-transparent`}
        style={{ height: "calc(100vh - 240px)" }}
        placeholder="内容を入力..."
      />
      {linkSuggestions.length > 0 && (
        <div
          className="absolute z-50 w-72 max-h-56 overflow-y-auto bg-white dark:bg-gray-700 border border-zinc-200 dark:border-gray-500 shadow rounded-sm"
          style={{ left: `${suggestPos.left}px`, top: `${suggestPos.top}px` }}
        >
          {linkSuggestions.map((note, idx) => (
            <div
              key={note.id}
              className={`px-2 py-1 cursor-pointer ${
                idx === selectedSuggestion
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-100"
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


  // Paste handler for Markdown link (declared later, after content state)
  const { addNote, deleteNote, updateNote: updateNoteInContext } = useNotesContext();
  const { user: userCtx } = useAuthContext();
  const user = userProp || userCtx;

  const { notes } = useNotesContext();
  const allNotes = Array.isArray(notes) ? notes : [];

  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const listHidden = (searchParams.get('list') === 'hidden');
  const toggleListVisibility = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    if (listHidden) {
      next.delete('list');
    } else {
      next.set('list', 'hidden');
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, listHidden]);

  // Refs
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const wrapperRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const noteIdRef = useRef(isNew ? null : id); // ← ここは常に「文字列ID or null」
  const isSyncingScroll = useRef(false);

  // UI state
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState("*"); // "*" = dirty, "saved" = clean
  const [recentMarked, setRecentMarked] = useState(false);
  const restoredForIdRef = useRef(null);

  const saveCaret = useCallback(() => {
    const ta = textareaRef.current;
    const curId = noteIdRef.current || (isNew ? "new" : id);
    if (!ta || !curId) return;
    try {
      const s = ta.selectionStart ?? 0;
      const e = ta.selectionEnd ?? s;
      const st = ta.scrollTop ?? 0;
      localStorage.setItem(`noteCaret:${curId}`, JSON.stringify({ s, e, st }));
    } catch {}
  }, [id, isNew]);

  const restoreCaret = useCallback(() => {
    const ta = textareaRef.current;
    const curId = noteIdRef.current || (isNew ? "new" : id);
    if (!ta || !curId) return;
    let raw = null;
    try {
      raw = localStorage.getItem(`noteCaret:${curId}`);
    } catch {}
    if (!raw) return;
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch {
      return;
    }
    const len = (content || "").length;
    const s = Math.min(Math.max(0, obj?.s ?? 0), len);
    const e = Math.min(Math.max(0, obj?.e ?? s), len);
    const st = typeof obj?.st === "number" ? obj.st : null;
    setTimeout(() => {
      const current = textareaRef.current;
      if (!current) return;
      try {
        current.selectionStart = s;
        current.selectionEnd = e;
        if (st !== null) current.scrollTop = st;
        if (document.activeElement === current || !document.activeElement || document.activeElement === document.body) {
          current.focus();
        }
      } catch {}
    }, 0);
  }, [id, isNew, content]);
  // --- caret/selection helpers ---
  const getLineInfoAt = useCallback((text, index) => {
    const start = text.lastIndexOf("\n", Math.max(0, index - 1)) + 1;
    const endIdx = text.indexOf("\n", index);
    const end = endIdx === -1 ? text.length : endIdx;
    const line = text.slice(start, end);
    return { start, end, line };
  }, []);

  const setContentAndRestore = useCallback((ta, newText, caretPos) => {
    setContent(newText);
    if (ta) {
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = caretPos;
        ta.focus();
      }, 0);
    }
  }, []);

  const wrapSelection = useCallback((ta, left, right) => {
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? start;
    const before = content.slice(0, start);
    const selected = content.slice(start, end);
    const after = content.slice(end);
    const inserted = `${left}${selected || ""}${right}`;
    const nextPos = start + left.length + (selected ? selected.length : 0);
    setContentAndRestore(ta, before + inserted + after, nextPos);
  }, [content, setContentAndRestore]);
  // Paste handler for Markdown link
  const handlePaste = useCallback((e) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const clipboard = e.clipboardData;
    if (!clipboard) return;
    // Try to get both text and URL
    const text = clipboard.getData("text/plain");
    const html = clipboard.getData("text/html");
    // Case: paste a plain URL over a selection -> make [selection](url)
    const hasSelection = (ta.selectionEnd ?? 0) > (ta.selectionStart ?? 0);
    const isUrl = /^https?:\/\/\S+$/i.test((text || "").trim());
    if (hasSelection && isUrl) {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = content.slice(0, start);
      const selected = content.slice(start, end);
      const after = content.slice(end);
      const mdLink = `[${selected}](${text.trim()})`;
      setContentAndRestore(ta, before + mdLink + after, before.length + mdLink.length);
      return;
    }
    // Try to extract a link from HTML (Edge/Chrome rich copy)
    let match = html && html.match(/<a [^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i);
    if (match) {
      const url = match[1];
      const label = match[2];
      // Insert as Markdown
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = content.slice(0, start);
      const after = content.slice(end);
      const mdLink = `[${label}](${url})`;
      setContentAndRestore(ta, before + mdLink + after, before.length + mdLink.length);
      return;
    }
    // Fallback: if only a URL, just paste as normal
  }, [content, setContentAndRestore]);
  const [mode, setMode] = useState(() => {
    return localStorage.getItem("lastMode") || "edit"; // Default to "edit"
  });

  useEffect(() => {
    const handler = () => saveCaret();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveCaret]);

  useEffect(() => {
    return () => {
      saveCaret();
    };
  }, [id, isNew, saveCaret]);

  useEffect(() => {
    const curId = noteIdRef.current || (isNew ? "new" : id);
    if (!curId) return;
    if (!(mode === "edit" || mode === "split-right")) return;
    if (restoredForIdRef.current === curId) return;
    restoreCaret();
    restoredForIdRef.current = curId;
  }, [id, isNew, mode, content, restoreCaret]);

  const titleToId = useCallback(
    (t) => {
      const hit = allNotes.find(
        (n) => (n.title || "").trim().toLowerCase() === t.trim().toLowerCase()
      );
      return hit ? hit.id : null;
    },
    [allNotes]
  );

  // 文字サイズ
  const [fontSize, setFontSize] = useState(
    () => localStorage.getItem("noteFontSize") || "base"
  );
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

  // タグ装飾はプレビュー側で適用（Markdown→HTML 後）
  const renderMarkdown = useCallback(
    (txt) => {
      let html = md.render(txt || "");

      // Annotate task checkboxes with sequential indices for toggling
      {
        let i = 0;
        html = html.replace(/<input([^>]*type=["']checkbox["'][^>]*)>/g, (_, attrs) => {
          const idx = i++;
          const cleaned = attrs.replace(/\sdisabled(=["'][^"']*["'])?/i, "");
          return `<input${cleaned} data-task-index="${idx}">`;
        });
      }

      // [[タイトル]] → 既存ノートへのリンク
      html = html.replace(/\[\[([^\]]+)\]\]/g, (_, p1) => {
        const noteId = titleToId(p1);
        return noteId
          ? `<a href="/edit/${noteId}" class="text-blue-600 underline">${p1}</a>`
          : `<span class="text-gray-400">[[${p1}]]</span>`;
      });

      // #タグ を <span class="tag"> に装飾（日本語・句読点対応）
      html = html.replace(
        /(?<![A-Za-z0-9_])[#＃]([A-Za-z0-9\u00C0-\uFFFF._/-]+)(?=\s|$|[、。,.!?:;)\]}<])/gu,
        '<span class="tag">#$1</span>'
      );

      return html;
    },
    [titleToId]
  );

  const toggleTaskAtIndex = useCallback((text, taskIndex) => {
    if (taskIndex == null || taskIndex < 0) return text;
    let i = 0;
    const lines = (text || "").split(/\r?\n/);
    for (let li = 0; li < lines.length; li++) {
      const m = lines[li].match(/^(\s*[-*+] )\[( |x|X)\](.*)$/);
      if (m) {
        if (i === taskIndex) {
          const prefix = m[1];
          const mark = m[2];
          const rest = m[3];
          const nextMark = mark.toLowerCase() === "x" ? " " : "x";
          lines[li] = `${prefix}[${nextMark}]${rest}`;
          break;
        }
        i++;
      }
    }
    return lines.join("\n");
  }, []);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const onClick = (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      let input = null;
      if (t.tagName.toLowerCase() === "input" && t.getAttribute("type") === "checkbox") {
        input = t;
      } else if (t.tagName.toLowerCase() === "label") {
        const found = t.querySelector('input[type="checkbox"]');
        if (found) input = found;
      }
      if (!input) return;
      e.preventDefault();
      let idxAttr = input.getAttribute("data-task-index");
      let idx = idxAttr != null ? parseInt(idxAttr, 10) : NaN;
      if (Number.isNaN(idx)) {
        const all = Array.from(el.querySelectorAll('input[type="checkbox"]'));
        idx = all.indexOf(input);
      }
      setContent((prev) => toggleTaskAtIndex(prev, idx));
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [previewRef, setContent, toggleTaskAtIndex]);

  // [[ サジェスト ------------------------------------------
  const [linkQuery, setLinkQuery] = useState("");
  const [linkSuggestions, setLinkSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [suggestPos, setSuggestPos] = useState({ left: 0, top: 0 });

  // タイトル抽出
  const deriveTitle = useCallback((txt) => {
    const first =
      (txt || "").split(/\r?\n/).find((l) => l.trim().length > 0) || "";
    return first.replace(/^#\s*/, "").trim() || "Untitled";
  }, []);

  // キャレット位置→サジェスト位置計算
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

  // 入力時処理：[[サジェスト & 自動保存スケジュール --------------------------
  const handleContentChange = useCallback(
    (e) => {
      const newContent = e.target.value;
      setContent(newContent);
      setSaveState("*");

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
          // --- 初回保存：ID取得→URLだけ置換、画面はそのまま ---
          const now = new Date().toISOString();
          const newTitle = deriveTitle(newContent);
          const newTags = mineTagsFrom(newTitle, newContent);
          const newNote = {
            title: newTitle,
            content: newContent,
            tags: newTags,
            createdAt: now,
            updatedAt: now,
          };
          try {
            const created = await createNote(user.uid, newNote);
            // 戻り値が string でも {id, ...} でもOK
            const newId = typeof created === "string" ? created : created.id;

            noteIdRef.current = newId;          // ← 以降は純粋な文字列ID
            addNote({ id: newId, ...newNote }); // ← 一覧即時反映（任意）
            setMode("edit");
            localStorage.setItem("noteViewMode", "edit");
            setSaveState("saved");

            // 画面遷移なしで URL だけを新IDに置換
            window.history.replaceState(null, "", `/edit/${newId}`);
          } catch (err) {
            console.error("初回保存失敗:", err);
          }
        } else {
          // --- 2回目以降：更新保存 ---
          try {
            const now = new Date().toISOString();
            const newTitle = deriveTitle(newContent);
            const newTags = mineTagsFrom(newTitle, newContent);
            await updateNoteRemote(user.uid, noteIdRef.current, {
              title: newTitle,
              content: newContent,
              tags: newTags,
              updatedAt: now,
            });
            // Keep local context in sync so tag mining/list updates immediately
            try {
              updateNoteInContext(noteIdRef.current, {
                title: newTitle,
                content: newContent,
                tags: newTags,
              });
            } catch {}
            setSaveState("saved");
          } catch (err) {
            console.error("自動保存失敗:", err);
          }
        }
      }, 800);
    },
    [allNotes, computeCaretPosition, deriveTitle, user?.uid, addNote]
  );

  // Manual save button handler (create or update immediately)
  const saveNow = useCallback(async () => {
    if (!user?.uid) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const newContent = content;
    if (!noteIdRef.current) {
      const now = new Date().toISOString();
      const newNote = {
        title: deriveTitle(newContent),
        content: newContent,
        createdAt: now,
        updatedAt: now,
      };
      try {
        const created = await createNote(user.uid, newNote);
        const newId = typeof created === "string" ? created : created.id;
        noteIdRef.current = newId;
        addNote({ id: newId, ...newNote });
        setMode("edit");
        localStorage.setItem("noteViewMode", "edit");
        window.history.replaceState(null, "", `/edit/${newId}`);
        setSaveState("saved");
      } catch (err) {
        console.error("手動保存に失敗:", err);
      }
    } else {
      try {
        const now = new Date().toISOString();
        const newTitle = deriveTitle(newContent);
        const newTags = mineTagsFrom(newTitle, newContent);
        await updateNoteRemote(user.uid, noteIdRef.current, {
          title: newTitle,
          content: newContent,
          tags: newTags,
          updatedAt: now,
        });
        try {
          updateNoteInContext(noteIdRef.current, {
            title: newTitle,
            content: newContent,
            tags: newTags,
          });
        } catch {}
        setSaveState("saved");
      } catch (err) {
        console.error("手動保存に失敗:", err);
      }
    }
  }, [user?.uid, content, deriveTitle, addNote]);

  // 候補確定 ---------------------------------------------------------------
  const insertSuggestion = useCallback(
    (title) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const before = content
        .slice(0, cursorPos)
        .replace(/\[\[[^\]]*$/, `[[${title}]]`);
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
      const ta = textareaRef.current;
      // Suggestion navigation first
      if (linkSuggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedSuggestion((i) => (i + 1) % linkSuggestions.length);
          setSuggestPos(computeCaretPosition());
          return;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedSuggestion((i) => (i === 0 ? linkSuggestions.length - 1 : i - 1));
          setSuggestPos(computeCaretPosition());
          return;
        } else if (e.key === "Enter") {
          const hit = linkSuggestions[selectedSuggestion];
          if (hit) {
            e.preventDefault();
            insertSuggestion(hit.title);
            return;
          }
        } else if (e.key === "Escape") {
          setLinkSuggestions([]);
          return;
        }
      }

      if (!ta) return;

      // Formatting shortcuts
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'b') {
        e.preventDefault();
        wrapSelection(ta, '**', '**');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === '-') {
        e.preventDefault();
        wrapSelection(ta, '~~', '~~');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'i') {
        e.preventDefault();
        wrapSelection(ta, '_', '_');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        const start = ta.selectionStart ?? 0;
        const end = ta.selectionEnd ?? start;
        const sel = content.slice(start, end) || 'リンク';
        const url = window.prompt('リンク先URLを入力してください', 'https://');
        if (url) {
          const before = content.slice(0, start);
          const after = content.slice(end);
          const md = `[${sel}](${url})`;
          setContentAndRestore(ta, before + md + after, before.length + md.length);
        }
        return;
      }

      // Enter logic for lists, quotes, code fences
      if (e.key === 'Enter') {
        const cur = ta.selectionStart ?? 0;
        const { start: ls, end: le, line } = getLineInfoAt(content, cur);

        // Code fence auto-close when line is ``` or ```lang
        if (/^```\w*\s*$/.test(line)) {
          e.preventDefault();
          const before = content.slice(0, cur);
          const after = content.slice(cur);
          const insert = "\n\n```";
          setContentAndRestore(ta, before + insert + after, before.length + 1);
          return;
        }

        // Blockquote continuation
        const quoteMatch = line.match(/^(\s*)>\s?(.*)$/);
        if (quoteMatch) {
          e.preventDefault();
          const indent = quoteMatch[1] || '';
          const body = (quoteMatch[2] || '').trim();
          const beforeFull = content.slice(0, cur);
          const afterFull = content.slice(cur);
          if (body.length === 0 && cur >= le) {
            // exit quote on empty line
            setContentAndRestore(ta, beforeFull + "\n" + afterFull, beforeFull.length + 1);
          } else {
            setContentAndRestore(ta, beforeFull + "\n" + indent + "> " + afterFull, beforeFull.length + 1 + indent.length + 2);
          }
          return;
        }

        // List continuation (bulleted / ordered, with optional task [ ] or [x])
        const listMatch = line.match(/^(\s*)(?:([-*+])|(\d+)\.)\s(?:\[( |x|X)\]\s)?(.*)$/);
        if (listMatch) {
          e.preventDefault();
          const indent = listMatch[1] || '';
          const bullet = listMatch[2];
          const num = listMatch[3];
          const rest = (listMatch[5] || '').trim();
          const beforeFull = content.slice(0, cur);
          const afterFull = content.slice(cur);
          if (rest.length === 0 && cur >= le) {
            // Exit list on empty item
            setContentAndRestore(ta, beforeFull + "\n" + afterFull, beforeFull.length + 1);
          } else {
            const nextMarker = bullet ? (bullet + ' ') : (String(parseInt(num, 10) + 1) + '. ');
            const nextPrefix = indent + nextMarker;
            setContentAndRestore(ta, beforeFull + "\n" + nextPrefix + afterFull, beforeFull.length + 1 + nextPrefix.length);
          }
          return;
        }
      }
    },
    [linkSuggestions, selectedSuggestion, computeCaretPosition, insertSuggestion, content, getLineInfoAt, setContentAndRestore, wrapSelection]
  );

  // スクロール同期（split-right） ----------------------------------------
  const syncScroll = useCallback((fromRef, toRef) => {
    if (isSyncingScroll.current) return;
    const from = fromRef.current;
    const to = toRef.current;
    if (!from || !to) return;
    isSyncingScroll.current = true;
    const ratio =
      from.scrollTop / (from.scrollHeight - from.clientHeight || 1);
    to.scrollTop = ratio * (to.scrollHeight - to.clientHeight);
    isSyncingScroll.current = false;
  }, []);

  // ルート変更時の読み込み・初期化 ------------------------------------------
  useEffect(() => {
    setLinkSuggestions([]);
    setLinkQuery("");
    restoredForIdRef.current = null;
    if (!isNew && user?.uid) {
      getNoteById(user.uid, id).then((note) => {
        if (!note) navigate("/", { replace: true });
        else {
          setContent(note.content || "");
          setSaveState("saved");
          try {
            const title = note.title || deriveTitle(note.content || "");
            addRecentNote({ id: note.id || id, title });
          } catch {}
        }
      });
    } else if (isNew) {
      setContent("");
      setSaveState("*");
    }
    setMode("edit");
    localStorage.setItem("noteViewMode", "edit");
  }, [id, isNew, user, navigate]);

  useEffect(() => {
    const savedMode = localStorage.getItem("lastMode");
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lastMode", mode);
  }, [mode]);

  // Keyboard shortcuts for view modes and list toggle/hide
  useEffect(() => {
    const onKey = (e) => {
      // Support Ctrl on Windows/Linux and Cmd on macOS
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = String(e.key).toLowerCase();
      if (k === '1') {
        e.preventDefault();
        setMode('edit');
        localStorage.setItem('noteViewMode', 'edit');
      } else if (k === '2') {
        e.preventDefault();
        setMode('preview');
        localStorage.setItem('noteViewMode', 'preview');
      } else if (k === '3') {
        e.preventDefault();
        setMode('split-right');
        localStorage.setItem('noteViewMode', 'split-right');
      } else if (k === 'l') {
        // Ctrl+L or Ctrl+Shift+L: toggle list panel visibility
        e.preventDefault();
        try { toggleListVisibility(); } catch {}
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleListVisibility]);

  // After a new note gets its ID, add it to recent notes once
  useEffect(() => {
    if (noteIdRef.current && !recentMarked) {
      try {
        const title = deriveTitle(content);
        addRecentNote({ id: noteIdRef.current, title });
      } catch {}
      setRecentMarked(true);
    }
  }, [recentMarked, content]);

  const previewHTML = useMemo(
    () => ({ __html: renderMarkdown(content) }),
    [content, renderMarkdown]
  );

  // モード変更ハンドラ
  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  // UI ----------------------------------------------------------------------
  return (
    <div className="p-2 sm:p-3 space-y-3">
      {/* タイトル行 */}
      <h1 className="note-title font-bold text-lg">
        {deriveTitle(content)}
        <span className="ml-2 text-sm text-gray-500">
          （ID: {noteIdRef.current ?? "未保存"}）
        </span>
        <span className="ml-2 text-sm text-gray-500">
          {saveState === "saved" ? "saved" : "*"}
        </span>
      </h1>

      {/* ツールバー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-sm">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              className={`px-3 py-1 rounded border border-gray-400 bg-white/80 dark:bg-gray-700 ${mode === "edit" ? "font-bold underline" : ""}`}
              onClick={() => {
                setMode("edit");
                localStorage.setItem("noteViewMode", "edit");
              }}
            >
              ✏️ 編集
            </button>
            <button
              className={`px-3 py-1 rounded border border-gray-400 bg-white/80 dark:bg-gray-700 ${mode === "preview" ? "font-bold underline" : ""}`}
              onClick={() => {
                setMode("preview");
                localStorage.setItem("noteViewMode", "preview");
              }}
            >
              👁️ プレビュー
            </button>
            <button
              className={`px-3 py-1 rounded border border-gray-400 bg-white/80 dark:bg-gray-700 ${mode === "split-right" ? "font-bold underline" : ""}`}
              onClick={() => {
                setMode("split-right");
                localStorage.setItem("noteViewMode", "split-right");
              }}
            >
              ↔️ 分割（右）
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="opacity-70">文字</span>
            <button
              onClick={() => changeFontSize("sm")}
              className={`px-2 py-1 rounded border border-gray-300 ${fontSize === "sm" ? "font-bold underline bg-white/70 dark:bg-gray-700" : "bg-white/60 dark:bg-gray-700"}`}
            >
              小
            </button>
            <button
              onClick={() => changeFontSize("base")}
              className={`px-2 py-1 rounded border border-gray-300 ${fontSize === "base" ? "font-bold underline bg-white/70 dark:bg-gray-700" : "bg-white/60 dark:bg-gray-700"}`}
            >
              標準
            </button>
            <button
              onClick={() => changeFontSize("lg")}
              className={`px-2 py-1 rounded border border-gray-300 ${fontSize === "lg" ? "font-bold underline bg-white/70 dark:bg-gray-700" : "bg-white/60 dark:bg-gray-700"}`}
            >
              大
            </button>
            <button
              onClick={() => changeFontSize("xl")}
              className={`px-2 py-1 rounded border border-gray-300 ${fontSize === "xl" ? "font-bold underline bg-white/70 dark:bg-gray-700" : "bg-white/60 dark:bg-gray-700"}`}
            >
              特大
            </button>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 justify-end">
          <button
            onClick={toggleListVisibility}
            className="bg-gray-300 text-gray-800 px-3 py-1 text-sm rounded hover:bg-gray-400"
            title="リスト"
            aria-label="リスト"
          >
            リスト
          </button>
          <button
            onClick={saveNow}
            className="bg-indigo-600 text-white px-3 py-1 text-sm rounded hover:bg-indigo-700"
          >
            保存
          </button>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
          >
            一覧
          </button>
          <button
            onClick={() => navigate("/edit/new")}
            className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
          >
            新規作成
          </button>
          {noteIdRef.current && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* 本体 */}
      {mode === "edit" && (
        <EditorWithSuggestions
          content={content}
          onChange={handleContentChange}
          onScroll={() => {
            if (linkSuggestions.length) setSuggestPos(computeCaretPosition());
            saveCaret();
          }}
          textareaRef={textareaRef}
          wrapperRef={wrapperRef}
          handleKeyDown={handleKeyDown}
          linkSuggestions={linkSuggestions}
          suggestPos={suggestPos}
          selectedSuggestion={selectedSuggestion}
          insertSuggestion={insertSuggestion}
          fontSizeCls={fontSizeCls}
          onPaste={handlePaste}
          onSelect={saveCaret}
          onKeyUp={saveCaret}
          onMouseUp={saveCaret}
        />
      )}

      {mode === "preview" && (
        <div
          ref={previewRef}
          dangerouslySetInnerHTML={previewHTML}
          className={`prose prose-invert max-w-none ${fontSizeCls} bg-[#bdbdbd] dark:bg-[#bdbdbd] rounded-lg p-2 sm:p-3 border border-zinc-300 dark:border-gray-500`}
          style={{ height: "calc(100vh - 240px)", overflow: "auto" }}
        />
      )}

      {mode === "split-right" && (
        <div className="flex h-full gap-2 sm:gap-3">
          <EditorWithSuggestions
            content={content}
          onChange={handleContentChange}
          onScroll={() => {
            if (linkSuggestions.length) setSuggestPos(computeCaretPosition());
            syncScroll(textareaRef, previewRef);
            saveCaret();
          }}
          textareaRef={textareaRef}
          wrapperRef={wrapperRef}
          handleKeyDown={handleKeyDown}
          linkSuggestions={linkSuggestions}
          suggestPos={suggestPos}
          selectedSuggestion={selectedSuggestion}
          insertSuggestion={insertSuggestion}
          fontSizeCls={fontSizeCls}
          onPaste={handlePaste}
          onSelect={saveCaret}
          onKeyUp={saveCaret}
          onMouseUp={saveCaret}
        />
          <div
            ref={previewRef}
            dangerouslySetInnerHTML={previewHTML}
            className={`flex-1 prose prose-invert max-w-none ${fontSizeCls} bg-[#bdbdbd] dark:bg-[#bdbdbd] rounded-lg p-2 sm:p-3 border border-zinc-300 dark:border-gray-500`}
            style={{ height: "calc(100vh - 240px)", overflow: "auto" }}
            onScroll={() => syncScroll(previewRef, textareaRef)}
          />
        </div>
      )}
    </div>
  );

}



