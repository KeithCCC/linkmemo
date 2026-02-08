# Firebase → Supabase 移行ガイド

## 📋 移行概要

FirebaseからSupabaseへの移行により、以下のメリットが得られます：
- オープンソースのPostgreSQLデータベース
- より柔軟なクエリとSQL対応
- コスト削減の可能性
- リアルタイム機能の強化

## 🔄 移行対象コンポーネント

### 1. Authentication（認証）
- **Firebase**: Google認証（signInWithPopup）
- **Supabase**: Supabase Auth（Google OAuth対応）

### 2. Database（データベース）
- **Firebase**: Firestore（NoSQLドキュメント）
- **Supabase**: PostgreSQL（リレーショナル）

### 3. データ構造
現在の構造: `users/{uid}/notes/{noteId}`
Supabase構造案: `notes` テーブル（user_id列でフィルタ）

## 📦 必要なパッケージ

### インストール
```bash
npm install @supabase/supabase-js
npm uninstall firebase
```

### package.json更新
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

## 🗄️ データベーススキーマ設計

### テーブル: `notes`
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  focus BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);

-- Row Level Security (RLS) 設定
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のノートのみアクセス可能
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);
```

## 📝 コード移行手順

### Step 1: Supabase設定ファイル作成

**src/supabase.js**（新規作成）
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**/.env**（新規作成）
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 2: 認証機能の書き換え

**src/supabaseAuth.js**（新規作成）
```javascript
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
  }
};

// ログイン状態の監視
export const subscribeToAuth = (callback) => {
  // 初回の状態取得
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user ?? null);
  });
  
  // 状態変更の監視
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null);
    }
  );
  
  return () => subscription.unsubscribe();
};
```

### Step 3: ノートサービスの書き換え

**src/supabaseNotesService.js**（新規作成）
```javascript
import { supabase } from './supabase';

// ノート一覧を取得
export const getNotes = async (uid) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// ノートを作成
export const createNote = async (uid, note) => {
  const { data, error } = await supabase
    .from('notes')
    .insert([{
      user_id: uid,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// ノートを更新
export const updateNote = async (uid, noteId, note) => {
  const { data, error } = await supabase
    .from('notes')
    .update({
      ...note,
      updated_at: new Date().toISOString()
    })
    .eq('id', noteId)
    .eq('user_id', uid)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// ノートを削除
export const deleteNote = async (uid, noteId) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', uid);
  
  if (error) throw error;
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
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
};
```

### Step 4: コンポーネントの更新

既存のインポートを以下のように置き換え：

```javascript
// Before
import { loginWithGoogle, logout, subscribeToAuth } from './auth';
import { getNotes, createNote, updateNote, deleteNote, getNoteById } from './notesService';

// After
import { loginWithGoogle, logout, subscribeToAuth } from './supabaseAuth';
import { getNotes, createNote, updateNote, deleteNote, getNoteById } from './supabaseNotesService';
```

## 🔍 検索機能の強化（Supabaseの利点）

PostgreSQLの強力な検索機能を活用：

```javascript
// 全文検索
export const searchNotes = async (uid, searchTerm) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', uid)
    .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// タグ検索
export const getNotesByTag = async (uid, tag) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', uid)
    .contains('tags', [tag])
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data;
};
```

## 📊 データ移行スクリプト

Firebaseから既存データをエクスポートしてSupabaseにインポート：

**scripts/migrate-data.js**
```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';

const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Admin key for migration
);

async function migrateUserNotes(uid) {
  const notesRef = collection(db, 'users', uid, 'notes');
  const snapshot = await getDocs(notesRef);
  
  const notes = snapshot.docs.map(doc => ({
    user_id: uid,
    title: doc.data().title,
    content: doc.data().content,
    tags: doc.data().tags || [],
    created_at: new Date(doc.data().createdAt).toISOString(),
    updated_at: new Date(doc.data().updatedAt).toISOString()
  }));
  
  const { data, error } = await supabase
    .from('notes')
    .insert(notes);
  
  if (error) {
    console.error('Migration error:', error);
  } else {
    console.log(`Migrated ${notes.length} notes for user ${uid}`);
  }
}

// 全ユーザーのマイグレーション実行
// migrateUserNotes('user-id-here');
```

## ✅ 移行チェックリスト

- [ ] Supabaseプロジェクト作成
- [ ] データベーススキーマ作成（SQL実行）
- [ ] Google OAuth設定（Supabaseダッシュボード）
- [ ] 環境変数設定（.env）
- [ ] パッケージインストール
- [ ] supabase.js作成
- [ ] supabaseAuth.js作成
- [ ] supabaseNotesService.js作成
- [ ] インポート文の更新
- [ ] Firebase設定ファイルの削除
- [ ] テスト環境で動作確認
- [ ] データ移行スクリプト実行
- [ ] 本番デプロイ

## ⚠️ 注意事項

1. **認証フロー変更**: SupabaseのOAuthはリダイレクトベース
2. **IDフォーマット**: FirestoreのドキュメントIDとSupabaseのUUIDは異なる
3. **リアルタイム更新**: 必要に応じてSupabaseのRealtime機能を有効化
4. **バックアップ**: 移行前に必ずFirebaseデータをバックアップ

## 🚀 次のステップ

移行後に活用できるSupabaseの高度な機能：
- **Edge Functions**: サーバーサイドロジック
- **Storage**: ファイルアップロード機能
- **Realtime**: リアルタイム同期
- **Database Functions**: PostgreSQL関数でビジネスロジック実装

## 📚 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [PostgreSQL Full Text Search](https://supabase.com/docs/guides/database/full-text-search)
