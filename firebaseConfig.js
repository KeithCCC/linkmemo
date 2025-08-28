// firebaseConfig.js
import { initializeApp } from "firebase/app";

// const firebaseConfig = {
//   apiKey: "AIzaSyDbzxj19yXg0H0mlo2Y5uCNst-1qQasMBQ",          // 御主人様の Firebase API Key
//   authDomain: "link-memo-e7515.firebaseapp.com",
//   projectId: "link-memo-e7515",
//   storageBucket: "link-memo-e7515.appspot.com",
//   messagingSenderId: "xxxxxxx",
//   appId: "1:81184793660:web:73f757077bb009cd96cf39"
// };
const firebaseConfig = {
  apiKey: "AIzaSyDbzxj19yXg0H0mlo2Y5uCNst-1qQasMBQ",
  authDomain: "link-memo-e7515.firebaseapp.com",
  projectId: "link-memo-e7515",
  storageBucket: "link-memo-e7515.firebasestorage.app",
  messagingSenderId: "81184793660",
  appId: "1:81184793660:web:73f757077bb009cd96cf39",
  measurementId: "G-ZWDRGBKB5N"
};

// Firebase アプリを初期化
export const app = initializeApp(firebaseConfig);
