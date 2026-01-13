// events.js - 事件处理模块

import { isAmazonPage, sendMessageToContentScript } from './utils.js';
import { showMessage, updateLoginUI, injectAccountManager } from './ui.js';

// 账号管理按钮点击事件处理
export function handleAccountButtonClick() {
    console.log('=== 账号管理按钮点击事件触发 ===');
    // 检查是否已登录
    chrome.storage.local.get('loggedInUser', (result) => {
        console.log('获取登录状态结果:', result);
        const loggedInUser = result.loggedInUser;
        console.log('当前登录用户:', loggedInUser);
        
        if (!loggedInUser) {
            console.log('用户未登录，显示登录提示');
            // 未登录，显示提示
            const messageDiv = document.getElementById('login-message');
            console.log('登录消息元素:', messageDiv);
            if (messageDiv) {
                messageDiv.textContent = '请先登录后使用账号管理功能';
                messageDiv.style.color = '#e53935';
            }
            // 显示登录表单
            const loginFormContainer = document.getElementById('login-form-container');
            console.log('登录表单容器:', loginFormContainer);
            if (loginFormContainer) {
                loginFormContainer.style.display = 'block';
            }
            return;
        }
        
        console.log('用户已登录，获取当前活动标签页');
        // 已登录，获取当前活动标签页（不限制页面类型）
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            console.log('获取标签页结果:', tabs);
            const activeTab = tabs[0];
            console.log('当前活动标签页:', activeTab);
            if (activeTab && activeTab.id) {
                console.log('注入账号管理弹窗到标签页:', activeTab.id);
                // 注入账号管理弹窗到当前网页（不限制页面类型）
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    func: injectAccountManager
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        console.error('注入content script失败:', chrome.runtime.lastError);
                    } else {
                        console.log('注入content script成功:', results);
                    }
                });
            } else {
                console.error('未找到活动标签页');
            }
        });
    });
}

// 显示颜色标签按钮点击事件处理
export function handleShowColorButtonClick() {
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

// 登录/注册处理函数
export async function handleLoginRegister(action) {
    console.log('handleLoginRegister called with action:', action);
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const messageDiv = document.getElementById('login-message');
    
    console.log('Form data:', { username, password });
    
    // 简单验证
    if (!username || !password) {
        if (messageDiv) {
            messageDiv.textContent = '用户名和密码不能为空';
            messageDiv.style.color = '#e53935';
        }
        return;
    }
    
    // 禁用按钮防止重复提交
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = '处理中...';
    }
    if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.textContent = '处理中...';
    }
    
    // 清除之前的消息
    if (messageDiv) {
        messageDiv.textContent = '';
    }
    
    try {
        // 发送请求到后台
        console.log('Sending message to background with type:', action);
        console.log('Message payload:', JSON.stringify({ type: action, username: username, password: password }));
        const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: action,
                username: username,
                password: password
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log('Response from background:', JSON.stringify(response));
                    resolve(response);
                }
            });
        });
        
        // 显示结果
        if (messageDiv) {
            if (result.code === 200 || result.status === 'success') {
                messageDiv.textContent = `${action === 'login' ? '登录' : '注册'}成功！`;
                messageDiv.style.color = '#43a047';
                
                // 登录成功后，存储用户信息到chrome.storage.local
                if (action === 'login' && result.data) {
                    const userInfo = {
                        username: result.data.username || username,
                        id: result.data.id
                    };
                    chrome.storage.local.set({ loggedInUser: userInfo }, () => {
                        console.log('用户信息已存储:', userInfo);
                        
                        // 更新UI显示登录状态
                        updateLoginUI();
                    });
                }
            } else {
                messageDiv.textContent = `${action === 'login' ? '登录' : '注册'}失败：${result.msg || result.message || '未知错误'}`;
                messageDiv.style.color = '#e53935';
            }
        }
    } catch (error) {
        console.error('Error in handleLoginRegister:', error);
        if (messageDiv) {
            messageDiv.textContent = `请求失败：${error.message}`;
            messageDiv.style.color = '#e53935';
        }
    } finally {
        // 恢复按钮状态
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = '登录';
        }
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.textContent = '注册';
        }
    }
}
