// 商品数据提取模块
import { getElement, getElementText, showTooltip } from '../utils/domUtils.js';
import { MESSAGE_TYPES } from '../utils/messageService.js';

// 提取商品品牌和URL
function extractProductData() {
  const currentUrl = window.location.href;
  let brandName = '';
  
  // 尝试从不同位置提取品牌名称
  const brandSelectors = [
    '#bylineInfo', // 默认品牌信息位置
    '.a-size-medium.a-color-base' // 备选位置
  ];
  
  for (const selector of brandSelectors) {
    const brandElement = getElement(selector);
    if (brandElement) {
      const elementText = getElementText(brandElement);
      const brandMatch = elementText.match(/Visit the (.*?) Store/);
      if (brandMatch) {
        brandName = brandMatch[1];
        break;
      }
    }
  }
  
  // 如果没有找到品牌名称，尝试其他方法
  if (!brandName) {
    const titleElement = getElement('#productTitle');
    if (titleElement) {
      const titleText = getElementText(titleElement);
      // 从标题中提取可能的品牌（简单实现）
      brandName = titleText.split(' ')[0];
    }
  }
  
  return {
    brandName: brandName || '未找到品牌名称',
    url: currentUrl
  };
}

// 复制品牌和URL到剪贴板
async function copyBrandAndUrl() {
  const productData = extractProductData();
  const copyContent = `${productData.brandName}\n\n${productData.url}`;
  
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(copyContent);
    } else {
      // 降级方案
      const tempTextarea = document.createElement('textarea');
      tempTextarea.value = copyContent;
      tempTextarea.style.position = 'fixed';
      document.body.appendChild(tempTextarea);
      tempTextarea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextarea);
    }
    
    showTooltip('已复制到剪贴板', 'success');
    return { success: true, productData };
  } catch (error) {
    console.error('复制失败:', error);
    showTooltip('复制失败', 'error');
    return { success: false, error: error.message };
  }
}

// 获取完整的商品数据（可扩展）
function getFullProductData() {
  const basicData = extractProductData();
  
  // 可以在这里添加更多数据提取逻辑
  const titleElement = getElement('#productTitle');
  const priceElement = getElement('#priceblock_ourprice');
  
  return {
    ...basicData,
    title: getElementText(titleElement),
    price: getElementText(priceElement),
    timestamp: new Date().toISOString()
  };
}

export {
  extractProductData,
  copyBrandAndUrl,
  getFullProductData
};
