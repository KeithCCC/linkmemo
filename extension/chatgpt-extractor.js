// Content script for extracting ChatGPT responses
console.log('ChatGPT extractor loaded');

/**
 * Extracts the last assistant response from the ChatGPT conversation
 */
function extractLastChatGPTResponse() {
  try {
    // Multiple selectors to handle different ChatGPT UI versions
    const possibleSelectors = [
      // Current ChatGPT selectors (as of 2024)
      '[data-message-author-role="assistant"]',
      '[data-testid*="conversation-turn-"]:has([data-message-author-role="assistant"])',
      '.group.w-full:has([data-message-author-role="assistant"])',
      
      // Alternative selectors for different UI versions
      '.group.w-full.text-token-text-primary:has(.whitespace-pre-wrap)',
      '.flex.flex-col.items-start:has(.markdown)',
      '.conversation-turn:has(.assistant-message)',
      
      // Fallback generic selectors
      '[class*="assistant"]',
      '[class*="response"]'
    ];

    let assistantMessages = [];
    
    // Try each selector until we find messages
    for (const selector of possibleSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          
          // Filter to only assistant messages
          for (const element of elements) {
            if (isAssistantMessage(element)) {
              assistantMessages.push(element);
            }
          }
          
          if (assistantMessages.length > 0) {
            break; // Found messages, stop trying other selectors
          }
        }
      } catch (e) {
        console.warn(`Error with selector ${selector}:`, e);
        continue;
      }
    }

    console.log(`Found ${assistantMessages.length} assistant messages`);

    if (assistantMessages.length === 0) {
      // Fallback: try to find any message-like content
      const fallbackElements = document.querySelectorAll('.markdown, .prose, .whitespace-pre-wrap, [class*="message"]');
      console.log(`Fallback: found ${fallbackElements.length} potential message elements`);
      
      if (fallbackElements.length > 0) {
        // Take the last one as a best guess
        const lastElement = fallbackElements[fallbackElements.length - 1];
        const content = extractTextContent(lastElement);
        if (content && content.length > 10) { // Only if substantial content
          return {
            content: content,
            title: generateTitle(content),
            timestamp: new Date().toISOString(),
            source: 'chatgpt-fallback'
          };
        }
      }
      
      return null;
    }

    // Get the last assistant message
    const lastMessage = assistantMessages[assistantMessages.length - 1];
    const content = extractTextContent(lastMessage);
    
    if (!content || content.length < 5) {
      console.log('No substantial content found in last message');
      return null;
    }

    return {
      content: content,
      title: generateTitle(content),
      timestamp: new Date().toISOString(),
      source: 'chatgpt'
    };

  } catch (error) {
    console.error('Error extracting ChatGPT response:', error);
    return null;
  }
}

/**
 * Determines if an element contains an assistant message
 */
function isAssistantMessage(element) {
  // Check for explicit assistant role
  if (element.getAttribute('data-message-author-role') === 'assistant') {
    return true;
  }
  
  // Check for assistant indicators in parent/child elements
  const hasAssistantRole = element.querySelector('[data-message-author-role="assistant"]');
  if (hasAssistantRole) {
    return true;
  }
  
  // Check if it's an odd-numbered message (typically assistant in alternating pattern)
  const allMessages = document.querySelectorAll('.group.w-full, [class*="conversation-turn"], [class*="message"]');
  const messageIndex = Array.from(allMessages).indexOf(element);
  
  // Skip if it looks like user input (has input-like characteristics)
  if (element.querySelector('textarea, input, [contenteditable]')) {
    return false;
  }
  
  // Check for typical assistant message indicators
  const hasCodeBlocks = element.querySelector('pre, code');
  const hasMarkdown = element.querySelector('.markdown, .prose');
  const hasLongText = extractTextContent(element).length > 50;
  
  return hasCodeBlocks || hasMarkdown || (hasLongText && messageIndex % 2 === 1);
}

/**
 * Extracts clean text content from an element
 */
