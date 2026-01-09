// 主Content Script文件
// 整合所有功能，处理消息监听

// 辅助函数：显示提示信息
function showTooltip(message, type = 'info', duration = 2000) {
  const tooltip = document.createElement('div');
  tooltip.textContent = message;
  tooltip.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  // 设置不同类型的背景色
  const colors = {
    info: '#333',
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800'
  };
  tooltip.style.background = colors[type] || colors.info;

  document.body.appendChild(tooltip);

  // 显示提示
  setTimeout(() => {
    tooltip.style.opacity = '1';
  }, 100);

  // 隐藏并移除提示
  setTimeout(() => {
    tooltip.style.opacity = '0';
    setTimeout(() => {
      tooltip.remove();
    }, 300);
  }, duration);
}

// DOM操作增强 - 添加缓存机制
const domCache = new Map();
const CACHE_DURATION = 5000; // 缓存有效期5秒

// 缓存项结构
class CacheItem {
  constructor(value) {
    this.value = value;
    this.timestamp = Date.now();
  }
  
  isExpired() {
    return Date.now() - this.timestamp > CACHE_DURATION;
  }
}

// 辅助函数：安全地获取元素（带缓存）
function getElement(selector, useCache = true) {
  // 检查缓存
  if (useCache && domCache.has(selector)) {
    const cacheItem = domCache.get(selector);
    if (!cacheItem.isExpired()) {
      return cacheItem.value;
    }
    domCache.delete(selector);
  }
  
  try {
    const element = document.querySelector(selector);
    if (useCache && element) {
      domCache.set(selector, new CacheItem(element));
    }
    return element;
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

// 辅助函数：安全地获取元素文本内容
function getElementText(element, defaultText = '') {
  if (!element || !element.isConnected) return defaultText;
  try {
    return element.textContent.trim();
  } catch (error) {
    console.error('获取元素文本失败:', error);
    return defaultText;
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

// 辅助函数：从元素中提取文本（支持正则表达式）
function extractTextFromElement(element, regex, groupIndex = 1, defaultText = '') {
  if (!element || !element.isConnected) return defaultText;
  try {
    const text = element.textContent;
    const match = text.match(regex);
    return match && match[groupIndex] ? match[groupIndex].trim() : defaultText;
  } catch (error) {
    console.error('从元素提取文本失败:', error);
    return defaultText;
  }
}

// 清除DOM缓存
function clearDomCache() {
  domCache.clear();
}

// 监听页面变化，清除缓存
const cacheClearObserver = new MutationObserver(() => {
  clearDomCache();
});

cacheClearObserver.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// 商品数据提取功能 - 超级增强版
function extractProductData() {
  const currentUrl = window.location.href;
  let brandName = '';
  
  // 超级增强版品牌提取策略数组
  const brandExtractionStrategies = [
    // 策略1：从"Visit the X Store"格式提取 - 增强版
    {
      name: 'Visit Store格式',
      selectors: [
        '#bylineInfo', 
        '[data-cel-widget="bylineInfo_feature_div"]', 
        '#sellerProfileTriggerId',
        '.a-link-normal',
        '.a-size-small.a-link-normal.a-color-secondary',
        '[data-testid="bylineInfo_feature_div"]',
        '.a-row.a-spacing-mini.a-spacing-top-micro',
        '.a-row.a-spacing-small',
        '.a-section.a-spacing-none',
        '.a-row.a-spacing-mini',
        '.a-section.a-spacing-mini',
        '.a-size-base.a-link-normal',
        '.a-size-small.a-color-secondary.a-link-normal'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略1提取:', text);
        // 尝试多种正则表达式匹配
        const matches = [
          /Visit the (.*?) Store/i,
          /Visit (.*?)'s Store/i,
          /by (.*?)\s*\(/i,
          /by (.*?)$/i,
          /Sold by (.*?)\s*/i,
          /Ships from (.*?)\s*/i,
          /Fulfilled by Amazon/i,
          /Brand: (.*?)$/i,
          /Manufacturer: (.*?)$/i,
          /From (.*?)$/i
        ];
        for (const regex of matches) {
          const result = extractTextFromElement(element, regex, 1);
          if (result) return result;
        }
        // 如果没有匹配到正则，检查是否包含"Store"或"by"等关键词
        if (text && text.includes('Store') && !text.includes('Amazon.com')) {
          return text;
        }
        return text; // 如果没有匹配到正则，直接返回文本
      }
    },
    // 策略2：从品牌链接提取 - 增强版
    {
      name: '品牌链接',
      selectors: [
        '#bylineInfo a', 
        '.a-link-normal.a-color-secondary', 
        '.a-link-normal:has(+ .a-color-secondary)', 
        '[href*="brand"]',
        '[href*="seller"]',
        '.a-link-normal.a-text-normal',
        '.aplus-v2-module-brand .a-link-normal',
        '#sellerProfileTriggerId a',
        '.a-row.a-spacing-mini a',
        '.a-size-small.a-link-normal'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略2提取:', text);
        // 过滤掉可能的非品牌链接，但保留更宽松的过滤条件
        if (text && !text.includes('Amazon.com') && !text.includes('More Buying Choices') && 
            !text.includes('www.') && !text.includes('http')) {
          return text;
        }
        return '';
      }
    },
    // 策略3：从商品详情元数据提取 - 增强版
    {
      name: '元数据',
      selectors: [
        '[itemprop="brand"]', 
        '[data-testid="brand"]', 
        '.brand-text', 
        '.a-section:contains("品牌")',
        '[data-component-type="s-product-image"] [alt*="品牌"]',
        '.aplus-v2-module-brand [itemprop="brand"]',
        '[data-a-badge="brand"]',
        '.a-span7:contains("Brand") + .a-span5',
        '.a-span7:contains("品牌") + .a-span5',
        '.a-span6:contains("Brand") + .a-span6',
        '#wayfinding-breadcrumbs_feature_div .a-link-normal',
        '.nav-a:contains("Brands") + .nav-a',
        '.a-link-normal:contains("Brand")',
        '[data-asin] [alt*="Brand"]',
        '.a-image-wrapper img[alt*="Brand"]',
        '#detailBullets_feature_div .a-list-item:contains("Brand")',
        '#detailBullets_feature_div .a-list-item:contains("品牌")'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略3提取:', text);
        // 如果文本包含品牌相关关键词，尝试提取
        if (text && (text.includes('Brand') || text.includes('品牌'))) {
          const colonIndex = text.indexOf(':');
          if (colonIndex > -1) {
            return text.substring(colonIndex + 1).trim();
          }
        }
        return text;
      }
    },
    // 策略4：从商品属性表格提取 - 增强版
    {
      name: '商品属性表格',
      selectors: [
        '.tabular-buybox-text[tabular-attribute-name="Brand"]', 
        '.a-span9:contains("Brand") + .a-span9',
        '.a-section.a-spacing-small:contains("Brand") .a-size-base',
        '.a-label.a-text-bold:contains("Brand") + .a-form-text',
        '.a-normal.a-spacing-micro .a-span9:nth-child(2)',
        '.a-keyvalue.prodDetTable .a-span9',
        '.a-size-base.prodDetAttrValue',
        '#productDetailsTable .a-span9',
        '.a-section.a-spacing-small:contains("Brand") .a-size-base',
        '#detailBullets_feature_div .a-list-item:contains("Brand")',
        '#detailBullets_feature_div .a-list-item:contains("品牌")',
        '.a-list-item:contains("Manufacturer")',
        '.a-list-item:contains("制造商")',
        '.a-section.a-spacing-small .a-row:contains("Brand") .a-size-base',
        '.a-section.a-spacing-small .a-row:contains("品牌") .a-size-base',
        '.a-section.a-spacing-small .a-row:contains("Manufacturer") .a-size-base',
        '.a-section.a-spacing-small .a-row:contains("制造商") .a-size-base',
        '.prodDetTable .a-keyvalue',
        '.a-keyvalue.a-spacing-top-small',
        '.a-column.a-span6 .a-text-bold:contains("Brand") + .a-text-bold',
        '.a-column.a-span6 .a-text-bold:contains("品牌") + .a-text-bold'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略4提取:', text);
        // 检查是否是相邻的品牌属性
        const prevElement = element.previousElementSibling;
        if (prevElement && getElementText(prevElement).toLowerCase().includes('brand')) {
          return text;
        }
        // 检查当前元素是否包含品牌相关关键词
        if (text.toLowerCase().includes('brand')) {
          const colonIndex = text.indexOf(':');
          if (colonIndex > -1) {
            return text.substring(colonIndex + 1).trim();
          }
        }
        // 直接返回文本，可能是品牌
        if (text && !text.includes(':')) {
          return text;
        }
        // 从包含冒号的文本中提取品牌
        const colonIndex = text.indexOf(':');
        if (colonIndex > -1) {
          const brandPart = text.substring(colonIndex + 1).trim();
          if (brandPart) return brandPart;
        }
        // 尝试从整个元素及其兄弟元素中提取
        const parentElement = element.parentElement;
        if (parentElement) {
          const parentText = getElementText(parentElement);
          const brandMatch = parentText.match(/Brand:\s*(.*?)(?:\n|$)/i) || parentText.match(/品牌:\s*(.*?)(?:\n|$)/i);
          if (brandMatch && brandMatch[1]) {
            return brandMatch[1].trim();
          }
        }
        return text; // 如果没有找到冒号，直接返回文本
      }
    },
    // 策略5：从标题中提取 - 增强版
    {
      name: '标题提取',
      selectors: ['#productTitle', '.a-size-large.product-title-word-break', '.product-title', '.a-size-large.a-spacing-none'],
      extractor: (element) => {
        const titleText = getElementText(element);
        console.log('策略5标题:', titleText);
        if (titleText) {
          // 尝试从标题中提取品牌
          // 方法1：取前几个单词作为候选品牌
          const words = titleText.split(' ');
          for (let i = 1; i <= 5; i++) { // 尝试取1-5个单词
            const potentialBrand = words.slice(0, i).join(' ').trim();
            if (potentialBrand && potentialBrand.length > 2 && !potentialBrand.match(/^\d+$/)) {
              return potentialBrand;
            }
          }
          // 方法2：查找常见的品牌分隔符
          const separators = ['-', '|', ':', '—', '\u2013', '\u2014', '/', '\\'];
          for (const sep of separators) {
            if (titleText.includes(sep)) {
              const brandPart = titleText.split(sep)[0].trim();
              if (brandPart && brandPart.length > 2) {
                return brandPart;
              }
            }
          }
          // 方法3：直接返回前半部分文本作为品牌
          if (titleText.length > 5) {
            const halfLength = Math.floor(titleText.length / 2);
            const potentialBrand = titleText.substring(0, halfLength).trim();
            if (potentialBrand && potentialBrand.length > 2) {
              return potentialBrand;
            }
          }
        }
        return '';
      }
    },
    // 策略6：从卖家信息提取 - 增强版
    {
      name: '卖家信息',
      selectors: [
        '.tabular-buybox-text[tabular-attribute-name="Brand"]', 
        '.a-span9:contains("Brand") + .a-span9',
        '.a-section.a-spacing-small:contains("Brand") .a-size-base',
        '.a-label.a-text-bold:contains("Brand") + .a-form-text',
        '.a-row.a-spacing-mini:contains("Brand") + .a-row',
        '.a-section.a-spacing-small:contains("制造商") .a-size-base',
        '.tabular-buybox-text[tabular-attribute-name="Manufacturer"]',
        '.a-row.a-spacing-small:contains("Sold by")',
        '.a-row.a-spacing-small:contains("Ships from")',
        '.a-box.shipFromSoldBy'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略6提取:', text);
        // 尝试从卖家信息中提取品牌
        const match = text.match(/Sold by (.*?)\s*/i) || text.match(/Ships from (.*?)\s*/i);
        return match ? match[1] : text;
      }
    },
    // 策略7：从商品描述提取 - 增强版
    {
      name: '商品描述',
      selectors: [
        '#productDescription', 
        '.a-section.a-spacing-medium',
        '.aplus-module-2',
        '.aplus-v2-module-3',
        '#feature-bullets',
        '.a-section.a-spacing-small' 
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略7提取:', text.length > 100 ? text.substring(0, 100) + '...' : text);
        // 尝试多种正则表达式匹配
        const matches = [
          /(?:Brand|品牌):?\s*(.*?)[\s,\.<\n]/i,
          /(?:Manufacturer|制造商):?\s*(.*?)[\s,\.<\n]/i,
          /(?:by|由|来自)\s*(.*?)[\s,\.<\n]/i,
          /(?:Brand Name|品牌名称):?\s*(.*?)[\s,\.<\n]/i,
          /(?:Product Brand|产品品牌):?\s*(.*?)[\s,\.<\n]/i
        ];
        for (const regex of matches) {
          const result = extractTextFromElement(element, regex, 1);
          if (result) return result;
        }
        return '';
      }
    },
    // 策略8：从侧边栏品牌信息提取 - 增强版
    {
      name: '侧边栏品牌信息',
      selectors: [
        '#wayfinding-breadcrumbs_container',
        '.nav-a:contains("Brands")',
        '.a-list-item:contains("Brand") .a-link-normal',
        '.a-section:contains("Brand") .a-link-normal',
        '.a-box-group .a-box .a-box-inner .a-row.a-spacing-mini',
        '#nav-subnav .nav-a'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略8提取:', text);
        // 从面包屑中提取品牌
        const match = text.match(/Brands › (.*?)(?: › |$)/i) || text.match(/品牌 › (.*?)(?: › |$)/i);
        return match ? match[1] : text;
      }
    },
    // 策略9：从图片alt属性提取 - 增强版
    {
      name: '图片alt属性',
      selectors: [
        '#landingImage',
        '#imgBlkFront',
        '.a-dynamic-image.a-stretch-horizontal',
        '[data-image-index="0"]',
        '.a-dynamic-image.a-stretch-vertical',
        '[data-csa-c-dynamic-image]'
      ],
      extractor: (element) => {
        const altText = getElementAttribute(element, 'alt');
        console.log('策略9提取:', altText);
        if (altText) {
          // 取第一个单词作为品牌
          const firstWord = altText.split(' ')[0].trim();
          if (firstWord && firstWord.length > 2) {
            return firstWord;
          }
          // 尝试取前几个单词
          const words = altText.split(' ');
          for (let i = 2; i <= 4; i++) {
            const potentialBrand = words.slice(0, i).join(' ').trim();
            if (potentialBrand && potentialBrand.length > 2) {
              return potentialBrand;
            }
          }
        }
        return '';
      }
    },
    // 策略10：从评论区提取
    {
      name: '评论区品牌',
      selectors: [
        '#cm_cr-product_info .a-link-normal',
        '.a-profile-name',
        '.a-section.review-byline',
        '#cm_cr-product_info'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略10提取:', text);
        return text;
      }
    },
    // 策略11：从购买选项提取
    {
      name: '购买选项',
      selectors: [
        '#buybox',
        '#merchant-info',
        '.a-box.shipFromSoldBy',
        '.a-row.offer-display-area'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略11提取:', text);
        const match = text.match(/Sold by (.*?)\s*Ships/i) || text.match(/Ships from (.*?)\s*Sold/i);
        return match ? match[1] : text;
      }
    },
    // 策略12：从价格下方的品牌信息提取
    {
      name: '价格下方品牌信息',
      selectors: [
        '.a-row.a-spacing-none.a-spacing-top-small',
        '.a-size-small.a-color-secondary',
        '.a-text-bold'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略12提取:', text);
        return text;
      }
    },
    // 策略13：从页面其他位置提取
    {
      name: '其他位置',
      selectors: [
        '.a-box-group',
        '.a-box-inner',
        '.a-section.a-spacing-medium.a-text-center',
        '#centerCol',
        '.a-section.a-spacing-medium',
        '.a-container',
        '.a-box',
        '.a-text-bold',
        '.a-row'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略13提取:', text.length > 100 ? text.substring(0, 100) + '...' : text);
        // 尝试从文本中提取可能的品牌
        const matches = [
          /(?:Brand|品牌):?\s*(.*?)[\s,\.<\n]/i,
          /(?:Manufacturer|制造商):?\s*(.*?)[\s,\.<\n]/i,
          /(?:by|由|来自)\s*(.*?)[\s,\.<\n]/i,
          /(?:Product|产品)\s*(?:by|from)\s*(.*?)[\s,\.<\n]/i
        ];
        for (const regex of matches) {
          const result = extractTextFromElement(element, regex, 1);
          if (result) return result;
        }
        // 如果没有匹配到正则，但文本看起来像品牌，直接返回
        if (text && text.length > 2 && text.length < 50 && /^[A-Z][a-zA-Z\s\-\&\.]+$/.test(text)) {
          return text;
        }
        return '';
      }
    },
    // 策略14：从商品详情区域提取
    {
      name: '商品详情区域',
      selectors: [
        '#detailBullets_feature_div',
        '#productDetails_detailBullets_sections1',
        '#productDetailsTable',
        '.a-section.a-spacing-medium.a-spacing-top-small',
        '.a-section.a-spacing-large',
        '.a-section.a-spacing-small.a-text-center'
      ],
      extractor: (element) => {
        const text = getElementText(element);
        console.log('策略14提取:', text.length > 100 ? text.substring(0, 100) + '...' : text);
        // 尝试从详情区域提取品牌
        const matches = [
          /Brand:\s*(.*?)(?:\n|\s{2}|$)/i,
          /品牌:\s*(.*?)(?:\n|\s{2}|$)/i,
          /Manufacturer:\s*(.*?)(?:\n|\s{2}|$)/i,
          /制造商:\s*(.*?)(?:\n|\s{2}|$)/i,
          /by\s*(.*?)\s*\(/i,
          /by\s*(.*?)$/i
        ];
        for (const regex of matches) {
          const result = extractTextFromElement(element, regex, 1);
          if (result) return result;
        }
        return '';
      }
    }
  ];
  
  // 尝试所有提取策略
  console.log('开始品牌提取，当前URL:', currentUrl);
  for (let i = 0; i < brandExtractionStrategies.length; i++) {
    const strategy = brandExtractionStrategies[i];
    console.log(`尝试策略 ${i + 1}: ${strategy.name}`);
    
    for (const selector of strategy.selectors) {
      console.log(`  选择器: ${selector}`);
      // 使用多个DOM查询方法确保找到元素
      let elements = [];
      try {
        elements = Array.from(document.querySelectorAll(selector));
        if (elements.length === 0) {
          // 尝试使用getElement作为备选
          const element = getElement(selector);
          if (element) elements = [element];
        }
      } catch (error) {
        console.log(`  选择器语法错误: ${selector}`);
        continue;
      }
      
      for (const element of elements) {
        if (element && element.isConnected) {
          console.log(`  找到元素:`, element);
          const extractedBrand = strategy.extractor(element);
          if (extractedBrand) {
            console.log(`  提取成功: ${extractedBrand}`);
            brandName = extractedBrand;
            break;
          } else {
            console.log(`  提取结果为空`);
          }
        }
      }
      
      if (brandName) break;
    }
    if (brandName) break;
  }
  
  // 如果仍然没有找到品牌，尝试从页面中提取所有可能的品牌信息
  if (!brandName) {
    console.log('尝试从页面中提取所有可能的品牌信息...');
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      if (element && element.isConnected) {
        const text = getElementText(element);
        if (text && text.length > 2 && text.length < 100) {
          // 尝试匹配可能的品牌名称模式
          const brandPatterns = [
            /^[A-Z][a-zA-Z\s\-\&\.]+$/,
            /^[A-Z0-9][a-zA-Z0-9\s\-\&\.]+$/,
            /^(?:Brand|品牌|Manufacturer|制造商):?\s*(.+)$/i
          ];
          for (const pattern of brandPatterns) {
            const match = text.match(pattern);
            if (match) {
              const potentialBrand = match.length > 1 ? match[1] : match[0];
              if (potentialBrand && potentialBrand.length > 2) {
                console.log('找到可能的品牌:', potentialBrand);
                brandName = potentialBrand;
                break;
              }
            }
          }
          if (brandName) break;
        }
      }
    }
  }
  
  console.log('最终品牌提取结果:', brandName);
  
  // 提取更多商品信息
  const productTitle = getElementText(getElement('#productTitle'));
  const productPrice = getElementText(getElement('.a-price-whole'));
  const productRating = getElementText(getElement('.a-icon-alt'));
  
  return {
    brandName: brandName || '未找到品牌名称',
    url: currentUrl,
    title: productTitle,
    price: productPrice,
    rating: productRating,
    extractedAt: new Date().toISOString()
  };
}

// 确保DOM完全加载的辅助函数
function ensureDomLoaded() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      resolve();
    } else {
      document.addEventListener('DOMContentLoaded', resolve);
      window.addEventListener('load', resolve);
    }
  });
}

// 等待特定元素出现
function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime < timeout) {
        setTimeout(checkElement, 100);
      } else {
        resolve(null);
      }
    };
    
    checkElement();
  });
}

