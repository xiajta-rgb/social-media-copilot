// loginModule.js - 登录注册功能模块

// 显示消息
export function showMessage(text, type) {
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

// 更新登录状态UI
export function updateLoginUI() {
    chrome.storage.local.get('loggedInUser', (result) => {
        const loggedInUser = result.loggedInUser;
        const loginFormContainer = document.getElementById('login-form-container');
        const toggleLoginForm = document.getElementById('toggleLoginForm');
        const accountButton = document.getElementById('accountButton');
        const loginMessage = document.getElementById('login-message');
        
        if (loggedInUser) {
            // 用户已登录
            const userInfo = loggedInUser;
            
            // 完全隐藏登录表单
            if (loginFormContainer) {
                loginFormContainer.style.display = 'none';
            }
            
            // 更新登录按钮为用户信息
            if (toggleLoginForm) {
                toggleLoginForm.innerHTML = `👤 ${userInfo.username}`;
                toggleLoginForm.title = '点击查看用户信息';
                
                // 点击显示用户信息和登出按钮
                toggleLoginForm.onclick = function() {
                    const userMenu = document.getElementById('user-menu');
                    if (userMenu) {
                        userMenu.style.display = userMenu.style.display === 'none' ? 'block' : 'none';
                    } else {
                        // 创建用户菜单（只包含用户信息和登出）
                        createUserMenu(userInfo);
                    }
                };
            }
            
            // 启用账号管理按钮
            if (accountButton) {
                accountButton.disabled = false;
                accountButton.style.opacity = '1';
            }
            
            // 更新登录消息
            if (loginMessage) {
                loginMessage.textContent = `已登录：${userInfo.username}`;
                loginMessage.style.color = '#43a047';
            }
        } else {
            // 用户未登录
            // 设置为立即登录按钮
            if (toggleLoginForm) {
                toggleLoginForm.innerHTML = '请登录';
                toggleLoginForm.title = '点击登录或注册';
                
                // 点击直接显示登录表单
                toggleLoginForm.onclick = function() {
                    const loginFormContainer = document.getElementById('login-form-container');
                    if (loginFormContainer) {
                        loginFormContainer.style.display = 'block';
                    }
                };
            }
            
            // 禁用账号管理按钮
            if (accountButton) {
                accountButton.disabled = true;
                accountButton.style.opacity = '0.6';
            }
            
            // 显示请登录的提示
            if (loginMessage) {
                loginMessage.textContent = '请先登录后使用账号管理功能';
                loginMessage.style.color = '#e53935';
            }
        }
    });
}

// 创建用户菜单
export function createUserMenu(userInfo) {
    const menu = document.createElement('div');
    menu.id = 'user-menu';
    menu.style.cssText = `
        position: fixed;
        bottom: 60px;
        right: 10px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 180px;
        padding: 8px 0;
    `;
    
    menu.innerHTML = `
        <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${userInfo.username}</div>
            <div style="font-size: 12px; color: #666;">用户ID: ${userInfo.id || 'N/A'}</div>
        </div>
        <button id="change-password-btn" style="
            width: 100%;
            padding: 10px 16px;
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            font-size: 13px;
            transition: background-color 0.2s;
        ">
            🔑 修改密码
        </button>
        <button id="logout-btn" style="
            width: 100%;
            padding: 10px 16px;
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            font-size: 13px;
            transition: background-color 0.2s;
        ">
            🚪 登出
        </button>
    `;
    
    // 添加悬停效果
    const logoutBtn = menu.querySelector('#logout-btn');
    const changePasswordBtn = menu.querySelector('#change-password-btn');
    
    const addHoverEffect = (btn) => {
        if (btn) {
            btn.onmouseover = function() {
                this.style.backgroundColor = '#f5f7fa';
            };
            btn.onmouseout = function() {
                this.style.backgroundColor = 'transparent';
            };
        }
    };
    
    addHoverEffect(logoutBtn);
    addHoverEffect(changePasswordBtn);
    
    // 添加到页面
    document.body.appendChild(menu);
    
    // 添加修改密码事件
    if (changePasswordBtn) {
        changePasswordBtn.onclick = function() {
            // 显示修改密码表单
            showChangePasswordForm();
            // 隐藏菜单
            menu.remove();
        };
    }
    
    // 添加登出事件
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            // 清除chrome.storage.local中的用户信息
            chrome.storage.local.remove('loggedInUser', () => {
                // 关闭已打开的收藏夹窗口
                const bookmarkModal = document.getElementById('bookmark-modal');
                if (bookmarkModal) {
                    bookmarkModal.remove();
                }
                
                // 更新UI
                updateLoginUI();
                
                // 隐藏菜单
                menu.remove();
                
                // 显示登出消息
                showMessage('已成功登出', 'success');
            });
        };
    }
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', function(e) {
        if (!menu.contains(e.target) && e.target !== document.getElementById('toggleLoginForm')) {
            menu.remove();
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

// 显示修改密码表单
export function showChangePasswordForm() {
    // 隐藏登录表单
    const loginFormContainer = document.getElementById('login-form-container');
    if (loginFormContainer) {
        loginFormContainer.style.display = 'none';
    }
    
    // 显示修改密码表单
    const changePasswordContainer = document.getElementById('change-password-container');
    if (changePasswordContainer) {
        changePasswordContainer.style.display = 'block';
        
        // 绑定取消按钮事件
        const cancelChangePassword = document.getElementById('cancelChangePassword');
        if (cancelChangePassword) {
            cancelChangePassword.onclick = function() {
                changePasswordContainer.style.display = 'none';
            };
        }
        
        // 绑定保存按钮事件
        const saveNewPassword = document.getElementById('saveNewPassword');
        if (saveNewPassword) {
            saveNewPassword.onclick = handleChangePassword;
        }
    }
}

// 处理修改密码
export async function handleChangePassword() {
    const oldPassword = document.getElementById('oldPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmNewPassword = document.getElementById('confirmNewPassword').value.trim();
    const saveNewPassword = document.getElementById('saveNewPassword');
    const cancelChangePassword = document.getElementById('cancelChangePassword');
    const messageDiv = document.getElementById('change-password-message');
    
    // 简单验证
    if (!oldPassword || !newPassword || !confirmNewPassword) {
        if (messageDiv) {
            messageDiv.textContent = '所有密码字段不能为空';
            messageDiv.style.color = '#e53935';
        }
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        if (messageDiv) {
            messageDiv.textContent = '两次输入的新密码不一致';
            messageDiv.style.color = '#e53935';
        }
        return;
    }
    
    // 禁用按钮防止重复提交
    if (saveNewPassword) {
        saveNewPassword.disabled = true;
        saveNewPassword.textContent = '处理中...';
    }
    if (cancelChangePassword) {
        cancelChangePassword.disabled = true;
    }
    
    // 清除之前的消息
    if (messageDiv) {
        messageDiv.textContent = '';
    }
    
    try {
        // 发送请求到后台
        const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'changePassword',
                oldPassword: oldPassword,
                newPassword: newPassword
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        // 显示结果
        if (messageDiv) {
            if (result.code === 200 || result.status === 'success') {
                messageDiv.textContent = '密码修改成功！';
                messageDiv.style.color = '#43a047';
                
                // 清空表单
                document.getElementById('oldPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmNewPassword').value = '';
                
                // 3秒后隐藏表单
                setTimeout(() => {
                    const changePasswordContainer = document.getElementById('change-password-container');
                    if (changePasswordContainer) {
                        changePasswordContainer.style.display = 'none';
                    }
                }, 3000);
            } else {
                messageDiv.textContent = `修改失败：${result.msg || result.message || '未知错误'}`;
                messageDiv.style.color = '#e53935';
            }
        }
    } catch (error) {
        if (messageDiv) {
            messageDiv.textContent = `请求失败：${error.message}`;
            messageDiv.style.color = '#e53935';
        }
    } finally {
        // 恢复按钮状态
        if (saveNewPassword) {
            saveNewPassword.disabled = false;
            saveNewPassword.textContent = '保存';
        }
        if (cancelChangePassword) {
            cancelChangePassword.disabled = false;
        }
    }
}