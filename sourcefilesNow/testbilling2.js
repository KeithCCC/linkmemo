import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "./firebaseConfig.js";

const db = getFirestore(app);

async function testConnection() {
  try {
    // users/{userId}/notes を指定
    const userId = "YtA0t5wluzPXPlCB8mGtt9wNsTx1";
    const snapshot = await getDocs(collection(db, "users", userId, "notes"));
    
    console.log("✅ Firestore 接続成功:", snapshot.size, " documents");

    snapshot.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
  } catch (err) {
    console.error("❌ Firestore エラー:", err);
  }
}

testConnection();
