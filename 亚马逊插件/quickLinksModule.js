// quickLinksModule.js - 快速链接功能模块

// 存储键名
const QUICK_LINKS_KEY = 'quickLinks';

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 获取快速链接
export function getQuickLinks() {
    return new Promise((resolve) => {
        chrome.storage.local.get(QUICK_LINKS_KEY, (result) => {
            resolve(result[QUICK_LINKS_KEY] || []);
        });
    });
}

// 保存快速链接
export function saveQuickLinks(quickLinks) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [QUICK_LINKS_KEY]: quickLinks }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

// 递归查找项目
function findItem(quickLinks, id) {
    for (const item of quickLinks) {
        if (item.id === id) {
            return { item, parent: null, index: quickLinks.indexOf(item) };
        }
        if (item.type === 'folder' && item.children) {
            const result = findItem(item.children, id);
            if (result.item) {
                return { ...result, parent: item };
            }
        }
    }
    return { item: null, parent: null, index: -1 };
}

// 添加快速链接
export async function addQuickLink(linkname, link, parentId = null) {
    const quickLinks = await getQuickLinks();
    let targetArray = quickLinks;
    
    // 如果指定了父文件夹，找到它
    if (parentId) {
        const { item: parentFolder } = findItem(quickLinks, parentId);
        if (parentFolder && parentFolder.type === 'folder') {
            targetArray = parentFolder.children || [];
        }
    }
    
    // 检查是否已存在相同链接
    const exists = targetArray.some(item => item.link === link && item.type === 'link');
    if (exists) {
        return { success: false, message: '该链接已存在于快速链接中' };
    }
    
    // 添加新链接
    const newLink = { id: generateId(), type: 'link', linkname, link };
    targetArray.push(newLink);
    
    // 如果是子文件夹，更新父文件夹
    if (parentId) {
        const { item: parentFolder } = findItem(quickLinks, parentId);
        if (parentFolder) {
            parentFolder.children = targetArray;
        }
    }
    
    await saveQuickLinks(quickLinks);
    
    // 重新渲染快速链接
    renderQuickLinks();
    
    return { success: true, message: '已添加到快速链接' };
}



// 删除项目（链接或文件夹）
export async function removeItem(id) {
    const quickLinks = await getQuickLinks();
    const { parent, index } = findItem(quickLinks, id);
    
    if (parent) {
        parent.children.splice(index, 1);
    } else if (index > -1) {
        quickLinks.splice(index, 1);
    } else {
        return { success: false, message: '项目不存在' };
    }
    
    await saveQuickLinks(quickLinks);
    
    // 重新渲染快速链接
    renderQuickLinks();
    
    return { success: true, message: '已删除' };
}

// 重命名文件夹
export async function renameFolder(id, newName) {
    const quickLinks = await getQuickLinks();
    const { item } = findItem(quickLinks, id);
    
    if (item && item.type === 'folder') {
        item.name = newName;
        await saveQuickLinks(quickLinks);
        renderQuickLinks();
        return { success: true, message: '文件夹重命名成功' };
    }
    
    return { success: false, message: '文件夹不存在' };
}



