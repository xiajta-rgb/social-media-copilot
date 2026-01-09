// 后台服务工作线程
chrome.runtime.onInstalled.addListener(() => {
  console.log('亚马逊插件已安装');
  // 设置插件图标
  chrome.action.setBadgeText({ text: '' });
});

// 监听来自content scripts和popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request, '来自:', sender);
  
  // 处理不同类型的消息
  switch (request.type) {
    case 'GET_PRODUCT_DATA':
      // 处理获取商品数据的请求
      handleProductDataRequest(request, sender, sendResponse);
      break;
    case 'COPY_BRAND_AND_URL':
      // 处理复制品牌和URL的请求
      handleCopyBrandAndUrlRequest(request, sender, sendResponse);
      break;
    case 'SHOW_COLORS':
      // 处理显示颜色的请求
      handleShowColorsRequest(request, sender, sendResponse);
      break;
    case 'DOWNLOAD_DATA':
      // 处理下载数据的请求
      handleDownloadRequest(request, sender, sendResponse);
      break;
    case 'API_REQUEST':
      // 处理API请求
      handleApiRequest(request, sender, sendResponse);
      break;
    case 'GET_ACTIVE_TAB':
      // 获取当前活动标签页
      handleGetActiveTab(request, sender, sendResponse);
      break;
    default:
      console.log('未知消息类型:', request.type);
      sendResponse({ status: 'error', message: '未知消息类型' });
  }
  
  return true; // 保持消息通道打开，以便异步发送响应
});

// 处理获取商品数据的请求
function handleProductDataRequest(request, sender, sendResponse) {
  console.log('处理商品数据请求:', request);
  // 如果请求中包含商品数据，则直接返回
  if (request.productData) {
    sendResponse({ status: 'success', productData: request.productData });
    return;
  }
  
  // 否则，向当前标签页的content script请求数据
  if (sender.tab && sender.tab.id) {
    chrome.tabs.sendMessage(sender.tab.id, { type: 'GET_PRODUCT_DATA' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('获取商品数据失败:', chrome.runtime.lastError);
        sendResponse({ status: 'error', message: '获取商品数据失败' });
      } else {
        sendResponse({ status: 'success', productData: response.productData });
      }
    });
  } else {
    sendResponse({ status: 'error', message: '无法确定当前标签页' });
  }
}

// 处理复制品牌和URL的请求
function handleCopyBrandAndUrlRequest(request, sender, sendResponse) {
  console.log('处理复制品牌和URL请求:', request);
  // 向当前标签页的content script发送复制请求
  if (sender.tab && sender.tab.id) {
    chrome.tabs.sendMessage(sender.tab.id, { type: 'COPY_BRAND_AND_URL' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('复制失败:', chrome.runtime.lastError);
        sendResponse({ status: 'error', message: '复制失败' });
      } else {
        sendResponse({ status: 'success', ...response });
      }
    });
  } else {
    sendResponse({ status: 'error', message: '无法确定当前标签页' });
  }
}

// 处理显示颜色的请求
function handleShowColorsRequest(request, sender, sendResponse) {
  console.log('处理显示颜色请求:', request);
  // 向当前标签页的content script发送显示颜色请求
  if (sender.tab && sender.tab.id) {
    chrome.tabs.sendMessage(sender.tab.id, { type: 'SHOW_COLORS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('显示颜色失败:', chrome.runtime.lastError);
        sendResponse({ status: 'error', message: '显示颜色失败' });
      } else {
        sendResponse({ status: 'success', ...response });
      }
    });
  } else {
    sendResponse({ status: 'error', message: '无法确定当前标签页' });
  }
}

// 处理下载数据的请求
function handleDownloadRequest(request, sender, sendResponse) {
  if (!request.data) {
    sendResponse({ status: 'error', message: '没有数据可下载' });
    return;
  }
  
  // 将数据转换为JSON字符串
  const jsonData = JSON.stringify(request.data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // 下载文件
  chrome.downloads.download({
    url: url,
    filename: `amazon_product_data_${Date.now()}.json`,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('下载失败:', chrome.runtime.lastError);
      sendResponse({ status: 'error', message: '下载失败' });
    } else {
      console.log('下载成功:', downloadId);
      sendResponse({ status: 'success', message: '下载成功', downloadId });
    }
  });
}

// 速率限制管理器
const rateLimitManager = (() => {
  const requestTimestamps = new Map();
  const DEFAULT_RATE_LIMIT = 2000; // 默认2秒请求一次
  const RATE_LIMIT_MAP = {
    'www.amazon.com': 2000,
    'www.amazon.co.uk': 2000,
    'www.amazon.de': 2000
  };

  return {
    // 检查是否允许请求
    checkRateLimit: (url) => {
      const domain = new URL(url).hostname;
      const rateLimit = RATE_LIMIT_MAP[domain] || DEFAULT_RATE_LIMIT;
      const now = Date.now();
      const lastRequestTime = requestTimestamps.get(domain);

      if (lastRequestTime && now - lastRequestTime < rateLimit) {
        return {
          allowed: false,
          waitTime: rateLimit - (now - lastRequestTime)
        };
      }

      requestTimestamps.set(domain, now);
      return {
        allowed: true,
        waitTime: 0
      };
    },

    // 清除特定域名的请求记录
    clearDomain: (domain) => {
      requestTimestamps.delete(domain);
    },

    // 清除所有请求记录
    clearAll: () => {
      requestTimestamps.clear();
    }
  };
})();

