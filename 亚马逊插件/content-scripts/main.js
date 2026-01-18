// 主Content Script文件
// 整合所有功能，处理消息监听

// 辅助函数：安全地获取元素（带缓存）
function getElement(selector, useCache = true) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error('获取元素失败:', error);
    return null;
  }
}

// 辅助函数：安全地获取多个元素
function getElements(selector) {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch (error) {
    console.error('获取多个元素失败:', error);
    return [];
  }
}

// 辅助函数：安全地获取元素属性值
function getElementAttribute(element, attributeName, defaultVal = '') {
  if (!element || !element.isConnected) return defaultVal;
  try {
    return element.getAttribute(attributeName) || defaultVal;
  } catch (error) {
    console.error('获取元素属性失败:', error);
    return defaultVal;
  }
}

// 辅助函数：强制页面重新渲染
function forceRender(element) {
  if (!element || !element.isConnected) return;
  try {
    element.offsetHeight; // 触发重排
  } catch (error) {
    console.error('强制渲染失败:', error);
  }
}

// 颜色处理功能
const colorProcessor = (() => {
  // 配置项
  const CONFIG = {
    LABEL_STYLE: `.color-label{\n            background:rgba(0,0,0,0.85);\n            color:#fff;\n            padding:4px 12px;\n            border-radius:16px;\n            font:12px/1.4 Arial,sans-serif;\n            white-space:nowrap;\n            z-index:9999;\n            box-shadow:0 2px 8px rgba(0,0,0,0.2);\n            backdrop-filter:blur(4px);\n            transition:all 0.3s ease;\n            margin:2px 0;\n            opacity:0;\n            max-width:200px;\n            text-overflow:ellipsis;\n            overflow:hidden;\n        }\n        .labels-container{\n            position:absolute;\n            left:50%;\n            transform:translateX(-50%);\n            display:flex;\n            flex-direction:column;\n            align-items:center;\n            gap:4px;\n            pointer-events:none;\n            min-width:100%;\n        }\n        .swatch-wrapper{\n            position:relative;\n            display:inline-block;\n            margin:12px;\n            vertical-align:top;\n        }`,
    EXTRACT_DELAY: 1500,
    DEBOUNCE_TIME: 300,
    LABEL_MARGIN: 8,
    MAX_RETRIES: 3,
    COLUMN_COUNT: 10
  };

  // 颜色标准化工具
  const colorNormalizer = (() => {
    let seen = new WeakMap();

    return {
      normalize: (color) => {
        return color.replace(/-short\b/gi, '').replace(/\s{2,}/g, ' ').trim();
      },

      isUnique: (element, color) => {
        const key = color.toLowerCase();
        if (seen.has(element)) return false;
        seen.set(element, key);
        return true;
      },

      clearCache: () => {
        seen = new WeakMap();
      }
    };
  })();

  // 移除分页/轮播样式，将颜色列表改为网格布局
  function removePagination() {
    const colorList = getElement('.dimension-values-list.dimension-values-carousel');
    if (colorList) {
      colorList.classList.remove('dimension-values-carousel');
      
      colorList.style.cssText = `
        grid-template-columns: repeat(${CONFIG.COLUMN_COUNT}, minmax(80px, 1fr)) !important;
        grid-template-areas: none !important;
        -webkit-mask-image: none !important;
        padding: 10px !important;
        overflow-x: auto !important;
        overflow-y: visible !important;
        gap: 10px !important;
        width: 100% !important;
      `;

      const parentContainer = colorList.closest('#tp-inline-twister-dim-values-container, .a-section');
      if (parentContainer) {
        parentContainer.style.width = '100% !important';
        parentContainer.style.overflow = 'visible !important';
        parentContainer.style.maxWidth = 'none !important';
      }
    }
  }

  // 初始化样式
  function initStyles() {
    const style = document.createElement('style');
    style.textContent = CONFIG.LABEL_STYLE;
    document.head.appendChild(style);
  }

  // 计算布局
  function calculateLayout(container, retry = 0) {
    const img = container.querySelector('img');
    
    if (!img || retry >= CONFIG.MAX_RETRIES) {
      return { position: 'bottom', offset: 0 };
    }

    try {
      const imgRect = img.getBoundingClientRect();
      const labelsContainer = container.querySelector('.labels-container');

      if (!labelsContainer || !labelsContainer.children.length) {
        return;
      }

      const labelHeights = Array.from(labelsContainer.children).map(label => label.offsetHeight || 24);
      const totalHeight = labelHeights.reduce((a, b) => a + b, 0) + (labelHeights.length - 1) * 4;
      
      const spaceBelow = window.innerHeight - imgRect.bottom;
      const spaceAbove = imgRect.top;

      if (spaceBelow > totalHeight + 20) {
        return { position: 'bottom', offset: totalHeight + CONFIG.LABEL_MARGIN };
      } else if (spaceAbove > totalHeight + 20) {
        return { position: 'top', offset: totalHeight + CONFIG.LABEL_MARGIN };
      } else {
        return calculateLayout(container, retry + 1);
      }
    } catch (e) {
      console.warn('布局计算异常，尝试重试...', e);
      return calculateLayout(container, retry + 1);
    }
  }

  // 创建颜色标签
  function createLabels(colorData) {
    colorData.forEach(({ element, color }) => {
      if (element.classList.contains('processed')) return;
      element.classList.add('processed');

      let wrapper = element.closest('.swatch-wrapper');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'swatch-wrapper';
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(element);
      }

      let labelsContainer = wrapper.querySelector('.labels-container');
      if (!labelsContainer) {
        labelsContainer = document.createElement('div');
        labelsContainer.className = 'labels-container';
        wrapper.appendChild(labelsContainer);
      }

      labelsContainer.innerHTML = '';
      const label = document.createElement('div');
      label.className = 'color-label';
      label.textContent = color;
      labelsContainer.appendChild(label);

      forceLayoutUpdate(wrapper);
    });
  }

  // 强制更新布局
  function forceLayoutUpdate(container) {
    if (!container || !container.isConnected) return;

    const layout = calculateLayout(container);
    const labelsContainer = container.querySelector('.labels-container');
    const img = container.querySelector('img');

    if (!labelsContainer || !img) {
      container.remove();
      return;
    }

    labelsContainer.style.cssText = '';

    if (layout.position === 'bottom') {
      labelsContainer.style.bottom = `${layout.offset}px`;
      container.style.marginBottom = `${layout.offset + 8}px`;
    } else {
      labelsContainer.style.top = `${layout.offset}px`;
      container.style.marginTop = `${layout.offset + 8}px`;
    }

    requestAnimationFrame(() => {
      Array.from(labelsContainer.children).forEach(label => {
        label.style.opacity = '1';
      });
    });
  }

  // 提取颜色数据
  async function extractColors() {
    await new Promise(resolve => setTimeout(resolve, CONFIG.EXTRACT_DELAY));

    const elementMap = new Map();
    const selectors = [
      'li[id^="color_name_"] img',
      'img.imgSwatch',
      'img.a-color-swatch',
      '[data-asin] img.swatch-image[alt]'
    ];

    selectors.forEach(selector => {
      getElements(selector).forEach(img => {
        try {
          if (img.closest('.processed')) return;

          const rawColor = getElementAttribute(img, 'alt').trim();
          const normalized = colorNormalizer.normalize(rawColor);

          if (normalized && colorNormalizer.isUnique(img, normalized)) {
            const container = img.closest('[data-asin], li') || img.parentElement;
            if (!elementMap.has(container)) {
              elementMap.set(container, {
                element: container,
                color: normalized,
                imageUrl: getElementAttribute(img, 'src')
              });
            }
          }
        } catch (e) {
          console.warn('元素处理异常:', e);
        }
      });
    });

    return Array.from(elementMap.values());
  }

  // 防抖处理
  let processing = false;
  async function debouncedProcess() {
    if (processing) return;

    try {
      processing = true;
      const colors = await extractColors();
      if (colors.length) createLabels(colors);
    } catch (error) {
      console.error('Color Processing Error:', error);
    } finally {
      setTimeout(() => {
        processing = false;
        getElements('.swatch-wrapper').forEach(forceLayoutUpdate);
      }, CONFIG.DEBOUNCE_TIME);
    }
  }

  // 设置事件监听器
  function setupEventListeners() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        getElements('.swatch-wrapper').forEach(wrapper => {
          wrapper.isConnected ? forceLayoutUpdate(wrapper) : wrapper.remove();
        });
        colorNormalizer.clearCache();
      }, 200);
    });

    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        getElements('.swatch-wrapper').forEach(wrapper => {
          wrapper.isConnected && forceLayoutUpdate(wrapper);
        });
      }, 100);
    });
  }

  // 初始化颜色处理功能
  function init() {
    initStyles();
    removePagination();
    debouncedProcess();
    setupEventListeners();

    new MutationObserver((mutations) => {
      let shouldProcess = false;
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length || 
            mutation.attributeName === 'class' || 
            mutation.attributeName === 'style') {
          shouldProcess = true;
        }
      });

      if (shouldProcess) {
        removePagination();
        debouncedProcess();
      }
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  return {
    init
  };
})();