// 截断文本到指定长度
function truncateText(text, maxLength = 4) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// 渲染单个项目
function renderItem(item, parentContainer, level = 0) {
    if (item.type === 'folder') {
        // 渲染文件夹
        const folderElement = document.createElement('div');
        folderElement.className = 'folder-item';
        folderElement.dataset.id = item.id;
        folderElement.draggable = true;
        folderElement.style.cssText = `margin-left: ${level * 20}px; margin-bottom: 4px; transition: all 0.2s;`;
        
        const folderContentElement = document.createElement('div');
        folderContentElement.style.cssText = `margin-left: 20px; display: none;`;
        
        const folderHeaderElement = document.createElement('div');
        folderHeaderElement.style.cssText = `display: flex; align-items: center; gap: 8px; padding: 4px; background: #f0f0f0; border-radius: 4px; cursor: pointer; transition: background 0.2s;`;
        folderHeaderElement.innerHTML = `
            <div class="folder-icon" style="color: #ffc107; font-size: 16px;">📁</div>
            <div class="folder-name" style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
            <div class="folder-actions" style="display: flex; gap: 4px;">
                <button class="folder-expand" style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">▼</button>
                <button class="folder-rename" style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">✎</button>
                <button class="folder-delete" style="background: none; border: none; color: #ff4444; cursor: pointer; font-size: 12px;">×</button>
            </div>
        `;
        
        folderElement.appendChild(folderHeaderElement);
        folderElement.appendChild(folderContentElement);
        
        // 展开/折叠功能
        const expandBtn = folderHeaderElement.querySelector('.folder-expand');
        let isExpanded = false;
        
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isExpanded = !isExpanded;
            folderContentElement.style.display = isExpanded ? 'block' : 'none';
            expandBtn.textContent = isExpanded ? '▲' : '▼';
        });
        
        // 重命名功能
        const renameBtn = folderHeaderElement.querySelector('.folder-rename');
        const nameDiv = folderHeaderElement.querySelector('.folder-name');
        
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newName = prompt('请输入新的文件夹名称:', item.name);
            if (newName && newName.trim() !== item.name) {
                renameFolder(item.id, newName.trim());
            }
        });
        
        // 删除功能
        const deleteBtn = folderHeaderElement.querySelector('.folder-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要删除这个文件夹及其内容吗？')) {
                removeItem(item.id);
            }
        });
        
        parentContainer.appendChild(folderElement);
        
        // 渲染子项目
        if (item.children && item.children.length > 0) {
            item.children.forEach(child => {
                renderItem(child, folderContentElement, level + 1);
            });
        }
    } else {
        // 渲染链接
        const linkElement = document.createElement('div');
        linkElement.className = 'function-item quick-link';
        linkElement.dataset.id = item.id;
        linkElement.style.cssText = `margin-left: ${level * 20}px; margin-bottom: 4px;`;
        
        linkElement.innerHTML = `
            <div class="icon">⭐</div>
            <div class="text" style="flex: 1; width: 60px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${truncateText(item.linkname, 4)}</div>
            <div style="display: flex; align-items: center; gap: 4px;">
                <button class="remove-quick-link" data-id="${item.id}" style="background: none; border: none; color: #999; cursor: pointer; font-size: 14px;">×</button>
            </div>
        `;
        
        // 点击链接打开URL
        linkElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-quick-link')) {
                window.open(item.link, '_blank');
            }
        });
        
        // 移除链接按钮事件
        const removeBtn = linkElement.querySelector('.remove-quick-link');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeItem(item.id);
        });
        
        parentContainer.appendChild(linkElement);
    }
}

// 渲染快速链接
export async function renderQuickLinks() {
    const container = document.getElementById('quickLinksContainer');
    if (!container) return;
    
    // 获取快速链接标题元素
    const sectionTitle = container.closest('.section').querySelector('.section-title');
    

    
    const quickLinks = await getQuickLinks();
    
    // 清空容器
    container.innerHTML = '';
    
    if (quickLinks.length === 0) {
        // 显示提示信息
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'text-align: center; padding: 10px; color: #666; font-size: 12px;';
        emptyDiv.textContent = '暂无快速链接，可在收藏夹中添加';
        container.appendChild(emptyDiv);
        return;
    }
    

    
    // 渲染快速链接和文件夹
    quickLinks.forEach((item) => {
        renderItem(item, container);
    });
}

// 绑定快速链接事件
export function bindQuickLinksEvents() {
    // 页面加载时渲染快速链接
    renderQuickLinks();
    
    // 监听存储变化，更新快速链接
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[QUICK_LINKS_KEY]) {
            renderQuickLinks();
        }
    });
}

// 检查链接是否已在快速链接中
export async function isLinkInQuickLinks(link) {
    const quickLinks = await getQuickLinks();
    
    function checkLinks(items) {
        for (const item of items) {
            if (item.type === 'link' && item.link === link) {
                return true;
            }
            if (item.type === 'folder' && item.children) {
                if (checkLinks(item.children)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    return checkLinks(quickLinks);
}
