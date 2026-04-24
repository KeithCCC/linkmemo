import React from "react";

export default function SettingsScreen() {
  return (
    <div className="app-page-tight">
      <section className="app-reading-surface p-6 sm:p-8">
        <div className="app-doc prose text-base leading-relaxed">
          <div className="app-section-title mb-3">Guide</div>
          <h1 className="text-blue-700 text-2xl font-bold mb-4">ASUKA Guide</h1>

          <h2>What ASUKA is for</h2>
          <p>
            ASUKA is a Markdown note workspace designed for fast capture, quick retrieval, and lightweight knowledge linking.
            The main goal is to help you create notes quickly, find them again without friction, and keep editing without losing your place.
          </p>

          <h2>Main areas</h2>
          <ul className="list-disc pl-5">
            <li><strong>All Notes</strong>: browse, search, filter, and sort notes</li>
            <li><strong>New Note</strong>: create a fresh note immediately</li>
            <li><strong>Guide</strong>: open this help screen</li>
            <li><strong>Recent Notes</strong>: jump back into work quickly</li>
          </ul>

          <h2>How the notes screen works</h2>
          <h3>Workspace tabs</h3>
          <ul className="list-disc pl-5">
            <li><strong>All</strong>: show every note</li>
            <li><strong>Recent</strong>: show recently opened notes</li>
            <li><strong>Tags</strong>: show notes with tags</li>
            <li><strong>Groups</strong>: show notes with grouped tags</li>
            <li><strong>Focus</strong>: show focus-marked notes</li>
          </ul>

          <h3>View modes</h3>
          <p>The view button cycles between cards, list, dense, and auto mode.</p>
          <ul className="list-disc pl-5">
            <li><strong>Cards</strong>: broad overview of each note</li>
            <li><strong>List</strong>: balanced default browsing view</li>
            <li><strong>Dense</strong>: compact view for scanning many notes</li>
            <li><strong>Auto</strong>: adapt layout based on screen width</li>
          </ul>

          <h3>Search, sort, and filtering</h3>
          <ul className="list-disc pl-5">
            <li>Search matches note titles, body text, and tags</li>
            <li>Sort by updated time or first tag</li>
            <li>Advanced tag filters support include, exclude, and neutral states</li>
          </ul>

          <h2>Editor basics</h2>
          <ul className="list-disc pl-5">
            <li><strong>Edit</strong>: write in the text editor</li>
            <li><strong>Preview</strong>: see the rendered Markdown</li>
            <li><strong>Split</strong>: edit and preview side by side</li>
            <li><strong>Focus</strong>: mark a note as important</li>
          </ul>

          <h2>Keyboard shortcuts</h2>
          <ul className="list-disc pl-5">
            <li><kbd>Ctrl/Cmd</kbd> + <kbd>K</kbd>: open command palette</li>
            <li><kbd>Ctrl/Cmd</kbd> + <kbd>9</kbd>: create a new note</li>
            <li><kbd>Ctrl/Cmd</kbd> + <kbd>0</kbd>: return to the note list</li>
            <li><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>: toggle sidebar</li>
            <li><kbd>Ctrl/Cmd</kbd> + <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>: switch editor view modes</li>
          </ul>

          <h2>Data</h2>
          <ul className="list-disc pl-5">
            <li>Live mode stores notes in Supabase</li>
            <li>UX test mode can use seeded local notes for UI work</li>
            <li>You can also export and import notes as JSON</li>
          </ul>

          <p className="mt-10 text-sm app-muted-text">ASUKA - powered by Nono</p>
        </div>
      </section>
    </div>
  );
}
