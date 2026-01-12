// 后台服务工作线程
chrome.runtime.onInstalled.addListener(() => {
  console.log('亚马逊插件已安装');
  // 设置插件图标
  chrome.action.setBadgeText({ text: '' });
});

// 配置Supabase信息
const SUPABASE_CONFIG = {
  url: "https://xarrfzqxwpuurjrsaant.supabase.co",
  // 使用可发布密钥（public key）
  key: "sb_publishable_Q_tcn_K4HCXIriaMCm8_VQ_qtQYvit6"
};

// 1. 封装注册请求函数
async function userRegister(username, password) {
  try {
    // 直接使用fetch调用Supabase API
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `注册失败：${response.status}`;
      } catch {
        errorMessage = `注册失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空数组
    let data = [];
    try {
      data = await response.json();
    } catch {
      console.log("注册成功，但响应体为空");
    }
    
    console.log("注册成功：", data);
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `注册成功！`,
      data: data[0]
    };
  } catch (error) {
    console.error("注册异常：", error);
    return { code: 500, status: 'error', msg: `注册失败：${error.message}` };
  }
}

// 2. 封装登录请求函数
async function userLogin(username, password) {
  try {
    console.log('登录请求开始:', { username, password });
    
    // 直接使用fetch调用Supabase API
    const url = `${SUPABASE_CONFIG.url}/rest/v1/account?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}`;
    console.log('登录请求URL:', url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });

    console.log('登录请求响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        console.log('登录请求错误数据:', errorData);
        errorMessage = errorData.message || `登录失败：${response.status}`;
      } catch (e) {
        console.log('解析错误信息失败:', e);
        errorMessage = `登录失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空数组
    let data = [];
    try {
      data = await response.json();
      console.log('登录请求响应数据:', data);
    } catch (e) {
      console.log("登录成功，但响应体为空:", e);
    }
    
    if (data && data.length > 0) {
      console.log("登录成功：", data);
      return { 
        code: 200, 
        status: 'success', 
        msg: `登录成功！欢迎 ${username}`,
        data: data[0]
      };
    } else {
      console.log("登录失败：账号密码错误，响应数据为空");
      return { 
        code: 401, 
        status: 'error', 
        msg: `用户名或密码错误`
      };
    }
  } catch (error) {
    console.error("登录异常：", error);
    return { code: 500, status: 'error', msg: `登录失败：${error.message}` };
  }
}

// 3. 封装查询所有数据请求函数
async function queryAllData() {
  try {
    // 直接使用fetch调用Supabase API
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/account`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `查询失败：${response.status}`;
      } catch {
        errorMessage = `查询失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空数组
    let data = [];
    try {
      data = await response.json();
    } catch {
      console.log("查询成功，但响应体为空");
    }
    
    console.log("查询数据成功：", data);
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `查询成功！共 ${data.length} 条数据`,
      data: data
    };
  } catch (error) {
    console.error("查询异常：", error);
    return { code: 500, status: 'error', msg: `查询失败：${error.message}` };
  }
}

