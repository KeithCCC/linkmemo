// App.jsx
import { Routes, Route, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { loginWithGoogle, logout, subscribeToAuth } from './auth';
import NoteDetailScreen from './screens/NoteDetailScreen';
import NoteEditScreen from './screens/NoteEditScreen';
import SettingsScreen from './screens/SettingsScreen';
import HomeScreen from './screens/HomeScreen';
import Navigation from './components/Navigation';
import NoteListScreen from './screens/NoteListScreen';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase'; // ← Firebase初期化済みのdbインスタンス



function App() {
  // const [collapsed, setCollapsed] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("navCollapsed") === "true";
  });
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    localStorage.setItem("navCollapsed", collapsed);
  }, [collapsed]);


  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setUser(user);
      setAuthChecked(true); // ← ログイン状態確認完了フラグ
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



  return (
    <div className="flex flex-col min-h-screen">
      {/* ✅ 上部ヘッダー帯 */}
      <div className="bg-red-500 h-10 w-full flex items-center px-4 text-white font-semibold shadow-sm">
        📝 ASUKA2 TEXT EDITOR BETA
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
            className="fixed top-2 left-2 sm:left-1 z-50 sm:hidden bg-white shadow px-3 py-1 rounded"
            onClick={() => setCollapsed(!collapsed)}
          >
            ☰
          </button>
          <div className="px-4 pt-6 sm:pt-8">
            <Routes>
              <Route path="/" element={<NoteListScreen />} />
              <Route path="/note/:id" element={<NoteDetailScreen />} />
              <Route path="/edit/:id" element={<NoteEditScreenWrapper />} />
              <Route path="/new" element={<NoteEditScreenWrapper />} />
              <Route path="/settings" element={<SettingsScreen />} />
            </Routes>

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