// 监听来自popup和background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request, '来自:', sender);
  
  // 处理不同的消息类型
  switch (request.type) {
    case 'EXTRACT_BRAND_URL':
      console.log('=== 开始处理EXTRACT_BRAND_URL消息 ===');
      
      // 立即处理消息，不使用async/await
      const u = window.location.href;
      let result = '';
      let success = false;
      let brandName = "未找到品牌名称";
      
      // 1. 直接获取页面上所有的a标签
      const allLinks = document.querySelectorAll('a');
      let targetLink = null;
      
      // 2. 遍历所有a标签，查找包含"Brand:"的链接
      console.log('开始查找包含Brand:的链接...');
      for (let link of allLinks) {
        const linkText = link.textContent.trim();
        const linkHref = link.getAttribute('href');
        
        // 检查文本中是否包含Brand:
        if (linkText.includes('Brand:')) {
          targetLink = link;
          console.log('找到包含Brand:的链接:', linkText, linkHref);
          break;
        }
      }
      
      // 3. 如果找到目标链接，提取品牌名称
      if (targetLink) {
        try {
          const linkText = targetLink.textContent.trim();
          console.log('目标链接文本:', linkText);
          
          // 直接从"Brand: "后面提取品牌名称
          if (linkText.includes('Brand:')) {
            // 使用多种方法提取，确保万无一失
            // 方法1: split
            const splitResult = linkText.split('Brand:');
            if (splitResult.length > 1) {
              brandName = splitResult[1].trim();
              console.log('split方法提取结果:', brandName);
            }
            
            // 方法2: 正则表达式
            const regex = /Brand:\s*(\w+)/i;
            const regexResult = linkText.match(regex);
            if (regexResult && regexResult[1]) {
              brandName = regexResult[1].trim();
              console.log('正则表达式提取结果:', brandName);
            }
            
            // 方法3: 直接截取
            const brandIndex = linkText.indexOf('Brand:');
            if (brandIndex > -1) {
              brandName = linkText.substring(brandIndex + 6).trim();
              console.log('直接截取结果:', brandName);
            }
          }
          
          // 4. 额外从href中提取作为备用
          const href = targetLink.getAttribute('href');
          if (href && (brandName === "未找到品牌名称" || brandName === "")) {
            console.log('从href中提取备用品牌名称:', href);
            // 从href中提取品牌名称
            const brandFromHref = href.match(/\/(\w+)\/b\//);
            if (brandFromHref && brandFromHref[1]) {
              brandName = brandFromHref[1];
              console.log('从href提取的品牌:', brandName);
            }
          }
          
          console.log('最终提取的品牌名称:', brandName);
          
          // 确保品牌名称有效
          if (!brandName || brandName === "") {
            brandName = "未找到品牌名称";
          }
          
          result = `${brandName}\n\n${u}`;
          console.log('最终结果:', result);
          
          // 使用现代的Clipboard API来复制文本
          if (navigator.clipboard) {
            navigator.clipboard.writeText(result)
              .then(() => {
                showNotification('已复制到剪贴板', 'success');
              })
              .catch(() => {
                // 降级使用document.execCommand
                fallbackCopyTextToClipboard(result);
              });
          } else {
            // 不支持Clipboard API，使用document.execCommand
            fallbackCopyTextToClipboard(result);
          }
          
          success = true;
        } catch (error) {
          console.error('Error extracting brand:', error);
          showNotification(`提取品牌失败: ${error.message}`, 'error');
        }
      } else {
        // 尝试其他方法查找品牌信息
        console.log('未找到包含Brand:的链接，尝试其他方法...');
        
        // 尝试从页面中所有包含Brand的文本中提取
        const allElements = document.querySelectorAll('*');
        for (let element of allElements) {
          const text = element.textContent.trim();
          if (text.includes('Brand:')) {
            console.log('从其他元素找到Brand:', text);
            // 提取品牌名称
            const brand = text.split('Brand:')[1].trim();
            if (brand) {
              brandName = brand;
              break;
            }
          }
        }
        
        // 如果仍然没找到，使用默认值
        result = `${brandName}\n\n${u}`;
        showNotification('已复制到剪贴板', 'success');
        success = true;
      }
      
      // 立即发送响应
      console.log('发送响应:', { success, message: success ? '提取完成' : '未找到品牌信息', brandName });
      sendResponse({ success: success, message: success ? '提取完成' : '未找到品牌信息', brandName: brandName });
      return true;
      
    case 'SHOW_COLORS':
      try {
        colorProcessor.init();
        sendResponse({ success: true, message: '颜色处理器已初始化' });
      } catch (error) {
        console.error('初始化颜色处理器失败:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    case 'TEST_CONNECTION':
      // 测试连接消息，用于验证content script是否正常工作
      sendResponse({ success: true, message: 'Content script已连接', currentUrl: window.location.href });
      return true;
    default:
      console.log('未知消息类型，将交给其他监听器处理:', request.type);
      // 对于不处理的消息类型，不调用sendResponse，让消息继续传递给其他监听器
      return true; // 保持消息通道开放，让其他监听器处理
  }
});

// 辅助函数：显示通知
function showNotification(text, type = 'success') {
  const notification = document.createElement('div');
  notification.textContent = text;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    background: ${type === 'success' ? '#333' : '#f44336'};
    color: white;
    border-radius: 4px;
    z-index: 9999;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

// 辅助函数：降级复制文本到剪贴板
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  
  try {
    const copySuccess = document.execCommand('copy');
    showNotification(copySuccess ? '已复制到剪贴板' : '复制失败', copySuccess ? 'success' : 'error');
  } catch (err) {
    showNotification('复制失败', 'error');
  } finally {
    document.body.removeChild(textArea);
  }
}

console.log('亚马逊插件Content Script已加载');

// ==================== 提示词搜索功能 ====================

// 全局变量
let isPromptSearchOpen = false;
let lastInputValue = '';
let contentEditableValuesMap = new WeakMap();

// 显示提示词搜索界面
async function showPromptSearch(force = false) {
  if (isPromptSearchOpen) return;
  
  try {
    isPromptSearchOpen = true;
    console.log('准备打开提示词搜索界面...', { force });
    
    // 获取当前聚焦的输入框
    let targetElement = document.activeElement;
    let isTargetValid = false;
    
    // 检查目标元素是否为有效的输入元素
    if (targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || 
       (targetElement instanceof HTMLElement && targetElement.getAttribute('contenteditable') === 'true'))) {
      isTargetValid = true;
    } else if (force) {
      // 如果是强制唤醒，尝试查找页面上的第一个输入框
      console.log('强制唤醒模式，尝试查找页面上的输入框...');
      targetElement = document.querySelector('input, textarea, [contenteditable="true"]');
      
      if (targetElement) {
        console.log('找到输入框:', targetElement.tagName);
        isTargetValid = true;
      } else {
        console.log('未找到输入框，将创建临时输入区域');
        // 如果没有找到输入框，将使用临时输入区域（由renderPromptSearch处理）
        isTargetValid = true; // 强制为true，让renderPromptSearch处理
      }
    }
    
    if (!isTargetValid) {
      alert('请先点击输入框或使用快捷键强制唤醒');
      isPromptSearchOpen = false;
      return;
    }
    
    // 从background获取提示词数据
    const promptsResult = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'getUserPrompts', getLoggedInUser: true },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });
    
    if (promptsResult.status === 'success' && promptsResult.data && promptsResult.data.length > 0) {
      console.log('获取到提示词数据:', promptsResult.data.length);
      await renderPromptSearch(promptsResult.data, targetElement);
    } else {
      showNotification('未找到提示词数据', 'error');
      isPromptSearchOpen = false;
    }
  } catch (error) {
    console.error('打开提示词搜索界面时出错:', error);
    showNotification('打开提示词搜索界面失败: ' + error.message, 'error');
    isPromptSearchOpen = false;
  }
}

