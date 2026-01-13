// bookmarkModule.js - 书签管理功能模块

// 显示通知
function showNotification(message, type = 'info') {
  // 检查是否已存在通知
  let notification = document.getElementById('bookmark-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'bookmark-notification';
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

// 添加书签
export async function addBookmark() {
  console.log('=== 添加书签功能触发 ===');
  
  try {
    // 检查登录状态
    const loggedInUser = await new Promise((resolve) => {
      chrome.storage.local.get('loggedInUser', (result) => {
        resolve(result.loggedInUser);
      });
    });
    
    if (!loggedInUser) {
      showNotification('请先登录后使用收藏功能', 'error');
      return;
    }
    
    // 获取当前活动标签页信息
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url || !activeTab.title) {
      showNotification('无法获取当前页面信息', 'error');
      return;
    }
    
    const linkname = activeTab.title;
    const link = activeTab.url;
    
    // 使用API调用添加书签
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'addUserBookmarkData', linkname: linkname, link: link },
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
        showNotification('收藏成功！', 'success');
        console.log('添加书签成功:', result.data);
    } else {
        throw new Error(result.msg || result.message || '添加书签失败');
    }
  } catch (error) {
    console.error('添加书签失败:', error);
    showNotification('收藏失败: ' + error.message, 'error');
  }
}

// 显示收藏夹
export async function showBookmarkList() {
  console.log('=== 显示收藏夹功能触发 ===');
  
  try {
    // 检查登录状态
    const loggedInUser = await new Promise((resolve) => {
      chrome.storage.local.get('loggedInUser', (result) => {
        resolve(result.loggedInUser);
      });
    });
    
    if (!loggedInUser) {
      showNotification('请先登录后查看收藏夹', 'error');
      return;
    }
    
    // 获取当前活动标签页
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const activeTab = tabs[0];
    if (activeTab && activeTab.id) {
      // 注入书签管理弹窗
      await injectBookmarkModal(activeTab.id);
    } else {
      console.error('未找到活动标签页');
      showNotification('显示收藏夹失败: 未找到活动标签页', 'error');
    }
  } catch (error) {
    console.error('显示收藏夹失败:', error);
    showNotification('显示收藏夹失败: ' + error.message, 'error');
  }
}

