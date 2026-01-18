// 后台服务工作线程
chrome.runtime.onInstalled.addListener(() => {
  console.log('亚马逊插件已安装');
  // 设置插件图标
chrome.action.setBadgeText({ text: '' });

// 检测快捷键是否正确注册
async function checkShortcutRegistration() {
  try {
    const commands = await chrome.commands.getAll();
    console.log('所有注册的命令:', commands);
    
    const promptSearchCommand = commands.find(cmd => cmd.name === 'open-search');
    if (promptSearchCommand) {
      console.log('提示词搜索快捷键注册信息:', promptSearchCommand);
      if (promptSearchCommand.shortcut) {
        console.log('快捷键已成功注册:', promptSearchCommand.shortcut);
      } else {
        console.warn('快捷键命令已注册，但未设置快捷键（可能存在冲突）');
        
        // 尝试提示用户手动设置快捷键（但不依赖通知API）
        console.warn('请在扩展管理页面手动设置快捷键 Ctrl+Shift+M 以打开提示词搜索界面。');
      }
    } else {
      console.error('提示词搜索快捷键命令未注册');
      
      // 尝试提示用户手动设置快捷键（但不依赖通知API）
      console.warn('请在扩展管理页面手动设置快捷键 Ctrl+Shift+M 以打开提示词搜索界面。');
    }
  } catch (error) {
    console.error('检测快捷键注册时出错:', error);
  }
}

// 扩展安装或更新时检测快捷键
chrome.runtime.onInstalled.addListener((details) => {
  console.log('扩展已安装/更新:', details);
  checkShortcutRegistration();
});

// 扩展启动时检测快捷键
checkShortcutRegistration();
});

// 处理快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  console.log('收到快捷键命令:', command);
  
  if (command === 'open-search') {
    try {
      // 获取当前活动标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('当前活动标签页:', tabs);
      
      if (tabs.length === 0) {
        console.error('未找到活动标签页');
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '提示词搜索',
          message: '未找到活动标签页，请尝试在浏览器窗口中使用。'
        });
        return;
      }
      
      const activeTab = tabs[0];
      if (!activeTab.id) {
        console.error('活动标签页没有ID');
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '提示词搜索',
          message: '标签页ID无效，请刷新页面后重试。'
        });
        return;
      }
      
      console.log('向标签页发送消息，标签页ID:', activeTab.id, 'URL:', activeTab.url);
      
      // 向内容脚本发送消息，支持 force 参数以忽略输入框限制
      const response = await chrome.tabs.sendMessage(activeTab.id, { 
        type: 'open-prompt-search',
        action: 'open-prompt-search',
        force: true // 强制唤醒，忽略输入框限制
      });
      
      console.log('收到内容脚本的响应:', response);
      
      // 如果内容脚本没有响应，可能是因为它没有加载
      if (!response) {
        console.warn('未收到内容脚本的响应，可能content script没有在该页面加载');
        
        // 检查当前页面是否是亚马逊页面
        if (activeTab.url && activeTab.url.includes('amazon')) {
          // 尝试注入content script
          console.log('尝试手动注入content script到页面:', activeTab.url);
          try {
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content-scripts/main.js']
            });
            console.log('content script注入成功！');
            
            // 等待一小段时间让脚本加载
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 再次尝试发送消息
            const secondResponse = await chrome.tabs.sendMessage(activeTab.id, { 
              type: 'open-prompt-search',
              action: 'open-prompt-search',
              force: true
            });
            
            console.log('注入后收到的响应:', secondResponse);
            
            if (secondResponse) {
              console.log('提示词搜索界面已成功打开！');
            } else {
              console.warn('注入脚本后仍未收到响应');
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '提示词搜索',
                message: '已注入脚本，但仍无法唤醒，请刷新页面后重试。'
              });
            }
          } catch (injectError) {
            console.error('注入content script时出错:', injectError);
            console.error('错误详情:', JSON.stringify(injectError, Object.getOwnPropertyNames(injectError)));
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: '提示词搜索',
              message: '无法注入脚本，请检查页面权限。'
            });
          }
        } else {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: '提示词搜索',
            message: '请在亚马逊网站上使用此功能。'
          });
        }
      }
    } catch (error) {
      console.error('处理快捷键命令时出错:', error);
      console.error('错误堆栈:', error.stack);
      
      // 根据错误类型显示不同的通知
      let errorMessage = '无法在当前页面唤醒提示词搜索功能';
      
      if (error.message.includes('Could not establish connection')) {
        errorMessage = '未找到内容脚本，请刷新页面或确保在亚马逊网站上使用。';
      } else if (error.message.includes('No tab with id')) {
        errorMessage = '标签页不存在，请刷新页面后重试。';
      }
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '提示词搜索',
        message: errorMessage
      });
    }
  }
});

// 支持从插件图标点击唤醒
try {
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      // 向当前标签页发送消息，强制唤醒提示词搜索界面
      await chrome.tabs.sendMessage(tab.id, { 
        type: 'open-prompt-search',
        action: 'open-prompt-search',
        force: true
      });
      console.log('通过插件图标点击唤醒提示词搜索界面');
    }
  });
} catch (error) {
  console.error('设置插件图标点击事件时出错:', error);
}

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

// 7. 封装获取用户书签数据的请求函数
async function getUserBookmarkData(username) {
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

    // 然后查询该用户的书签数据，使用account_id进行筛选
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/bookmark?account_id=eq.${userId}`, {
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
        errorMessage = errorData.message || `查询书签数据失败：${response.status}`;
      } catch {
        errorMessage = `查询书签数据失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空数组
    let data = [];
    try {
      data = await response.json();
    } catch {
      console.log("查询书签数据成功，但响应体为空");
    }
    
    console.log("查询书签数据成功：", data);
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `查询书签数据成功！共 ${data.length} 条数据`,
      data: data
    };
  } catch (error) {
    console.error("查询书签数据异常：", error);
    return { code: 500, status: 'error', msg: `查询书签数据失败：${error.message}` };
  }
}