// 4. 封装获取用户关联数据的请求函数
async function getUserDatabaseData(username) {
  try {
    // 直接使用fetch调用Supabase API
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/userdatabase?username=eq.${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `查询用户数据失败：${response.status}`;
      } catch {
        errorMessage = `查询用户数据失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空数组
    let data = [];
    try {
      data = await response.json();
    } catch {
      console.log("查询用户数据成功，但响应体为空");
    }
    
    console.log("查询用户数据成功：", data);
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `查询用户数据成功！共 ${data.length} 条数据`,
      data: data
    };
  } catch (error) {
    console.error("查询用户数据异常：", error);
    return { code: 500, status: 'error', msg: `查询用户数据失败：${error.message}` };
  }
}

// 5. 封装添加用户关联数据的请求函数
async function addUserDatabaseData(username, personal_name, personal_acc, personal_pw) {
  try {
    // 首先获取用户的ID
    const accountResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/account?username=eq.${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });

    if (!accountResponse.ok) {
      throw new Error(`获取用户信息失败：${accountResponse.status}`);
    }

    const accountData = await accountResponse.json();
    if (!accountData || accountData.length === 0) {
      throw new Error(`用户不存在`);
    }

    const userId = accountData[0].id;

    // 然后添加关联数据（移除id字段，让Supabase自动生成唯一的ID）
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/userdatabase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify({
        username: username,
        account_id: userId, // 设置为用户的account.id，满足外键约束
        personal_name: personal_name,
        personal_acc: personal_acc,
        personal_pw: personal_pw
      })
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `添加用户数据失败：${response.status}`;
      } catch {
        errorMessage = `添加用户数据失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空对象
    let data = {};
    try {
      data = await response.json();
    } catch {
      console.log("添加用户数据成功，但响应体为空");
    }
    
    console.log("添加用户数据成功：", data);
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `添加用户数据成功！`,
      data: data
    };
  } catch (error) {
    console.error("添加用户数据异常：", error);
    return { code: 500, status: 'error', msg: `添加用户数据失败：${error.message}` };
  }
}

