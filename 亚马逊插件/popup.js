// popup.js

// 辅助函数：检查是否为亚马逊页面
function isAmazonPage(url) {
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
function injectContentScript(tabId, callback) {
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
function testConnection(tabId, callback) {
    chrome.tabs.sendMessage(tabId, { type: 'TEST_CONNECTION' }, (response) => {
        if (chrome.runtime.lastError) {
            callback(false);
        } else {
            callback(true, response);
        }
    });
}

// 辅助函数：确保内容脚本已加载，如果未加载则尝试注入
function ensureContentScriptLoaded(tabId, retryCount = 0, maxRetries = 2, callback) {
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
function sendMessageToContentScript(tabId, message, successCallback, errorCallback) {
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

// 按钮点击事件处理
function handleCopyButtonClick() {
    // 获取当前激活的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        
        // 调试信息：输出当前标签页信息
        console.log('当前标签页信息:', activeTab);
        console.log('当前标签页URL:', activeTab ? activeTab.url : 'undefined');
        
        // 检查是否为亚马逊页面
        if (activeTab && activeTab.url) {
            if (isAmazonPage(activeTab.url)) {
                // 向内容脚本发送消息
                sendMessageToContentScript(
                    activeTab.id, 
                    { type: 'COPY_BRAND_AND_URL' },
                    () => showMessage('复制成功！', 'success'),
                    (error) => showMessage(`复制失败: ${error}`, 'error')
                );
            } else {
                showMessage('请先打开亚马逊商品页面', 'error');
            }
        } else {
            showMessage('无法获取当前标签页信息', 'error');
        }
    });
}

// 显示颜色标签按钮点击事件处理
function handleShowColorButtonClick() {
    // 获取当前激活的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        
        // 调试信息：输出当前标签页信息
        console.log('当前标签页信息:', activeTab);
        console.log('当前标签页URL:', activeTab ? activeTab.url : 'undefined');
        
        // 检查是否为亚马逊页面
        if (activeTab && activeTab.url) {
            if (isAmazonPage(activeTab.url)) {
                // 向内容脚本发送消息
                sendMessageToContentScript(
                    activeTab.id, 
                    { type: 'SHOW_COLORS' },
                    () => showMessage('颜色标签已显示！', 'success'),
                    (error) => showMessage(`显示颜色标签失败: ${error}`, 'error')
                );
            } else {
                showMessage('请先打开亚马逊商品页面', 'error');
            }
        } else {
            showMessage('无法获取当前标签页信息', 'error');
        }
    });
}

// 显示消息
function showMessage(text, type) {
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.textContent = text;
    messageElement.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        animation: fadeInOut 2s ease;
    `;
    
    // 根据类型设置颜色
    if (type === 'success') {
        messageElement.style.backgroundColor = '#4CAF50';
    } else {
        messageElement.style.backgroundColor = '#f44336';
    }
    
    // 添加到页面
    document.body.appendChild(messageElement);
    
    // 2秒后移除
    setTimeout(() => {
        messageElement.remove();
    }, 2000);
}

// 页面加载完成后绑定事件
document.addEventListener('DOMContentLoaded', () => {
    const copyButton = document.getElementById('copyButton');
    const showColorButton = document.getElementById('showColorButton');
    
    if (copyButton) {
        copyButton.addEventListener('click', handleCopyButtonClick);
    }
    
    if (showColorButton) {
        showColorButton.addEventListener('click', handleShowColorButtonClick);
    }
});

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        20% { opacity: 1; transform: translateX(-50%) translateY(0); }
        80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
`;
document.head.appendChild(style);