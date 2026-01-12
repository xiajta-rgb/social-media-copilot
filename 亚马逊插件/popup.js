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

// 账号管理按钮点击事件处理
function handleAccountButtonClick() {
    // 检查是否已登录
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        // 未登录，显示提示
        const messageDiv = document.getElementById('login-message');
        if (messageDiv) {
            messageDiv.textContent = '请先登录后使用账号管理功能';
            messageDiv.style.color = '#e53935';
        }
        // 显示登录表单
        const loginFormContainer = document.getElementById('login-form-container');
        if (loginFormContainer) {
            loginFormContainer.style.display = 'block';
        }
        return;
    }
    
    // 已登录，获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
            // 注入账号管理弹窗到当前网页
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: injectAccountManager
            });
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
    const showColorButton = document.getElementById('showColorButton');
    const accountButton = document.getElementById('accountButton');
    const closeButton = document.getElementById('closeButton');
    const toggleLoginForm = document.getElementById('toggleLoginForm');
    
    // 颜色显示按钮点击事件
    if (showColorButton) {
        showColorButton.addEventListener('click', handleShowColorButtonClick);
    }
    
    // 账号管理按钮点击事件
    if (accountButton) {
        accountButton.addEventListener('click', handleAccountButtonClick);
    }
    
    // 关闭按钮点击事件
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            window.close();
        });
    }
    
    // 显示/隐藏登录表单
    if (toggleLoginForm) {
        toggleLoginForm.addEventListener('click', () => {
            const loginFormContainer = document.getElementById('login-form-container');
            if (loginFormContainer) {
                loginFormContainer.style.display = loginFormContainer.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    // 登录按钮点击事件
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            handleLoginRegister('login');
        });
    }
    
    // 注册按钮点击事件
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            handleLoginRegister('register');
        });
    }
    
    // 添加键盘事件支持
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && passwordInput) {
                passwordInput.focus();
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLoginRegister('login');
            }
        });
    }
});

