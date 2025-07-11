// App.jsx
import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import NoteDetailScreen from './screens/NoteDetailScreen';
import NoteEditScreen from './screens/NoteEditScreen';
import SettingsScreen from './screens/SettingsScreen';
import HomeScreen from './screens/HomeScreen';
import Navigation from './components/Navigation';

function App() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("navCollapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("navCollapsed", collapsed);
  }, [collapsed]);

  return (
    <>
      <Navigation collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-56'}`}>
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
