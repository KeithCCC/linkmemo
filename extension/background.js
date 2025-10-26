// background.js (MV3 service worker)

const DEFAULT_BASE_URL = 'http://localhost:5173';

async function getBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL }, (items) => {
      resolve(items.baseUrl || DEFAULT_BASE_URL);
    });
  });
}

async function openClip(url, title) {
  const base = await getBaseUrl();
  const clipUrl = `${base.replace(/\/$/, '')}/clip?url=${encodeURIComponent(url || '')}&title=${encodeURIComponent(title || '')}&source=ext`;
  chrome.tabs.create({ url: clipUrl });
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await openClip(tab?.url, tab?.title);
  } catch (e) {
    // no-op
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'asuka-clip-page',
    title: 'Clip this page to Asuka',
    contexts: ['page']
  });
  chrome.contextMenus.create({
    id: 'asuka-clip-link',
    title: 'Clip link to Asuka',
    contexts: ['link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'asuka-clip-page') {
    await openClip(tab?.url, tab?.title);
  } else if (info.menuItemId === 'asuka-clip-link') {
    await openClip(info.linkUrl || '', info.selectionText || tab?.title || '');
  }
});