// 8. 封装添加用户书签数据的请求函数
async function addUserBookmarkData(username, linkname, link) {
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

    // 检查是否已存在相同的书签，避免重复添加
    const existingBookmarkResponse = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/bookmark?account_id=eq.${userId}&link=eq.${encodeURIComponent(link)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_CONFIG.key,
          "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
        }
      }
    );

    if (!existingBookmarkResponse.ok) {
      throw new Error(`检查书签存在性失败：${existingBookmarkResponse.status}`);
    }

    const existingBookmarks = await existingBookmarkResponse.json();
    if (existingBookmarks && existingBookmarks.length > 0) {
      // 已存在相同的书签，直接返回成功，避免重复添加
      console.log("书签已存在，无需重复添加：", existingBookmarks[0]);
      return { 
        code: 200, 
        status: 'success', 
        msg: `书签已存在，无需重复添加！`,
        data: existingBookmarks[0]
      };
    }

    // 然后添加关联的书签数据，只包含数据库表中实际存在的字段
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/bookmark`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify({
        linkname: linkname,
        link: link,
        account_id: userId // 设置为用户的account.id，满足外键约束
      })
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `添加书签数据失败：${response.status}`;
      } catch {
        errorMessage = `添加书签数据失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空对象
    let data = {};
    try {
      data = await response.json();
    } catch {
      console.log("添加书签数据成功，但响应体为空");
      // 当响应体为空时，尝试获取刚添加的书签
      const newBookmarkResponse = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/bookmark?account_id=eq.${userId}&link=eq.${encodeURIComponent(link)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_CONFIG.key,
            "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
          }
        }
      );
      
      if (newBookmarkResponse.ok) {
        const newBookmarks = await newBookmarkResponse.json();
        if (newBookmarks && newBookmarks.length > 0) {
          data = newBookmarks[0];
          console.log("通过查询获取到新添加的书签：", data);
        }
      }
    }
    
    console.log("添加书签数据成功：", data);
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `添加书签数据成功！`,
      data: data
    };
  } catch (error) {
    console.error("添加书签数据异常：", error);
    return { code: 500, status: 'error', msg: `添加书签数据失败：${error.message}` };
  }
}

// 9. 封装删除用户书签数据的请求函数
async function deleteUserBookmarkData(username, linkname, link) {
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

    // 然后删除关联的书签数据，使用account_id、linkname和link进行筛选
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/bookmark?account_id=eq.${userId}&linkname=eq.${encodeURIComponent(linkname)}&link=eq.${encodeURIComponent(link)}`, {
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
        errorMessage = errorData.message || `删除书签数据失败：${response.status}`;
      } catch {
        errorMessage = `删除书签数据失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    console.log("删除书签数据成功");
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `删除书签数据成功！`
    };
  } catch (error) {
    console.error("删除书签数据异常：", error);
    return { code: 500, status: 'error', msg: `删除书签数据失败：${error.message}` };
  }
}