// 获取随机的User-Agent
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// 验证码检测与处理
function handleCaptcha(response) {
  const commonCaptchaPatterns = [
    /captcha/i,
    /verify/i,
    /security/i,
    /challenge/i
  ];

  // 检查URL是否包含验证码相关关键字
  if (commonCaptchaPatterns.some(pattern => pattern.test(response.url))) {
    return {
      hasCaptcha: true,
      type: 'url_pattern'
    };
  }

  // 检查响应状态码
  if (response.status === 403) {
    return {
      hasCaptcha: true,
      type: 'status_code_403'
    };
  }

  return {
    hasCaptcha: false
  };
}

// 处理API请求
async function handleApiRequest(request, sender, sendResponse) {
  console.log('处理API请求:', request);
  
  if (!request.url) {
    sendResponse({ status: 'error', message: '缺少API URL' });
    return;
  }

  // 检查速率限制
  const rateLimitCheck = rateLimitManager.checkRateLimit(request.url);
  if (!rateLimitCheck.allowed) {
    sendResponse({ 
      status: 'rate_limited', 
      message: '请求频率过高，请稍后重试', 
      waitTime: rateLimitCheck.waitTime 
    });
    return;
  }
  
  try {
    // 构建更全面的请求头，模拟真实浏览器
    const options = {
      method: request.method || 'GET',
      headers: {
        'User-Agent': request.headers?.['User-Agent'] || getRandomUserAgent(),
        'Accept': request.headers?.['Accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': request.headers?.['Accept-Language'] || 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': request.headers?.['Accept-Encoding'] || 'gzip, deflate, br',
        'Connection': request.headers?.['Connection'] || 'keep-alive',
        'Upgrade-Insecure-Requests': request.headers?.['Upgrade-Insecure-Requests'] || '1',
        'Sec-Fetch-Dest': request.headers?.['Sec-Fetch-Dest'] || 'document',
        'Sec-Fetch-Mode': request.headers?.['Sec-Fetch-Mode'] || 'navigate',
        'Sec-Fetch-Site': request.headers?.['Sec-Fetch-Site'] || 'none',
        'Sec-Fetch-User': request.headers?.['Sec-Fetch-User'] || '?1',
        'Cache-Control': request.headers?.['Cache-Control'] || 'max-age=0',
        'Origin': request.origin || 'https://www.amazon.com',
        'Referer': request.referer || 'https://www.amazon.com/',
        ...request.headers
      },
      credentials: request.credentials || 'include',
      ...(request.body ? { body: JSON.stringify(request.body) } : {})
    };
    
    // 发送请求
    const response = await fetch(request.url, options);

    // 检查是否有验证码
    const captchaCheck = handleCaptcha(response);
    if (captchaCheck.hasCaptcha) {
      sendResponse({ 
        status: 'captcha_detected', 
        message: '检测到验证码，请手动验证后重试',
        captchaType: captchaCheck.type
      });
      return;
    }
    
    // 检查响应状态
    if (!response.ok) {
      // 处理429 Too Many Requests
      if (response.status === 429) {
        sendResponse({ 
          status: 'rate_limited', 
          message: '请求被限制，请稍后重试',
          retryAfter: response.headers.get('Retry-After') || '60'
        });
        return;
      }
      throw new Error(`HTTP错误! 状态: ${response.status}`);
    }
    
    // 根据Content-Type决定如何解析响应
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType && contentType.includes('text/html')) {
      data = await response.text();
    } else {
      data = await response.arrayBuffer();
    }
    
    sendResponse({ status: 'success', data, contentType });
  } catch (error) {
    console.error('API请求失败:', error);
    
    // 特殊错误处理
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      sendResponse({ 
        status: 'network_error', 
        message: '网络请求失败，请检查网络连接或稍后重试',
        details: error.message
      });
    } else {
      sendResponse({ status: 'error', message: error.message, details: error.stack });
    }
  }
}

// 处理获取当前活动标签页的请求
function handleGetActiveTab(request, sender, sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      sendResponse({ status: 'success', tab: tabs[0] });
    } else {
      sendResponse({ status: 'error', message: '没有找到活动标签页' });
    }
  });
}

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当标签页加载完成时
  if (changeInfo.status === 'complete' && tab.url) {
    // 检查是否为亚马逊页面
    const isAmazonPage = tab.url.toLowerCase().includes('amazon');
    
    // 如果是亚马逊页面，更新插件图标
    if (isAmazonPage) {
      chrome.action.setBadgeText({ text: 'ON', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// 监听标签页激活事件
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      const isAmazonPage = tab.url.toLowerCase().includes('amazon');
      if (isAmazonPage) {
        chrome.action.setBadgeText({ text: 'ON', tabId: activeInfo.tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: activeInfo.tabId });
        // 尝试注入内容脚本（如果还没有加载）
        injectContentScript(activeInfo.tabId);
      } else {
        chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
      }
    }
  });
});

// 动态注入内容脚本函数
function injectContentScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content-scripts/main.js']
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('动态注入content script失败:', chrome.runtime.lastError);
    } else {
      console.log('content script动态注入成功:', results);
    }
  });
}

// 测试连接函数
function testContentScriptConnection(tabId, callback) {
  chrome.tabs.sendMessage(tabId, { type: 'TEST_CONNECTION' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('测试连接失败:', chrome.runtime.lastError);
      callback(false);
    } else {
      console.log('测试连接成功:', response);
      callback(true, response);
    }
  });
}

console.log('亚马逊插件Background Service Worker已启动');

