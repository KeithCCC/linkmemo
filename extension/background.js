// background.js (MV3 service worker)

const DEFAULT_BASE_URL = 'https://linkmemo.vercel.app';

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
  console.log('Creating new window...');
  chrome.windows.create({ 
    url: clipUrl,
    type: 'popup',
    width: 800,
    height: 600
  });
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
    console.log('Tab URL:', tab.url);
    console.log('Tab title:', tab.title);
    
    // Extract ChatGPT response
    try {
      console.log('Sending message to content script...');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractLastResponse' });
      console.log('Received response from content script:', response);
      console.log('Response object:', JSON.stringify(response));
      console.log('Response content length:', response?.content?.length);
      
      const base = await getBaseUrl();
      console.log('Base URL:', base);
      
      if (response?.content && response.content.length > 0) {
        console.log('Content extracted successfully, creating clip URL...');
        // Add source parameter for better tracking
        let clipUrl = `${base.replace(/\/$/, '')}/clip?url=${encodeURIComponent(tab.url || '')}&title=${encodeURIComponent(`ChatGPT: ${response.title || 'Response'}`)}&source=chatgpt-ext`;
        
        // For large content, use chrome.storage
        if (response.content.length > 2000) {
          console.log('Using storage for large content');
          const contentId = 'clip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          await chrome.storage.local.set({ [contentId]: response.content });
          clipUrl += `&contentId=${encodeURIComponent(contentId)}`;
        } else {
          console.log('Using URL parameter for content');
          clipUrl += `&content=${encodeURIComponent(response.content)}`;
        }
        
        console.log('Creating window with URL:', clipUrl.substring(0, 200) + '...');
        chrome.windows.create({ 
          url: clipUrl,
          type: 'popup',
          width: 800,
          height: 600
        });
        console.log('Window created successfully');
      } else {
        console.error('No content extracted from ChatGPT response');
        console.log('Response details:', response);
        alert('Could not extract ChatGPT response. Please make sure there is a visible assistant message on the page.');
      }
    } catch (error) {
      console.error('Failed to extract ChatGPT response:', error);
      console.error('Error stack:', error.stack);
      alert('Failed to clip ChatGPT response: ' + error.message);
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
