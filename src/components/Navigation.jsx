import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotesContext } from "../context/NotesContext";
import { getRecentNotes, RECENT_NOTES_EVENT } from "../recentNotes";
import { useAuthContext } from "../context/AuthContext";

function NavMark({ children }) {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-panel)] text-[11px] font-bold">
      {children}
    </span>
  );
}

export default function Navigation({ collapsed, setCollapsed, user: userProp, onLogin, onLogout, isMobileNav = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;

  const { notes, addNote } = useNotesContext();
  const { user: ctxUser } = useAuthContext() || {};
  const user = userProp || ctxUser;

  const [recent, setRecent] = useState([]);
  const [showSecondary, setShowSecondary] = useState(false);

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
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedNotes = JSON.parse(event.target.result);
        importedNotes.forEach((note) => {
          if (note.title && note.content) addNote(note);
        });
        alert("Notes imported.");
      } catch {
        alert("Import failed. Please choose a valid JSON export.");
      }
    };
    reader.readAsText(file);
  };

  const jumpToSearch = () => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("asuka-list-focus-search"));
      }, 120);
    } else {
      window.dispatchEvent(new CustomEvent("asuka-list-focus-search"));
    }
    if (isMobileNav) setCollapsed(true);
  };

  const triggerSaveText = () => {
    if (location.pathname.startsWith("/edit/")) {
      window.dispatchEvent(new CustomEvent("asuka-export-text"));
    }
  };

  const navLinkClass = (active) =>
    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
      active
        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold"
        : "text-[var(--app-text)] hover:bg-[var(--app-panel)]"
    }`;

  const closeOnMobile = () => {
    if (isMobileNav) setCollapsed(true);
  };

  return (
    <aside
      className={`app-surface border-r border-[var(--app-border)] shadow-sm text-sm font-medium transition-all duration-300 flex flex-col ${
        isMobileNav ? "fixed inset-y-0 left-0 z-40 w-[85vw] max-w-[18.5rem] shadow-2xl" : "sticky top-0 min-h-screen w-72"
      } ${collapsed ? (isMobileNav ? "-translate-x-full" : "w-0 overflow-hidden") : "translate-x-0"}`}
    >
      {!collapsed && (
        <>
          <div className="px-4 pb-3 pt-4 space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="app-section-title">Workspace</div>
              <button onClick={() => setCollapsed(true)} className="app-secondary-button px-3 py-1.5 text-xs">
                Close
              </button>
            </div>

            <div className="app-panel flex items-center justify-between rounded-xl px-3 py-2 text-xs">
              {user ? (
                <>
                  <span className="truncate max-w-[9rem]" title={user.displayName || user.email}>
                    [{user.displayName || user.email || "User"}]
                  </span>
                  <button onClick={onLogout} className="rounded-lg bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600">
                    Logout
                  </button>
                </>
              ) : (
                <button onClick={onLogin} className="w-full rounded-lg bg-green-600 px-3 py-2 text-center text-white hover:bg-green-700">
                  Sign in
                </button>
              )}
            </div>

            <nav className="space-y-1">
              <Link to="/" className={navLinkClass(isActive("/"))} onClick={closeOnMobile}>
                <NavMark>N</NavMark>
                <span>All Notes</span>
              </Link>

              <Link to="/edit/new" className={navLinkClass(isActive("/edit/new"))} onClick={closeOnMobile}>
                <NavMark>+</NavMark>
                <span>New Note</span>
              </Link>

              <Link to="/settings" className={navLinkClass(isActive("/settings"))} onClick={closeOnMobile}>
                <NavMark>?</NavMark>
                <span>Guide</span>
              </Link>
            </nav>

            <section className="app-panel rounded-2xl border border-[var(--app-border)] p-3">
              <div className="app-section-title mb-2">Quick actions</div>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => { navigate("/edit/new"); closeOnMobile(); }} className="app-chip rounded-xl px-3 py-2 text-left text-xs app-panel-hover">
                  Create a note
                </button>
                <button onClick={jumpToSearch} className="app-chip rounded-xl px-3 py-2 text-left text-xs app-panel-hover">
                  Focus search
                </button>
                <button onClick={() => window.dispatchEvent(new CustomEvent("asuka-list-cycle-view"))} className="app-chip rounded-xl px-3 py-2 text-left text-xs app-panel-hover">
                  Change view
                </button>
              </div>
            </section>

            <div className="pt-1">
              <button
                onClick={() => setShowSecondary((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-xs text-[var(--app-muted)] transition-colors hover:bg-[var(--app-panel)] hover:text-[var(--app-text)]"
              >
                <span className="uppercase tracking-wide font-semibold">Tools</span>
                <span className={`transition-transform duration-200 ${showSecondary ? "rotate-90" : ""}`}>{">"}</span>
              </button>

              {showSecondary && (
                <nav className="space-y-1 mt-1">
                  <Link to="/tiptap" className={navLinkClass(isActive("/tiptap")) + " text-xs"} onClick={closeOnMobile}>
                    <NavMark>T</NavMark>
                    <span>TipTap Editor</span>
                  </Link>

                  <button onClick={triggerSaveText} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-[var(--app-panel)]">
                    <NavMark>TXT</NavMark>
                    <span>Export note as text</span>
                  </button>

                  <button onClick={handleExportAllNotes} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-[var(--app-panel)]">
                    <NavMark>JS</NavMark>
                    <span>Export all notes</span>
                  </button>

                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors hover:bg-[var(--app-panel)]">
                    <NavMark>IN</NavMark>
                    <span>Import notes</span>
                    <input type="file" accept=".json" onChange={handleImportNotes} className="hidden" />
                  </label>

                  <Link to="/extension" className={navLinkClass(isActive("/extension")) + " text-xs"} onClick={closeOnMobile}>
                    <NavMark>WEB</NavMark>
                    <span>Web Clipper</span>
                  </Link>
                </nav>
              )}
            </div>
          </div>

          <div className="flex-1 border-t border-[var(--app-border)] px-4 pb-4 pt-3 overflow-y-auto">
            <div className="app-section-title mb-2">Recent notes</div>
            {recent.length === 0 ? (
              <div className="text-xs app-muted-text">No recent notes yet.</div>
            ) : (
              <div className="space-y-1">
                {recent.slice(0, 10).map((note) => (
                  <Link
                    key={note.id}
                    to={`/edit/${note.id}`}
                    className="block truncate rounded-xl px-3 py-2 text-xs text-blue-600 hover:bg-[var(--app-panel)]"
                    title={note.title}
                    onClick={closeOnMobile}
                  >
                    {note.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
