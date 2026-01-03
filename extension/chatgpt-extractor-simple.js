// Simple test content script
console.log('Simple ChatGPT extractor loaded');

function extractLastChatGPTResponse() {
  console.log('extractLastChatGPTResponse called');
  try {
    // Find all assistant messages
    const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
    console.log('Found assistant messages:', assistantMessages.length);
    
    if (assistantMessages.length === 0) {
      console.log('No assistant messages found');
      return null;
    }

    const lastMessage = assistantMessages[assistantMessages.length - 1];
    console.log('Last message element:', lastMessage);
    
    // Try to find the actual content within the message
    // Look for markdown/prose content, avoiding buttons and UI elements
    let contentElement = null;
    
    // Try different selectors for the content area
    const contentSelectors = [
      '.markdown',
      '.prose',
      '[class*="markdown"]',
      '[class*="prose"]',
      '.whitespace-pre-wrap',
      '[data-message-author-role="assistant"] > div > div'
    ];
    
    for (const selector of contentSelectors) {
      const element = lastMessage.querySelector(selector);
      if (element) {
        contentElement = element;
        console.log('Found content with selector:', selector);
        break;
      }
    }
    
    // If no specific content element found, use the message element but filter out buttons
    if (!contentElement) {
      contentElement = lastMessage;
    }
    
    // Clone the element to avoid modifying the DOM
    const clone = contentElement.cloneNode(true);
    
    // Remove buttons, icons, and other UI elements
    const elementsToRemove = clone.querySelectorAll('button, svg, [role="button"], .copy-button, [class*="button"], [class*="icon"]');
    elementsToRemove.forEach(el => el.remove());
    
    let content = clone.textContent || clone.innerText || '';
    
    // Clean up excessive whitespace and newlines
    content = content
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace 3+ newlines with 2
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .replace(/^\s+|\s+$/gm, '') // Trim each line
      .trim(); // Trim overall
    
    console.log('Extracted content length:', content.length);
    console.log('First 200 chars:', content.substring(0, 200));
    console.log('Last 200 chars:', content.substring(Math.max(0, content.length - 200)));
    
    if (content.length < 10) {
      console.warn('Content too short, extraction may have failed');
      return null;
    }
    
    return {
      content: content,
      title: content.substring(0, 50).replace(/\n/g, ' ') + '...',
      timestamp: new Date().toISOString(),
      source: 'chatgpt'
    };

  } catch (error) {
    console.error('Error extracting ChatGPT response:', error);
    return null;
  }
}

// Make function globally accessible for testing
window.extractLastChatGPTResponse = extractLastChatGPTResponse;

// Test the function immediately
console.log('Testing function...');
console.log('Function exists:', typeof extractLastChatGPTResponse);
console.log('Global function exists:', typeof window.extractLastChatGPTResponse);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === 'extractLastResponse') {
    console.log('Extracting last ChatGPT response...');
    
    // Debug: Check what elements we can find
    const allMessages = document.querySelectorAll('[data-message-author-role]');
    console.log('All messages found:', allMessages.length);
    
    const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
    console.log('Assistant messages found:', assistantMessages.length);
    
    if (assistantMessages.length > 0) {
      const last = assistantMessages[assistantMessages.length - 1];
      console.log('Last assistant message element:', last);
      console.log('Element HTML preview:', last.outerHTML.substring(0, 200));
    }
    
    const response = extractLastChatGPTResponse();
    console.log('Extracted response:', response);
    console.log('Response content length:', response?.content?.length);
    
    sendResponse(response);
    return true;
  }
});

console.log('Content script setup complete');