// popup.js - 入口模块

// 导入新创建的功能模块
import { updateLoginUI, handleLoginRegister } from './loginModule.js';
import { injectAccountManager } from './accountModule.js';
import { addBookmark, showBookmarkList } from './bookmarkModule.js';
import { bindAmazonEvents } from './amazonModule.js';
import { bindQuickLinksEvents } from './quickLinksModule.js';
import { injectPromptManager } from './promptManagerModule.js';

// 直接绑定事件，不需要等待window.load，因为脚本在<body>末尾加载时DOM已经就绪
console.log('=== 开始绑定事件 ===');

// 绑定快速链接事件
bindQuickLinksEvents();

// 获取DOM元素
const accountButton = document.getElementById('accountButton');
const closeButton = document.getElementById('closeButton');
const toggleLoginForm = document.getElementById('toggleLoginForm');
const addBookmarkButton = document.getElementById('addBookmarkButton');
const showBookmarkButton = document.getElementById('showBookmarkButton');
const promptButton = document.getElementById('promptButton');

console.log('DOM元素获取结果:', {
    accountButton: accountButton,
    closeButton: closeButton,
    toggleLoginForm: toggleLoginForm,
    addBookmarkButton: addBookmarkButton,
    showBookmarkButton: showBookmarkButton,
    promptButton: promptButton
});

// 绑定亚马逊相关事件
bindAmazonEvents();

// 账号管理按钮点击事件
if (accountButton) {
    accountButton.addEventListener('click', () => {
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
    });
    console.log('账号管理按钮点击事件已绑定');
}

// 提示词管理按钮点击事件
if (promptButton) {
    promptButton.addEventListener('click', () => {
        console.log('=== 提示词管理按钮点击事件触发 ===');
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
                    messageDiv.textContent = '请先登录后使用提示词管理功能';
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
                    console.log('注入提示词管理弹窗到标签页:', activeTab.id);
                    // 注入提示词管理弹窗到当前网页（不限制页面类型）
                    chrome.scripting.executeScript({
                        target: { tabId: activeTab.id },
                        func: injectPromptManager
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
    });
    console.log('提示词管理按钮点击事件已绑定');
}

// 关闭按钮点击事件
if (closeButton) {
    closeButton.addEventListener('click', () => {
        window.close();
    });
    console.log('关闭按钮点击事件已绑定');
}

// 收藏当前页按钮点击事件
if (addBookmarkButton) {
    addBookmarkButton.addEventListener('click', addBookmark);
    console.log('收藏当前页按钮点击事件已绑定');
}

// 我的收藏夹按钮点击事件
if (showBookmarkButton) {
    showBookmarkButton.addEventListener('click', showBookmarkList);
    console.log('我的收藏夹按钮点击事件已绑定');
}



// 登录按钮点击事件
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        handleLoginRegister('login');
    });
    console.log('登录按钮点击事件已绑定');
}

// 注册按钮点击事件
const registerBtn = document.getElementById('registerBtn');
if (registerBtn) {
    registerBtn.addEventListener('click', () => {
        handleLoginRegister('register');
    });
    console.log('注册按钮点击事件已绑定');
}

// 添加键盘事件支持
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

console.log('输入框获取结果:', {
    usernameInput: usernameInput,
    passwordInput: passwordInput
});

if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && passwordInput) {
            passwordInput.focus();
        }
    });
    console.log('用户名输入框键盘事件已绑定');
}

if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLoginRegister('login');
        }
    });
    console.log('密码输入框键盘事件已绑定');
}

// 初始化登录状态UI
console.log('初始化登录状态UI');
updateLoginUI();
