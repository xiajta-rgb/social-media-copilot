// DOM操作工具模块

// 安全地获取元素
function getElement(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error('获取元素失败:', error);
    return null;
  }
}

// 安全地获取多个元素
function getElements(selector) {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch (error) {
    console.error('获取多个元素失败:', error);
    return [];
  }
}

// 安全地获取元素文本内容
function getElementText(element, defaultText = '') {
  if (!element) return defaultText;
  try {
    return element.textContent.trim();
  } catch (error) {
    console.error('获取元素文本失败:', error);
    return defaultText;
  }
}

// 安全地获取元素属性值
function getElementAttribute(element, attributeName, defaultVal = '') {
  if (!element) return defaultVal;
  try {
    return element.getAttribute(attributeName) || defaultVal;
  } catch (error) {
    console.error('获取元素属性失败:', error);
    return defaultVal;
  }
}

// 显示提示信息
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

// 强制页面重新渲染
function forceRender(element) {
  if (!element) return;
  try {
    element.offsetHeight; // 触发重排
  } catch (error) {
    console.error('强制渲染失败:', error);
  }
}

// 检查元素是否在视口中
function isInViewport(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export {
  getElement,
  getElements,
  getElementText,
  getElementAttribute,
  showTooltip,
  forceRender,
  isInViewport
};
