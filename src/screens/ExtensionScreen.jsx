import React, { useMemo } from "react";

export default function ExtensionScreen() {
  const isEdge = useMemo(() => /Edg\//.test(navigator.userAgent), []);

  const storeHint = isEdge
    ? "Open edge://extensions/, enable Developer Mode, then load the unpacked extension folder."
    : "Open chrome://extensions/, enable Developer Mode, then load the unpacked extension folder.";

  const baseUrl = window.location.origin;
  const optionsPath = isEdge ? "Open the Edge extension options page" : "Open the Chrome extension options page";

  return (
    <div className="app-page-tight">
      <section className="app-reading-surface p-6 sm:p-8">
        <div className="app-doc text-left">
          <div className="app-section-title mb-3">Extension</div>
          <h1 className="text-3xl font-black tracking-tight mb-4">Web Clipper Setup</h1>

          <div className="mb-6 rounded-2xl border bg-blue-50 p-5 text-gray-900">
            <h2 className="text-lg font-semibold mb-3 text-blue-900">What the web clipper does</h2>
            <p className="mb-3 text-sm text-gray-800">
              The ASUKA web clipper saves web pages and excerpts into your note workspace so you can keep research and writing in one place.
            </p>
            <h3 className="font-semibold mt-4 mb-2 text-sm text-gray-900">Main features</h3>
            <ul className="list-disc ml-6 space-y-1 text-sm text-gray-800">
              <li><strong>Clip a page quickly</strong> from the browser toolbar or context menu</li>
              <li><strong>Capture ChatGPT output</strong> into notes for later review</li>
              <li><strong>Add tags automatically</strong> such as <code className="rounded bg-gray-200 px-1 text-gray-800">#clipping</code> or <code className="rounded bg-gray-200 px-1 text-gray-800">#chatgpt</code></li>
              <li><strong>Jump straight into editing</strong> after clipping</li>
            </ul>
          </div>

          <h2 className="text-lg font-semibold mb-3">Setup steps</h2>

          <ol className="list-decimal ml-6 space-y-3">
            <li>
              <a className="text-blue-600 underline" href="/asuka-clipper.zip" download>
                Download asuka-clipper.zip
              </a>
              <div className="text-sm text-gray-600 mt-1">If the zip is missing, generate it locally with <code>npm run pack:extension</code>.</div>
            </li>
            <li>
              {storeHint}
              <div className="text-sm text-gray-600 mt-1">If unpacked loading fails, unzip the archive first and point the browser at the extracted folder.</div>
            </li>
            <li>
              {optionsPath} and set <b>App base URL</b> to <code>{baseUrl}</code>.
            </li>
            <li>Visit any page and trigger the clipper from the toolbar icon or context menu.</li>
          </ol>

          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-gray-900">
            <h2 className="text-lg font-semibold mb-3 text-green-900">How to use it</h2>

            <h3 className="font-semibold mt-3 mb-2 text-sm text-gray-900">Option 1: clip from the toolbar</h3>
            <ol className="list-decimal ml-6 space-y-1 text-sm mb-4 text-gray-800">
              <li>Open the page you want to save</li>
              <li>Click the ASUKA clipper icon in the browser toolbar</li>
              <li>The note is created and you are sent into the editor</li>
            </ol>

            <h3 className="font-semibold mt-3 mb-2 text-sm text-gray-900">Option 2: clip from the context menu</h3>
            <ol className="list-decimal ml-6 space-y-1 text-sm mb-4 text-gray-800">
              <li>Right-click on the page</li>
              <li>Select <strong>Clip to Asuka</strong></li>
              <li>The note is created and opened in the editor</li>
            </ol>

            <h3 className="font-semibold mt-3 mb-2 text-sm text-gray-900">Using it with ChatGPT</h3>
            <div className="ml-6 text-sm space-y-2 text-gray-800">
              <p><strong>You can also use the clipper on ChatGPT pages to save the latest answer into your notes.</strong></p>
              <ul className="list-disc ml-6 space-y-1 text-gray-800">
                <li>The conversation title can become the note title</li>
                <li>The latest AI response can be stored in the note body</li>
                <li>A <code className="rounded bg-gray-200 px-1 text-gray-800">#chatgpt</code> tag can be added automatically</li>
                <li>The source link can be preserved for later reference</li>
              </ul>
            </div>

            <div className="mt-4 rounded border border-yellow-300 bg-yellow-100 p-3 text-sm text-gray-900">
              <strong>Tip</strong> Keep the note title and tags clean after clipping so retrieval stays fast later.
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-yellow-50 p-3 text-sm text-gray-800">
            This page describes local setup. If browser store publishing is added later, these instructions can be shortened further.
          </div>
        </div>
      </section>
    </div>
  );
}
