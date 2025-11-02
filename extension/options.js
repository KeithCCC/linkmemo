const DEFAULT_BASE_URL = 'https://link-memo-e7515.web.app';

function load() {
  chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL }, (items) => {
    document.getElementById('baseUrl').value = items.baseUrl || DEFAULT_BASE_URL;
  });
}

function save() {
  const baseUrl = document.getElementById('baseUrl').value.trim() || DEFAULT_BASE_URL;
  chrome.storage.sync.set({ baseUrl }, () => {
    const btn = document.getElementById('save');
    const prev = btn.textContent;
    btn.textContent = 'Saved';
    setTimeout(() => (btn.textContent = prev), 800);
  });
}

document.addEventListener('DOMContentLoaded', load);
document.getElementById('save').addEventListener('click', save);