// 注入书签管理弹窗
async function injectBookmarkModal(tabId) {
  try {
    // 注入CSS样式
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      css: `
        #bookmark-modal {
          position: fixed;
          top: 20px;
          left: 20px;
          width: 800px;
          height: 600px;
          min-width: 600px;
          min-height: 400px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 1000000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
          resize: both;
        }
        #bookmark-modal.dragging {
          cursor: grabbing;
        }
        .bookmark-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #4285F4;
          color: white;
          border-radius: 10px 10px 0 0;
        }
        .bookmark-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bookmark-title::before {
          content: "⭐";
        }
        .bookmark-close {
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
        .bookmark-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }
        .bookmark-content {
          padding: 20px;
          height: calc(100% - 64px);
          overflow-y: auto;
        }
        .bookmark-add-form {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border: 1px solid #e9ecef;
        }
        .bookmark-add-form h3 {
          margin: 0 0 14px 0;
          font-size: 16px;
          font-weight: 600;
        }
        .bookmark-input-group {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
        }
        .bookmark-input-item {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .bookmark-input-item label {
          font-size: 12px;
          font-weight: 500;
          color: #6c757d;
          margin-bottom: 4px;
        }
        .bookmark-input-item input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
        }
        .bookmark-add-btn {
          align-self: flex-end;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: #4CAF50;
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }
        .bookmark-table-header {
            display: grid;
            grid-template-columns: 40px 40px 3fr 1fr 160px;
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
        .bookmark-item {
            display: grid;
            grid-template-columns: 40px 40px 3fr 1fr 160px;
            align-items: center;
            padding: 12px 15px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin-bottom: 10px;
            transition: all 0.2s;
        }
        .bookmark-item:hover {
          background: #fafafa;
          border-color: #d1d5db;
        }
        .bookmark-btn {
          padding: 6px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .open-link {
          background: #e3f2fd;
          color: #1565c0;
        }
        .open-link:hover {
          background: #bbdefb;
        }
        .edit-bookmark {
          background: #fff9c4;
          color: #f57f17;
        }
        .edit-bookmark:hover {
          background: #fef08a;
        }
        .delete-bookmark {
          background: #ffebee;
          color: #c62828;
        }
        .delete-bookmark:hover {
          background: #ffcdd2;
        }

        .bookmark-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 20px;
          height: 20px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='16 16 22 22 16 22 16 16'%3E%3C/polyline%3E%3Cpolyline points='8 8 2 2 8 2 8 8'%3E%3C/polyline%3E%3Cline x1='2' y1='16' x2='8' y2='16'%3E%3C/line%3E%3Cline x1='16' y1='8' x2='22' y2='8'%3E%3C/line%3E%3C/svg%3E") no-repeat center;
          cursor: nwse-resize;
          opacity: 0.5;
        }
        .bookmark-resize-handle:hover {
          opacity: 1;
        }
        .bookmark-notification {
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
        .bookmark-notification.show {
          opacity: 1;
          transform: translateY(0);
        }
      `
    });
    
    // 注入JavaScript功能
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // 显示通知
        function showNotification(message, type = "info") {
          let notification = document.getElementById("bookmark-notification");
          if (!notification) {
            notification = document.createElement("div");
            notification.id = "bookmark-notification";
            notification.style.cssText = "position: fixed; top: 20px; right: 20px; padding: 12px 20px; background: #4285F4; color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); font-size: 14px; font-weight: 500; z-index: 1000001; opacity: 0; transform: translateY(-20px); transition: all 0.3s ease;";
            document.body.appendChild(notification);
          }
          
          notification.textContent = message;
          notification.style.background = type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3";
          
          // 显示通知
          notification.style.opacity = "1";
          notification.style.transform = "translateY(0)";
          
          // 3秒后自动隐藏
          setTimeout(() => {
            notification.style.opacity = "0";
            notification.style.transform = "translateY(-20px)";
            setTimeout(() => notification.remove(), 300);
          }, 3000);
        }
        
        // 解析HTML书签文件并导入
        async function parseAndImportBookmarks(htmlContent, bookmarkList) {
          try {
            // 解析HTML
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
            
            if (bookmarks.length === 0) {
              showNotification('未解析到有效的书签数据', 'error');
              return;
            }
            
            if (!confirm(`确定要导入 ${bookmarks.length} 个书签吗？`)) {
              return;
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
            // 刷新书签列表
            await refreshBookmarkList(bookmarkList);
          } catch (error) {
            console.error('解析或导入书签失败:', error);
            showNotification(`导入失败: ${error.message}`, 'error');
          }
        }

        // 刷新书签列表
        async function refreshBookmarkList(bookmarkList) {
          try {
            // 使用API调用获取书签数据
            const result = await new Promise((resolve, reject) => {
              chrome.runtime.sendMessage(
                { type: 'getUserBookmarkData', getLoggedInUser: true },
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
            renderBookmarkList(bookmarkList, result.data);
        } else {
            throw new Error(result.msg || result.message || '获取书签数据失败');
        }
          } catch (error) {
            console.error('刷新书签列表失败:', error);
            showNotification('刷新书签列表失败: ' + error.message, 'error');
          }
        }
        
        // 渲染书签列表
        function renderBookmarkList(bookmarkList, bookmarks) {
          bookmarkList.innerHTML = "";
          if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
            bookmarkList.innerHTML = '<div style="text-align: center; padding: 30px; color: #666; border: 1px dashed #e5e7eb; border-radius: 6px;">暂无书签数据，可点击上方添加</div>';
            return;
          }
          
          // 先获取快速链接列表
          chrome.storage.local.get('quickLinks', (quickLinksResult) => {
            const quickLinks = quickLinksResult.quickLinks || [];
            
            bookmarks.forEach((item, idx) => {
              if (!item || typeof item !== "object") return;
              
              // 显示完整链接，不区分代码和真实网站链接
              const displayLink = item.link || "无效链接";
              
              // 检查是否已添加到快速链接
              const isInQuickLinks = quickLinks.some(quickLink => quickLink.link === item.link);
              const heartIcon = isInQuickLinks ? '❤️' : '🤍';
              
              const row = document.createElement("div");
              row.className = "bookmark-item";
              row.innerHTML = '<div style="text-align: center;"><input type="checkbox" class="bookmark-checkbox" data-idx="' + idx + '" style="cursor: pointer;"></div>' +
                              '<div style="text-align: center;">' + (idx + 1) + '</div>' +
                              '<div>' + (item.linkname || "未命名") + '</div>' +
                              '<div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 12px;">' + displayLink + '</div>' +
                              '<div style="display: flex; gap: 8px; align-items: center;">' +
                              '<button class="bookmark-btn favorite-btn" title="添加到快速链接" data-linkname="' + (item.linkname || '') + '" data-link="' + item.link + '" style="background: none; border: none; padding: 6px; cursor: pointer; font-size: 16px;">' + heartIcon + '</button>' +
                              '<button class="bookmark-btn open-link" title="打开链接" data-link="' + item.link + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></button>' +
                              '<button class="bookmark-btn edit-bookmark" title="修改书签" data-linkname="' + (item.linkname || '') + '" data-link="' + item.link + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>' +
                              '<button class="bookmark-btn delete-bookmark" title="删除书签" data-linkname="' + (item.linkname || '') + '" data-link="' + item.link + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>' +
                              '</div>';
              bookmarkList.appendChild(row);
            });
            
            // 绑定事件
            bindBookmarkEvents(bookmarkList);
            updateBookmarkSelectedCount(bookmarkList);
          });
        }

        // 更新书签选中数量
        function updateBookmarkSelectedCount(bookmarkList) {
          const checkboxes = bookmarkList.querySelectorAll('.bookmark-checkbox:checked');
          const count = checkboxes.length;
          const countElement = document.getElementById('bookmark-selected-count');
          if (countElement) {
            countElement.textContent = `已选择 ${count} 项`;
          }
          
          // 更新全选状态
          const allCheckbox = document.getElementById('select-all-bookmarks');
          const allCheckboxes = bookmarkList.querySelectorAll('.bookmark-checkbox');
          if (allCheckbox && allCheckboxes.length > 0) {
            const allChecked = Array.from(allCheckboxes).every(checkbox => checkbox.checked);
            allCheckbox.checked = allChecked;
          }
        }

        // 绑定书签事件
        function bindBookmarkEvents(bookmarkList) {
          // 打开链接 - 直接打开，不区分代码和真实网站链接
          const openBtns = bookmarkList.querySelectorAll('.open-link');
          openBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              const link = btn.dataset.link;
              if (link) {
                // 直接打开链接，浏览器会自动处理JavaScript:链接
                window.open(link, '_blank');
              }
            });
          });
          
          // 收藏到快速链接
          const favoriteBtns = bookmarkList.querySelectorAll('.favorite-btn');
          favoriteBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              const linkname = btn.dataset.linkname;
              const link = btn.dataset.link;
              
              // 获取当前快速链接
              chrome.storage.local.get('quickLinks', (result) => {
                let quickLinks = result.quickLinks || [];
                const isInQuickLinks = quickLinks.some(quickLink => quickLink.link === link);
                
                if (isInQuickLinks) {
                  // 从快速链接中移除
                  quickLinks = quickLinks.filter(quickLink => quickLink.link !== link);
                  chrome.storage.local.set({ quickLinks: quickLinks }, () => {
                    showNotification('已从快速链接中移除', 'success');
                    // 刷新书签列表以更新爱心状态
                    refreshBookmarkList(bookmarkList);
                  });
                } else {
                  // 添加到快速链接
                  quickLinks.push({ linkname, link });
                  chrome.storage.local.set({ quickLinks: quickLinks }, () => {
                    showNotification('已添加到快速链接', 'success');
                    // 刷新书签列表以更新爱心状态
                    refreshBookmarkList(bookmarkList);
                  });
                }
              });
            });
          });
          
          // 编辑书签
          const editBtns = bookmarkList.querySelectorAll('.edit-bookmark');
          editBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              const linkname = btn.dataset.linkname;
              const link = btn.dataset.link;
              createEditForm({ linkname: linkname, link: link }, bookmarkList);
            });
          });
          
          // 删除书签
          const deleteBtns = bookmarkList.querySelectorAll('.delete-bookmark');
          deleteBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
              const linkname = btn.dataset.linkname;
              const link = btn.dataset.link;
              if (confirm('确定要删除该书签吗？')) {
                try {
                  // 使用API调用删除书签
                  const result = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                      { type: 'deleteUserBookmarkData', linkname: linkname, link: link },
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
                    // 刷新书签列表
                    await refreshBookmarkList(bookmarkList);
                    showNotification('删除书签成功', 'success');
                    // 从快速链接中移除（如果存在）
                    chrome.storage.local.get('quickLinks', (result) => {
                      let quickLinks = result.quickLinks || [];
                      const updatedQuickLinks = quickLinks.filter(quickLink => quickLink.link !== link);
                      if (updatedQuickLinks.length !== quickLinks.length) {
                        chrome.storage.local.set({ quickLinks: updatedQuickLinks });
                      }
                    });
                  } else {
                    throw new Error(result.msg || result.message || '删除书签失败');
                  }
                } catch (error) {
                  console.error('删除书签失败:', error);
                  showNotification('删除书签失败: ' + error.message, 'error');
                }
              }
            });
          });
          
          // 单个复选框事件
          const checkboxes = bookmarkList.querySelectorAll('.bookmark-checkbox');
          checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
              updateBookmarkSelectedCount(bookmarkList);
            });
          });
          
          // 全选复选框事件
          const allCheckbox = document.getElementById('select-all-bookmarks');
          if (allCheckbox) {
            allCheckbox.addEventListener('change', () => {
              const isChecked = allCheckbox.checked;
              const allCheckboxes = bookmarkList.querySelectorAll('.bookmark-checkbox');
              allCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
              });
              updateBookmarkSelectedCount(bookmarkList);
            });
          }
          
          // 批量添加到快速链接按钮事件
          const batchAddToQuickLinksBtn = document.getElementById('batch-add-to-quick-links');
          if (batchAddToQuickLinksBtn) {
            batchAddToQuickLinksBtn.addEventListener('click', async () => {
              const checkedBoxes = bookmarkList.querySelectorAll('.bookmark-checkbox:checked');
              const selectedIndices = Array.from(checkedBoxes).map(checkbox => parseInt(checkbox.dataset.idx, 10));
              
              if (selectedIndices.length === 0) {
                showNotification('请选择要添加到快速链接的书签', 'error');
                return;
              }
              
              if (confirm(`确定要将选中的 ${selectedIndices.length} 个书签添加到快速链接吗？`)) {
                try {
                  // 先获取所有书签数据
                  const result = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                      { type: 'getUserBookmarkData', getLoggedInUser: true },
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
                    const bookmarks = result.data;
                    
                    // 获取当前快速链接
                    const quickLinksResult = await new Promise((resolve) => {
                      chrome.storage.local.get('quickLinks', (data) => {
                        resolve(data.quickLinks || []);
                      });
                    });
                    
                    let quickLinks = [...quickLinksResult];
                    let addedCount = 0;
                    
                    for (const idx of selectedIndices) {
                      const item = bookmarks[idx];
                      if (item) {
                        // 检查是否已存在相同链接
                        const exists = quickLinks.some(quickLink => quickLink.link === item.link);
                        if (!exists) {
                          quickLinks.push({ linkname: item.linkname, link: item.link });
                          addedCount++;
                        }
                      }
                    }
                    
                    // 保存更新后的快速链接
                    await new Promise((resolve) => {
                      chrome.storage.local.set({ quickLinks: quickLinks }, () => {
                        resolve();
                      });
                    });
                    
                    // 刷新书签列表以更新爱心状态
                    await refreshBookmarkList(bookmarkList);
                    showNotification(`成功添加 ${addedCount} 个书签到快速链接`, 'success');
                  } else {
                    throw new Error(result.msg || result.message || '获取书签数据失败');
                  }
                } catch (error) {
                  console.error('批量添加到快速链接失败:', error);
                  showNotification('批量添加到快速链接失败: ' + error.message, 'error');
                }
              }
            });
          }
          
          // 导入书签按钮事件
          const importBookmarksBtn = document.getElementById('import-bookmarks-btn');
          if (importBookmarksBtn) {
            importBookmarksBtn.addEventListener('click', () => {
              // 创建文件选择输入
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = '.html,.htm';
              fileInput.style.display = 'none';
              
              // 文件选择事件
              fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  
                  reader.onload = (e) => {
                    const content = e.target.result;
                    parseAndImportBookmarks(content, bookmarkList);
                  };
                  
                  reader.readAsText(file, 'UTF-8');
                }
              });
              
              document.body.appendChild(fileInput);
              fileInput.click();
              setTimeout(() => fileInput.remove(), 1000);
            });
          }
          
          // 批量删除按钮事件
          const batchDeleteBtn = document.getElementById('batch-delete-bookmarks');
          if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', async () => {
              const checkedBoxes = bookmarkList.querySelectorAll('.bookmark-checkbox:checked');
              const selectedIndices = Array.from(checkedBoxes).map(checkbox => parseInt(checkbox.dataset.idx, 10));
              
              if (selectedIndices.length === 0) {
                showNotification('请选择要删除的书签', 'error');
                return;
              }
              
              if (confirm(`确定要删除选中的 ${selectedIndices.length} 个书签吗？`)) {
                try {
                  // 先获取所有书签数据
                  const result = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                      { type: 'getUserBookmarkData', getLoggedInUser: true },
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
                    const bookmarks = result.data;
                    // 按索引从大到小删除，避免索引混乱
                    selectedIndices.sort((a, b) => b - a);
                    
                    for (const idx of selectedIndices) {
                      const item = bookmarks[idx];
                      if (item) {
                        // 使用API调用删除书签
                        await new Promise((resolve, reject) => {
                          chrome.runtime.sendMessage(
                            { type: 'deleteUserBookmarkData', linkname: item.linkname, link: item.link },
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
                    }
                    
                    // 刷新书签列表
                    await refreshBookmarkList(bookmarkList);
                    showNotification(`成功删除 ${selectedIndices.length} 个书签`, 'success');
                  } else {
                    throw new Error(result.msg || result.message || '获取书签数据失败');
                  }
                } catch (error) {
                  console.error('批量删除书签失败:', error);
                  showNotification('批量删除书签失败: ' + error.message, 'error');
                }
              }
            });
          }
        }

        // 创建修改表单
        function createEditForm(bookmark, bookmarkList) {
          // 移除现有表单
          const existingForm = document.getElementById('bookmark-edit-form');
          if (existingForm) existingForm.remove();
          
          // 创建表单
          const editForm = document.createElement('div');
          editForm.id = 'bookmark-edit-form';
          editForm.style.cssText = 'background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e9ecef;';
          editForm.innerHTML = '<h3 style="margin-top: 0; margin-bottom: 20px; font-size: 16px;">修改书签信息</h3>' +
                              '<div style="display: flex; flex-direction: column; gap: 12px;">' +
                              '<div><label style="display: block; font-size: 12px; font-weight: 500; color: #6c757d; margin-bottom: 4px;">网站名称</label>' +
                              '<input type="text" id="edit-linkname" value="' + (bookmark.linkname || '') + '" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" /></div>' +
                              '<div><label style="display: block; font-size: 12px; font-weight: 500; color: #6c757d; margin-bottom: 4px;">网站链接</label>' +
                              '<input type="text" id="edit-link" value="' + (bookmark.link || '') + '" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" /></div>' +
                              '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
                              '<button id="cancel-edit" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer;">取消</button>' +
                              '<button id="save-edit" style="padding: 8px 16px; border: none; border-radius: 4px; background: #4CAF50; color: white; cursor: pointer;">保存</button>' +
                              '</div></div>';
          
          // 插入表单到书签列表之前
          bookmarkList.parentNode.insertBefore(editForm, bookmarkList);
          
          // 取消按钮事件
          document.getElementById('cancel-edit').addEventListener('click', () => {
            editForm.remove();
          });
          
          // 保存按钮事件
          document.getElementById('save-edit').addEventListener('click', async () => {
            const newLinkname = document.getElementById('edit-linkname').value.trim();
            const newLink = document.getElementById('edit-link').value.trim();
            if (!newLinkname || !newLink) {
              showNotification('请填写完整信息', 'error');
              return;
            }
            
            try {
              // 使用API调用更新书签
              const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                  { 
                    type: 'updateUserBookmarkData', 
                    oldLinkname: bookmark.linkname, 
                    oldLink: bookmark.link, 
                    newLinkname: newLinkname, 
                    newLink: newLink 
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
                // 刷新书签列表
                await refreshBookmarkList(bookmarkList);
                editForm.remove();
                showNotification('修改书签成功', 'success');
            } else {
                throw new Error(result.msg || result.message || '修改书签失败');
            }
            } catch (error) {
              console.error('修改书签失败:', error);
              showNotification('修改书签失败: ' + error.message, 'error');
            }
          });
        }

        // 创建书签管理弹窗
        async function createBookmarkModal() {
          // 检查是否已存在弹窗
          if (document.getElementById('bookmark-modal')) {
            return;
          }
          
          // 创建弹窗
          const modal = document.createElement('div');
          modal.id = 'bookmark-modal';
          modal.innerHTML = `
            <div class="bookmark-header" id="bookmark-drag-handle">
                <h3 class="bookmark-title">我的收藏夹</h3>
                <button class="bookmark-close" id="bookmark-close">×</button>
            </div>
            <div class="bookmark-content">
                <div class="bookmark-add-form">
                    <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 16px;">添加新书签</h3>
                    <div class="bookmark-input-group">
                        <div class="bookmark-input-item">
                            <label for="new-linkname">网站名称</label>
                            <input type="text" id="new-linkname" placeholder="请输入网站名称">
                        </div>
                        <div class="bookmark-input-item">
                            <label for="new-link">网站链接</label>
                            <input type="text" id="new-link" placeholder="请输入网站链接">
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="bookmark-add-btn" id="add-bookmark-btn">添加</button>
                            <button class="bookmark-add-btn" id="refresh-bookmark-btn" style="background: #2196F3;">刷新</button>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;">
                    <button class="bookmark-add-btn" id="batch-add-to-quick-links" style="background: #28a745;">❤️ 批量添加到快速链接</button>
                    <button class="bookmark-add-btn" id="import-bookmarks-btn" style="background: #17a2b8;">📥 导入书签</button>
                    <button class="bookmark-add-btn" id="batch-delete-bookmarks" style="background: #dc3545;">🗑️ 批量删除</button>
                    <span id="bookmark-selected-count" style="font-size: 13px; color: #666; display: flex; align-items: center;">已选择 0 项</span>
                </div>
                <div class="bookmark-table-header">
                    <div style="text-align: center;">
                        <input type="checkbox" id="select-all-bookmarks" style="cursor: pointer;">
                    </div>
                    <div style="text-align: center;">序号</div>
                    <div>网站名称</div>
                    <div>网站链接</div>
                    <div style="text-align: left;">操作</div>
                </div>
                <div class="bookmark-list" id="bookmark-list"></div>
            </div>
            <div class="bookmark-resize-handle"></div>
          `;
          document.body.appendChild(modal);
          
          // 获取元素
          const bookmarkList = document.getElementById('bookmark-list');
          const closeBtn = document.getElementById('bookmark-close');
          const dragHandle = document.getElementById('bookmark-drag-handle');
          const resizeHandle = modal.querySelector('.bookmark-resize-handle');
          const addBtn = document.getElementById('add-bookmark-btn');
          const newLinkname = document.getElementById('new-linkname');
          const newLink = document.getElementById('new-link');
          
          // 渲染初始列表
          await refreshBookmarkList(bookmarkList);
          
          // 关闭弹窗事件
          closeBtn.addEventListener('click', () => {
            modal.remove();
          });
          
          // 添加新书签事件
          addBtn.addEventListener('click', async () => {
            const linkname = newLinkname.value.trim();
            const link = newLink.value.trim();
            
            if (!linkname || !link) {
              showNotification('请填写完整信息', 'error');
              return;
            }
            
            try {
              // 使用API调用添加书签
              const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                  { type: 'addUserBookmarkData', linkname: linkname, link: link },
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
                // 刷新书签列表
                await refreshBookmarkList(bookmarkList);
                newLinkname.value = '';
                newLink.value = '';
                showNotification('添加书签成功', 'success');
            } else {
                throw new Error(result.msg || result.message || '添加书签失败');
            }
            } catch (error) {
              console.error('添加书签失败:', error);
              showNotification('添加书签失败: ' + error.message, 'error');
            }
          });
          
          // 刷新书签列表事件
          const refreshBtn = document.getElementById('refresh-bookmark-btn');
          if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
              try {
                await refreshBookmarkList(bookmarkList);
                showNotification('书签列表已刷新', 'success');
              } catch (error) {
                console.error('刷新书签列表失败:', error);
                showNotification('刷新书签列表失败: ' + error.message, 'error');
              }
            });
          }
          
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
          });
          
          document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            modal.style.left = (startLeft + dx) + 'px';
            modal.style.top = (startTop + dy) + 'px';
          });
          
          document.addEventListener('mouseup', () => {
            if (isDragging) {
              isDragging = false;
              modal.classList.remove('dragging');
            }
          });
          
          // 调整大小功能
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
          });
          
          document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newWidth = startWidth + (e.clientX - startClientX);
            const newHeight = startHeight + (e.clientY - startClientY);
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
        
        // 调用主函数
        createBookmarkModal();
      }
    });
    
    console.log('注入书签管理弹窗成功');
  } catch (error) {
    console.error('注入书签管理弹窗失败:', error);
    throw error;
  }
}

// 删除书签
export async function deleteBookmarkItem(bookmarkId) {
  try {
    showNotification('此删除方式已废弃，请使用收藏夹中的删除按钮', 'error');
  } catch (error) {
    console.error('删除书签失败:', error);
    showNotification('删除失败: ' + error.message, 'error');
  }
}