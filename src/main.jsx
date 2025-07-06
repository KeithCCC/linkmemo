import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { NotesProvider } from './context/NotesContext.jsx';
import { BrowserRouter } from 'react-router-dom'; // ✅ ここだけでOK

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotesProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </NotesProvider>
  </React.StrictMode>
);