// 6. 封装删除用户关联数据的请求函数
async function deleteUserDatabaseData(username, personal_name, personal_acc) {
  try {
    // 直接使用fetch调用Supabase API
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/userdatabase?username=eq.${encodeURIComponent(username)}&personal_name=eq.${encodeURIComponent(personal_name)}&personal_acc=eq.${encodeURIComponent(personal_acc)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `删除用户数据失败：${response.status}`;
      } catch {
        errorMessage = `删除用户数据失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    console.log("删除用户数据成功");
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `删除用户数据成功！`
    };
  } catch (error) {
    console.error("删除用户数据异常：", error);
    return { code: 500, status: 'error', msg: `删除用户数据失败：${error.message}` };
  }
}

// 确保只注册一个消息监听器，先移除所有现有监听器
// 注意：这种方式只能移除通过该引用注册的监听器
// 为了彻底清理，我们将使用更可靠的方式
let existingListeners = [];

// 重新注册一个新的消息监听器
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('=== 消息处理开始 ===');
  console.log('原始请求:', JSON.stringify(request));
  console.log('发送者:', JSON.stringify(sender));
  
  try {
    // 检查请求对象是否有效
    if (!request || typeof request !== 'object') {
      console.error('无效的请求对象:', request);
      sendResponse({
        code: 400,
        status: 'error',
        message: '无效的请求对象',
        requestType: typeof request
      });
      return true;
    }
    
    // 获取并验证消息类型
    let msgType = request.type;
    console.log('提取到的消息类型:', msgType);
    
    if (msgType === undefined || msgType === null) {
      console.error('消息类型未定义');
      sendResponse({
        code: 400,
        status: 'error',
        message: '未知错误请审查'
      });
      return true;
    }
    
    if (typeof msgType !== 'string') {
      console.error('消息类型不是字符串:', msgType, typeof msgType);
      sendResponse({
        code: 400,
        status: 'error',
        message: '未知错误请审查',
        receivedType: msgType,
        type: typeof msgType
      });
      return true;
    }
    
    // 处理不同类型的消息
    switch (msgType) {
      case 'GET_PRODUCT_DATA':
        console.log('处理GET_PRODUCT_DATA消息');
        handleProductDataRequest(request, sender, sendResponse);
        return true;
        
      case 'COPY_BRAND_AND_URL':
        console.log('处理COPY_BRAND_AND_URL消息');
        handleCopyBrandAndUrlRequest(request, sender, sendResponse);
        return true;
        
      case 'SHOW_COLORS':
        console.log('处理SHOW_COLORS消息');
        handleShowColorsRequest(request, sender, sendResponse);
        return true;
        
      case 'DOWNLOAD_DATA':
        console.log('处理DOWNLOAD_DATA消息');
        handleDownloadRequest(request, sender, sendResponse);
        return true;
        
      case 'API_REQUEST':
        console.log('处理API_REQUEST消息');
        (async () => {
          try {
            await handleApiRequest(request, sender, sendResponse);
          } catch (error) {
            console.error('API_REQUEST处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'API_REQUEST处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'GET_ACTIVE_TAB':
        console.log('处理GET_ACTIVE_TAB消息');
        handleGetActiveTab(request, sender, sendResponse);
        return true;
        
      case 'register':
        console.log('处理register消息');
        (async () => {
          try {
            console.log('调用userRegister函数');
            const result = await userRegister(request.username, request.password);
            console.log('userRegister返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('register处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'register处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'login':
        console.log('处理login消息');
        (async () => {
          try {
            console.log('调用userLogin函数');
            const result = await userLogin(request.username, request.password);
            console.log('userLogin返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('login处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'login处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'queryAllData':
        console.log('处理queryAllData消息');
        (async () => {
          try {
            const result = await queryAllData();
            sendResponse(result);
          } catch (error) {
            console.error('queryAllData处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'queryAllData处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'getUserDatabaseData':
        console.log('处理getUserDatabaseData消息');
        (async () => {
          try {
            let username = request.username;
            // 如果没有提供username，从chrome.storage.local获取登录状态
            if (!username && request.getLoggedInUser) {
              const storageResult = await new Promise((resolve) => {
                chrome.storage.local.get('loggedInUser', resolve);
              });
              if (storageResult.loggedInUser) {
                username = storageResult.loggedInUser.username;
              }
            }
            
            if (!username) {
              sendResponse({
                code: 401,
                status: 'error',
                message: '未找到登录用户'
              });
              return;
            }
            
            const result = await getUserDatabaseData(username);
            console.log('getUserDatabaseData返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('getUserDatabaseData处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'getUserDatabaseData处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'addUserDatabaseData':
        console.log('处理addUserDatabaseData消息');
        (async () => {
          try {
            let username = request.username;
            // 如果没有提供username，从chrome.storage.local获取登录状态
            if (!username) {
              const storageResult = await new Promise((resolve) => {
                chrome.storage.local.get('loggedInUser', resolve);
              });
              if (storageResult.loggedInUser) {
                username = storageResult.loggedInUser.username;
              }
            }
            
            if (!username) {
              sendResponse({
                code: 401,
                status: 'error',
                message: '未找到登录用户'
              });
              return;
            }
            
            const result = await addUserDatabaseData(username, request.personal_name, request.personal_acc, request.personal_pw);
            console.log('addUserDatabaseData返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('addUserDatabaseData处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'addUserDatabaseData处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'deleteUserDatabaseData':
        console.log('处理deleteUserDatabaseData消息');
        (async () => {
          try {
            let username = request.username;
            // 如果没有提供username，从chrome.storage.local获取登录状态
            if (!username) {
              const storageResult = await new Promise((resolve) => {
                chrome.storage.local.get('loggedInUser', resolve);
              });
              if (storageResult.loggedInUser) {
                username = storageResult.loggedInUser.username;
              }
            }
            
            if (!username) {
              sendResponse({
                code: 401,
                status: 'error',
                message: '未找到登录用户'
              });
              return;
            }
            
            const result = await deleteUserDatabaseData(username, request.personal_name, request.personal_acc);
            console.log('deleteUserDatabaseData返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('deleteUserDatabaseData处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'deleteUserDatabaseData处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      default:
        console.error('未知消息类型:', msgType);
        sendResponse({
          code: 400,
          status: 'error',
          message: '未知错误请审查',
          receivedType: msgType
        });
        return true;
    }
  } catch (error) {
    console.error('消息处理异常:', error);
    sendResponse({
      code: 500,
      status: 'error',
      message: '消息处理异常: ' + error.message,
      error: error.message,
      stack: error.stack
    });
    return true;
  } finally {
    console.log('=== 消息处理结束 ===');
  }
  
  return true;
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

