// 颜色处理模块
import { getElement, getElements, getElementAttribute, forceRender } from '../utils/domUtils.js';

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
  const seen = new WeakMap();

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
      seen.clear();
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
function initColorProcessor() {
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

export {
  initColorProcessor
};