// 10. 封装更新用户书签数据的请求函数
async function updateUserBookmarkData(username, oldLinkname, oldLink, newLinkname, newLink) {
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

    // 然后更新关联的书签数据，使用account_id、oldLinkname和oldLink进行筛选
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/bookmark?account_id=eq.${userId}&linkname=eq.${encodeURIComponent(oldLinkname)}&link=eq.${encodeURIComponent(oldLink)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify({
        linkname: newLinkname,
        link: newLink
      })
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `更新书签数据失败：${response.status}`;
      } catch {
        errorMessage = `更新书签数据失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    console.log("更新书签数据成功");
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `更新书签数据成功！`
    };
  } catch (error) {
    console.error("更新书签数据异常：", error);
    return { code: 500, status: 'error', msg: `更新书签数据失败：${error.message}` };
  }
}



// 12. 封装修改用户密码的请求函数
async function changePassword(username, oldPassword, newPassword) {
  try {
    // 首先验证旧密码是否正确
    const loginResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/account?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(oldPassword)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });

    if (!loginResponse.ok) {
      throw new Error(`旧密码验证失败：${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    if (!loginData || loginData.length === 0) {
      throw new Error(`旧密码错误`);
    }

    const userId = loginData[0].id;

    // 更新密码
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/account?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify({
        password: newPassword
      })
    });

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `修改密码失败：${response.status}`;
      } catch {
        errorMessage = `修改密码失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    console.log("密码修改成功：", userId);
    return {
      code: 200,
      status: 'success',
      msg: `密码修改成功！`
    };
  } catch (error) {
    console.error("修改密码异常：", error);
    return {
      code: 500,
      status: 'error',
      msg: `修改密码失败：${error.message}`
    };
  }
}

// 13. 封装添加浏览器书签的请求函数
async function addBrowserBookmark(title, url) {
  try {
    console.log('添加到浏览器书签栏:', title, url);
    
    // 检查chrome.bookmarks API是否可用
    if (!chrome || !chrome.bookmarks) {
      throw new Error('浏览器书签API不可用，可能是权限未设置或浏览器不支持');
    }
    
    // 先获取书签栏的实际ID，避免硬编码
    const bookmarkBarId = await new Promise((resolve, reject) => {
      if (!chrome.bookmarks.getTree) {
        reject(new Error('浏览器书签API不支持getTree方法'));
        return;
      }
      
      chrome.bookmarks.getTree((tree) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        // 遍历书签树，找到书签栏（考虑不同语言环境）
        const findBookmarkBar = (nodes) => {
          for (const node of nodes) {
            // 支持中文和英文书签栏名称
            if (node.title === '书签栏' || node.title === 'Bookmarks bar') {
              return node.id;
            }
            if (node.children) {
              const found = findBookmarkBar(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const barId = findBookmarkBar(tree);
        if (!barId) {
          // 如果找不到书签栏，使用默认的书签栏ID或不指定parentId
          // 不指定parentId会添加到默认位置
          resolve(null);
          return;
        }
        resolve(barId);
      });
    });
    
    // 准备创建书签的参数
    const createParams = {
      title: title,
      url: url
    };
    
    // 只有当找到书签栏ID时才添加parentId
    if (bookmarkBarId) {
      createParams.parentId = bookmarkBarId;
    }
    
    // 使用chrome.bookmarks API添加书签
    const bookmark = await new Promise((resolve, reject) => {
      if (!chrome.bookmarks.create) {
        reject(new Error('浏览器书签API不支持create方法'));
        return;
      }
      
      chrome.bookmarks.create(createParams, (bookmark) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(bookmark);
      });
    });
    
    console.log('已成功添加到浏览器书签栏:', bookmark);
    return {
      status: 'success',
      bookmark: bookmark
    };
  } catch (error) {
    console.error('添加到浏览器书签栏失败:', error);
    return {
      status: 'error',
      error: error.message
    };
  }
}

// 14. 封装获取用户提示词的请求函数
async function getUserPrompts(username) {
  try {
    console.log('=== getUserPrompts函数开始 ===');
    console.log('传入的username:', username);
    
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

    // 然后查询该用户的提示词数据，使用account_id进行筛选
    // 明确指定要返回的字段，确保包括pin字段
    const fields = 'id,promptname,description,type,created_at,updatedAt,pin';
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt?account_id=eq.${userId}&select=${fields}`, {
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
        errorMessage = errorData.message || `查询提示词数据失败：${response.status}`;
      } catch {
        errorMessage = `查询提示词数据失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空数组
    let data = [];
    try {
      data = await response.json();
    } catch (error) {
      console.error("解析提示词数据失败：", error);
      console.log("查询提示词数据成功，但响应体格式不正确");
    }
    
    console.log("查询提示词数据成功：", data);
    console.log("每个提示词的pin字段信息：");
    data.forEach((prompt, index) => {
      console.log(`提示词 ${index + 1}: id=${prompt.id}, pin=${prompt.pin}, type=${typeof prompt.pin}`);
    });
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `查询提示词数据成功！共 ${data.length} 条数据`,
      data: data
    };
  } catch (error) {
    console.error("查询提示词数据异常：", error);
    return { code: 500, status: 'error', msg: `查询提示词数据失败：${error.message}` };
  }
}

// 15. 封装添加提示词的请求函数
async function addPrompt(prompt) {
  try {
    // 首先获取用户的ID
    const accountResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/account?username=eq.${encodeURIComponent(prompt.username)}`, {
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

    // 然后添加提示词数据，只保存数据库表中存在的字段
    
    // 现在前端直接发送pin字段，与Supabase对应
    console.log('添加提示词时接收到的prompt对象:', prompt);
    console.log('添加提示词时接收到的pin字段值:', prompt.pin, '类型:', typeof prompt.pin);
    
    // 将pin字段转换为字符串类型的"1"或"0"，以兼容后端的text属性
    const pinValue = prompt.pin === true || prompt.pin === 'true' || prompt.pin === 1 || prompt.pin === '1' ? '1' : '0';
    console.log('转换前的pin值:', prompt.pin, '类型:', typeof prompt.pin);
    console.log('转换后的数值:', pinValue, '类型:', typeof pinValue);
    
    // 构建标准的JSON对象
    const requestBody = {
      promptname: prompt.promptname,
      description: prompt.description,
      type: prompt.type || 'text',
      account_id: userId,
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pin: pinValue
    };
    
    console.log('=== 发送API请求开始 (添加提示词) ===');
    console.log('请求URL:', `${SUPABASE_CONFIG.url}/rest/v1/prompt`);
    console.log('请求方法:', "POST");
    console.log('请求头部:', {
      "Content-Type": "application/json",
      "apikey": "[REDACTED]",
      "Authorization": "Bearer [REDACTED]"
    });
    console.log('请求体:', requestBody);
    console.log('pin字段类型:', typeof requestBody.pin);
    console.log('pin字段值:', requestBody.pin);
    console.log('=== 发送API请求结束 ===');
    
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('=== API响应开始 ===');
    console.log('响应状态码:', response.status);
    console.log('响应状态文本:', response.statusText);
    console.log('响应头部:', Object.fromEntries(response.headers));
    console.log('=== API响应结束 ===');

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        console.error('添加提示词API错误详情:', errorData);
        console.error('错误状态码:', response.status);
        console.error('请求URL:', response.url);
        console.error('请求体:', JSON.stringify({
          promptname: prompt.promptname,
          description: prompt.description,
          type: prompt.type || 'text',
          account_id: userId,
          created_at: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pin: pinValue
        }));
        errorMessage = errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errorMessage = response.statusText;
        console.error('添加提示词API请求失败:', response.status, response.statusText);
      }
      throw new Error(`添加提示词失败：${response.status} ${errorMessage}`);
    }

    // 处理不同响应情况
    let data = {};
    // 检查是否有响应体
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
      // 204 No Content 或没有JSON响应体
      console.log("添加提示词成功，响应体为空或非JSON格式");
    } else {
      // 尝试解析响应数据
      try {
        data = await response.json();
        console.log("添加提示词成功：", data);
      } catch (error) {
        console.error("解析响应数据失败：", error);
        // 即使解析失败，也认为添加成功，因为状态码是成功的
        console.log("添加提示词成功，但响应体格式不正确");
      }
    }
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `添加提示词成功！`,
      data: data
    };
  } catch (error) {
    console.error("添加提示词异常：", error);
    return { code: 500, status: 'error', msg: `添加提示词失败：${error.message}` };
  }
}

