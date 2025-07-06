import { Routes, Route } from 'react-router-dom';
import NoteDetailScreen from './screens/NoteDetailScreen';
import HomeScreen from "./screens/HomeScreen"; // ← これを追加
// 他の画面も...

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} /> {/* ← これが必要！ */}
      <Route path="/note/:id" element={<NoteDetailScreen />} />
      {/* 他のルート */}
    </Routes>
  );
}

export default App;
