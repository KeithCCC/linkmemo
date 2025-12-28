// Simple test content script
console.log('Simple ChatGPT extractor loaded');

function extractLastChatGPTResponse() {
  console.log('extractLastChatGPTResponse called');
  try {
    // Simple extraction using the most basic selector
    const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
    console.log('Found assistant messages:', assistantMessages.length);
    
    if (assistantMessages.length === 0) {
      console.log('No assistant messages found');
      return null;
    }

    const lastMessage = assistantMessages[assistantMessages.length - 1];
    console.log('Last message element:', lastMessage);
    
    let content = lastMessage.textContent || lastMessage.innerText || '';
    
    // Clean up excessive whitespace and newlines
    content = content
      .replace(/\n\s*\n\s*\n/g, '\n') // Replace 3+ newlines with 1
      .replace(/\n\s*\n/g, '\n') // Replace 2+ newlines with 1
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .replace(/^\s+|\s+$/gm, '') // Trim each line
      .trim(); // Trim overall
    
    console.log('Extracted content length:', content.length);
    console.log('First 100 chars:', content.substring(0, 100));
    
    return {
      content: content,
      title: content.substring(0, 50) + '...',
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