function extractTextContent(element) {
  if (!element) return '';
  
  // First try to find the actual message content container
  let contentElement = element;
  const contentSelectors = [
    '.markdown',
    '.prose',
    '[class*="markdown"]',
    '[class*="prose"]',
    '.whitespace-pre-wrap',
    '[data-message-author-role="assistant"] > div > div'
  ];
  
  for (const selector of contentSelectors) {
    const found = element.querySelector(selector);
    if (found) {
      contentElement = found;
      console.log('Found content with selector:', selector);
      break;
    }
  }
  
  // Clone the element to avoid modifying the original
  const clone = contentElement.cloneNode(true);
  
  // Remove unwanted elements (buttons, icons, UI elements)
  const unwantedSelectors = [
    'button',
    'svg',
    '[role="button"]',
    '.copy-button',
    '[class*="copy"]',
    '[class*="button"]',
    '[class*="icon"]',
    '.timestamp',
    '.meta',
    '[class*="menu"]',
    '[aria-hidden="true"]',
    '[data-testid*="copy"]',
    '[title*="Copy"]'
  ];
  
  unwantedSelectors.forEach(selector => {
    const unwanted = clone.querySelectorAll(selector);
    unwanted.forEach(el => el.remove());
  });
  
  // Get text content and preserve structure
  let text = '';
  
  // Try to preserve markdown structure from the HTML
  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes).map(processNode).join('');
      
      switch (tagName) {
        case 'h1': return `# ${children}\n\n`;
        case 'h2': return `## ${children}\n\n`;
        case 'h3': return `### ${children}\n\n`;
        case 'h4': return `#### ${children}\n\n`;
        case 'p': return `${children}\n\n`;
        case 'br': return '\n';
        case 'code': return `\`${children}\``;
        case 'pre': return `\`\`\`\n${children}\n\`\`\`\n\n`;
        case 'strong': case 'b': return `**${children}**`;
        case 'em': case 'i': return `*${children}*`;
        case 'ul': case 'ol': return `${children}\n`;
        case 'li': return `- ${children}\n`;
        case 'blockquote': return `> ${children}\n\n`;
        default: return children;
      }
    }
    return '';
  };
  
  text = processNode(clone);
  
  // Fallback to simple text extraction if structured approach fails
  if (!text.trim()) {
    text = clone.textContent || clone.innerText || '';
  }
  
  // Clean up excessive whitespace while preserving structure
  text = text
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .trim();
  
  console.log('Extracted text length:', text.length);
  console.log('Text preview (first 200):', text.substring(0, 200));
  console.log('Text preview (last 200):', text.substring(Math.max(0, text.length - 200)));
  
  return text;
}

/**
 * Generates a title from content
 */
function generateTitle(content) {
  if (!content) return 'ChatGPT Response';
  
  // Take first line or first sentence
  const firstLine = content.split('\n')[0].trim();
  const firstSentence = content.split(/[.!?]/)[0].trim();
  
  let title = firstLine.length < 100 ? firstLine : firstSentence;
  
  if (title.length > 80) {
    title = title.substring(0, 77) + '...';
  }
  
  return title || 'ChatGPT Response';
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractLastResponse') {
    console.log('Extracting last ChatGPT response...');
    
    const response = extractLastChatGPTResponse();
    console.log('Extracted response:', response);
    
    sendResponse(response);
    return true;
  }
});

// Make function globally accessible for testing
window.extractLastChatGPTResponse = extractLastChatGPTResponse;
window.testAsukaExtractor = () => {
  console.log('=== Testing Asuka ChatGPT Extractor ===');
  console.log('Function exists:', typeof extractLastChatGPTResponse);
  const result = extractLastChatGPTResponse();
  console.log('Test result:', result);
  return result;
};

console.log('=== Asuka ChatGPT Extractor Ready ===');
console.log('Test by running: window.testAsukaExtractor()');
console.log('===========================================');

// Add a visual indicator when the extension is active
function addExtensionIndicator() {
  if (document.getElementById('asuka-chatgpt-indicator')) {
    return; // Already added
  }
  
  const indicator = document.createElement('div');
  indicator.id = 'asuka-chatgpt-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #10a37f;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    opacity: 0.7;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  indicator.textContent = '🗂️ Asuka Ready';
  indicator.title = 'Right-click to clip ChatGPT response to Asuka';
  
  document.body.appendChild(indicator);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.style.transition = 'opacity 0.3s';
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }
  }, 3000);
}

// Initialize when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addExtensionIndicator);
} else {
  addExtensionIndicator();
}