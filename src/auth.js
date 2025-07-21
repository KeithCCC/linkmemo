// src/auth.js
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Googleログイン
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("ログイン失敗:", error);
    throw error;
  }
};

// ログアウト
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("ログアウト失敗:", error);
  }
};

// ログイン状態の監視
export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};
