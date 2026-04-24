// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToAuth } from '../services/authService';

const AuthContext = createContext();

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((supabaseUser) => {
      setUser(supabaseUser);
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, authChecked }}>
      {children}
    </AuthContext.Provider>
  );
};
