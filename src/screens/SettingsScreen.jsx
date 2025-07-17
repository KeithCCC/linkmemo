import React from 'react';

export default function SettingsScreen() {
  return (
    <div className="prose max-w-prose mx-auto p-6 text-base leading-relaxed">
      <h1 className="text-blue-800 text-2xl font-bold mb-4">ASUKAの使い方（初心者向けガイド）</h1>

      <h2>📝 ASUKAとは？</h2>
      <p>
        ASUKAは、シンプルな操作でMarkdownノートが書けるアプリです。<br />
        表示の切り替え、ファイル保存、タグ管理などが手軽にできます。
      </p>

      <h2>🖋 ノートを作成・編集する</h2>
      <ol className="list-decimal pl-5">
        <li>左のメニューから「✏️ 新規作成」をクリックします。</li>
        <li>ノートの1行目がタイトルになります。</li>
        <li>以降の内容はMarkdown形式で自由に記述できます。</li>
      </ol>

      <h2>👁 表示モードを切り替える</h2>
      <ul className="list-disc pl-5">
        <li><kbd>Ctrl</kbd> + <kbd>1</kbd>：編集のみ</li>
        <li><kbd>Ctrl</kbd> + <kbd>2</kbd>：プレビューのみ</li>
        <li><kbd>Ctrl</kbd> + <kbd>3</kbd>：横に分割表示</li>
        <li><kbd>Ctrl</kbd> + <kbd>4</kbd>：縦に分割表示</li>
      </ul>

      <h2>💾 ノートを保存・エクスポートする</h2>
      <ul className="list-disc pl-5">
        <li>「保存」ボタンで内容を記録します。</li>
        <li>「ファイルとして保存」：<code>.txt</code> 形式で保存</li>
        <li>「Markdownとして保存」：<code>.md</code> 形式で保存</li>
      </ul>

      <h2>🏷 タグの使い方</h2>
      <p>
        本文内で <code>#タグ名</code> または <code>＃タグ名</code> を使うと、<br />
        自動的にタグとして抽出・表示されます。
      </p>

      <h2>📥 JSONでの入出力</h2>
      <ul className="list-disc pl-5">
        <li>左のメニューから「📤 エクスポート」で全ノートを <code>.json</code> に保存</li>
        <li>「📥 インポート」で保存済み <code>.json</code> を読み込み、ノートを復元</li>
      </ul>

      <p className="mt-10 text-sm text-gray-500">
        ASUKA — powered by ノノ ✨
      </p>
    </div>
  );
}
