// App.jsx
import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import NoteDetailScreen from './screens/NoteDetailScreen';
import NoteEditScreen from './screens/NoteEditScreen';
import SettingsScreen from './screens/SettingsScreen';
import HomeScreen from './screens/HomeScreen';
import Navigation from './components/Navigation';

function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ✅ 上部ヘッダー帯 */}
      <div className="bg-red-500 h-10 w-full flex items-center px-4 text-white font-semibold shadow-sm">
        📝 ASUKA TEXT EDITOR BETA
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
              <Route path="/" element={<HomeScreen />} />
              <Route path="/note/:id" element={<NoteDetailScreen />} />
              <Route path="/edit/:id" element={<NoteEditScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
