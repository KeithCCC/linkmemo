import React from 'react';

export default function SettingsScreen() {
  return (
    <div className="prose max-w-prose mx-auto p-6 text-base leading-relaxed bg-[#bdbdbd] dark:bg-[#bdbdbd] text-zinc-900 dark:text-zinc-900 rounded border border-zinc-300">
      <h1 className="text-blue-800 text-2xl font-bold mb-4">ASUKA の使い方ガイド</h1>

      <h2>📝 ASUKAとは</h2>
      <p>
        ASUKA はシンプルに Markdown ノートを書けるエディタです。表示モードの切り替え、
        文字装飾、タグ抽出、エクスポート/インポートに対応しています。
      </p>

      <h2>🖋 ノートを作成・編集する</h2>
      <ol className="list-decimal pl-5">
        <li>「新規作成」からノートを作ります（一覧画面右上、またはエディタ右上）。</li>
        <li>1 行目がタイトルになります。</li>
        <li>本文は Markdown で自由に記述できます。</li>
      </ol>

      <h2>⌨️ キーボードショートカット</h2>
      <h3>グローバル</h3>
      <ul className="list-disc pl-5">
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>：サイドバー表示の切り替え</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>0</kbd>：ノート一覧へ移動（先頭にフォーカス）</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>9</kbd>：新規ノートを作成</li>
      </ul>

      <h3>エディタ</h3>
      <ul className="list-disc pl-5">
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>1</kbd>：編集モード</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>2</kbd>：プレビューモード</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>3</kbd>：分割（右）</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>B</kbd>：選択を太字（<code>**text**</code>）</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>I</kbd>：選択を斜体（<code>_text_</code>）</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>-</kbd>：選択を打ち消し線（<code>~~text~~</code>）</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>K</kbd>：リンク作成（URL入力で <code>[text](url)</code>）</li>
        <li><code>[[</code> 入力中：<kbd>↑/↓</kbd> 候補移動、<kbd>Enter</kbd> 決定、<kbd>Esc</kbd> 閉じる</li>
      </ul>

      <h3>ノート一覧</h3>
      <ul className="list-disc pl-5">
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd>：クイックナビの表示切り替え</li>
      </ul>
      <p className="text-xs text-gray-500">※ Ctrl は macOS では Cmd に読み替えてください。</p>

      <h2>💾 ノートを保存・エクスポートする</h2>
      <ul className="list-disc pl-5">
        <li>エディタ右上の「テキスト保存」で <code>.txt</code> として保存できます。</li>
        <li>左メニューの「エクスポート」で全ノートを <code>.json</code> に保存できます。</li>
        <li>「インポート」で保存済み <code>.json</code> を読み込み、ノートを復元します。</li>
      </ul>

      <h2>🏷 タグの使い方</h2>
      <p>
        本文やタイトルに <code>#tag</code> 形式で書くとタグとして自動抽出され、一覧画面で
        フィルタやトグルができます。
      </p>

      <h2>📥 JSONでの入出力</h2>
      <ul className="list-disc pl-5">
        <li>「エクスポート」で全ノートのバックアップを作成します。</li>
        <li>「インポート」でバックアップから復元できます。</li>
      </ul>

      <p className="mt-10 text-sm text-gray-500">ASUKA — powered by Nono ✨</p>
    </div>
  );
}
