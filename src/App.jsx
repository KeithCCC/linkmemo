import { Routes, Route } from 'react-router-dom';
import NoteDetailScreen from './screens/NoteDetailScreen';
import NoteEditScreen from './screens/NoteEditScreen'; // ← 追加
import SettingsScreen from './screens/SettingsScreen'; // ← 追加
import HomeScreen from './screens/HomeScreen';
import Navigation from './components/Navigation';

function App() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/note/:id" element={<NoteDetailScreen />} />
        <Route path="/edit/:id" element={<NoteEditScreen />} /> {/* ← 追加 */}
        <Route path="/settings" element={<SettingsScreen />} /> {/* ← 追加 */}
      </Routes>
    </>
  );
}

export default App;
