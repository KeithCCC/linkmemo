承知しました、御主人様っ！
ではまず「**ASUKAリンクメモ機能のデータ構造**」から設計に入りますね。

---

## 🧬 ASUKA リンクメモ機能：MVP用データ構造案（v0.1）

### 1. 📝 `Note`（ノート）

| フィールド       | 型                   | 説明                       |
| ----------- | ------------------- | ------------------------ |
| `id`        | string              | ノートの一意なID（Firebase UID）  |
| `content`   | string              | メモ本文（Markdown＋\[\[リンク]]） |
| `tags`      | string\[]           | 紐づけられたタグの配列              |
| `status`    | `"todo"` / `"done"` | ToDo状態の管理（MVP対応）         |
| `createdAt` | timestamp           | 作成日時                     |
| `updatedAt` | timestamp           | 最終更新日時                   |

---

### 2. 🏷 `Tag`（タグ）

| フィールド         | 型           | 説明                    |
| ------------- | ----------- | --------------------- |
| `id`          | string      | タグのID（= 名前と同じでもOK）    |
| `label`       | string      | 表示名（例：#仕事）            |
| `description` | string (任意) | タグの用途や定義（Post-MVPで活用） |

---

### 3. 🔗 `LinkMemo`（リンクメモ）

| フィールド         | 型           | 説明                       |
| ------------- | ----------- | ------------------------ |
| `id`          | string      | リンクメモID                  |
| `title`       | string      | リンクメモの名前（まとめのタイトル）       |
| `noteIds`     | string\[]   | まとめたノートのID配列             |
| `createdAt`   | timestamp   | 作成日                      |
| `description` | string (任意) | このまとめの意図・背景（Post-MVPで活用） |

---

### 4. 🔁 `TagRelation`（タグ間の関連）

| フィールド      | 型                                        | 説明                  |
| ---------- | ---------------------------------------- | ------------------- |
| `from`     | string                                   | 元タグID               |
| `to`       | string                                   | 関連タグID              |
| `relation` | `"related"` / `"similar"` / `"includes"` | 関係の種別（Post-MVPで精緻化） |

---

### ✅ 最小構成としては

* `Note` + `Tag` → 断片の入力・検索・記録
* `LinkMemo` → 思考の束ね
* `TagRelation` → 発見的探索（MVPでは静的定義でOK）

---

次に「モック画面」へと進みますっ！

画面構成は以下を想定しております：

### 📱 モック対象画面（MVP対応）

1. **NoteListScreen**：タグフィルタ＋ToDoフィルタ＋ノート一覧
2. **NoteEditScreen**：短文入力＋タグ入力＋\[\[リンク補完]]
3. **LinkMemoScreen**：ノート選択＋リンクメモ作成
4. **TagSuggestPopup**：関連タグ候補表示（インライン）

---

御主人様、どの画面からモックアップを始めたいですか？
あるいは「全体の画面遷移図」が見たい場合も対応できます！✨
