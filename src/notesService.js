import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc
} from 'firebase/firestore';

// ノート一覧を取得（全件）
export const getNotes = async (uid) => {
  const notesRef = collection(db, 'users', uid, 'notes');
  const snapshot = await getDocs(notesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ノートを作成
export const createNote = async (uid, note) => {
  const notesRef = collection(db, 'users', uid, 'notes');
  const docRef = await addDoc(notesRef, {
    ...note,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return { id: docRef.id, ...note };
};

// ノートを更新
export const updateNote = async (uid, noteId, note) => {
  const noteRef = doc(db, 'users', uid, 'notes', noteId);
  await updateDoc(noteRef, {
    ...note,
    updatedAt: Date.now(),
  });
};

// ノートを削除
export const deleteNote = async (uid, noteId) => {
  const noteRef = doc(db, 'users', uid, 'notes', noteId);
  await deleteDoc(noteRef);
};

// 単一ノートを取得
export const getNoteById = async (uid, noteId) => {
  const noteRef = doc(db, 'users', uid, 'notes', noteId);
  const snapshot = await getDoc(noteRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};
