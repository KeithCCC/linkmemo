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

      <div className="mt-6 p-3 bg-yellow-50 border rounded text-sm">
        本番運用では Chrome ウェブストア / Edge Add-ons からの配布が推奨です。<br />
        管理者向け: リポジトリの <code>extension/</code> を zip 化してストアへ申請、あるいは <code>npm run pack:extension</code> で生成される zip を <code>public/</code> に置いて配布できます。
      </div>
    </div>
  );
}

