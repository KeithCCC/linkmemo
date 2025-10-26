// src/screens/TipTapScreen.jsx
import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

export default function TipTapScreen() {
  const [html, setHtml] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "ここにノートを書いてください…",
      }),
    ],
    content: "<p>初期ノートです。</p>",
    onUpdate({ editor }) {
      setHtml(editor.getHTML());
    },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">🧪 TipTap Editor テスト</h1>

      <div className="border border-gray-300 rounded p-2 bg-white min-h-[200px]">
        <EditorContent editor={editor} />
      </div>

      <div>
        <h2 className="text-md font-semibold mt-4">📄 HTML出力:</h2>
        <pre className="text-sm bg-gray-100 p-2 rounded whitespace-pre-wrap">{html}</pre>
      </div>
    </div>
  );
}
