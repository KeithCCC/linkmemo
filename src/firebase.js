import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const readFirebaseEnv = (value) => (typeof value === "string" ? value.trim() : "");

const firebaseConfig = {
  apiKey: readFirebaseEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: readFirebaseEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: readFirebaseEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: readFirebaseEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: readFirebaseEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: readFirebaseEnv(import.meta.env.VITE_FIREBASE_APP_ID),
};

const requiredConfig = ["apiKey", "authDomain", "projectId", "appId"];
if (requiredConfig.some((key) => !firebaseConfig[key])) {
  throw new Error("Firebase Authentication is not configured");
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
