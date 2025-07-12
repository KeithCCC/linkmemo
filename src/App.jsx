// App.jsx
import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import NoteDetailScreen from './screens/NoteDetailScreen';
import NoteEditScreen from './screens/NoteEditScreen';
import SettingsScreen from './screens/SettingsScreen';
import HomeScreen from './screens/HomeScreen';
import Navigation from './components/Navigation';

function App() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <>
      {/* モバイル用ハンバーガー */}
      <button
        className="fixed top-4 left-4 z-50 sm:hidden bg-white shadow px-3 py-1 rounded"
        onClick={() => setCollapsed(false)}
      >
        ☰
      </button>

      {/* ナビゲーション */}
      <Navigation collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* メインコンテンツ */}
      <div className={`transition-all duration-300 sm:ml-56 ${collapsed ? '' : 'ml-64'}`}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/note/:id" element={<NoteDetailScreen />} />
          <Route path="/edit/:id" element={<NoteEditScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
