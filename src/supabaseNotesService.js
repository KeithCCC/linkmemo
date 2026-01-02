// src/supabaseNotesService.js
import { supabase } from './supabase';

// ノート一覧を取得（全件）
export const getNotes = async (uid) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch notes:', error);
    throw error;
  }
  
  // Convert snake_case to camelCase for React app
  return (data || []).map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    tags: note.tags,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  }));
};

// ノートを作成
export const createNote = async (uid, note) => {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('notes')
    .insert([{
      user_id: uid,
      title: note.title || '',
      content: note.content || '',
      tags: note.tags || [],
      created_at: now,
      updated_at: now
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Failed to create note:', error);
    throw error;
  }
  
  return data.id;
};

// ノートを更新
export const updateNote = async (uid, noteId, note) => {
  const updates = {
    title: note.title,
    content: note.content,
    tags: note.tags || [],
    updated_at: note.updatedAt || new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', noteId)
    .eq('user_id', uid)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to update note:', error);
    throw error;
  }
  
  return data;
};

// ノートを削除
export const deleteNote = async (uid, noteId) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', uid);
  
  if (error) {
    console.error('Failed to delete note:', error);
    throw error;
  }
};

// 単一ノートを取得
export const getNoteById = async (uid, noteId) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .eq('user_id', uid)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Failed to fetch note:', error);
    throw error;
  }
  
  // Convert snake_case to camelCase
  return data ? {
    id: data.id,
    title: data.title,
    content: data.content,
    tags: data.tags,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } : null;
};