// 渲染提示词搜索界面
function renderPromptSearch(prompts, targetElement) {
  return new Promise((resolve) => {
    // 创建搜索界面容器
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      max-width: 90vw;
      max-height: 70vh;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      overflow: hidden;
    `;
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999998;
    `;
    
    // 头部
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const title = document.createElement('h2');
    title.textContent = '提示词搜索';
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.onmouseenter = () => closeBtn.style.backgroundColor = '#f5f5f5';
    closeBtn.onmouseleave = () => closeBtn.style.backgroundColor = 'transparent';
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // 搜索区域
    const searchArea = document.createElement('div');
    searchArea.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
    `;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '搜索提示词... (支持分类筛选: #分类名)';
    searchInput.style.cssText = `
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    `;
    searchInput.onfocus = () => searchInput.style.borderColor = '#2196f3';
    searchInput.onblur = () => searchInput.style.borderColor = '#e0e0e0';
    
    searchArea.appendChild(searchInput);
    
    // 分类筛选
    const categoryFilter = document.createElement('div');
    categoryFilter.style.cssText = `
      padding: 0 20px 16px;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      white-space: nowrap;
    `;
    
    // 提取所有分类（同时支持 type 和 category 字段）
    const allCategories = ['全部', ...new Set(prompts.map(p => p.type || p.category))].filter(cat => cat);
    allCategories.forEach(category => {
      const categoryBtn = document.createElement('button');
      categoryBtn.textContent = category;
      categoryBtn.className = category === '全部' ? 'category-btn active' : 'category-btn';
      categoryBtn.style.cssText = `
        padding: 6px 12px;
        border: 1px solid #e0e0e0;
        border-radius: 20px;
        background: white;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
      `;
      
      if (category === '全部') {
        categoryBtn.style.backgroundColor = '#2196f3';
        categoryBtn.style.color = 'white';
        categoryBtn.style.borderColor = '#2196f3';
      }
      
      categoryBtn.onmouseenter = () => {
        if (!categoryBtn.classList.contains('active')) {
          categoryBtn.style.backgroundColor = '#f5f5f5';
        }
      };
      categoryBtn.onmouseleave = () => {
        if (!categoryBtn.classList.contains('active')) {
          categoryBtn.style.backgroundColor = 'white';
        }
      };
      
      categoryFilter.appendChild(categoryBtn);
    });
    
    // 提示词列表
    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
      max-height: 300px;
      overflow-y: auto;
      padding: 8px 0;
    `;
    
    // 渲染提示词列表
    function renderPromptsList(filteredPrompts) {
      listContainer.innerHTML = '';
      
      if (filteredPrompts.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.textContent = '未找到匹配的提示词';
        emptyState.style.cssText = `
          padding: 40px;
          text-align: center;
          color: #999;
          font-size: 14px;
        `;
        listContainer.appendChild(emptyState);
        return;
      }
      
      filteredPrompts.forEach((prompt, index) => {
        const item = document.createElement('div');
        item.className = 'prompt-item';
        item.dataset.index = index;
        item.style.cssText = `
          padding: 12px 20px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          flex-direction: column;
        `;
        
        item.onmouseenter = () => item.style.backgroundColor = '#f5f5f5';
        item.onmouseleave = () => item.style.backgroundColor = 'white';
        
        // 添加点击事件监听器
        item.addEventListener('click', () => {
          console.log('点击了提示词项，索引:', index);
          selectPrompt(index);
        });
        
        const promptName = document.createElement('div');
        promptName.textContent = prompt.promptname || prompt.name || '未命名提示词';
        promptName.style.cssText = `
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        `;
        
        const promptContent = document.createElement('div');
        const content = prompt.description || prompt.content || '';
        promptContent.textContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        promptContent.style.cssText = `
          font-size: 12px;
          color: #666;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `;
        
        const promptMeta = document.createElement('div');
        promptMeta.style.cssText = `
          font-size: 11px;
          color: #999;
          margin-top: 4px;
        `;
        
        const category = prompt.type || prompt.category;
        if (category) {
          const categorySpan = document.createElement('span');
          categorySpan.textContent = `#${category}`;
          promptMeta.appendChild(categorySpan);
        }
        
        item.appendChild(promptName);
        item.appendChild(promptContent);
        item.appendChild(promptMeta);
        listContainer.appendChild(item);
      });
    }
    
    // 初始渲染所有提示词
    renderPromptsList(prompts);
    
    // 过滤和搜索功能
    let currentFilter = '全部';
    let searchTerm = '';
    
    function filterPrompts() {
      let filtered = prompts;
      
      // 按分类筛选（支持 type 和 category 字段）
      if (currentFilter !== '全部') {
        filtered = filtered.filter(p => (p.type || p.category) === currentFilter);
      }
      
      // 按搜索词筛选
      if (searchTerm) {
        // 支持 #分类名 搜索
        if (searchTerm.startsWith('#')) {
          const categorySearch = searchTerm.substring(1);
          filtered = filtered.filter(p => (p.type || p.category)?.toLowerCase().includes(categorySearch.toLowerCase()));
        } else {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(p => 
            (p.promptname || p.name)?.toLowerCase().includes(term) || 
            (p.description || p.content)?.toLowerCase().includes(term) ||
            (p.type || p.category)?.toLowerCase().includes(term)
          );
        }
      }
      
      renderPromptsList(filtered);
      
      // 更新选中状态
      updateSelectedItem();
    }
    
    // 搜索输入事件
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      filterPrompts();
    });
    
    // 分类筛选事件
    categoryFilter.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // 移除所有active状态
        categoryFilter.querySelectorAll('.category-btn').forEach(b => {
          b.classList.remove('active');
          b.style.backgroundColor = 'white';
          b.style.color = '#333';
          b.style.borderColor = '#e0e0e0';
        });
        
        // 添加当前按钮的active状态
        btn.classList.add('active');
        btn.style.backgroundColor = '#2196f3';
        btn.style.color = 'white';
        btn.style.borderColor = '#2196f3';
        
        currentFilter = btn.textContent;
        filterPrompts();
      });
    });
    
    // 输入框选择功能
    function showInputSelector() {
      console.log('显示输入框选择器...');
      
      // 查找页面上的所有输入元素
      const inputElements = document.querySelectorAll('input, textarea, [contenteditable="true"]');
      
      if (inputElements.length === 0) {
        // 如果没有输入元素，创建一个临时输入区域
        createTemporaryInput();
        return;
      }
      
      // 高亮显示所有输入元素
      const highlightStyles = [];
      inputElements.forEach((element, index) => {
        if (!(element instanceof HTMLElement)) return;
        
        // 保存原始样式
        const originalStyle = {
          outline: element.style.outline,
          outlineOffset: element.style.outlineOffset,
          position: element.style.position,
          zIndex: element.style.zIndex
        };
        highlightStyles.push(originalStyle);
        
        // 添加高亮样式
        element.style.outline = '2px solid #2196f3';
        element.style.outlineOffset = '2px';
        element.style.position = 'relative';
        element.style.zIndex = '999999';
        
        // 创建选择指示器
        const indicator = document.createElement('div');
        indicator.className = 'input-selector-indicator';
        indicator.textContent = `${index + 1}`;
        indicator.style.cssText = `
          position: absolute;
          top: -25px;
          left: -5px;
          background: #2196f3;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          z-index: 1000000;
          pointer-events: none;
        `;
        
        // 确保元素有相对定位
        if (getComputedStyle(element).position === 'static') {
          element.style.position = 'relative';
        }
        
        element.appendChild(indicator);
      });
      
      // 更新搜索界面标题
      title.textContent = '选择输入框（按数字键）';
      
      // 添加数字键监听
      function handleKeyPress(e) {
        const key = e.key;
        
        if (/^[1-9]\d*$/.test(key)) {
          const index = parseInt(key) - 1;
          
          if (index >= 0 && index < inputElements.length) {
            // 移除高亮样式
            removeHighlights();
            
            // 设置目标元素为选中的输入框
            targetElement = inputElements[index];
            console.log('选择了输入框:', targetElement);
            
            // 恢复原始标题
            title.textContent = '提示词搜索';
            
            // 聚焦到选择的输入框
            if (targetElement instanceof HTMLElement) {
              targetElement.focus();
            }
            
            // 移除事件监听器
            document.removeEventListener('keydown', handleKeyPress);
          }
        } else if (key === 'Escape') {
          // 取消选择
          removeHighlights();
          title.textContent = '提示词搜索';
          document.removeEventListener('keydown', handleKeyPress);
        }
      }
      
      // 移除高亮样式
      function removeHighlights() {
        inputElements.forEach((element, index) => {
          if (!(element instanceof HTMLElement)) return;
          
          // 恢复原始样式
          const originalStyle = highlightStyles[index];
          element.style.outline = originalStyle.outline;
          element.style.outlineOffset = originalStyle.outlineOffset;
          element.style.position = originalStyle.position;
          element.style.zIndex = originalStyle.zIndex;
          
          // 移除指示器
          const indicator = element.querySelector('.input-selector-indicator');
          if (indicator) {
            indicator.remove();
          }
        });
      }
      
      // 添加事件监听器
      document.addEventListener('keydown', handleKeyPress);
    }
    
    // 创建临时输入区域
    function createTemporaryInput() {
      console.log('创建临时输入区域...');
      
      // 创建临时输入容器
      const tempInputContainer = document.createElement('div');
      tempInputContainer.className = 'temp-input-container';
      tempInputContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        max-width: 90vw;
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 1000000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      `;
      
      // 标题
      const tempTitle = document.createElement('h3');
      tempTitle.textContent = '临时输入区域';
      tempTitle.style.cssText = `
        margin: 0 0 15px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      `;
      
      // 输入框
      const tempInput = document.createElement('textarea');
      tempInput.placeholder = '输入内容...';
      tempInput.style.cssText = `
        width: 100%;
        height: 120px;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
        resize: vertical;
        outline: none;
      `;
      tempInput.onfocus = () => tempInput.style.borderColor = '#2196f3';
      tempInput.onblur = () => tempInput.style.borderColor = '#e0e0e0';
      
      // 按钮容器
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 15px;
      `;
      
      // 取消按钮
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '取消';
      cancelBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background: white;
        color: #333;
        cursor: pointer;
        font-size: 14px;
      `;
      cancelBtn.onclick = () => {
        tempInputContainer.remove();
        closeSearch();
      };
      
      // 确定按钮
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = '确定';
      confirmBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #2196f3;
        border-radius: 4px;
        background: #2196f3;
        color: white;
        cursor: pointer;
        font-size: 14px;
      `;
      confirmBtn.onclick = () => {
        const content = tempInput.value;
        if (content) {
          // 可以将内容复制到剪贴板
          navigator.clipboard.writeText(content).then(() => {
            showNotification('内容已复制到剪贴板', 'success');
          }).catch(err => {
            fallbackCopyTextToClipboard(content);
          });
        }
        tempInputContainer.remove();
        closeSearch();
      };
      
      // 构建临时输入区域
      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(confirmBtn);
      
      tempInputContainer.appendChild(tempTitle);
      tempInputContainer.appendChild(tempInput);
      tempInputContainer.appendChild(buttonContainer);
      
      // 添加到页面
      document.body.appendChild(tempInputContainer);
      
      // 聚焦输入框
      tempInput.focus();
    }
    
    // 检查目标元素是否有效
    function checkTargetElement() {
      if (!targetElement) {
        showInputSelector();
        return false;
      }
      
      // 检查目标元素是否仍然在DOM中
      if (!document.contains(targetElement)) {
        console.log('目标元素已不在DOM中');
        showInputSelector();
        return false;
      }
      
      // 检查目标元素是否为有效的输入元素
      if (!(targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || 
         (targetElement instanceof HTMLElement && targetElement.getAttribute('contenteditable') === 'true'))) {
        console.log('目标元素不是有效的输入元素');
        showInputSelector();
        return false;
      }
      
      return true;
    }
    
    // 选择提示词
    function selectPrompt(promptIndex) {
      // 检查目标元素是否有效
      if (!checkTargetElement()) {
        return;
      }
      
      const filteredPrompts = [...prompts].filter(p => {
        if (currentFilter !== '全部' && (p.type || p.category) !== currentFilter) return false;
        if (!searchTerm) return true;
        if (searchTerm.startsWith('#')) {
          const categorySearch = searchTerm.substring(1);
          return (p.type || p.category)?.toLowerCase().includes(categorySearch.toLowerCase());
        } else {
          const term = searchTerm.toLowerCase();
          return (p.promptname || p.name)?.toLowerCase().includes(term) || 
                 (p.description || p.content)?.toLowerCase().includes(term) ||
                 (p.type || p.category)?.toLowerCase().includes(term);
        }
      });
      
      if (promptIndex >= 0 && promptIndex < filteredPrompts.length) {
        const selectedPrompt = filteredPrompts[promptIndex];
        insertPromptContent(selectedPrompt.description || selectedPrompt.content || '', targetElement);
        closeSearch();
      }
    }
    
    // 插入提示词到输入框
    function insertPromptContent(content, targetElement) {
      if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
        // 标准输入框
        const startPos = targetElement.selectionStart;
        const endPos = targetElement.selectionEnd;
        const value = targetElement.value;
        
        // 移除最后输入的 /p
        if (value.toLowerCase().endsWith('/p')) {
          targetElement.value = value.slice(0, -2) + content;
        } else {
          targetElement.value = value.substring(0, startPos) + content + value.substring(endPos);
        }
        
        // 设置光标位置
        const newPos = startPos + content.length;
        targetElement.setSelectionRange(newPos, newPos);
        targetElement.focus();
      } else if (targetElement instanceof HTMLElement && targetElement.getAttribute('contenteditable') === 'true') {
        // contenteditable元素
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // 移除最后输入的 /p
        const lastTwoChars = targetElement.textContent.slice(-2);
        if (lastTwoChars.toLowerCase() === '/p') {
          range.setStart(targetElement.firstChild, targetElement.textContent.length - 2);
          range.setEnd(targetElement.firstChild, targetElement.textContent.length);
          range.deleteContents();
        }
        
        // 插入内容
        const textNode = document.createTextNode(content);
        range.insertNode(textNode);
        
        // 设置光标位置
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        targetElement.focus();
      }
    }
    
    // 键盘导航
    let selectedIndex = 0;
    
    function updateSelectedItem() {
      const items = listContainer.querySelectorAll('.prompt-item');
      items.forEach((item, index) => {
        item.style.backgroundColor = index === selectedIndex ? '#e3f2fd' : 'white';
      });
    }
    
    function handleKeyDown(e) {
      const items = listContainer.querySelectorAll('.prompt-item');
      if (items.length === 0) return;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(0, selectedIndex - 1);
          updateSelectedItem();
          scrollToSelected();
          break;
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
          updateSelectedItem();
          scrollToSelected();
          break;
        case 'Enter':
          e.preventDefault();
          selectPrompt(selectedIndex);
          break;
        case 'Escape':
          e.preventDefault();
          closeSearch();
          break;
      }
    }
    
    function scrollToSelected() {
      const items = listContainer.querySelectorAll('.prompt-item');
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
    
    // 点击列表项选择
    listContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.prompt-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        selectPrompt(index);
      }
    });
    
    // 关闭搜索界面
    function closeSearch() {
      overlay.remove();
      container.remove();
      document.removeEventListener('keydown', handleKeyDown);
      isPromptSearchOpen = false;
      resolve();
    }
    
    // 关闭按钮事件
    closeBtn.addEventListener('click', closeSearch);
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', closeSearch);
    
    // 阻止容器内点击事件冒泡
    container.addEventListener('click', (e) => e.stopPropagation());
    
    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyDown);
    
    // 构建界面
    container.appendChild(header);
    container.appendChild(searchArea);
    container.appendChild(categoryFilter);
    container.appendChild(listContainer);
    
    // 添加到页面
    document.body.appendChild(overlay);
    document.body.appendChild(container);
    
    // 聚焦搜索框
    searchInput.focus();
  });
}

