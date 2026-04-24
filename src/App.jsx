// App.jsx
import { Routes, Route, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { loginWithGoogle, logout, subscribeToAuth } from './services/authService';
import NoteDetailScreen from './screens/NoteDetailScreen';
import NoteEditScreen from './screens/NoteEditScreen';
import SettingsScreen from './screens/SettingsScreen';
import HomeScreen from './screens/HomeScreen';
import Navigation from './components/Navigation';
import NoteListScreen from './screens/NoteListScreen';
import TipTapScreen from './screens/TipTapScreen';
import ClipScreen from './screens/ClipScreen';
import ExtensionScreen from './screens/ExtensionScreen';
import CommandPalette from './components/CommandPalette';
import { isUxTestMode } from './appMode';


function App() {
  // const [collapsed, setCollapsed] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem("navCollapsed");
    if (stored !== null) return stored === "true";
    if (typeof window !== "undefined") return window.innerWidth < 768;
    return false;
  });
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileNav, setIsMobileNav] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const navigate = useNavigate();
  useEffect(() => {
    localStorage.setItem("navCollapsed", collapsed);
  }, [collapsed]);

  useEffect(() => {
    const onResize = () => setIsMobileNav(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isMobileNav) {
      setCollapsed(true);
    }
  }, [isMobileNav]);

  useEffect(() => {
    if (!isMobileNav) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = collapsed ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [collapsed, isMobileNav]);

  // Global shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const mod = (e.ctrlKey || e.metaKey);
      const modShift = mod && e.shiftKey;
      const key = String(e.key).toLowerCase();

      const target = e.target;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      // Ctrl/Cmd+K: command palette (avoid conflicts while typing)
      if (mod && !e.shiftKey && key === 'k' && !isTypingTarget) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+Shift+C: toggle left nav
      if (modShift && key === 'c') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
        return;
      }

      // Ctrl+0: go to note list and focus the first note
      if (mod && !e.shiftKey && key === '0') {
        e.preventDefault();
        navigate('/', { state: { focusFirst: true } });
        return;
      }

      // Ctrl+9: create a new note
      if (mod && !e.shiftKey && key === '9') {
        e.preventDefault();
        navigate('/edit/new');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commandPaletteActions = [
    {
      id: 'new-note',
      label: 'Create note',
      hint: 'Open /edit/new',
      keywords: 'new create note',
      onSelect: () => navigate('/edit/new'),
    },
    {
      id: 'go-list',
      label: 'Go to notes',
      hint: 'Focus the first note',
      keywords: 'list home notes',
      onSelect: () => navigate('/', { state: { focusFirst: true } }),
    },
    {
      id: 'focus-search',
      label: 'Focus search',
      hint: 'Move to the list search box',
      keywords: 'search filter',
      onSelect: () => window.dispatchEvent(new CustomEvent('asuka-list-focus-search')),
    },
    {
      id: 'toggle-view',
      label: 'Change view',
      hint: 'Cards / list / dense / auto',
      keywords: 'view mode card list',
      onSelect: () => window.dispatchEvent(new CustomEvent('asuka-list-cycle-view')),
    },
    {
      id: 'toggle-focus',
      label: 'Toggle focus',
      hint: 'Toggle focus on the first note',
      keywords: 'focus toggle',
      onSelect: () => window.dispatchEvent(new CustomEvent('asuka-list-toggle-focus-first')),
    },
    {
      id: 'open-settings',
      label: 'Open guide',
      hint: 'Open /settings',
      keywords: 'settings help usage',
      onSelect: () => navigate('/settings'),
    },
  ];


  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setUser(user);
      setAuthChecked(true); // ↁEログイン状態確認完亁E��ラグ
    });
    return () => unsubscribe();
  }, []);

  if (!authChecked) {
    return <div className="p-4">Checking sign-in status...</div>;
  }

  const NoteEditScreenWrapper = () => {
    const { id } = useParams();
    return <NoteEditScreen key={id || "new"} user={user} />;
  };

  // Split layout: resizable list (persisted), editor on the right
  const SplitListAndEditor = () => {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    // Remove list visibility logic - list is always hidden now
    const toggleListVisibility = useCallback(() => {
      setCollapsed((prev) => !prev);
    }, []);

    return (
      <div className="flex items-stretch gap-0 min-h-[70vh] overflow-x-hidden">
        <div className="flex-1 min-w-0">
          <NoteEditScreen
            key={id || "new"}
            user={user}
            listHidden={true}
            toggleListVisibility={toggleListVisibility}
            setNavCollapsed={setCollapsed}
          />
        </div>
      </div>
    );
  };
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1 min-w-0 overflow-x-hidden">
        {(isMobileNav || !collapsed) && (
          <Navigation
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            user={user}
            onLogin={loginWithGoogle}
            onLogout={logout}
            isMobileNav={isMobileNav}
          />
        )}

        <div className="relative flex-1 min-w-0">
          {isMobileNav && !collapsed && <button className="app-mobile-backdrop" aria-label="Close navigation" onClick={() => setCollapsed(true)} />}
          {isUxTestMode && (
            <div className="fixed right-3 top-3 z-50 rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-950 shadow">
              UX Test Mode
            </div>
          )}
          <button
            className={`fixed left-2 top-2 z-50 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold shadow sm:left-3 sm:top-3 ${collapsed ? "block" : isMobileNav ? "block" : "hidden"}`}
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle menu"
          >
            {collapsed ? "Menu" : "Hide menu"}
          </button>
          <div className="px-2 pb-5 pt-14 sm:px-4 sm:pb-6 sm:pt-8 lg:px-6">
            <Routes>
              <Route path="/" element={<NoteListScreen />} />
              <Route path="/note/:id" element={<NoteDetailScreen />} />
              <Route path="/edit/:id" element={<SplitListAndEditor />} />
              <Route path="/new" element={<SplitListAndEditor />} />
              <Route path="/clip" element={<ClipScreen />} />
              <Route path="/extension" element={<ExtensionScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/tiptap" element={<TipTapScreen />} />
            </Routes>

          </div>
          <CommandPalette
            open={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            actions={commandPaletteActions}
          />
        </div>
      </div>
    </div>
  );
}

export default App;