// 复制品牌和URL到剪贴板 - 增强版
async function copyBrandAndUrl() {
  try {
    console.log('======= 开始复制品牌和URL流程 =======');
    
    // 确保DOM完全加载
    console.log('检查DOM加载状态:', document.readyState);
    await ensureDomLoaded();
    console.log('DOM加载完成');
    
    // 增加额外的等待时间，确保页面完全渲染
    console.log('等待额外的页面渲染时间...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 等待多个关键元素出现，提高页面加载完成的确定性
    console.log('等待关键元素出现...');
    const elementsFound = await Promise.race([
      waitForElement('#productTitle', 15000), // 等待标题
      waitForElement('#bylineInfo', 15000),   // 等待品牌信息区域
      waitForElement('.a-price-whole', 15000), // 等待价格信息
      waitForElement('#productDetailsTable', 15000), // 等待详情表格
      waitForElement('.a-row.a-spacing-mini', 15000), // 等待卖家信息行
      waitForElement('.a-size-large.product-title-word-break', 15000), // 等待另一种标题元素
      waitForElement('.a-container', 15000), // 等待页面容器
      waitForElement('.a-box', 15000), // 等待页面盒子元素
      waitForElement('#detailBullets_feature_div', 15000), // 等待详情列表
      waitForElement('#productDescription', 15000) // 等待商品描述
    ]);
    console.log('关键元素已找到:', elementsFound ? elementsFound.tagName : '未知元素');
    
    // 强制页面渲染完成
    console.log('强制页面渲染...');
    forceRender(document.body);
    await new Promise(resolve => setTimeout(resolve, 500)); // 等待渲染完成
    forceRender(document.body);
    console.log('页面渲染完成');
    
    // 多次尝试提取数据，提高成功率
    let productData = null;
    let attempts = 0;
    const maxAttempts = 10;
    const delayBetweenAttempts = 1500;
    
    while (!productData?.brandName || productData.brandName === '未找到品牌名称') {
      if (attempts >= maxAttempts) {
        break;
      }
      
      console.log(`开始第${attempts + 1}次数据提取尝试...`);
      
      // 每次提取前强制刷新DOM
      clearDomCache();
      console.log('DOM缓存已清除');
      forceRender(document.body);
      await new Promise(resolve => setTimeout(resolve, 300)); // 等待DOM更新
      
      productData = extractProductData();
      
      if (productData.brandName !== '未找到品牌名称') {
        console.log(`提取成功！品牌: ${productData.brandName}`);
        console.log(`提取的URL: ${productData.url}`);
        break;
      }
      
      attempts++;
      console.log(`品牌提取失败，尝试第${attempts + 1}次...`);
      
      // 等待更长时间后重试，确保页面完全加载
      await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
    }
    
    // 确保productData存在
    if (!productData) {
      productData = extractProductData();
    }
    
    // 准备复制内容
    const copyContent = `${productData.brandName}\n\n${productData.url}`;
    console.log('准备复制的内容:', copyContent);
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(copyContent);
      } else {
        // 降级方案
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = copyContent;
        tempTextarea.style.position = 'fixed';
        tempTextarea.style.opacity = '0';
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        
        try {
          document.execCommand('copy');
        } catch (execError) {
          console.error('复制命令执行失败:', execError);
          // 再次尝试
          await new Promise(resolve => setTimeout(resolve, 100));
          document.execCommand('copy');
        }
        
        document.body.removeChild(tempTextarea);
      }
      
      showTooltip('已复制到剪贴板', 'success');
      return { success: true, productData };
    } catch (clipboardError) {
      console.error('复制到剪贴板失败:', clipboardError);
      showTooltip('复制失败', 'error');
      return { success: false, error: clipboardError.message };
    }
  } catch (error) {
    console.error('复制品牌和URL时发生错误:', error);
    showTooltip('操作失败', 'error');
    return { success: false, error: error.message };
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
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('收到消息:', request, '来自:', sender);
  
  try {
    // 处理不同类型的消息
    switch (request.type) {
      case 'COPY_BRAND_AND_URL':
        try {
          const response = await copyBrandAndUrl();
          sendResponse(response);
        } catch (error) {
          console.error('复制品牌和URL失败:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
      case 'SHOW_COLORS':
        try {
          colorProcessor.init();
          sendResponse({ success: true, message: '颜色处理器已初始化' });
        } catch (error) {
          console.error('初始化颜色处理器失败:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
      case 'GET_PRODUCT_DATA':
        try {
          const productData = extractProductData();
          sendResponse({ success: true, productData });
        } catch (error) {
          console.error('提取商品数据失败:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
      case 'TEST_CONNECTION':
        // 测试连接消息，用于验证content script是否正常工作
        sendResponse({ success: true, message: 'Content script已连接', currentUrl: window.location.href });
        break;
      case 'EXTRACT_DATA':
        // 通用数据提取消息
        try {
          const data = extractProductData();
          sendResponse({ success: true, data });
        } catch (error) {
          console.error('通用数据提取失败:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
      default:
        console.log('未知消息类型:', request.type);
        sendResponse({ success: false, status: 'error', message: '未知消息类型' });
    }
  } catch (error) {
    console.error('消息处理异常:', error);
    sendResponse({ success: false, status: 'error', message: '消息处理异常', error: error.message });
  }
  
  return true; // 保持消息通道打开，以便异步发送响应
});

console.log('亚马逊插件Content Script已加载');
