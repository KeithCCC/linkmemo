// src/screens/ExtensionScreen.jsx
import React, { useMemo } from 'react';

export default function ExtensionScreen() {
  const isEdge = useMemo(() => /Edg\//.test(navigator.userAgent), []);
  const isChrome = useMemo(() => !isEdge && /Chrome\//.test(navigator.userAgent), [isEdge]);

  const storeHint = isEdge
    ? 'edge://extensions/ で「開発者モード」をオン → 「展開して読み込み」'
    : 'chrome://extensions/ で「デベロッパーモード」をオン → 「パッケージ化されていない拡張機能を読み込む」';

  const baseUrl = window.location.origin;
  const optionsPath = isEdge ? 'Edge の拡張機能の詳細→オプション' : 'Chrome の拡張機能の詳細→オプション';

  return (
    <div className="max-w-3xl mr-auto text-left p-4">
      <h1 className="text-xl font-bold mb-4">拡張機能（Web Clipper）</h1>

      {/* README Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded text-gray-900">
        <h2 className="text-lg font-semibold mb-3 text-blue-900">📖 Asuka Clipper について</h2>
        <p className="mb-3 text-sm text-gray-800">
          Asuka Clipper は、ブラウジング中のページを素早くメモに保存できる Chrome/Edge 拡張機能です。
        </p>
        <h3 className="font-semibold mt-4 mb-2 text-sm text-gray-900">✨ 主な機能:</h3>
        <ul className="list-disc ml-6 space-y-1 text-sm text-gray-800">
          <li><strong>ワンクリックでページをクリップ</strong> - ツールバーアイコンまたは右クリックメニューから即座に保存</li>
          <li><strong>ChatGPT 会話の自動抽出</strong> - ChatGPT のページで使用すると、最新の応答を自動的に抽出して保存</li>
          <li><strong>自動タグ付け</strong> - クリップしたページには <code className="bg-gray-200 text-gray-800 px-1 rounded">#clipping</code> タグ、ChatGPT からは <code className="bg-gray-200 text-gray-800 px-1 rounded">#chatgpt</code> タグが自動付与</li>
          <li><strong>シームレスな統合</strong> - クリップ後、自動的にエディタ画面が開き、すぐに編集可能</li>
        </ul>
      </div>

      <h2 className="text-lg font-semibold mb-3">🚀 セットアップ手順</h2>

      <ol className="list-decimal ml-6 space-y-3">
        <li>
          <a className="text-blue-600 underline" href="/asuka-clipper.zip" download>
            asuka-clipper.zip をダウンロード
          </a>
          <div className="text-sm text-gray-600 mt-1">もし 404 の場合は、管理者が zip を用意していません。開発環境では <code>npm run pack:extension</code> で生成できます。</div>
        </li>
        <li>
          {storeHint}
          <div className="text-sm text-gray-600 mt-1">ダイアログで、解凍せず zip を選ぶのではなく <b>展開したフォルダ</b> または zip をドラッグ&ドロップしてください。両方とも可のブラウザがあります。</div>
        </li>
        <li>
          {optionsPath} で <b>App base URL</b> に <code>{baseUrl}</code> を設定して保存
        </li>
        <li>
          任意のページでツールバーのアイコンをクリック、または右クリックメニューから「Clip ... to Asuka」を選択
        </li>
      </ol>

      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded text-gray-900">
        <h2 className="text-lg font-semibold mb-3 text-green-900">📝 使い方</h2>
        
        <h3 className="font-semibold mt-3 mb-2 text-sm text-gray-900">方法1: ツールバーアイコンから</h3>
        <ol className="list-decimal ml-6 space-y-1 text-sm mb-4 text-gray-800">
          <li>クリップしたいページを開く</li>
          <li>ブラウザのツールバーにある Asuka Clipper アイコンをクリック</li>
          <li>自動的にメモが作成され、編集画面に移動します</li>
        </ol>

        <h3 className="font-semibold mt-3 mb-2 text-sm text-gray-900">方法2: 右クリックメニューから</h3>
        <ol className="list-decimal ml-6 space-y-1 text-sm mb-4 text-gray-800">
          <li>ページ上で右クリック</li>
          <li>「Clip to Asuka」を選択</li>
          <li>メモが作成され、編集画面に移動します</li>
        </ol>

        <h3 className="font-semibold mt-3 mb-2 text-sm text-gray-900">ChatGPT での使用:</h3>
        <div className="ml-6 text-sm space-y-2 text-gray-800">
          <p>🤖 <strong>ChatGPT のページで拡張機能を使用すると、最新の AI 応答が自動的に抽出されます。</strong></p>
          <ul className="list-disc ml-6 space-y-1 text-gray-800">
            <li>会話のタイトルがメモのタイトルになります</li>
            <li>最新の ChatGPT 応答が本文として保存されます</li>
            <li><code className="bg-gray-200 text-gray-800 px-1 rounded">#chatgpt</code> タグが自動的に追加されます</li>
            <li>元の会話へのリンクも保存されます</li>
          </ul>
        </div>

        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-gray-900">
          <strong>💡 ヒント:</strong> クリップ後、編集画面ですぐに内容を追加・修正できます。タグやタイトルも自由に変更可能です。
        </div>
      </div>

      <div className="mt-6 p-3 bg-yellow-50 border rounded text-sm text-gray-800">
        本番運用では Chrome ウェブストア / Edge Add-ons からの配布が推奨です。<br />
        管理者向け: リポジトリの <code>extension/</code> を zip 化してストアへ申請、あるいは <code>npm run pack:extension</code> で生成される zip を <code>public/</code> に置いて配布できます。
      </div>
    </div>
  );
}

