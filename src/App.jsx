// App.jsx
import { Routes, Route, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { loginWithGoogle, logout, subscribeToAuth } from './supabaseAuth';
import NoteDetailScreen from './screens/NoteDetailScreen';
import NoteEditScreen from './screens/NoteEditScreen';
import SettingsScreen from './screens/SettingsScreen';
import HomeScreen from './screens/HomeScreen';
import Navigation from './components/Navigation';
import NoteListScreen from './screens/NoteListScreen';
import TipTapScreen from './screens/TipTapScreen';
import ClipScreen from './screens/ClipScreen';
import ExtensionScreen from './screens/ExtensionScreen';


function App() {
  // const [collapsed, setCollapsed] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("navCollapsed") === "true";
  });
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    localStorage.setItem("navCollapsed", collapsed);
  }, [collapsed]);

  // Global shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const mod = (e.ctrlKey || e.metaKey);
      const modShift = mod && e.shiftKey;
      const key = String(e.key).toLowerCase();

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


  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setUser(user);
      setAuthChecked(true); // ↁEログイン状態確認完亁E��ラグ
    });
    return () => unsubscribe();
  }, []);

  if (!authChecked) {
    return <div className="p-4">ログイン確認中...</div>;
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
      <div className="flex flex-1">
        <Navigation
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          user={user}
          onLogin={loginWithGoogle}
          onLogout={logout}
        />

        <div className="flex-1 relative">
          <button
            className="fixed top-2 left-2 z-50 bg-white shadow px-2 py-1 rounded text-sm"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle menu"
          >
            Menu
          </button>
          <div className="px-2 sm:px-3 pt-4 sm:pt-6">
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
        </div>
      </div>
    </div>
  );
}

export default App;




