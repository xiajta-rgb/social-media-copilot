// promptManagerModule.js - 提示词管理功能模块

// 提示词管理弹窗注入函数
async function injectPromptManager() {
    console.log('=== 开始注入提示词管理弹窗 ===');
    // 检查是否已存在提示词管理弹窗
    if (document.getElementById('prompt-manager-modal')) {
        console.log('提示词管理弹窗已存在，返回');
        return;
    }
    
    // 从background获取当前登录用户的提示词数据
    let prompts = [];
    let categories = [];
    
    // 渲染分类列表
    function renderCategories() {
        categoryList.innerHTML = '';
        
        // 添加"所有提示词"选项
        const allCategoryItem = document.createElement('div');
        allCategoryItem.className = `category-item ${currentCategoryId === 'all' ? 'active' : ''}`;
        allCategoryItem.dataset.categoryId = 'all';
        allCategoryItem.innerHTML = `
            <span class="category-color" style="background: #6366f1;"></span>
            <span>所有提示词</span>
            <span class="category-count">${prompts.length}</span>
        `;
        allCategoryItem.addEventListener('click', () => {
            currentCategoryId = 'all';
            currentCategoryTitle.textContent = '所有提示词';
            renderCategories();
            renderPrompts();
        });
        categoryList.appendChild(allCategoryItem);
        
        // 从提示词中提取所有唯一的type值
        const types = [...new Set(prompts.map(p => p.type).filter(Boolean))];
        console.log('提取的提示词类型:', types);
        
        // 渲染分类
        types.forEach(type => {
            const categoryItem = document.createElement('div');
            categoryItem.className = `category-item ${currentCategoryId === type ? 'active' : ''}`;
            categoryItem.dataset.categoryId = type;
            categoryItem.innerHTML = `
                <span class="category-color" style="background: #6366f1;"></span>
                <span>${type}</span>
                <span class="category-count">${prompts.filter(p => p.type === type).length}</span>
            `;
            categoryItem.addEventListener('click', () => {
                currentCategoryId = type;
                currentCategoryTitle.textContent = type;
                renderCategories();
                renderPrompts();
            });
            categoryList.appendChild(categoryItem);
        });
    }
    
    // 渲染提示词列表
    function renderPrompts() {
        console.log('=== 开始渲染提示词 ===');
        console.log('当前prompts变量长度:', prompts.length);
        console.log('当前currentCategoryId:', currentCategoryId);
        console.log('当前searchInput.value:', searchInput.value);
        
        promptList.innerHTML = '';
        
        // 筛选提示词
        let filteredPrompts = prompts;
        console.log('筛选前的提示词数量:', filteredPrompts.length);
        
        if (currentCategoryId !== 'all') {
            console.log('按分类筛选，currentCategoryId:', currentCategoryId);
            filteredPrompts = prompts.filter(p => p.type === currentCategoryId);
            console.log('按分类筛选后的提示词数量:', filteredPrompts.length);
        }
        
        // 搜索筛选
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            console.log('按搜索词筛选，searchTerm:', searchTerm);
            filteredPrompts = filteredPrompts.filter(p => 
                p.promptname.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm)
            );
            console.log('按搜索词筛选后的提示词数量:', filteredPrompts.length);
        }
        
        // 无数据时显示提示
        if (filteredPrompts.length === 0) {
            console.log('没有筛选后的提示词，显示空状态');
            promptList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <div class="empty-state-text">暂无提示词</div>
                    <div class="empty-state-subtext">点击右上角添加你的第一个提示词</div>
                </div>
            `;
            return;
        }
        
        console.log('开始渲染提示词卡片，数量:', filteredPrompts.length);
        
        // 渲染提示词卡片
        filteredPrompts.forEach((prompt, index) => {
            console.log(`渲染提示词 ${index + 1}:`, prompt.promptname);
            console.log(`提示词详情:`, prompt);
            
            const promptCard = document.createElement('div');
            promptCard.className = `prompt-card`;
            promptCard.dataset.promptId = prompt.id;
            
            try {
                promptCard.innerHTML = `
                    <div class="prompt-card-header">
                        <h4 class="prompt-card-title">${prompt.promptname || '未命名'}</h4>
                        <div class="prompt-card-meta">
                            <span class="prompt-card-category">${prompt.type || '默认'}</span>
                            <span>${new Date(prompt.updatedAt || prompt.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="prompt-card-content">${prompt.description || ''}</div>
                    <div class="prompt-card-actions">
                        <button class="card-action-btn edit-btn" data-prompt-id="${prompt.id}">编辑</button>
                        <button class="card-action-btn delete-btn" data-prompt-id="${prompt.id}">删除</button>
                    </div>
                `;
                
                // 添加点击事件
                promptCard.addEventListener('click', (e) => {
                    // 如果点击的是按钮，不触发卡片详情
                    if (e.target.closest('.card-action-btn')) {
                        e.stopPropagation();
                        return;
                    }
                    showPromptDetail(prompt);
                });
                
                // 添加编辑事件
                promptCard.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showEditPromptForm(prompt);
                });
                
                // 添加删除事件
                promptCard.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deletePrompt(prompt.id);
                });
                
                promptList.appendChild(promptCard);
            } catch (error) {
                console.error(`渲染提示词 ${prompt.promptname} 时出错:`, error);
                console.error('错误堆栈:', error.stack);
            }
        });
        
        console.log('=== 渲染提示词完成 ===');
    }
    
    // 获取提示词数据函数
    async function fetchPromptsData() {
        try {
            console.log('=== 开始获取提示词数据 ===');
            
            // 检查chrome.storage.local中的登录状态
            console.log('检查chrome.storage.local中的登录状态');
            const storageResult = await new Promise(resolve => {
                chrome.storage.local.get('loggedInUser', resolve);
            });
            console.log('chrome.storage.local中的登录用户:', storageResult.loggedInUser);
            
            // 使用消息传递从background获取登录状态和提示词数据
            console.log('从background获取提示词数据');
            const promptsResult = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'getUserPrompts', getLoggedInUser: true },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('发送消息失败:', chrome.runtime.lastError);
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            console.log('获取提示词数据成功:', response);
                            resolve(response);
                        }
                    }
                );
            });
            
            console.log('promptsResult.status:', promptsResult.status);
            console.log('promptsResult.data:', promptsResult.data);
            console.log('promptsResult.data.length:', promptsResult.data ? promptsResult.data.length : 0);
            
            if (promptsResult.status === 'success' && promptsResult.data) {
                prompts = promptsResult.data;
                console.log('更新本地prompts变量，当前数量:', prompts.length);
                
                // 检查prompts变量的内容
                console.log('prompts变量的内容:', prompts);
            } else {
                console.error('获取提示词数据失败:', promptsResult.msg || promptsResult.message);
            }
            
            // 移除分类数据获取，直接从提示词的type字段提取分类信息
            console.log('不再从background获取分类数据，将从提示词的type字段提取分类信息');
            
            // 从提示词中提取所有唯一的type值
            const types = [...new Set(prompts.map(p => p.type).filter(Boolean))];
            console.log('从提示词中提取的分类信息:', types);
            
            // 更新本地categories变量，使用type值作为分类
            categories = types.map(type => ({
                id: type,
                name: type,
                color: '#6366f1' // 默认颜色
            }));
            console.log('更新本地categories变量，当前数量:', categories.length);
            
            // 检查当前状态
            console.log('当前currentCategoryId:', currentCategoryId);
            console.log('当前searchInput.value:', searchInput.value);
            
            // 更新UI
            console.log('准备渲染提示词');
            renderPrompts();
            console.log('准备渲染分类');
            renderCategories();
            
            console.log('=== 获取提示词数据完成 ===');
        } catch (error) {
            console.error('获取提示词数据时出错:', error);
            console.error('错误堆栈:', error.stack);
            showNotification('获取数据失败: ' + error.message, 'error');
        }
    }
    
    // 创建样式标签
    const style = document.createElement('style');
    style.id = 'prompt-manager-style';
    style.textContent = `
        /* 提示词管理弹窗样式 */
        #prompt-manager-modal {
            position: fixed;
            top: 20px;
            left: 20px;
            width: 800px;
            height: 600px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        #prompt-manager-modal.dragging {
            cursor: grabbing;
        }
        
        /* 拖动手柄 */
        .prompt-resize-handle {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 20px;
            height: 20px;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='16 16 22 22 16 22 16 16'%3E%3C/polyline%3E%3Cpolyline points='8 8 2 2 8 2 8 8'%3E%3C/polyline%3E%3Cline x1='2' y1='16' x2='8' y2='16'%3E%3C/line%3E%3Cline x1='16' y1='8' x2='22' y2='8'%3E%3C/line%3E%3C/svg%3E") no-repeat center;
            cursor: nwse-resize;
            opacity: 0.5;
        }
        
        .prompt-resize-handle:hover {
            opacity: 1;
        }
        
        .prompt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #6366f1;
            color: white;
            border-radius: 10px 10px 0 0;
        }
        
        .prompt-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .prompt-title::before {
            content: "💬";
        }
        
        .prompt-close {
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
        
        .prompt-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }
        
        .prompt-content {
            display: flex;
            height: calc(100% - 64px);
            overflow: hidden;
        }
        
        /* 左侧分类面板 */
        .prompt-sidebar {
            width: 220px;
            background: #f8fafc;
            border-right: 1px solid #e2e8f0;
            padding: 16px;
            overflow-y: auto;
        }
        
        .prompt-sidebar h4 {
            margin: 0 0 16px 0;
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
        }
        
        .category-item {
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            position: relative;
        }
        
        .category-item:hover {
            background: #e2e8f0;
        }
        
        .category-item.active {
            background: #6366f1;
            color: white;
        }
        
        .category-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        .category-count {
            margin-left: auto;
            font-size: 12px;
            background: rgba(0, 0, 0, 0.1);
            padding: 2px 6px;
            border-radius: 10px;
        }
        
        .category-item.active .category-count {
            background: rgba(255, 255, 255, 0.2);
        }
        
        /* 添加分类按钮 */
        .add-category-btn {
            width: 100%;
            padding: 10px;
            background: white;
            border: 2px dashed #cbd5e1;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            color: #64748b;
            margin-top: 16px;
            transition: all 0.2s;
        }
        
        .add-category-btn:hover {
            border-color: #6366f1;
            color: #6366f1;
        }
        
        /* 右侧提示词列表 */
        .prompt-main {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }
        
        /* 搜索栏 */
        .prompt-search {
            position: relative;
            margin-bottom: 20px;
        }
        
        .prompt-search input {
            width: 100%;
            padding: 12px 16px 12px 40px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .prompt-search input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .prompt-search::before {
            content: "🔍";
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
        }
        
        /* 提示词操作栏 */
        .prompt-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .prompt-actions h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        
        .refresh-prompt-btn {
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
            margin-right: 8px;
        }

        .refresh-prompt-btn:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }

        .refresh-prompt-btn:disabled {
            background: #93c5fd;
            cursor: not-allowed;
            transform: none;
        }

        .add-prompt-btn {
            padding: 10px 20px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .add-prompt-btn:hover {
            background: #4f46e5;
            transform: translateY(-1px);
        }
        
        /* 提示词列表 */
        .prompt-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }
        
        /* 提示词卡片 */
        .prompt-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            transition: all 0.2s;
            cursor: pointer;
            position: relative;
        }
        
        .prompt-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
        }
        
        .prompt-card.pinned {
            border-color: #f59e0b;
            background: #fffbeb;
        }
        
        .prompt-card.pinned::before {
            content: "📌";
            position: absolute;
            top: 12px;
            right: 12px;
            font-size: 16px;
        }
        
        .prompt-card-header {
            margin-bottom: 12px;
        }
        
        .prompt-card-title {
            margin: 0 0 4px 0;
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
        }
        
        .prompt-card-meta {
            font-size: 12px;
            color: #64748b;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .prompt-card-category {
            display: inline-block;
            padding: 2px 8px;
            background: #e0e7ff;
            color: #4f46e5;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .prompt-card-content {
            font-size: 14px;
            color: #334155;
            line-height: 1.5;
            margin-bottom: 12px;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
        }
        
        .prompt-card-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 12px;
        }
        
        .prompt-card-tag {
            padding: 2px 8px;
            background: #f1f5f9;
            color: #64748b;
            border-radius: 4px;
            font-size: 11px;
        }
        
        /* 提示词卡片操作按钮 */
        .prompt-card-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .prompt-card:hover .prompt-card-actions {
            opacity: 1;
        }
        
        .card-action-btn {
            padding: 6px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .edit-btn {
            background: #e0f2fe;
            color: #0369a1;
        }
        
        .edit-btn:hover {
            background: #bae6fd;
        }
        
        .delete-btn {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .delete-btn:hover {
            background: #fecaca;
        }
        
        /* 空状态 */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #64748b;
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .empty-state-text {
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .empty-state-subtext {
            font-size: 14px;
            opacity: 0.8;
        }
        
        /* 表单样式 */
        .prompt-form {
            background: white;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 120px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        /* 标签输入 */
        .tags-input {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            min-height: 40px;
        }
        
        .tag {
            background: #e0e7ff;
            color: #4f46e5;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .tag-remove {
            cursor: pointer;
            font-size: 14px;
        }
        
        .tags-input input {
            border: none;
            flex: 1;
            min-width: 100px;
            padding: 4px 0;
            outline: none;
        }
        
        /* 表单操作按钮 */
        .form-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
        }
        
        .cancel-btn {
            padding: 10px 20px;
            background: white;
            color: #6b7280;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .cancel-btn:hover {
            background: #f9fafb;
        }
        
        .save-btn {
            padding: 10px 20px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .save-btn:hover {
            background: #4f46e5;
        }
        
        /* 通知样式 */
        .prompt-notification {
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
        
        .prompt-notification.show {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    
    // 显示通知
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'prompt-notification';
        notification.textContent = message;
        
        // 设置不同类型的通知颜色
        switch(type) {
            case 'success':
                notification.style.background = '#10b981';
                break;
            case 'error':
                notification.style.background = '#ef4444';
                break;
            case 'warning':
                notification.style.background = '#f59e0b';
                break;
            default:
                notification.style.background = '#4285F4';
        }
        
        document.body.appendChild(notification);
        
        // 显示通知
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 隐藏通知
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 创建弹窗元素
    const modal = document.createElement('div');
    modal.id = 'prompt-manager-modal';
    modal.innerHTML = `
        <div class="prompt-header" id="prompt-drag-handle">
            <h3 class="prompt-title">提示词管理器</h3>
            <button class="prompt-close" id="prompt-close">×</button>
        </div>
        <div class="prompt-content">
            <!-- 左侧分类面板 -->
            <div class="prompt-sidebar">
                <h4>分类</h4>
                <div class="category-list" id="category-list"></div>
                <button class="add-category-btn" id="add-category-btn">+ 添加分类</button>
            </div>
            
            <!-- 右侧提示词列表 -->
            <div class="prompt-main">
                <!-- 搜索栏 -->
                <div class="prompt-search">
                    <input type="text" id="prompt-search" placeholder="搜索提示词...">
                </div>
                
                <!-- 操作栏 -->
                <div class="prompt-actions">
                    <h3 id="current-category-title">所有提示词</h3>
                    <button class="refresh-prompt-btn" id="refresh-prompt-btn">🔄 刷新</button>
                    <button class="add-prompt-btn" id="add-prompt-btn">+ 添加提示词</button>
                </div>
                
                <!-- 提示词列表 -->
                <div class="prompt-list" id="prompt-list"></div>
            </div>
        </div>
        <div class="prompt-resize-handle"></div>
    `;
    
    // 添加到页面
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // 获取DOM元素
    const categoryList = modal.querySelector('#category-list');
    const promptList = modal.querySelector('#prompt-list');
    const searchInput = modal.querySelector('#prompt-search');
    const addPromptBtn = modal.querySelector('#add-prompt-btn');
    const refreshPromptBtn = modal.querySelector('#refresh-prompt-btn');
    const addCategoryBtn = modal.querySelector('#add-category-btn');
    const currentCategoryTitle = modal.querySelector('#current-category-title');
    
    // 为刷新按钮添加点击事件
    refreshPromptBtn.addEventListener('click', async () => {
        refreshPromptBtn.innerHTML = '🔄 刷新中...';
        refreshPromptBtn.disabled = true;
        try {
            await fetchPromptsData();
            showNotification('提示词数据已刷新', 'success');
        } catch (error) {
            console.error('刷新数据失败:', error);
            showNotification('刷新数据失败', 'error');
        } finally {
            refreshPromptBtn.innerHTML = '🔄 刷新';
            refreshPromptBtn.disabled = false;
        }
    });
    
    // 当前选中的分类
    let currentCategoryId = 'all';
    
    // 初始获取数据
    await fetchPromptsData();
    
    // 显示提示词详情
    function showPromptDetail(prompt) {
        // 创建详情弹窗
        const detailModal = document.createElement('div');
        detailModal.className = 'prompt-form';
        detailModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 1000002;
        `;
        
        const category = categories.find(c => c.id === prompt.categoryId);
        
        detailModal.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 24px;">提示词详情</h3>
            <div class="form-group">
                <label>标题</label>
                <input type="text" value="${prompt.promptname}" disabled>
            </div>
            <div class="form-group">
                <label>分类</label>
                <input type="text" value="${category ? category.name : '默认'}" disabled>
            </div>
            <div class="form-group">
                <label>内容</label>
                <textarea disabled>${prompt.description}</textarea>
            </div>
            <div class="form-group">
                <label>标签</label>
                <div class="tags-input">
                    ${Array.isArray(prompt.tags) ? prompt.tags.map(tag => `<span class="tag">${tag}<span class="tag-remove">×</span></span>`).join('') : ''}
                </div>
            </div>
            <div class="form-group">
                <label>创建时间</label>
                <input type="text" value="${new Date(prompt.createdAt).toLocaleString()}" disabled>
            </div>
            <div class="form-group">
                <label>更新时间</label>
                <input type="text" value="${new Date(prompt.updatedAt).toLocaleString()}" disabled>
            </div>
            <div class="form-actions">
                <button class="cancel-btn" id="close-detail-btn">关闭</button>
                <button class="save-btn" id="use-prompt-btn">使用提示词</button>
            </div>
        `;
        
        document.body.appendChild(detailModal);
        
        // 添加遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000001;
        `;
        document.body.appendChild(overlay);
        
        // 关闭按钮事件
        document.getElementById('close-detail-btn').addEventListener('click', () => {
            detailModal.remove();
            overlay.remove();
        });
        
        // 使用提示词按钮事件
        document.getElementById('use-prompt-btn').addEventListener('click', () => {
            // 尝试找到当前活动的文本输入框
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                const start = activeElement.selectionStart;
                const end = activeElement.selectionEnd;
                const currentValue = activeElement.value;
                
                // 插入提示词内容
                const newValue = currentValue.slice(0, start) + prompt.content + currentValue.slice(end);
                activeElement.value = newValue;
                
                // 触发input事件
                activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                
                // 设置光标位置
                activeElement.focus();
                activeElement.setSelectionRange(start + prompt.content.length, start + prompt.content.length);
                
                showNotification('提示词已插入到当前输入框', 'success');
            } else {
                // 复制到剪贴板
                navigator.clipboard.writeText(prompt.content).then(() => {
                    showNotification('提示词已复制到剪贴板', 'success');
                }).catch(() => {
                    showNotification('复制失败，请手动复制', 'error');
                });
            }
            
            detailModal.remove();
            overlay.remove();
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', () => {
            detailModal.remove();
            overlay.remove();
        });
    }
    
    // 显示添加提示词表单
    function showAddPromptForm() {
        showEditPromptForm(null);
    }
    
    // 显示编辑提示词表单
    function showEditPromptForm(prompt = null) {
        // 创建表单弹窗
        const formModal = document.createElement('div');
        formModal.className = 'prompt-form';
        formModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 1000002;
        `;
        
        const isEdit = prompt !== null;
        
        formModal.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 24px;">${isEdit ? '编辑提示词' : '添加提示词'}</h3>
            <form id="prompt-form">
                <div class="form-group">
                    <label for="form-title">标题 *</label>
                    <input type="text" id="form-title" required value="${prompt ? prompt.promptname : ''}">
                </div>
                <!-- 分类功能暂时不可用 -->
                <div class="form-group">
                    <label for="form-content">内容 *</label>
                    <textarea id="form-content" required>${prompt ? prompt.description : ''}</textarea>
                </div>
                <div class="form-group">
                        <label for="form-tags">标签 (按回车键添加)</label>
                        <div class="tags-input" id="form-tags-input">
                            ${prompt && Array.isArray(prompt.tags) ? prompt.tags.map(tag => `<span class="tag">${tag}<span class="tag-remove">×</span></span>`).join('') : ''}
                            <input type="text" id="tag-input" placeholder="添加标签...">
                        </div>
                    </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="form-pinned" ${prompt && prompt.pinned ? 'checked' : ''}> 置顶
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" id="form-cancel">取消</button>
                    <button type="submit" class="save-btn">保存</button>
                </div>
            </form>
        `;
        
        document.body.appendChild(formModal);
        
        // 添加遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000001;
        `;
        document.body.appendChild(overlay);
        
        // 标签输入处理
        const tagsInput = formModal.querySelector('#form-tags-input');
        const tagInput = formModal.querySelector('#tag-input');
        const tags = prompt ? [...prompt.tags] : [];
        
        function updateTagsDisplay() {
            // 移除所有标签元素
            const existingTags = tagsInput.querySelectorAll('.tag');
            existingTags.forEach(tag => tag.remove());
            
            // 重新渲染标签
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.innerHTML = `${tag}<span class="tag-remove">×</span>`;
                tagElement.querySelector('.tag-remove').addEventListener('click', () => {
                    const index = tags.indexOf(tag);
                    if (index > -1) {
                        tags.splice(index, 1);
                        updateTagsDisplay();
                    }
                });
                tagsInput.insertBefore(tagElement, tagInput.lastChild);
            });
        }
        
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && tagInput.value.trim()) {
                e.preventDefault();
                const tag = tagInput.value.trim();
                if (!tags.includes(tag)) {
                    tags.push(tag);
                    tagInput.value = '';
                    updateTagsDisplay();
                }
            }
        });
        
        // 表单提交事件
        const form = formModal.querySelector('#prompt-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const promptname = form.querySelector('#form-title').value.trim();
            const description = form.querySelector('#form-content').value.trim();
            const pinned = form.querySelector('#form-pinned').checked;
            
            if (!promptname || !description) {
                showNotification('请填写标题和内容', 'error');
                return;
            }
            
            try {
                const promptData = {
                    promptname,
                    description,
                    tags,
                    pinned
                };
                
                let result;
                if (isEdit) {
                    // 更新提示词
                    result = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage(
                            { 
                                type: 'updatePrompt', 
                                prompt: { ...prompt, ...promptData } 
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
                } else {
                    // 添加提示词
                    result = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage(
                            { type: 'addPrompt', prompt: promptData },
                            (response) => {
                                if (chrome.runtime.lastError) {
                                    reject(new Error(chrome.runtime.lastError.message));
                                } else {
                                    resolve(response);
                                }
                            }
                        );
                    });
                }
                
                if (result.status === 'success') {
                    // 重新获取最新数据
                    await fetchPromptsData();
                    
                    showNotification(isEdit ? '提示词更新成功' : '提示词添加成功', 'success');
                    
                    // 关闭表单
                    formModal.remove();
                    overlay.remove();
                } else {
                    throw new Error(result.message || '操作失败');
                }
            } catch (error) {
                console.error('保存提示词失败:', error);
                showNotification('保存失败: ' + error.message, 'error');
            }
        });
        
        // 取消按钮事件
        formModal.querySelector('#form-cancel').addEventListener('click', () => {
            formModal.remove();
            overlay.remove();
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', () => {
            formModal.remove();
            overlay.remove();
        });
    }
    
    // 删除提示词
    async function deletePrompt(promptId) {
        if (!confirm('确定要删除这个提示词吗？')) {
            return;
        }
        
        try {
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'deletePrompt', promptId },
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
                // 重新获取最新数据
                await fetchPromptsData();
                showNotification('提示词删除成功', 'success');
            } else {
                throw new Error(result.message || '删除失败');
            }
        } catch (error) {
            console.error('删除提示词失败:', error);
            showNotification('删除失败: ' + error.message, 'error');
        }
    }
    
    // 搜索功能
    searchInput.addEventListener('input', () => {
        renderPrompts();
    });
    
    // 添加提示词按钮事件
    addPromptBtn.addEventListener('click', showAddPromptForm);
    
    // 添加分类按钮事件
    addCategoryBtn.addEventListener('click', () => {
        // 创建添加分类表单
        const formModal = document.createElement('div');
        formModal.className = 'prompt-form';
        formModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            max-width: 90%;
            z-index: 1000002;
        `;
        
        formModal.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 24px;">添加分类</h3>
            <form id="category-form">
                <div class="form-group">
                    <label for="category-name">名称 *</label>
                    <input type="text" id="category-name" required>
                </div>
                <div class="form-group">
                    <label for="category-color">颜色</label>
                    <input type="color" id="category-color" value="#6366f1">
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" id="category-cancel">取消</button>
                    <button type="submit" class="save-btn">保存</button>
                </div>
            </form>
        `;
        
        document.body.appendChild(formModal);
        
        // 添加遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000001;
        `;
        document.body.appendChild(overlay);
        
        // 表单提交事件
        const form = formModal.querySelector('#category-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = form.querySelector('#category-name').value.trim();
            const color = form.querySelector('#category-color').value;
            
            if (!name) {
                showNotification('请填写分类名称', 'error');
                return;
            }
            
            try {
                const result = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { type: 'addCategory', category: { name, color } },
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
                    // 更新本地数据
                    categories.push(result.data);
                    renderCategories();
                    renderPrompts();
                    showNotification('分类添加成功', 'success');
                    
                    // 关闭表单
                    formModal.remove();
                    overlay.remove();
                } else {
                    throw new Error(result.message || '添加失败');
                }
            } catch (error) {
                console.error('添加分类失败:', error);
                showNotification('添加失败: ' + error.message, 'error');
            }
        });
        
        // 取消按钮事件
        formModal.querySelector('#category-cancel').addEventListener('click', () => {
            formModal.remove();
            overlay.remove();
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', () => {
            formModal.remove();
            overlay.remove();
        });
    });
    
    // 关闭按钮事件
    modal.querySelector('#prompt-close').addEventListener('click', () => {
        // 移除样式和弹窗
        const style = document.getElementById('prompt-manager-style');
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });
    
    // 实现拖拽功能
    const dragHandle = modal.querySelector('#prompt-drag-handle');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(modal.style.left) || 20;
        startTop = parseInt(modal.style.top) || 20;
        modal.classList.add('dragging');
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        e.preventDefault();
    });
    
    function drag(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        modal.style.left = (startLeft + dx) + 'px';
        modal.style.top = (startTop + dy) + 'px';
    }
    
    function stopDrag() {
        isDragging = false;
        modal.classList.remove('dragging');
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    }
    
    // 实现调整大小功能
    const resizeHandle = modal.querySelector('.prompt-resize-handle');
    let isResizing = false;
    let startWidth, startHeight;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(modal.style.width) || 800;
        startHeight = parseInt(modal.style.height) || 600;
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
    });
    
    function resize(e) {
        if (!isResizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        modal.style.width = Math.max(400, startWidth + dx) + 'px';
        modal.style.height = Math.max(300, startHeight + dy) + 'px';
    }
    
    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }
    
    // 初始渲染
    renderCategories();
    renderPrompts();
    
    console.log('=== 提示词管理弹窗注入完成 ===');
}

// 将函数暴露到全局作用域
if (typeof window !== 'undefined') {
    window.injectPromptManager = injectPromptManager;
}

// ES模块导出
export { injectPromptManager };
