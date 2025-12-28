// background.js (MV3 service worker)

const DEFAULT_BASE_URL = 'https://link-memo-e7515.web.app';

async function getBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL }, (items) => {
      resolve(items.baseUrl || DEFAULT_BASE_URL);
    });
  });
}

async function openClip(url, title, content = null) {
  console.log('openClip called with:', { url, title, contentLength: content?.length });
  
  const base = await getBaseUrl();
  console.log('Base URL:', base);
  
  let clipUrl = `${base.replace(/\/$/, '')}/clip?url=${encodeURIComponent(url || '')}&title=${encodeURIComponent(title || '')}&source=ext`;
  
  // For large content, use chrome.storage instead of URL parameters
  if (content && content.length > 2000) {
    console.log('Using storage for large content');
    // Store content in chrome.storage and pass a reference
    const contentId = 'clip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    await chrome.storage.local.set({ [contentId]: content });
    clipUrl += `&contentId=${encodeURIComponent(contentId)}`;
  } else if (content) {
    console.log('Using URL parameter for content');
    clipUrl += `&content=${encodeURIComponent(content)}`;
  }
  
  console.log('Final clip URL:', clipUrl);
  console.log('Creating new tab...');
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
  chrome.contextMenus.create({
    id: 'asuka-clip-chatgpt',
    title: 'Clip last ChatGPT response',
    contexts: ['page'],
    documentUrlPatterns: ['https://chatgpt.com/*', 'https://chat.openai.com/*']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  if (info.menuItemId === 'asuka-clip-page') {
    await openClip(tab?.url, tab?.title);
  } else if (info.menuItemId === 'asuka-clip-link') {
    await openClip(info.linkUrl || '', info.selectionText || tab?.title || '');
  } else if (info.menuItemId === 'asuka-clip-chatgpt') {
    console.log('ChatGPT clip requested for tab:', tab.id);
    // Extract ChatGPT response
    try {
      console.log('Sending message to content script...');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractLastResponse' });
      console.log('Received response from content script:', response);
      console.log('Response content length:', response?.content?.length);
      
      if (response?.content) {
        console.log('Calling openClip with content...');
        await openClip(
          tab.url,
          `ChatGPT Response: ${response.title || 'Untitled'}`,
          response.content
        );
        console.log('openClip completed');
      } else {
        console.log('No ChatGPT response found');
      }
    } catch (error) {
      console.error('Failed to extract ChatGPT response:', error);
    }
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clipChatGPTResponse') {
    openClip(
      sender.tab?.url, 
      `ChatGPT Response: ${request.title || 'Untitled'}`,
      request.content
    ).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Failed to clip ChatGPT response:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep the message channel open for async response
  } else if (request.action === 'getStoredContent') {
    // Retrieve stored content by contentId
    chrome.storage.local.get([request.contentId], (result) => {
      const content = result[request.contentId];
      sendResponse({ content: content });
      
      // Clean up stored content after retrieval
      if (content) {
        chrome.storage.local.remove([request.contentId]);
      }
    });
    return true; // Keep the message channel open for async response
  }
});