// 监听输入事件，检测 /p 输入
function setupInputDetection() {
  document.addEventListener('input', async (event) => {
    // 标准输入框处理
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      const inputElement = event.target;
      const value = inputElement.value;
      
      if (value?.toLowerCase()?.endsWith('/p') && lastInputValue !== value && !isPromptSearchOpen) {
        lastInputValue = value;
        await showPromptSearch();
      } else if (!value?.toLowerCase()?.endsWith('/p')) {
        // 更新上次输入值
        lastInputValue = value;
      }
    }
    // contenteditable 元素处理
    else if (
      event.target instanceof HTMLElement && 
      event.target.getAttribute('contenteditable') === 'true'
    ) {
      const editableElement = event.target;
      const value = editableElement.textContent || '';
      const lastValue = contentEditableValuesMap.get(editableElement) || '';
      
      if (value?.toLowerCase()?.endsWith('/p') && lastValue !== value && !isPromptSearchOpen) {
        contentEditableValuesMap.set(editableElement, value);
        await showPromptSearch();
      } else if (!value?.toLowerCase()?.endsWith('/p')) {
        contentEditableValuesMap.set(editableElement, value);
      }
    }
  });
}

// 设置输入检测
setupInputDetection();

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到来自background的消息:', message);
  
  // 添加测试功能：在页面上显示消息
  if (message.action === 'open-prompt-search' || message.type === 'open-prompt-search') {
    // 在页面上显示一个测试通知
    const testNotification = document.createElement('div');
    testNotification.textContent = '快捷键已按下！正在尝试打开提示词搜索界面...';
    testNotification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 12px;
      background: #2196f3;
      color: white;
      border-radius: 4px;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    `;
    document.body.appendChild(testNotification);
    
    // 3秒后移除通知
    setTimeout(() => {
      testNotification.remove();
    }, 3000);
    
    // 传递force参数给showPromptSearch
    showPromptSearch(message.force || false).then(() => {
      sendResponse({ status: 'success' });
    }).catch(error => {
      console.error('打开提示词搜索界面时出错:', error);
      sendResponse({ status: 'error', message: error.message });
    });
    return true; // 保持消息通道开放
  }
  
  return false;
});

console.log('已启用 /p 快捷键检测功能');
console.log('已启用 Ctrl+Shift+Q 快捷键功能');
console.log('已设置消息监听器，响应来自background的命令');

// 添加直接的键盘事件监听（作为Chrome Commands API的替代方案）
function addKeyboardListener() {
  // 检查是否已经添加了键盘监听器
  if (window.hasOwnProperty('amazonExtensionKeyboardListener')) {
    return;
  }
  
  const handleKeyDown = (event) => {
    // 检查是否按下了Ctrl+Shift+Q
    if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
      event.preventDefault();
      console.log('直接键盘事件触发快捷键 Ctrl+Shift+Q');
      showPromptSearch(true);
    }
  };
  
  // 添加键盘事件监听器
  document.addEventListener('keydown', handleKeyDown);
  window.amazonExtensionKeyboardListener = handleKeyDown;
  console.log('已添加直接键盘事件监听器');
}

// 页面加载完成后添加键盘监听器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addKeyboardListener);
} else {
  addKeyboardListener();
}

