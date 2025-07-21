// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDbzxj19yXg0H0mlo2Y5uCNst-1qQasMBQ",
  authDomain: "link-memo-e7515.firebaseapp.com",
  projectId: "link-memo-e7515",
  storageBucket: "link-memo-e7515.firebasestorage.app",
  messagingSenderId: "81184793660",
  appId: "1:81184793660:web:73f757077bb009cd96cf39",
  measurementId: "G-ZWDRGBKB5N"

};

// Firebase アプリ初期化
const app = initializeApp(firebaseConfig);

// 認証とFirestoreインスタンスをエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
