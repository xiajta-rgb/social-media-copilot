// importModule.js - 导入书签功能模块

// 显示通知
function showNotification(message, type = 'info') {
    // 检查是否已存在通知
    let notification = document.getElementById('import-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'import-notification';
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 12px 20px; background: #4285F4; color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); font-size: 14px; font-weight: 500; z-index: 1000001; opacity: 0; transform: translateY(-20px); transition: all 0.3s ease;';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.background = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3';
    
    // 显示通知
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 解析HTML书签文件
export function parseBookmarkHTML(htmlContent) {
    return new Promise((resolve, reject) => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const bookmarks = [];
            
            // 查找所有的DT元素，它们是书签项
            const dtElements = doc.querySelectorAll('dt');
            
            dtElements.forEach(dt => {
                // 查找DT下的A标签，它包含书签链接
                const aElement = dt.querySelector('a');
                if (aElement) {
                    const linkname = aElement.textContent.trim();
                    const link = aElement.getAttribute('href');
                    
                    if (link && linkname) {
                        // 跳过非http/https链接和javascript链接
                        if (link.startsWith('http://') || link.startsWith('https://')) {
                            bookmarks.push({ linkname, link });
                        }
                    }
                }
            });
            
            resolve(bookmarks);
        } catch (error) {
            reject(new Error(`解析HTML文件失败: ${error.message}`));
        }
    });
}

// 导入书签到用户账户
export async function importBookmarks(bookmarks) {
    try {
        // 检查登录状态
        const loggedInUser = await new Promise((resolve) => {
            chrome.storage.local.get('loggedInUser', (result) => {
                resolve(result.loggedInUser);
            });
        });
        
        if (!loggedInUser) {
            showNotification('请先登录后使用导入功能', 'error');
            return { success: false, message: '请先登录' };
        }
        
        // 批量导入书签
        let importedCount = 0;
        let existingCount = 0;
        
        for (const bookmark of bookmarks) {
            try {
                // 使用API调用添加书签
                const result = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { type: 'addUserBookmarkData', linkname: bookmark.linkname, link: bookmark.link },
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
                    importedCount++;
                } else {
                    existingCount++;
                }
            } catch (error) {
                console.error(`导入书签失败: ${bookmark.linkname}`, error);
                // 继续导入其他书签
            }
        }
        
        showNotification(`导入完成：成功导入 ${importedCount} 个书签，已存在 ${existingCount} 个书签`, 'success');
        return { success: true, imported: importedCount, existing: existingCount };
    } catch (error) {
        console.error('导入书签失败:', error);
        showNotification(`导入失败: ${error.message}`, 'error');
        return { success: false, message: error.message };
    }
}

// 显示导入对话框
export function showImportDialog() {
    // 检查是否已存在对话框
    if (document.getElementById('import-dialog')) {
        return;
    }
    
    // 创建对话框容器
    const dialog = document.createElement('div');
    dialog.id = 'import-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
    `;
    
    // 创建对话框内容
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = `
        background: white;
        border-radius: 10px;
        padding: 24px;
        width: 400px;
        max-width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    `;
    
    dialogContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">导入书签</h3>
            <button id="close-import-dialog" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666; padding: 0;width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
        </div>
        <div style="margin-bottom: 20px;">
            <p style="color: #666; margin-bottom: 16px;">从其他浏览器导入HTML格式的书签文件</p>
            <div style="border: 2px dashed #ddd; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer;">
                <input type="file" id="bookmark-file-input" accept=".html,.htm" style="display: none;">
                <div style="margin-bottom: 12px; font-size: 32px;">📁</div>
                <p style="margin: 0; color: #666;">点击选择HTML书签文件</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">或直接拖拽文件到此处</p>
            </div>
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="start-import-btn" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; opacity: 0.6; pointer-events: none;">开始导入</button>
        </div>
    `;
    
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    
    // 获取元素
    const closeBtn = dialog.querySelector('#close-import-dialog');
    const fileInput = dialog.querySelector('#bookmark-file-input');
    const startImportBtn = dialog.querySelector('#start-import-btn');
    const dropArea = dialog.querySelector('div[style*="border: 2px dashed #ddd"]');
    
    let selectedFile = null;
    let parsedBookmarks = [];
    
    // 关闭对话框
    closeBtn.addEventListener('click', () => {
        dialog.remove();
    });
    
    // 点击选择文件
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 文件选择事件
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            parseSelectedFile(file);
        }
    });
    
    // 拖拽事件
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = '#4CAF50';
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.style.borderColor = '#ddd';
    });
    
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = '#ddd';
        
        const file = e.dataTransfer.files[0];
        if (file && (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
            selectedFile = file;
            parseSelectedFile(file);
        } else {
            showNotification('请选择HTML格式的书签文件', 'error');
        }
    });
    
    // 解析选择的文件
    function parseSelectedFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target.result;
            parseBookmarkHTML(content)
                .then(bookmarks => {
                    parsedBookmarks = bookmarks;
                    startImportBtn.style.opacity = '1';
                    startImportBtn.style.pointerEvents = 'auto';
                    startImportBtn.textContent = `开始导入 (${bookmarks.length} 个书签)`;
                    showNotification(`成功解析 ${bookmarks.length} 个书签`, 'success');
                })
                .catch(error => {
                    showNotification(error.message, 'error');
                });
        };
        
        reader.onerror = () => {
            showNotification('读取文件失败', 'error');
        };
        
        reader.readAsText(file, 'UTF-8');
    }
    
    // 开始导入
    startImportBtn.addEventListener('click', async () => {
        if (parsedBookmarks.length === 0) {
            showNotification('请先选择并解析书签文件', 'error');
            return;
        }
        
        startImportBtn.disabled = true;
        startImportBtn.textContent = '导入中...';
        
        const result = await importBookmarks(parsedBookmarks);
        
        if (result.success) {
            dialog.remove();
        } else {
            startImportBtn.disabled = false;
            startImportBtn.textContent = `开始导入 (${parsedBookmarks.length} 个书签)`;
        }
    });
}

// 绑定导入事件
export function bindImportEvents() {
    // 获取导入按钮
    const importBtn = document.getElementById('importBookmarkButton');
    if (importBtn) {
        importBtn.addEventListener('click', showImportDialog);
        console.log('导入书签按钮点击事件已绑定');
    }
}