// 16. 封装更新提示词的请求函数
async function updatePrompt(prompt) {
  try {
    console.log('=== updatePrompt函数开始 ===');
    console.log('传入的prompt数据:', prompt);
    console.log('pin状态:', prompt.pin, '类型:', typeof prompt.pin);
    console.log('准备保存到数据库的pin字段:', prompt.pin);
    
    // 记录完整的调用信息，包括调用栈
    const stackTrace = new Error().stack;
    console.log('updatePrompt函数调用栈:', stackTrace);
    
    // 确保只有记录所有者可以更新
    let userId = null;
    if (prompt.username) {
      // 首先获取用户的ID
      const accountResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/account?username=eq.${encodeURIComponent(prompt.username)}`, {
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

      userId = accountData[0].id;
      
      // 验证记录是否属于当前用户
      const checkResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt?id=eq.${prompt.id}&account_id=eq.${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_CONFIG.key,
          "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
        }
      });
      
      if (!checkResponse.ok) {
        console.error('验证记录归属失败，响应状态:', checkResponse.status, checkResponse.statusText);
        throw new Error('验证记录归属失败');
      }
      
      const checkData = await checkResponse.json();
      if (!checkData || checkData.length === 0) {
        console.error('记录不存在或不属于当前用户，记录ID:', prompt.id, '用户ID:', userId);
        throw new Error('无权更新此记录');
      }
    }
    
    // 然后更新提示词数据
    console.log('更新提示词的ID:', prompt.id, '类型:', typeof prompt.id);
    // 构建PATCH请求URL，包含account_id条件以确保安全
    let patchUrl = `${SUPABASE_CONFIG.url}/rest/v1/prompt?id=eq.${prompt.id}`;
    if (userId) {
      // 如果有userId，在URL中加入account_id条件
      patchUrl += `&account_id=eq.${userId}`;
    }
    console.log('完整的PATCH请求URL:', patchUrl);
    
    // 现在前端直接发送pin字段，与Supabase对应
    console.log('接收到的prompt对象:', prompt);
    console.log('接收到的pin字段值:', prompt.pin, '类型:', typeof prompt.pin);
    
    // 明确检查pin字段是否存在并确保是布尔类型
    const hasPinField = 'pin' in prompt;
    console.log('prompt对象是否包含pin字段:', hasPinField);
    
    // 将pin字段转换为字符串类型的"1"或"0"，以兼容后端的text属性
    const pinValue = prompt.pin === true || prompt.pin === 'true' || prompt.pin === 1 || prompt.pin === '1' ? '1' : '0';
    console.log('转换前的pin值:', prompt.pin, '类型:', typeof prompt.pin);
    console.log('转换后的数值:', pinValue, '类型:', typeof pinValue);
    
    // 构建简化的请求体，只包含必要的字段（pin和更新时间）
    const requestBody = {
      updatedAt: new Date().toISOString(),
      pin: pinValue
    };
    
    // 确保pin字段在JSON序列化中正确表示，即使它是false
    console.log('最终发送到数据库的请求体:', requestBody);
    console.log('请求体中pin字段值:', requestBody.pin, '类型:', typeof requestBody.pin);
    console.log('JSON.stringify后的请求体:', JSON.stringify(requestBody));
    
    console.log('构建的请求体:', requestBody);
    console.log('请求体中的pin字段:', requestBody.pin, '类型:', typeof requestBody.pin);
    
    console.log('=== 发送API请求开始 ===');
    console.log('请求URL:', patchUrl);
    console.log('请求方法:', "PATCH");
    console.log('请求头部:', {
      "Content-Type": "application/json",
      "apikey": "[REDACTED]",
      "Authorization": "Bearer [REDACTED]"
    });
    console.log('请求体:', requestBody);
    console.log('pin字段类型:', typeof requestBody.pin);
    console.log('pin字段值:', requestBody.pin);
    console.log('JSON.stringify后的请求体:', JSON.stringify(requestBody));
    console.log('=== 发送API请求结束 ===');
    
    const response = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('=== API响应开始 (更新提示词) ===');
    console.log('响应状态:', response.status);
    console.log('响应状态文本:', response.statusText);
    console.log('响应头部:', Object.fromEntries(response.headers));
    console.log('=== API响应结束 ===');
    
    console.log('=== API响应开始 ===');
    console.log('响应状态码:', response.status);
    console.log('响应状态文本:', response.statusText);
    console.log('响应头部:', Object.fromEntries(response.headers));
    console.log('=== API响应结束 ===');

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        console.error('更新提示词API错误详情:', errorData);
        console.error('错误状态码:', response.status);
        console.error('请求URL:', response.url);
        console.error('请求体:', JSON.stringify(requestBody));
        errorMessage = errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errorMessage = response.statusText;
        console.error('更新提示词API请求失败:', response.status, response.statusText);
        console.error('请求URL:', response.url);
        console.error('请求体:', JSON.stringify(requestBody));
      }
      console.error('更新pin字段失败:', pinValue);
      throw new Error(`更新提示词失败：${response.status} ${errorMessage}`);
    }
    
    // 处理不同响应情况
    let data = {};
    if (response.status === 204) {
      // 204 No Content - 更新成功但没有响应体
      console.log("更新提示词成功，响应体为空");
    } else {
      // 尝试解析响应数据
      try {
        data = await response.json();
        console.log("更新提示词成功：", data);
        console.log('响应数据中的pin字段:', data[0]?.pin, '类型:', typeof data[0]?.pin);
      } catch (error) {
        console.error("解析响应数据失败：", error);
        // 即使解析失败，也认为更新成功，因为状态码是200
        console.log("更新提示词成功，但响应体格式不正确");
      }
    }
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `更新提示词成功！`,
      data: data
    };
  } catch (error) {
    console.error("更新提示词异常：", error);
    return { code: 500, status: 'error', msg: `更新提示词失败：${error.message}` };
  }
}

// 17. 封装删除提示词的请求函数
async function deletePrompt(promptId, username = null) {
  try {
    // 确保只有记录所有者可以删除
    if (username) {
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
      
      // 验证记录是否属于当前用户
      const checkResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt?id=eq.${promptId}&account_id=eq.${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_CONFIG.key,
          "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
        }
      });
      
      const checkData = await checkResponse.json();
      if (!checkData || checkData.length === 0) {
        throw new Error(`记录不存在或不属于当前用户`);
      }
    }
    
    // 删除提示词数据
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt?id=eq.${promptId}`, {
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
        errorMessage = errorData.message || `删除提示词失败：${response.status}`;
      } catch {
        errorMessage = `删除提示词失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    console.log("删除提示词成功");
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `删除提示词成功！`
    };
  } catch (error) {
    console.error("删除提示词异常：", error);
    return { code: 500, status: 'error', msg: `删除提示词失败：${error.message}` };
  }
}

// 18. 封装获取提示词分类的请求函数
async function getCategories() {
  try {
    // 由于category表不存在，返回默认分类
    const defaultCategories = [
      { id: 'general', name: '通用', color: '#6366f1' },
      { id: 'marketing', name: '营销', color: '#10b981' },
      { id: 'content', name: '内容创作', color: '#f59e0b' },
      { id: 'coding', name: '编程', color: '#8b5cf6' },
      { id: 'other', name: '其他', color: '#6b7280' }
    ];
    
    console.log("返回默认分类列表：", defaultCategories);
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `查询分类数据成功！共 ${defaultCategories.length} 条数据`,
      data: defaultCategories
    };
  } catch (error) {
    console.error("获取分类数据异常：", error);
    return { code: 500, status: 'error', msg: `获取分类数据失败：${error.message}` };
  }
}

// 19. 封装添加提示词分类的请求函数
async function addCategory(category) {
  console.log('=== queryPinValues函数开始 ===');
  console.log('传入的username:', username);
  console.log('username类型:', typeof username);
  
  try {
    if (!username) {
      throw new Error('用户名不能为空');
    }
    
    console.log('开始查询用户ID...');
    
    // 首先获取用户的ID
    const accountUrl = `${SUPABASE_CONFIG.url}/rest/v1/account?username=eq.${encodeURIComponent(username)}`;
    console.log('查询用户URL:', accountUrl);
    
    const accountResponse = await fetch(accountUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });

    console.log('用户查询响应状态:', accountResponse.status, accountResponse.statusText);
    console.log('用户查询响应头:', Object.fromEntries(accountResponse.headers));
    
    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('用户查询失败，响应状态:', accountResponse.status);
      console.error('用户查询失败，响应文本:', errorText);
      throw new Error(`获取用户信息失败：HTTP ${accountResponse.status} - ${errorText}`);
    }

    const accountData = await accountResponse.json();
    console.log('用户查询响应数据:', accountData);
    console.log('用户数据长度:', accountData ? accountData.length : 0);
    
    if (!accountData || accountData.length === 0) {
      throw new Error(`用户不存在: ${username}`);
    }

    const userId = accountData[0].id;
    console.log('获取到的userId:', userId);
    console.log('userId类型:', typeof userId);

    if (!userId) {
      throw new Error('获取到的userId为空');
    }

    // 然后查询该用户的提示词数据，使用account_id进行筛选
    // 明确指定要返回的字段，确保包括pin字段
    const fields = 'id,promptname,description,type,created_at,updatedAt,pin';
    // 注意：userId需要转换为字符串
    const promptUrl = `${SUPABASE_CONFIG.url}/rest/v1/prompt?account_id=eq.${String(userId)}&select=${encodeURIComponent(fields)}`;
    console.log('查询提示词URL:', promptUrl);
    
    const response = await fetch(promptUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });

    console.log('提示词查询响应状态:', response.status, response.statusText);
    console.log('提示词查询响应头:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('提示词查询失败，响应状态:', response.status);
      console.error('提示词查询失败，响应文本:', errorText);
      
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || `查询提示词数据失败：${response.status}`;
      } catch {
        errorMessage = `查询提示词数据失败：${response.status} ${response.statusText} - ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空数组
    let data = [];
    try {
      const responseText = await response.text();
      console.log('响应文本长度:', responseText.length);
      console.log('响应文本前100字符:', responseText.substring(0, 100));
      data = JSON.parse(responseText);
      console.log('成功解析提示词数据，数量:', data.length);
    } catch (error) {
      console.error("解析提示词数据失败：", error);
      console.log("查询提示词数据成功，但响应体格式不正确");
    }
    
    console.log("查询提示词数据成功：", data);
    console.log("每个提示词的pin字段信息：");
    data.forEach((prompt, index) => {
      console.log(`提示词 ${index + 1}: id=${prompt.id}, pin=${prompt.pin}, type=${typeof prompt.pin}`);
    });
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `查询提示词数据成功！共 ${data.length} 条数据`,
      data: data
    };
  } catch (error) {
    console.error("查询提示词数据异常：", error);
    console.error("错误堆栈：", error.stack);
    return { 
      code: 400, 
      status: 'error', 
      msg: `查询失败：${error.message}`,
      error: error.toString(),
      stack: error.stack
    };
  }
}

// 20. 封装添加提示词分类的请求函数
async function addCategory(category) {
  try {
    // 添加分类数据
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/category`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify({
        name: category.name,
        description: category.description || '',
        color: category.color || '#6366f1',
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `添加分类失败：${response.status}`;
      } catch {
        errorMessage = `添加分类失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // 尝试解析响应数据，如果失败则使用空对象
    let data = {};
    try {
      data = await response.json();
    } catch {
      console.log("添加分类成功，但响应体为空");
    }
    
    console.log("添加分类成功：", data);
    
    return { 
      code: 200, 
      status: 'success', 
      msg: `添加分类成功！`,
      data: data
    };
  } catch (error) {
    console.error("添加分类异常：", error);
    return { code: 500, status: 'error', msg: `添加分类失败：${error.message}` };
  }
}

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
        
      case 'changePassword':
        console.log('处理changePassword消息');
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
            
            const result = await changePassword(username, request.oldPassword, request.newPassword);
            console.log('changePassword返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('changePassword处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'changePassword处理失败: ' + error.message
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
        
      case 'getUserBookmarkData':
        console.log('处理getUserBookmarkData消息');
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
            
            const result = await getUserBookmarkData(username);
            console.log('getUserBookmarkData返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('getUserBookmarkData处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'getUserBookmarkData处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'addUserBookmarkData':
        console.log('处理addUserBookmarkData消息');
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
            
            const result = await addUserBookmarkData(username, request.linkname, request.link);
            console.log('addUserBookmarkData返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('addUserBookmarkData处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'addUserBookmarkData处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'deleteUserBookmarkData':
        console.log('处理deleteUserBookmarkData消息');
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
            
            const result = await deleteUserBookmarkData(username, request.linkname, request.link);
            console.log('deleteUserBookmarkData返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('deleteUserBookmarkData处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'deleteUserBookmarkData处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'updateUserBookmarkData':
        console.log('处理updateUserBookmarkData消息');
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
            
            const result = await updateUserBookmarkData(
              username, 
              request.oldLinkname, 
              request.oldLink, 
              request.newLinkname, 
              request.newLink
            );
            console.log('updateUserBookmarkData返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('updateUserBookmarkData处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'updateUserBookmarkData处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'addBrowserBookmark':
        console.log('处理addBrowserBookmark消息');
        (async () => {
          try {
            const result = await addBrowserBookmark(request.title, request.url);
            console.log('addBrowserBookmark返回:', JSON.stringify(result));
            sendResponse(result);
          } catch (error) {
            console.error('addBrowserBookmark处理失败:', error);
            sendResponse({
              status: 'error',
              error: error.message
            });
          }
        })();
        return true;
        
      case 'getUserPrompts':
        console.log('处理getUserPrompts消息');
        (async () => {
          try {
            let username = request.username;
            if (!username) {
              const storageResult = await new Promise(resolve => chrome.storage.local.get('loggedInUser', resolve));
              username = storageResult.loggedInUser?.username;
            }
            if (!username) {
              sendResponse({ code: 401, status: 'error', message: '未找到登录用户' });
              return;
            }
            const result = await getUserPrompts(username);
            sendResponse(result);
          } catch (error) {
            console.error('getUserPrompts处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'getUserPrompts处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'testPinField':
        // 将testPinField消息转发给专门的监听器处理
        console.log('testPinField消息转发给专门的监听器处理');
        return false; // 返回false允许消息继续传递给下一个监听器
        
      case 'addPrompt':
        console.log('=== 处理addPrompt消息开始 ===');
        console.log('接收时间:', new Date().toISOString());
        console.log('完整的request对象:', request);
        console.log('request.prompt:', request.prompt);
        console.log('request.username:', request.username);
        console.log('=== pin字段检查 ===');
        console.log('request.prompt中的pin值:', request.prompt.pin);
        console.log('request.prompt中的pin类型:', typeof request.prompt.pin);
        console.log('request.prompt中是否包含pin属性:', 'pin' in request.prompt);
        console.log('pin值是否为数字:', typeof request.prompt.pin === 'number');
        console.log('pin值是否为1:', request.prompt.pin === 1);
        console.log('pin值是否为0:', request.prompt.pin === 0);
        console.log('JSON.stringify后的pin值:', JSON.stringify(request.prompt.pin));
        console.log('=== pin字段检查结束 ===');
        (async () => {
          try {
            let username = request.username;
            if (!username) {
              const storageResult = await new Promise(resolve => chrome.storage.local.get('loggedInUser', resolve));
              username = storageResult.loggedInUser?.username;
            }
            if (!username) {
              sendResponse({ code: 401, status: 'error', message: '未找到登录用户' });
              return;
            }
            const promptWithUsername = { ...request.prompt, username };
            console.log('准备添加的提示词数据:', promptWithUsername);
            const result = await addPrompt(promptWithUsername);
            sendResponse(result);
          } catch (error) {
            console.error('addPrompt处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'addPrompt处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'updatePrompt':
        console.log('处理updatePrompt消息');
        console.log('接收到的request.prompt:', request.prompt);
        console.log('接收到的request.username:', request.username);
        console.log('request.prompt中的pin值:', request.prompt.pin, '类型:', typeof request.prompt.pin);
        console.log('request.prompt中是否包含pin属性:', 'pin' in request.prompt);
        (async () => {
          try {
            // 将username合并到prompt对象中
            const promptWithUsername = {
              ...request.prompt,
              username: request.username
            };
            const result = await updatePrompt(promptWithUsername);
            sendResponse(result);
          } catch (error) {
            console.error('updatePrompt处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'updatePrompt处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'deletePrompt':
        console.log('处理deletePrompt消息');
        (async () => {
          try {
            const result = await deletePrompt(request.promptId, request.username);
            sendResponse(result);
          } catch (error) {
            console.error('deletePrompt处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'deletePrompt处理失败: ' + error.message
            });
          }
        })();
        return true;


        

      case 'getCategories':
        console.log('处理getCategories消息');
        (async () => {
          try {
            const result = await getCategories();
            sendResponse(result);
          } catch (error) {
            console.error('getCategories处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'getCategories处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'addCategory':
        console.log('处理addCategory消息');
        (async () => {
          try {
            const result = await addCategory(request.category);
            sendResponse(result);
          } catch (error) {
            console.error('addCategory处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'addCategory处理失败: ' + error.message
            });
          }
        })();
        return true;
        
      case 'EXTRACT_BRAND_URL':
        // 这个消息应该由content script处理，background.js忽略它
        console.log('EXTRACT_BRAND_URL消息由content script处理，background.js忽略');
        return false; // 返回false表示不处理这个消息，让它继续传递给content script
        


        console.log('接收到的username:', request.username);
        (async () => {
          try {
            if (!request.username) {
              sendResponse({
                code: 401,
                status: 'error',
                message: '用户名不能为空'
              });
              return;
            }
            const result = await queryPinValues(request.username);
            sendResponse(result);
          } catch (error) {
            console.error('queryPinValues处理失败:', error);
            sendResponse({
              code: 500,
              status: 'error',
              message: 'queryPinValues处理失败: ' + error.message
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

// 处理下载请求
function handleDownloadRequest(request, sender, sendResponse) {
  console.log('处理下载请求:', request);
  
  // 检查是否提供了数据
  if (!request.data || !request.filename) {
    console.error('下载请求缺少必要参数:', request);
    sendResponse({ status: 'error', message: '下载请求缺少必要参数' });
    return;
  }
  
  // 将数据转换为Blob对象
  const blob = new Blob([request.data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // 调用Chrome的下载API
  chrome.downloads.download({
    url: url,
    filename: request.filename,
    conflictAction: 'uniquify',
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('下载失败:', chrome.runtime.lastError);
      sendResponse({ status: 'error', message: '下载失败: ' + chrome.runtime.lastError.message });
      return;
    }
    
    console.log('下载开始，下载ID:', downloadId);
    sendResponse({ status: 'success', downloadId: downloadId });
  });
}

// 处理API请求
async function handleApiRequest(request, sender, sendResponse) {
  console.log('处理API请求:', request);
  
  // 检查必要参数
  if (!request.apiUrl) {
    sendResponse({
      code: 400,
      status: 'error',
      message: 'API请求缺少必要参数: apiUrl'
    });
    return;
  }
  
  // 检查是否为POST请求
  const isPostRequest = request.method && request.method.toUpperCase() === 'POST';
  
  // 构建请求选项
  const options = {
    method: request.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...request.headers
    },
    credentials: 'include' // 包含凭证（cookie等）
  };
  
  // 如果是POST请求，添加请求体
  if (isPostRequest && request.body) {
    options.body = JSON.stringify(request.body);
  }
  
  try {
    // 发送请求
    const response = await fetch(request.apiUrl, options);
    const data = await response.json();
    
    // 返回结果
    sendResponse({
      code: response.status,
      status: response.ok ? 'success' : 'error',
      data: data,
      message: response.ok ? '请求成功' : `请求失败: ${response.statusText}`
    });
  } catch (error) {
    console.error('API请求失败:', error);
    sendResponse({
      code: 500,
      status: 'error',
      message: 'API请求失败: ' + error.message
    });
  }
}

// 处理获取当前活动标签页请求
function handleGetActiveTab(request, sender, sendResponse) {
  console.log('处理获取当前活动标签页请求:', request);
  
  // 使用chrome.tabs.query获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('获取当前活动标签页失败:', chrome.runtime.lastError);
      sendResponse({
        code: 500,
        status: 'error',
        message: '获取当前活动标签页失败: ' + chrome.runtime.lastError.message
      });
      return;
    }
    
    if (tabs.length === 0) {
      sendResponse({
        code: 404,
        status: 'error',
        message: '未找到当前活动标签页'
      });
      return;
    }
    
    const activeTab = tabs[0];
    sendResponse({
      code: 200,
      status: 'success',
      data: {
        tabId: activeTab.id,
        url: activeTab.url,
        title: activeTab.title,
        favIconUrl: activeTab.favIconUrl
      }
    });
  });
}

// 监听键盘快捷键命令
chrome.commands.onCommand.addListener((command) => {
  console.log('收到键盘命令:', command);
  
  if (command === 'open-popup') {
    console.log('执行激活插件主页面');
    
    // 激活插件弹出页面
    chrome.action.openPopup();
  }
});

// 测试函数：为指定用户创建测试提示词，一半pin=1，一半pin=0
async function testPinField(username = 'xiajta') {
  console.log('=== 开始测试pin字段功能 (直接写入Supabase prompt表) ===');
  console.log('测试用户:', username);
  console.log('测试时间:', new Date().toISOString());
  
  // 获取用户信息，确保用户存在
  console.log('1. 获取用户信息...');
  const accountResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/account?username=eq.${encodeURIComponent(username)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_CONFIG.key,
      "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
    }
  });
  
  if (!accountResponse.ok) {
    const errorMsg = `获取用户信息失败：${accountResponse.status}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  const accountData = await accountResponse.json();
  if (!accountData || accountData.length === 0) {
    const errorMsg = `用户不存在：${username}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  const userId = accountData[0].id;
  console.log('获取用户成功:', username, '用户ID:', userId);
  
  // 创建测试数据，一半pin=1，一半pin=0
  const testPrompts = [
    // pin=1的测试数据
    { promptname: '测试提示词1', description: '这是第一个测试提示词，pin=1，直接写入prompt表', type: 'test', pin: '1' },
    { promptname: '测试提示词3', description: '这是第三个测试提示词，pin=1，直接写入prompt表', type: 'test', pin: '1' },
    { promptname: '测试提示词5', description: '这是第五个测试提示词，pin=1，直接写入prompt表', type: 'test', pin: '1' },
    { promptname: '测试提示词7', description: '这是第七个测试提示词，pin=1，直接写入prompt表', type: 'test', pin: '1' },
    { promptname: '测试提示词9', description: '这是第九个测试提示词，pin=1，直接写入prompt表', type: 'test', pin: '1' },
    // pin=0的测试数据
    { promptname: '测试提示词2', description: '这是第二个测试提示词，pin=0，直接写入prompt表', type: 'test', pin: '0' },
    { promptname: '测试提示词4', description: '这是第四个测试提示词，pin=0，直接写入prompt表', type: 'test', pin: '0' },
    { promptname: '测试提示词6', description: '这是第六个测试提示词，pin=0，直接写入prompt表', type: 'test', pin: '0' },
    { promptname: '测试提示词8', description: '这是第八个测试提示词，pin=0，直接写入prompt表', type: 'test', pin: '0' },
    { promptname: '测试提示词10', description: '这是第十个测试提示词，pin=0，直接写入prompt表', type: 'test', pin: '0' }
  ];
  
  console.log(`
2. 准备创建${testPrompts.length}个测试提示词`);
  console.log(`   - 其中pin='1'的数量: ${testPrompts.filter(p => p.pin === '1').length}`);
  console.log(`   - 其中pin='0'的数量: ${testPrompts.filter(p => p.pin === '0').length}`);
  console.log(`   - 目标表: ${SUPABASE_CONFIG.url}/rest/v1/prompt`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // 逐个添加测试提示词，直接写入Supabase的prompt表
  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    console.log(`
=== 3. 添加测试提示词 ${i + 1}/${testPrompts.length} ===`);
    console.log('提示词名称:', prompt.promptname);
    console.log('原始pin值:', prompt.pin, '类型:', typeof prompt.pin);
    console.log('目标用户ID:', userId);
    
    // 构建直接写入prompt表的请求体
    const requestBody = {
      promptname: prompt.promptname,
      description: prompt.description,
      type: prompt.type || 'text',
      account_id: userId,
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pin: prompt.pin // 直接使用字符串类型的"1"或"0"
    };
    
    console.log('构建的请求体:', requestBody);
    console.log('请求体中的pin值:', requestBody.pin, '类型:', typeof requestBody.pin);
    
    try {
      // 直接向Supabase的prompt表发送POST请求
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_CONFIG.key,
          "Authorization": `Bearer ${SUPABASE_CONFIG.key}`,
          "Prefer": "return=representation" // 请求返回创建的记录
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('响应状态:', response.status);
      console.log('响应状态文本:', response.statusText);
      
      if (response.ok) {
        // 获取创建的记录，验证是否成功写入
        const createdData = await response.json();
        console.log('✅ 提示词添加成功，返回数据:', createdData);
        
        if (createdData && createdData.length > 0) {
          console.log('   - 记录ID:', createdData[0].id);
          console.log('   - 写入的pin值:', createdData[0].pin, '类型:', typeof createdData[0].pin);
          console.log('   - 验证pin值:', createdData[0].pin === prompt.pin ? '正确' : '错误');
        }
        
        successCount++;
      } else {
        const errorData = await response.json().catch(err => ({ message: '无法解析错误响应' }));
        console.error('❌ 提示词添加失败:', errorData);
        errorCount++;
      }
    } catch (error) {
      errorCount++;
      console.error('❌ 提示词添加异常:', error.message);
      console.error('异常详情:', error);
    }
  }
  
  // 查询数据库，验证记录是否真实存在
  console.log('4. 查询数据库，验证记录是否存在...');
  const verifyResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt?account_id=eq.${userId}&type=eq.test&limit=20`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_CONFIG.key,
      "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
    }
  });
  
  let verifyCount = 0;
  if (verifyResponse.ok) {
    const verifyData = await verifyResponse.json();
    verifyCount = verifyData.length;
    console.log('✅ 数据库查询成功');
    console.log('   - 找到的测试提示词数量:', verifyCount);
    
    // 统计pin=1和pin=0的数量
    const pin1Count = verifyData.filter(p => p.pin === '1').length;
    const pin0Count = verifyData.filter(p => p.pin === '0').length;
    console.log('   - 其中pin=1的数量:', pin1Count);
    console.log('   - 其中pin=0的数量:', pin0Count);
  } else {
    console.error('❌ 数据库查询失败:', verifyResponse.status);
  }
  
  // 输出最终测试结果统计
  console.log('=== 5. 测试完成 ===');
  console.log('测试时间:', new Date().toISOString());
  console.log('总测试数量:', testPrompts.length);
  console.log('成功写入数量:', successCount);
  console.log('失败数量:', errorCount);
  console.log('数据库中找到的测试记录数量:', verifyCount);
  console.log('成功率:', ((successCount / testPrompts.length) * 100).toFixed(2) + '%');
  
  return { 
    success: successCount, 
    error: errorCount, 
    total: testPrompts.length,
    verified: verifyCount
  };
}

// 监听测试请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'testPinField') {
    console.log('收到测试pin字段的请求:', request);
    
    (async () => {
      try {
        const result = await testPinField(request.username || 'xiajta');
        sendResponse({ code: 200, status: 'success', data: result, message: '测试完成' });
      } catch (error) {
        console.error('测试pin字段失败:', error);
        sendResponse({ code: 500, status: 'error', message: '测试失败: ' + error.message });
      }
    })();
    
    return true; // 保持消息通道开放
  }
});