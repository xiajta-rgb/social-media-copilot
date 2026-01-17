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
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt?account_id=eq.${userId}`, {
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
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify({
        promptname: prompt.promptname,
        description: prompt.description,
        type: prompt.type || 'text', // 设置默认类型
        account_id: userId,
        created_at: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `添加提示词失败：${response.status}`;
      } catch {
        errorMessage = `添加提示词失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
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
    // 然后更新提示词数据
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt?id=eq.${prompt.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      },
      body: JSON.stringify({
        promptname: prompt.promptname,
        description: prompt.description,
        updatedAt: new Date().toISOString(),
        type: prompt.type || 'text'
      })
    });

    if (!response.ok) {
      // 尝试获取错误信息，如果失败则使用默认信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `更新提示词失败：${response.status}`;
      } catch {
        errorMessage = `更新提示词失败：${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
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
async function deletePrompt(promptId) {
  try {
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
        
      case 'addPrompt':
        console.log('处理addPrompt消息');
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
            const result = await addPrompt({ ...request.prompt, username });
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
        (async () => {
          try {
            const result = await updatePrompt(request.prompt);
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
            const result = await deletePrompt(request.promptId);
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