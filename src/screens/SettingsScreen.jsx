import React from 'react';

export default function SettingsScreen() {
  return (
    <div className="prose max-w-prose mx-auto p-6 text-base leading-relaxed bg-[#bdbdbd] dark:bg-[#bdbdbd] text-zinc-900 dark:text-zinc-900 rounded border border-zinc-300">
      <h1 className="text-blue-800 text-2xl font-bold mb-4">ASUKA の使い方ガイド</h1>

      <h2>📝 ASUKAとは</h2>
      <p>
        ASUKA はシンプルに Markdown ノートを書けるエディタです。表示モードの切り替え、
        文字装飾、タグ抽出、エクスポート/インポート、ChatGPT 連携に対応しています。
      </p>

      <h2>🔍 ナビゲーションとノート検索</h2>
      <h3>サイドバーの使い方</h3>
      <ul className="list-disc pl-5">
        <li><strong>一覧</strong>：全ノートの一覧ページを表示</li>
        <li><strong>新規作成</strong>：新しいノートを作成</li>
        <li><strong>⚙️</strong>：このヘルプを表示</li>
        <li><strong>詳細機能</strong>：クリックで展開・折りたたみ
          <ul className="list-circle pl-5 mt-1">
            <li>TipTap：リッチテキストエディタ（実験的）</li>
            <li>エクスポート：全ノートをJSON形式で保存</li>
            <li>インポート：JSONファイルからノートを復元</li>
            <li>拡張機能：Chrome拡張のヘルプ</li>
          </ul>
        </li>
      </ul>

      <h3>ノート検索とフィルタリング</h3>
      <ul className="list-disc pl-5">
        <li>サイドバーの検索ボックスでタイトル・内容を検索できます</li>
        <li>検索ボックスの <strong>×</strong> ボタンでクリア</li>
        <li>タグをクリックしてフィルタリング：
          <ul className="list-circle pl-5 mt-1">
            <li><span className="text-blue-600">青色</span>：include（このタグを含む）</li>
            <li><span className="text-red-600">赤色</span>：exclude（このタグを除外）</li>
            <li><span className="text-gray-400">灰色</span>：フィルタなし</li>
          </ul>
        </li>
        <li><strong>Group</strong> ボタン：選択中のタグをグループ化</li>
        <li><strong>Dismiss</strong> ボタン：グループタグを全ノートから削除</li>
      </ul>

      <h2>🖋 ノートを作成・編集する</h2>
      <ol className="list-decimal pl-5">
        <li>「新規作成」からノートを作ります（サイドバー、またはエディタ右上）。</li>
        <li>1 行目がタイトルになります。</li>
        <li>本文は Markdown で自由に記述できます。</li>
        <li>エディタは画面の高さに合わせて自動調整されます。</li>
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
        <li>すべてのノートは自動的にクラウドに保存されます（Firebase）</li>
        <li>エディタ右上の「テキスト保存」で現在のノートを <code>.txt</code> として保存できます。</li>
        <li>サイドバーの「エクスポート」で全ノートを <code>.json</code> にバックアップできます。</li>
        <li>「インポート」で保存済み <code>.json</code> を読み込み、ノートを復元します。</li>
      </ul>

      <h2>🏷 タグの使い方</h2>
      <p>
        本文やタイトルに <code>#tag</code> 形式で書くとタグとして自動抽出され、サイドバーの
        ノートリストでフィルタリングできます。
      </p>
      <ul className="list-disc pl-5">
        <li>タグをクリックして include/exclude/off を切り替え</li>
        <li>複数のタグを組み合わせて絞り込み可能</li>
        <li><code>#group:xxx</code> 形式でグループタグを作成可能</li>
      </ul>

      <h2>🤖 Chrome拡張機能（ChatGPT連携）</h2>
      <p>
        Chrome拡張機能をインストールすると、ChatGPTの会話をワンクリックでASUKAに保存できます。
      </p>
      <h3>インストール方法</h3>
      <ol className="list-decimal pl-5">
        <li>サイドバーの「詳細機能」→「拡張機能」を開く</li>
        <li>表示される手順に従って拡張機能をインストール</li>
        <li>ChatGPT のページで右クリックメニューから「Clip to ASUKA」を選択</li>
        <li>ChatGPT の最後の応答がASUKAに自動保存されます</li>
      </ol>

      <h2>📥 JSONでの入出力</h2>
      <ul className="list-disc pl-5">
        <li>「エクスポート」で全ノートのバックアップを作成します。</li>
        <li>「インポート」でバックアップから復元できます。</li>
        <li>複数デバイス間でのデータ移行にも利用できます。</li>
      </ul>

      <h2>🎨 表示設定</h2>
      <ul className="list-disc pl-5">
        <li>ダークモード対応：OSの設定に自動追従</li>
        <li>カスタムスクロールバー：見やすいスクロール表示</li>
        <li>レスポンシブデザイン：画面サイズに応じて最適化</li>
      </ul>

      <h2>🔐 認証とデータ</h2>
      <ul className="list-disc pl-5">
        <li>Googleアカウントでログイン</li>
        <li>すべてのノートはFirebaseに安全に保存</li>
        <li>ログインユーザーごとにデータが分離</li>
      </ul>

      <p className="mt-10 text-sm text-gray-500">ASUKA — powered by Nono ✨</p>
    </div>
  );
}
