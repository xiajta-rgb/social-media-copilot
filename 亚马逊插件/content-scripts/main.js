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
      return false; // 关闭消息通道，让其他监听器处理
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
