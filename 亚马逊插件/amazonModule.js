// amazonModule.js - 亚马逊功能模块

// 导入工具函数
import { isAmazonPage, sendMessageToContentScript } from './utils.js';

// 显示颜色标签功能
export function showColors() {
    // 获取当前激活的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        
        if (activeTab && activeTab.url) {
            if (isAmazonPage(activeTab.url)) {
                // 向内容脚本发送消息
                sendMessageToContentScript(
                    activeTab.id, 
                    { type: 'SHOW_COLORS' },
                    () => {
                        // 显示成功消息
                        showNotification('颜色标签已显示！');
                    },
                    (error) => {
                        // 显示错误消息
                        showNotification(`显示颜色标签失败: ${error}`, 'error');
                    }
                );
            } else {
                // 显示错误消息
                showNotification('请先打开亚马逊商品页面', 'error');
            }
        } else {
            // 显示错误消息
            showNotification('无法获取当前标签页信息', 'error');
        }
    });
}

// 提取品牌&网址功能
export function extractBrandUrl() {
    // 获取当前激活的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        
        if (activeTab && activeTab.url) {
            if (isAmazonPage(activeTab.url)) {
                console.log('=== 提取品牌&网址功能触发 ===');
                console.log('当前标签页:', activeTab);
                
                // 直接使用chrome.tabs.sendMessage发送消息，避免复杂的sendMessageToContentScript
                chrome.tabs.sendMessage(
                    activeTab.id, 
                    { type: 'EXTRACT_BRAND_URL' },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('消息发送失败:', chrome.runtime.lastError);
                            showNotification(`提取失败: ${chrome.runtime.lastError.message}`, 'error');
                        } else if (response && response.success) {
                            console.log('提取成功，响应:', response);
                            showNotification('已复制到剪贴板！');
                        } else {
                            console.error('提取失败，响应:', response);
                            showNotification(`提取失败: ${response ? response.message : '未知错误'}`, 'error');
                        }
                    }
                );
            } else {
                // 显示错误消息
                showNotification('请先打开亚马逊商品页面', 'error');
            }
        } else {
            // 显示错误消息
            showNotification('无法获取当前标签页信息', 'error');
        }
    });
}

// 辅助函数：显示通知
function showNotification(message, type = 'success') {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 4px;
        background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        font-size: 14px;
        z-index: 10000;
        animation: fadeInOut 2s ease;
    `;
    document.body.appendChild(messageElement);
    setTimeout(() => messageElement.remove(), 2000);
}

// 绑定亚马逊相关事件
export function bindAmazonEvents() {
    // 获取DOM元素
    const showColorButton = document.getElementById('showColorButton');
    const extractBrandUrlButton = document.getElementById('extractBrandUrlButton');
    
    // 颜色显示按钮点击事件
    if (showColorButton) {
        showColorButton.addEventListener('click', showColors);
        console.log('颜色显示按钮点击事件已绑定');
    }
    
    // 提取品牌&网址按钮点击事件
    if (extractBrandUrlButton) {
        extractBrandUrlButton.addEventListener('click', extractBrandUrl);
        console.log('提取品牌&网址按钮点击事件已绑定');
    }
}