// 登录/注册处理函数
async function handleLoginRegister(action) {
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

// 注入到当前网页的账号管理弹窗函数
async function injectAccountManager() {
    // 检查是否已存在账号管理弹窗
    if (document.getElementById('account-manager-modal')) {
        return;
    }
    
    // 从background获取当前登录用户的关联数据
    let passwordItems = [];
    try {
        // 获取当前登录用户
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (loggedInUser) {
            // 使用消息传递从background获取用户关联数据
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'getUserDatabaseData', username: loggedInUser.username },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });
            
            if (result.status === 'success') {
                passwordItems = result.data.map(item => ({
                    site: item.personal_name,
                    username: item.personal_acc,
                    password: item.personal_pw
                }));
            }
        }
    } catch (error) {
        console.error('获取账号数据时出错:', error);
    }
    
    // 只使用从background获取的数据，不使用默认数据
    // 如果没有数据，passwordItems将保持为空数组
    
    // 创建样式标签
    const style = document.createElement('style');
    style.id = 'account-manager-style';
    style.textContent = `
        /* 账号管理弹窗样式 */
        #account-manager-modal {
            position: fixed;
            top: 20px;
            left: 20px;
            width: 450px;
            height: 400px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            resize: both;
        }
        
        #account-manager-modal.dragging {
            cursor: grabbing;
        }
        
        /* 拖动手柄 */
        .account-resize-handle {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 20px;
            height: 20px;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='16 16 22 22 16 22 16 16'%3E%3C/polyline%3E%3Cpolyline points='8 8 2 2 8 2 8 8'%3E%3C/polyline%3E%3Cline x1='2' y1='16' x2='8' y2='16'%3E%3C/line%3E%3Cline x1='16' y1='8' x2='22' y2='8'%3E%3C/line%3E%3C/svg%3E") no-repeat center;
            cursor: nwse-resize;
            opacity: 0.5;
        }
        
        .account-resize-handle:hover {
            opacity: 1;
        }
        
        .account-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #4285F4;
            color: white;
            border-radius: 10px 10px 0 0;
        }
        
        .account-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .account-title::before {
            content: "🔒";
        }
        
        .account-close {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            padding: 0;
            transition: all 0.2s;
        }
        
        .account-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }
        
        .account-content {
            padding: 20px;
            height: calc(100% - 64px);
            overflow-y: auto;
        }
        
        .account-table-header {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 0.8fr;
            background: #f5f7fa;
            padding: 12px 15px;
            font-weight: 600;
            color: #666;
            border-radius: 6px;
            margin-bottom: 12px;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .account-item {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 0.8fr;
            align-items: center;
            padding: 12px 15px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin-bottom: 10px;
            transition: all 0.2s;
        }
        
        .account-item:hover {
            background: #fafafa;
            border-color: #d1d5db;
        }
        
        .account-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }
        
        .account-btn {
            padding: 6px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .copy-account {
            background: #e3f2fd;
            color: #1565c0;
        }
        
        .copy-account:hover {
            background: #bbdefb;
        }
        
        .copy-password {
            background: #fff9c4;
            color: #f57f17;
        }
        
        .copy-password:hover {
            background: #fef08a;
        }
        
        .account-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: #4285F4;
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-size: 14px;
            font-weight: 500;
            z-index: 1000001;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        }
        
        .account-notification.show {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    
    // 创建弹窗元素
    const modal = document.createElement('div');
    modal.id = 'account-manager-modal';
    modal.innerHTML = `
        <div class="account-header" id="account-drag-handle">
            <h3 class="account-title">账号密码管理器</h3>
            <button class="account-close" id="account-close">×</button>
        </div>
        <div class="account-content">
            <div class="account-table-header">
                <div>名称</div>
                <div>账号</div>
                <div>密码</div>
                <div>操作</div>
            </div>
            <div class="account-list" id="account-list"></div>
        </div>
        <div class="account-resize-handle"></div>
    `;
    
    // 添加到页面
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // 添加添加数据的表单
    const addForm = document.createElement('div');
    addForm.className = 'account-add-form';
    addForm.innerHTML = `
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">添加新数据</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 15px;">
            <input type="text" id="new-site" placeholder="名称" style="padding: 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
            <input type="text" id="new-username" placeholder="账号" style="padding: 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
            <input type="text" id="new-password" placeholder="密码" style="padding: 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
            <button id="add-btn" style="padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 3px; font-size: 12px; cursor: pointer;">添加</button>
        </div>
    `;
    modal.querySelector('.account-content').insertBefore(addForm, accountList);
    
    // 渲染账号列表
    const accountList = modal.querySelector('#account-list');
    
    // 渲染数据列表
    function renderAccountList() {
        accountList.innerHTML = '';
        
        // 无数据时显示提示
        if (!Array.isArray(passwordItems) || passwordItems.length === 0) {
            accountList.innerHTML = `
                <div style="
                    text-align: center;
                    padding: 30px;
                    color: #666;
                    border: 1px dashed #e5e7eb;
                    border-radius: 6px;
                ">
                    暂无账号密码数据，可点击上方添加
                </div>
            `;
        } else {
            // 遍历渲染每条数据
            passwordItems.forEach((item, idx) => {
                if (!item || typeof item !== 'object') return;
                const row = document.createElement('div');
                row.className = 'account-item';
                row.innerHTML = `
                    <div>${item.site || '未知名称'}</div>
                    <div>${item.username || '未知账号'}</div>
                    <div>${item.password || '未知密码'}</div>
                    <div class="account-actions">
                        <button class="account-btn copy-account" data-idx="${idx}" data-type="username">复制账号</button>
                        <button class="account-btn copy-password" data-idx="${idx}" data-type="password">复制密码</button>
                        <button class="account-btn delete-item" data-idx="${idx}" style="background: #ffebee; color: #c62828; margin-left: 5px;">删除</button>
                    </div>
                `;
                accountList.appendChild(row);
            });
        }
        
        // 重新绑定事件
        bindCopyEvents();
        bindDeleteEvents();
    }
    
    // 绑定复制事件
    function bindCopyEvents() {
        const copyBtns = modal.querySelectorAll('.copy-account, .copy-password');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                try {
                    const idx = parseInt(btn.dataset.idx, 10);
                    const type = btn.dataset.type;
                    const item = passwordItems[idx];
                    if (!item) return;
                    
                    const text = type === 'username' ? item.username : item.password;
                    navigator.clipboard.writeText(text);
                    
                    // 显示通知
                    showNotification(`已复制${type === 'username' ? '账号' : '密码'}: ${text}`, 'success');
                } catch (error) {
                    console.error('复制失败:', error);
                    showNotification('复制失败，请手动复制', 'error');
                }
            });
        });
    }
    
    // 绑定删除事件
    function bindDeleteEvents() {
        const deleteBtns = modal.querySelectorAll('.delete-item');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(btn.dataset.idx, 10);
                const item = passwordItems[idx];
                if (!item) return;
                
                if (confirm(`确定要删除 "${item.site}" 的账号数据吗？`)) {
                    try {
                        // 获取当前登录用户
                        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
                        if (!loggedInUser) return;
                        
                        // 使用消息传递从background删除数据
                        const result = await new Promise((resolve, reject) => {
                            chrome.runtime.sendMessage(
                                {
                                    type: 'deleteUserDatabaseData',
                                    username: loggedInUser.username,
                                    personal_name: item.site,
                                    personal_acc: item.username
                                },
                                (response) => {
                                    if (chrome.runtime.lastError) {
                                        reject(new Error(chrome.runtime.lastError.message));
                                    } else {
                                        resolve(response);
                                    }
                                }
                            );
                        });
                        
                        if (result.status === 'success') {
                            // 从本地数组中删除
                            passwordItems.splice(idx, 1);
                            
                            // 重新渲染列表
                            renderAccountList();
                            
                            showNotification('删除成功', 'success');
                        } else {
                            throw new Error(result.msg || result.message || '删除失败');
                        }
                    } catch (error) {
                        console.error('删除失败:', error);
                        showNotification('删除失败: ' + error.message, 'error');
                    }
                }
            });
        });
    }
    
    // 添加数据事件
    const addBtn = modal.querySelector('#add-btn');
    addBtn.addEventListener('click', async () => {
        const site = document.getElementById('new-site').value.trim();
        const username = document.getElementById('new-username').value.trim();
        const password = document.getElementById('new-password').value.trim();
        
        if (!site || !username || !password) {
            showNotification('请填写完整信息', 'error');
            return;
        }
        
        try {
            // 获取当前登录用户
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (!loggedInUser) return;
            
            // 使用消息传递从background添加数据
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        type: 'addUserDatabaseData',
                        username: loggedInUser.username,
                        personal_name: site,
                        personal_acc: username,
                        personal_pw: password
                    },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });
            
            if (result.status === 'success') {
                // 添加到本地数组
                passwordItems.push({
                    site: site,
                    username: username,
                    password: password
                });
                
                // 清空表单
                document.getElementById('new-site').value = '';
                document.getElementById('new-username').value = '';
                document.getElementById('new-password').value = '';
                
                // 重新渲染列表
                renderAccountList();
                
                showNotification('添加成功', 'success');
            } else {
                throw new Error(result.msg || result.message || '添加失败');
            }
        } catch (error) {
            console.error('添加失败:', error);
            showNotification('添加失败: ' + error.message, 'error');
        }
    });
    
    // 渲染初始列表
    renderAccountList();
    
    // 通知显示函数
    function showNotification(message, type = 'info') {
        // 检查是否已存在通知
        let notification = document.getElementById('account-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'account-notification';
            notification.className = 'account-notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.background = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3';
        notification.classList.add('show');
        
        // 3秒后隐藏
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // 添加事件监听
    const closeBtn = modal.querySelector('#account-close');
    const dragHandle = modal.querySelector('#account-drag-handle');
    
    // 关闭弹窗
    closeBtn.addEventListener('click', () => {
        modal.remove();
        style.remove();
    });
    
    // 拖拽功能
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = modal.offsetLeft;
        startTop = modal.offsetTop;
        modal.classList.add('dragging');
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        modal.style.left = `${startLeft + dx}px`;
        modal.style.top = `${startTop + dy}px`;
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            modal.classList.remove('dragging');
        }
    });
    
    // 调整弹窗大小功能
    const resizeHandle = modal.querySelector('.account-resize-handle');
    let isResizing = false;
    let startWidth, startHeight, startClientX, startClientY;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startWidth = modal.offsetWidth;
        startHeight = modal.offsetHeight;
        startClientX = e.clientX;
        startClientY = e.clientY;
        modal.style.userSelect = 'none';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const newWidth = startWidth + (e.clientX - startClientX);
        const newHeight = startHeight + (e.clientY - startClientY);
        
        // 设置最小尺寸
        modal.style.width = Math.max(300, newWidth) + 'px';
        modal.style.height = Math.max(200, newHeight) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            modal.style.userSelect = '';
            document.body.style.userSelect = '';
        }
    });
}

// 注入到当前网页的登录弹窗函数
function injectLoginModal() {
    // 检查是否已存在登录弹窗
    if (document.getElementById('login-modal')) {
        return;
    }
    
    // 创建样式标签
    const style = document.createElement('style');
    style.id = 'login-modal-style';
    style.textContent = `
        /* 登录弹窗样式 */
        #login-modal {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: white;
            border-radius: 16px 16px 0 0;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000000;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #login-modal.show {
            transform: translateY(0);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .modal-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #999;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }
        
        .modal-close:hover {
            background: #f5f5f5;
            color: #333;
        }
        
        .modal-content {
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
        }
        
        .form-group {
            margin-bottom: 16px;
        }
        
        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #555;
            margin-bottom: 6px;
        }
        
        .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.2s;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #4285F4;
            box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
        }
        
        .form-actions {
            margin-top: 24px;
            display: flex;
            gap: 12px;
        }
        
        .btn {
            flex: 1;
            padding: 14px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: #4285F4;
            color: white;
        }
        
        .btn-primary:hover {
            background: #3367D6;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
        }
        
        .btn-secondary {
            background: #e0e0e0;
            color: #555;
        }
        
        .btn-secondary:hover {
            background: #bdbdbd;
            transform: translateY(-1px);
        }
    `;
    
    // 创建弹窗元素
    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">登录/注册</h3>
            <button class="modal-close" id="modal-close">×</button>
        </div>
        <div class="modal-content">
            <div class="form-group">
                <label class="form-label">用户名</label>
                <input type="text" class="form-input" placeholder="请输入用户名">
            </div>
            <div class="form-group">
                <label class="form-label">密码</label>
                <input type="password" class="form-input" placeholder="请输入密码">
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary">注册</button>
                <button class="btn btn-primary">登录</button>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // 显示弹窗
    setTimeout(() => {
        modal.classList.add('show');
    }, 100);
    
    // 添加事件监听
    const modalClose = modal.querySelector('#modal-close');
    const loginSubmit = modal.querySelector('.btn-primary');
    const registerSubmit = modal.querySelector('.btn-secondary');
    const usernameInput = modal.querySelector('input[type="text"]');
    const passwordInput = modal.querySelector('input[type="password"]');
    
    // 关闭弹窗
    modalClose.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            style.remove();
        }, 300);
    });
    
    // 发送消息到插件后台
    function sendMessageToBackground(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }
    
    // 处理表单提交
    async function handleSubmit(action) {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        // 简单验证
        if (!username || !password) {
            showNotification('用户名和密码不能为空', 'error');
            return;
        }
        
        // 禁用按钮防止重复提交
        loginSubmit.disabled = true;
        registerSubmit.disabled = true;
        loginSubmit.textContent = '处理中...';
        registerSubmit.textContent = '处理中...';
        
        try {
            // 发送请求到后台
            const result = await sendMessageToBackground({
                type: action,
                username: username,
                password: password
            });
            
            // 显示结果
            if (result.code === 0 || result.status === 'success') {
                showNotification(`${action === 'login' ? '登录' : '注册'}成功！`, 'success');
                
                // 关闭弹窗
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    style.remove();
                }, 300);
            } else {
                showNotification(`${action === 'login' ? '登录' : '注册'}失败：${result.msg || result.message || '未知错误'}`, 'error');
            }
        } catch (error) {
            showNotification(`请求失败：${error.message}`, 'error');
        } finally {
            // 恢复按钮状态
            loginSubmit.disabled = false;
            registerSubmit.disabled = false;
            loginSubmit.textContent = '登录';
            registerSubmit.textContent = '注册';
        }
    }
    
    // 登录按钮
    loginSubmit.addEventListener('click', () => {
        handleSubmit('login');
    });
    
    // 注册按钮
    registerSubmit.addEventListener('click', () => {
        handleSubmit('register');
    });
    
    // 添加键盘事件支持
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSubmit('login');
        }
    });
    
    // 通知提示函数
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#4CAF50' : '#f44336';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${bgColor};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-size: 14px;
            font-weight: 500;
            z-index: 1000001;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // 显示通知
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // 3秒后隐藏
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

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