import React from "react";

export default function SettingsScreen() {
  return (
    <div className="prose max-w-prose mx-auto p-6 text-base leading-relaxed app-panel rounded border">
      <h1 className="text-blue-700 text-2xl font-bold mb-4">ASUKA の使い方ガイド</h1>

      <h2>ASUKA とは</h2>
      <p>
        ASUKA は Markdown ノートを素早く記録し、タグで整理し、一覧で探しやすくするためのノートアプリです。
        編集・プレビュー・分割表示を切り替えながら、日々のメモや調査ログを継続的に蓄積できます。
      </p>

      <h2>基本操作</h2>
      <ul className="list-disc pl-5">
        <li><strong>一覧</strong>：ノートを検索・並び替え・絞り込み</li>
        <li><strong>新規作成</strong>：新しいノートを作成</li>
        <li><strong>使い方</strong>：このガイドを表示</li>
        <li><strong>最近開いたノート</strong>：左ペイン下部からすぐ再編集</li>
      </ul>

      <h2>一覧画面の使い方</h2>
      <h3>ワークスペースタブ</h3>
      <ul className="list-disc pl-5">
        <li><strong>すべて</strong>：全ノート表示</li>
        <li><strong>最近</strong>：最近開いたノートのみ表示</li>
        <li><strong>タグ</strong>：タグ付きノートのみ表示</li>
        <li><strong>グループ</strong>：グループタグを含むノート表示</li>
        <li><strong>フォーカス</strong>：Focus ON のノート表示</li>
      </ul>

      <h3>表示モード</h3>
      <p>右上の表示ボタンで次を切り替えできます。</p>
      <ul className="list-disc pl-5">
        <li><strong>カード</strong>：情報を広く確認</li>
        <li><strong>リスト</strong>：標準的な一覧表示</li>
        <li><strong>高密度</strong>：1画面に多くのノートを表示</li>
        <li><strong>自動</strong>：画面サイズに応じて自動調整</li>
      </ul>

      <h3>検索・並び替え・タグフィルター</h3>
      <ul className="list-disc pl-5">
        <li>検索ボックスはタイトル・本文・タグを横断検索します。</li>
        <li>並び替えは <strong>更新日</strong> / <strong>タグ</strong> を選択できます。</li>
        <li>更新日ソート時は <strong>新しい順 / 古い順</strong> を選べます。</li>
        <li>タグは <strong>include → exclude → 解除</strong> の順で切り替わります。</li>
      </ul>

      <h3>その他（詳細フィルター）</h3>
      <ul className="list-disc pl-5">
        <li><strong>グループ化</strong>：include 状態のタグをまとめてグループタグ化</li>
        <li><strong>グループ解除</strong>：選択中グループタグをノートから解除</li>
        <li><strong>全タグ</strong>：全タグから直接フィルターを設定</li>
      </ul>

      <h2>編集画面の使い方</h2>
      <ul className="list-disc pl-5">
        <li>1行目はタイトルとして表示されます。</li>
        <li>モード切替：<strong>編集 / プレビュー / 分割</strong></li>
        <li><strong>その他</strong>ボタンから文字サイズ・箇条書き・チェック整形</li>
        <li><strong>Focus</strong>で重要ノートを切り替え</li>
      </ul>

      <h2>左ペイン（サイドバー）</h2>
      <p>左ペインは「軽量ナビゲーション＋クイック操作」に最適化されています。</p>
      <ul className="list-disc pl-5">
        <li><strong>クイック操作</strong>：新規ノート / 一覧検索へ / 表示切替</li>
        <li><strong>詳細機能</strong>：テキスト保存 / エクスポート / インポート / 拡張機能</li>
      </ul>

      <h2>キーボードショートカット</h2>
      <h3>グローバル</h3>
      <ul className="list-disc pl-5">
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>：サイドバー表示切替</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>0</kbd>：一覧へ移動</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>9</kbd>：新規ノート作成</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>K</kbd>：コマンドパレット表示</li>
      </ul>

      <h3>エディタ</h3>
      <ul className="list-disc pl-5">
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>1</kbd>：編集モード</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>2</kbd>：プレビューモード</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>3</kbd>：分割モード</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>B</kbd>：太字</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>I</kbd>：斜体</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>-</kbd>：打ち消し線</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>L</kbd>：一覧へ戻る</li>
        <li><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd>：チェックボックス整形</li>
      </ul>

      <h2>データ管理</h2>
      <ul className="list-disc pl-5">
        <li>ノートは Supabase に保存されます。</li>
        <li>サイドバーの <strong>エクスポート</strong> で JSON バックアップを作成できます。</li>
        <li><strong>インポート</strong> で JSON バックアップから復元できます。</li>
      </ul>

      <p className="mt-10 text-sm app-muted-text">ASUKA - powered by Nono</p>
    </div>
  );
}
