import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "./firebaseConfig.js";

const db = getFirestore(app);

async function testConnection() {
  try {
    const userId = "YtA0t5wluzPXPlCB8mGtt9wNsTx1"; // ← 固定
    const notesRef = collection(db, "users", userId, "notes");
    const snapshot = await getDocs(notesRef);

    console.log("✅ Firestore 接続成功:", snapshot.size, " documents");

    snapshot.forEach(doc => {
      console.log("📄", doc.id, "=>", doc.data());
    });
  } catch (err) {
    console.error("❌ Firestore エラー:", err);
  }
}

testConnection();
