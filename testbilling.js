// testbilling.js
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "./firebaseConfig.js"; // 拡張子 .js を忘れずに！

const db = getFirestore(app);

async function testConnection() {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    console.log("✅ Firestore 接続成功:", snapshot.size, "documents");
  } catch (err) {
    console.error("❌ Firestore エラー:", err);
  }
}

testConnection();
