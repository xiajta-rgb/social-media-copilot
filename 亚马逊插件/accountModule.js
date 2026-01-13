// accountModule.js - 账号密码管理功能模块

// 注入到当前网页的账号管理弹窗函数
export async function injectAccountManager() {
    console.log('=== 开始注入账号管理弹窗 ===');
    // 检查是否已存在账号管理弹窗
    if (document.getElementById('account-manager-modal')) {
        console.log('账号管理弹窗已存在，返回');
        return;
    }
    
    // 从background获取当前登录用户的关联数据
    let passwordItems = [];
    try {
        console.log('从background获取用户数据');
        // 使用消息传递从background获取登录状态和用户关联数据
        const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { type: 'getUserDatabaseData', getLoggedInUser: true },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('发送消息失败:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        console.log('获取用户数据成功:', response);
                        resolve(response);
                    }
                }
            );
        });
        
        if (result.status === 'success' && result.data) {
            console.log('处理用户数据:', result.data);
            passwordItems = result.data.map(item => ({
                site: item.personal_name,
                username: item.personal_acc,
                password: item.personal_pw
            }));
            console.log('处理后的数据:', passwordItems);
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
    modal.style.cssText = `
        width: 800px;
        min-width: 600px;
        height: 600px;
        min-height: 400px;
    `;
    modal.innerHTML = `
        <div class="account-header" id="account-drag-handle">
            <h3 class="account-title">账号密码管理器</h3>
            <button class="account-close" id="account-close">×</button>
        </div>
        <div class="account-content">
            <div class="account-list" id="account-list"></div>
        </div>
        <div class="account-resize-handle"></div>
    `;
    
    // 添加到页面
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // 获取账号内容容器
    const accountContent = modal.querySelector('.account-content');
    
    // 渲染账号列表
    const accountList = modal.querySelector('#account-list');
    
    // 添加添加数据的表单
    const addForm = document.createElement('div');
    addForm.className = 'account-add-form';
    addForm.style.cssText = `
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        border: 1px solid #e9ecef;
    `;
    addForm.innerHTML = `
        <h4 style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600; color: #343a40;">添加新账号</h4>
        <div style="display: grid; grid-template-columns: 2fr 2fr 2fr 1fr; gap: 10px; align-items: end;">
            <div style="display: flex; flex-direction: column;">
                <label for="new-site" style="font-size: 12px; font-weight: 500; color: #6c757d; margin-bottom: 4px;">名称</label>
                <input type="text" id="new-site" placeholder="请输入网站/应用名称" style="padding: 8px; border: 1px solid #ced4da; border-radius: 4px; font-size: 13px; transition: border-color 0.2s;">
            </div>
            <div style="display: flex; flex-direction: column;">
                <label for="new-username" style="font-size: 12px; font-weight: 500; color: #6c757d; margin-bottom: 4px;">账号</label>
                <input type="text" id="new-username" placeholder="请输入账号" style="padding: 8px; border: 1px solid #ced4da; border-radius: 4px; font-size: 13px; transition: border-color 0.2s;">
            </div>
            <div style="display: flex; flex-direction: column;">
                <label for="new-password" style="font-size: 12px; font-weight: 500; color: #6c757d; margin-bottom: 4px;">密码</label>
                <input type="text" id="new-password" placeholder="请输入密码" style="padding: 8px; border: 1px solid #ced4da; border-radius: 4px; font-size: 13px; transition: border-color 0.2s;">
            </div>
            <button id="add-btn" title="添加" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background-color 0.2s;">+</button>
        </div>
    `;
    
    // 创建表头
    const tableHeader = document.createElement('div');
    tableHeader.className = 'account-table-header';
    tableHeader.style.display = 'grid';
    tableHeader.style.gridTemplateColumns = '40px 40px 2fr 1fr 1fr 160px';
    tableHeader.style.alignItems = 'center';
    tableHeader.innerHTML = `
        <div style="text-align: center;">
            <input type="checkbox" id="select-all-accounts" style="cursor: pointer;">
        </div>
        <div style="text-align: center;">序号</div>
        <div>名称</div>
        <div>账号</div>
        <div>密码</div>
        <div style="text-align: left;">操作</div>
    `;
    
    // 添加批量删除按钮
    const batchActions = document.createElement('div');
    batchActions.className = 'batch-actions';
    batchActions.style.cssText = `
        display: flex;
        gap: 10px;
        margin: 10px 0;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #e9ecef;
    `;
    batchActions.innerHTML = `
        <button id="batch-delete-accounts" style="
            padding: 6px 12px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        ">
            🗑️ 批量删除
        </button>
        <span id="selected-count" style="
            font-size: 13px;
            color: #666;
            display: flex;
            align-items: center;
        ">
            已选择 0 项
        </span>
    `;
    
    // 调整顺序：添加表单 -> 表头 -> 批量操作 -> 账号列表
    accountContent.insertBefore(addForm, accountList);
    accountContent.insertBefore(tableHeader, accountList);
    accountContent.insertBefore(batchActions, accountList);
    
    // 添加数据事件
    const addBtn = modal.querySelector('#add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const site = modal.querySelector('#new-site').value.trim();
            const username = modal.querySelector('#new-username').value.trim();
            const password = modal.querySelector('#new-password').value.trim();
            
            if (!site || !username || !password) {
                showNotification('请填写完整信息', 'error');
                return;
            }
            
            try {
                
                // 使用消息传递从background添加数据
                const result = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        {
                            type: 'addUserDatabaseData',
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
                    modal.querySelector('#new-site').value = '';
                    modal.querySelector('#new-username').value = '';
                    modal.querySelector('#new-password').value = '';
                    
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
    }
    
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
                row.draggable = false; // 取消拖动功能
                row.dataset.index = idx;
                row.style.display = 'grid';
                row.style.gridTemplateColumns = '40px 40px 2fr 1fr 1fr 160px';
                row.style.alignItems = 'center';
                row.innerHTML = `
                    <div style="text-align: center;">
                        <input type="checkbox" class="account-checkbox" data-idx="${idx}" style="cursor: pointer;">
                    </div>
                    <div style="text-align: center;">${idx + 1}</div>
                    <div>${item.site || '未知名称'}</div>
                    <div>${item.username || '未知账号'}</div>
                    <div>${item.password || '未知密码'}</div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="account-btn copy-account" title="复制账号" data-idx="${idx}" data-type="username" style="width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 4px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button class="account-btn copy-password" title="复制密码" data-idx="${idx}" data-type="password" style="width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 4px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </button>
                        <button class="account-btn edit-item" title="修改" data-idx="${idx}" style="width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 4px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="account-btn delete-item" title="删除" data-idx="${idx}" style="width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 4px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                `;
                accountList.appendChild(row);
            });
        }
        
        // 重新绑定事件
        bindCopyEvents();
        bindEditEvents();
        bindDeleteEvents();
        bindCheckboxEvents();
        updateSelectedCount();
    }
    
    // 更新已选择数量
    function updateSelectedCount() {
        const checkboxes = accountList.querySelectorAll('.account-checkbox:checked');
        const count = checkboxes.length;
        const countElement = modal.querySelector('#selected-count');
        if (countElement) {
            countElement.textContent = `已选择 ${count} 项`;
        }
        
        // 更新全选状态
        const allCheckbox = modal.querySelector('#select-all-accounts');
        const allCheckboxes = accountList.querySelectorAll('.account-checkbox');
        if (allCheckbox && allCheckboxes.length > 0) {
            const allChecked = Array.from(allCheckboxes).every(checkbox => checkbox.checked);
            allCheckbox.checked = allChecked;
        }
    }
    
    // 绑定复选框事件
    function bindCheckboxEvents() {
        // 单个复选框事件
        const checkboxes = accountList.querySelectorAll('.account-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedCount);
        });
        
        // 全选复选框事件
        const allCheckbox = modal.querySelector('#select-all-accounts');
        if (allCheckbox) {
            allCheckbox.addEventListener('change', () => {
                const isChecked = allCheckbox.checked;
                const allCheckboxes = accountList.querySelectorAll('.account-checkbox');
                allCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
                updateSelectedCount();
            });
        }
        
        // 批量删除按钮事件
        const batchDeleteBtn = modal.querySelector('#batch-delete-accounts');
        if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', async () => {
                const checkedBoxes = accountList.querySelectorAll('.account-checkbox:checked');
                const selectedIndices = Array.from(checkedBoxes).map(checkbox => parseInt(checkbox.dataset.idx, 10));
                
                if (selectedIndices.length === 0) {
                    showNotification('请选择要删除的项', 'error');
                    return;
                }
                
                if (confirm(`确定要删除选中的 ${selectedIndices.length} 项吗？`)) {
                    try {
                        // 按索引从大到小删除，避免索引混乱
                        selectedIndices.sort((a, b) => b - a);
                        
                        for (const idx of selectedIndices) {
                            const item = passwordItems[idx];
                            if (item) {
                                // 使用消息传递从background删除数据
                                const result = await new Promise((resolve, reject) => {
                                    chrome.runtime.sendMessage(
                                        {
                                            type: 'deleteUserDatabaseData',
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
                                } else {
                                    throw new Error(result.msg || result.message || '删除失败');
                                }
                            }
                        }
                        
                        // 重新渲染列表
                        renderAccountList();
                        
                        showNotification(`成功删除 ${selectedIndices.length} 项`, 'success');
                    } catch (error) {
                        console.error('批量删除失败:', error);
                        showNotification('批量删除失败: ' + error.message, 'error');
                    }
                }
            });
        }
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
    
    // 绑定修改事件
    function bindEditEvents() {
        const editBtns = modal.querySelectorAll('.edit-item');
        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.idx, 10);
                const item = passwordItems[idx];
                if (!item) return;
                
                // 创建修改表单
                createEditForm(item, idx);
            });
        });
    }
    
    // 创建修改表单
    function createEditForm(item, idx) {
        // 检查是否已存在修改表单
        const existingForm = document.getElementById('edit-form');
        if (existingForm) {
            existingForm.remove();
        }
        
        // 创建修改表单
        const editForm = document.createElement('div');
        editForm.id = 'edit-form';
        editForm.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000001;
            min-width: 400px;
        `;
        
        editForm.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 20px;">修改账号信息</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">名称</label>
                    <input type="text" id="edit-site" value="${item.site || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">账号</label>
                    <input type="text" id="edit-username" value="${item.username || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">密码</label>
                    <input type="text" id="edit-password" value="${item.password || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button id="cancel-edit" title="取消" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer;">✕</button>
                    <button id="save-edit" title="保存" style="padding: 8px 16px; border: none; border-radius: 4px; background: #4CAF50; color: white; cursor: pointer;">✓</button>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(editForm);
        
        // 添加事件监听
        document.getElementById('cancel-edit').addEventListener('click', () => {
            editForm.remove();
        });
        
        document.getElementById('save-edit').addEventListener('click', async () => {
            const site = editForm.querySelector('#edit-site').value.trim();
            const username = editForm.querySelector('#edit-username').value.trim();
            const password = editForm.querySelector('#edit-password').value.trim();
            
            if (!site || !username || !password) {
                showNotification('请填写完整信息', 'error');
                return;
            }
            
            try {
                // 使用消息传递从background更新数据
                // 先删除旧数据
                await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        {
                            type: 'deleteUserDatabaseData',
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
                
                // 再添加新数据
                const result = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        {
                            type: 'addUserDatabaseData',
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
                    // 更新本地数组
                    passwordItems[idx] = {
                        site: site,
                        username: username,
                        password: password
                    };
                    
                    // 重新渲染列表
                    renderAccountList();
                    
                    // 关闭修改表单
                    editForm.remove();
                    
                    showNotification('修改成功', 'success');
                } else {
                    throw new Error(result.msg || result.message || '修改失败');
                }
            } catch (error) {
                console.error('修改失败:', error);
                showNotification('修改失败: ' + error.message, 'error');
            }
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
                        // 使用消息传递从background删除数据
                        const result = await new Promise((resolve, reject) => {
                            chrome.runtime.sendMessage(
                                {
                                    type: 'deleteUserDatabaseData',
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
    
    // 添加数据事件已在上方绑定
    
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