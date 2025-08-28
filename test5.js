import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "./firebaseConfig.js";
import { getApp } from "firebase/app";

console.log("接続しているプロジェクト:", getApp().options.projectId);

const db = getFirestore(app);

async function testConnection() {
  try {
    // まず users コレクション直下のドキュメントIDを列挙
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(usersRef);

    console.log("👥 users コレクションにあるドキュメント数:", usersSnap.size);

    usersSnap.forEach(doc => {
      console.log("👤 userId:", doc.id);
    });

    // 特定のユーザーIDで notes を読む
    const userId = "YtA0t5wluzPXPlCB8mGtt9wNsTx1"; // 必要に応じて↑の出力で確認
    const notesRef = collection(db, "users", userId, "notes");
    const notesSnap = await getDocs(notesRef);

    console.log("📝 notes ドキュメント数:", notesSnap.size);

    notesSnap.forEach(doc => {
      console.log("📄", doc.id, "=>", doc.data());
    });

  } catch (err) {
    console.error("❌ Firestore エラー:", err);
  }
}

testConnection();
