// App.jsx
import { Routes, Route, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { loginWithGoogle, logout, subscribeToAuth } from './auth';
import NoteDetailScreen from './screens/NoteDetailScreen';
import NoteEditScreen from './screens/NoteEditScreen';
import SettingsScreen from './screens/SettingsScreen';
import HomeScreen from './screens/HomeScreen';
import Navigation from './components/Navigation';
import NoteListScreen from './screens/NoteListScreen';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase'; // ← Firebase初期化済みのdbインスタンス
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
  const [canInstall, setCanInstall] = useState(false);
  const deferredPromptRef = useRef(null);
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
      setAuthChecked(true); // ← ログイン状態確認完了フラグ
    });
    return () => unsubscribe();
  }, []);

  // PWA install prompt handler (appears in preview/prod when installable)
  useEffect(() => {
    const onBIP = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
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
    const [searchParams] = useSearchParams();
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
    const [containerWidth, setContainerWidth] = useState(0);
    const [listWidth, setListWidth] = useState(() => {
      try {
        const saved = parseInt(localStorage.getItem('list.widthPx'), 10);
        if (!isNaN(saved) && saved > 0) return saved;
      } catch {}
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
      if (vw >= 1440) return 360;
      if (vw >= 1024) return Math.round(Math.min(Math.max(vw * 0.30, 280), 420));
      if (vw >= 768) return Math.round(Math.min(Math.max(vw * 0.35, 260), 420));
      return 0; // mobile will hide list
    });

    useEffect(() => {
      try { localStorage.setItem('list.widthPx', String(listWidth)); } catch {}
    }, [listWidth]);

    useEffect(() => {
      const onResize = () => setViewportWidth(window.innerWidth);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
      const el = containerRef.current;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry?.contentRect?.width;
          if (typeof w === 'number') setContainerWidth(w);
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      const onMove = (e) => {
        if (!isDragging) return;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const minList = 260;
        const maxList = 520;
        const handleW = 6;
        const containerWidth = rect.width;
        const minEditor = 640;
        const maxByEditor = containerWidth - minEditor - handleW;
        const clamped = Math.max(minList, Math.min(Math.min(maxList, maxByEditor), x));
        setListWidth(clamped);
        e.preventDefault();
      };
      const onUp = () => setIsDragging(false);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }, [isDragging]);

    // Clamp list width to fit available space and avoid horizontal scroll
    useEffect(() => {
      if (!containerRef.current) return;
      if (containerWidth > 0) {
        const minEditor = 640;
        const handleW = 6;
        const maxAllowedList = Math.max(0, containerWidth - minEditor - handleW);
        if (listWidth > maxAllowedList) {
          setListWidth(Math.max(260, Math.min(520, maxAllowedList)));
        }
      }
    }, [containerWidth, listWidth]);

    const listHiddenParam = (searchParams.get('list') === 'hidden');
    const isMobile = viewportWidth < 768;
    const minEditor = 640;
    const minList = 260;
    const handleW = 6;
    const tooNarrowForSplit = containerWidth > 0 && (containerWidth < (minEditor + minList + handleW));
    const listHidden = listHiddenParam || isMobile || tooNarrowForSplit;

    return (
      <div ref={containerRef} className="flex items-stretch gap-0 min-h-[70vh] overflow-x-hidden">
        {!listHidden && (
          <div
            className="shrink-0 border-r bg-white overflow-y-auto pr-2"
            style={{ width: listWidth, maxHeight: 'calc(100vh - 140px)' }}
          >
            <NoteListScreen embedded />
          </div>
        )}
        {!listHidden && (
          <div
            className={`w-[6px] cursor-col-resize ${isDragging ? 'bg-gray-400' : 'bg-transparent'} hover:bg-gray-300`}
            onMouseDown={() => setIsDragging(true)}
            title="Drag to resize"
          />
        )}
        <div className={`flex-1 ${listHidden ? 'min-w-0' : 'min-w-[640px]'}`}>
          <NoteEditScreen key={id || "new"} user={user} />
        </div>
      </div>
    );
  };


  return (
    <div className="flex flex-col min-h-screen">
      {/* ✅ 上部ヘッダー帯 */}
      <div className="bg-red-500 h-10 w-full flex items-center px-4 text-white font-semibold shadow-sm">
        📝 ASUKA2 TEXT EDITOR BETA
        {canInstall && (
          <button
            onClick={async () => {
              const dp = deferredPromptRef.current;
              if (!dp) return;
              dp.prompt();
              await dp.userChoice;
              deferredPromptRef.current = null;
              setCanInstall(false);
            }}
            className="ml-3 bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded"
          >
            インストール
          </button>
        )}
      </div>

      <div className="ml-0 flex gap-2 items-center bg-gray-200">
        {user ? (
          <>
            <span className="text-sm">[{user.displayName}]</span>
            <button onClick={logout} className="bg-white text-red-500 px-2 py-1 rounded">ログアウト</button>
          </>
        ) : (
          <button onClick={loginWithGoogle} className="bg-white text-red-500 px-2 py-1 rounded">ログイン</button>
        )}
      </div>


      {/* ✅ 本体エリア（サイドバー＋ページ） */}
      <div className="flex flex-1">
        <Navigation collapsed={collapsed} setCollapsed={setCollapsed} />

        <div className="flex-1 relative">
          {/* モバイル用ハンバーガー */}
          <button
            // className="fixed top-2 left-2 z-50 bg-white shadow px-2 py-1 rounded text-sm text-gray-700 hover:text-black border"
            className="fixed top-2 left-2 z-50 bg-white shadow px-3 py-1 rounded"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="メニューを開く"
          >
            ☰
          </button>
          <div className="px-4 pt-6 sm:pt-8">
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
