// src/supabaseAuth.js
import { supabase } from './supabase';

// Googleログイン
export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  
  if (error) {
    console.error("ログイン失敗:", error);
    throw error;
  }
  
  return data;
};

// ログアウト
export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("ログアウト失敗:", error);
    throw error;
  }
};

// ログイン状態の監視
export const subscribeToAuth = (callback) => {
  // 初回の状態取得
  supabase.auth.getSession().then(({ data: { session } }) => {
    const user = session?.user ?? null;
    // Firebase互換のユーザーオブジェクトに変換
    if (user) {
      callback({
        uid: user.id,
        email: user.email,
        displayName: user.user_metadata?.full_name || user.email,
        ...user
      });
    } else {
      callback(null);
    }
  });
  
  // 状態変更の監視
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      const user = session?.user ?? null;
      // Firebase互換のユーザーオブジェクトに変換
      if (user) {
        callback({
          uid: user.id,
          email: user.email,
          displayName: user.user_metadata?.full_name || user.email,
          ...user
        });
      } else {
        callback(null);
      }
    }
  );
  
  return () => subscription.unsubscribe();
};
