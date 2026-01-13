// utils.js - 工具函数模块

// 辅助函数：检查是否为亚马逊页面
export function isAmazonPage(url) {
    if (!url) return false;
    
    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
        
        // 检查是否为亚马逊域名
        const isAmazonDomain = hostname.endsWith('.amazon.com') || 
                              hostname.endsWith('.amazon.co.uk') || 
                              hostname.endsWith('.amazon.de') || 
                              hostname.endsWith('.amazon.fr') || 
                              hostname.endsWith('.amazon.es') || 
                              hostname.endsWith('.amazon.it') || 
                              hostname.endsWith('.amazon.co.jp') || 
                              hostname.endsWith('.amazon.cn') || 
                              hostname.endsWith('.amazon.ca') || 
                              hostname.endsWith('.amazon.com.au') || 
                              hostname.endsWith('.amazon.in') || 
                              hostname.endsWith('.amazon.sg') || 
                              hostname.endsWith('.amazon.ae') || 
                              hostname.endsWith('.amazon.com.mx') || 
                              hostname.endsWith('.amazon.com.br') || 
                              hostname.endsWith('.amazon.nl');
        
        // 额外检查URL中是否包含amazon，以处理可能的边缘情况
        const containsAmazon = url.toLowerCase().includes('amazon');
        
        console.log('URL检查结果:', {
            url: url,
            hostname: hostname,
            isAmazonDomain: isAmazonDomain,
            containsAmazon: containsAmazon
        });
        
        return isAmazonDomain || containsAmazon;
    } catch (error) {
        console.error('URL解析错误:', error);
        // 如果URL解析失败，回退到简单的包含检查
        return url.toLowerCase().includes('amazon');
    }
}

// 辅助函数：动态注入内容脚本
export function injectContentScript(tabId, callback) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content-scripts/main.js']
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.error('动态注入content script失败:', chrome.runtime.lastError);
            callback(false, chrome.runtime.lastError.message);
        } else {
            console.log('content script动态注入成功:', results);
            callback(true);
        }
    });
}

// 辅助函数：测试内容脚本连接
export function testConnection(tabId, callback) {
    chrome.tabs.sendMessage(tabId, { type: 'TEST_CONNECTION' }, (response) => {
        if (chrome.runtime.lastError) {
            callback(false);
        } else {
            callback(true, response);
        }
    });
}

// 辅助函数：确保内容脚本已加载，如果未加载则尝试注入
export function ensureContentScriptLoaded(tabId, retryCount = 0, maxRetries = 2, callback) {
    // 测试连接
    testConnection(tabId, (connected, response) => {
        if (connected) {
            // 连接成功
            callback(true, response);
        } else if (retryCount < maxRetries) {
            // 连接失败，尝试注入内容脚本
            console.log(`尝试第${retryCount + 1}次注入内容脚本...`);
            injectContentScript(tabId, (injected, error) => {
                if (injected) {
                    // 注入成功，等待一下然后重试连接
                    setTimeout(() => {
                        ensureContentScriptLoaded(tabId, retryCount + 1, maxRetries, callback);
                    }, 500); // 等待500ms让脚本加载
                } else {
                    // 注入失败
                    callback(false, error);
                }
            });
        } else {
            // 重试次数用完
            callback(false, '无法建立与内容脚本的连接');
        }
    });
}

// 辅助函数：发送消息到内容脚本并处理响应（带重试机制）
export function sendMessageToContentScript(tabId, message, successCallback, errorCallback) {
    // 首先确保内容脚本已加载
    ensureContentScriptLoaded(tabId, 0, 2, (loaded, responseOrError) => {
        if (loaded) {
            // 内容脚本已加载，发送消息
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('消息发送失败:', chrome.runtime.lastError);
                    errorCallback(`消息发送失败: ${chrome.runtime.lastError.message}`);
                } else if (response && response.success) {
                    successCallback(response);
                } else {
                    const errorMsg = response ? response.error || '操作失败' : '未收到响应';
                    errorCallback(errorMsg);
                }
            });
        } else {
            // 内容脚本加载失败
            console.error('内容脚本加载失败:', responseOrError);
            errorCallback(`内容脚本加载失败: ${responseOrError}`);
        }
    });
}
