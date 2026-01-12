// @ts-nocheck
// 消息传递服务模块

// 消息类型枚举
const MESSAGE_TYPES = {
  GET_PRODUCT_DATA: 'GET_PRODUCT_DATA',
  SHOW_COLORS: 'SHOW_COLORS',
  DOWNLOAD_DATA: 'DOWNLOAD_DATA'
};

// 向background service worker发送消息
function sendMessageToBackground(messageType, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: messageType, ...data },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('向background发送消息失败:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('收到background响应:', response);
          resolve(response);
        }
      }
    );
  });
}

// 向content script发送消息
function sendMessageToContent(tabId, messageType, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: messageType, ...data },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('向content script发送消息失败:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('收到content script响应:', response);
          resolve(response);
        }
      }
    );
  });
}

// 监听来自background或content script的消息
function addMessageListener(callback) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request, '来自:', sender);
    callback(request, sender, sendResponse);
    return true; // 保持消息通道打开，以便异步发送响应
  });
}

export {
  MESSAGE_TYPES,
  sendMessageToBackground,
  sendMessageToContent,
  addMessageListener
};
