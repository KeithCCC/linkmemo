import { Routes, Route } from 'react-router-dom';
import NoteDetailScreen from './screens/NoteDetailScreen';
import HomeScreen from './screens/HomeScreen';
import Navigation from './components/Navigation'; // ← 追加！

function App() {
  return (
    <>
      <Navigation /> {/* ← ここで表示！ */}
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/note/:id" element={<NoteDetailScreen />} />
        {/* 他のルート */}
      </Routes>
    </>
  );
}

export default App;
