// frontend_diagnostic.js - 前端诊断脚本
// 这个脚本需要在Chrome扩展的前端环境中运行（比如popup.html或content script）

// 定义SUPABASE配置
const SUPABASE_CONFIG = {
  url: "https://xarrfzqxwpuurjrsaant.supabase.co",
  key: "sb_publishable_Q_tcn_K4HCXIriaMCm8_VQ_qtQYvit6"
};

// 诊断测试结果
const diagnosticResults = [];

// 添加测试结果
function addTestResult(testName, success, message) {
  diagnosticResults.push({
    testName,
    success,
    message,
    timestamp: new Date().toISOString()
  });
}

// 检查Chrome API是否可用
function checkChromeAPI() {
  console.log("=== 1. 检查Chrome API可用性 ===");
  
  try {
    if (typeof chrome !== 'undefined') {
      addTestResult("Chrome API可用", true, "Chrome API已加载");
      
      // 检查chrome.runtime
      if (chrome.runtime) {
        addTestResult("Chrome Runtime API", true, "chrome.runtime已加载");
      } else {
        addTestResult("Chrome Runtime API", false, "chrome.runtime不可用");
      }
      
      // 检查chrome.storage
      if (chrome.storage) {
        addTestResult("Chrome Storage API", true, "chrome.storage已加载");
      } else {
        addTestResult("Chrome Storage API", false, "chrome.storage不可用");
      }
    } else {
      addTestResult("Chrome API可用", false, "Chrome API未加载");
    }
  } catch (error) {
    addTestResult("Chrome API可用性检查", false, error.message);
  }
}

// 检查登录用户信息
async function checkLoggedInUser() {
  console.log("=== 2. 检查登录用户信息 ===");
  
  try {
    // 检查localStorage（普通网页环境）
    if (typeof localStorage !== 'undefined') {
      const loggedInUser = localStorage.getItem('loggedInUser');
      if (loggedInUser) {
        addTestResult("localStorage中的登录用户", true, `找到登录用户: ${JSON.parse(loggedInUser).username}`);
      } else {
        addTestResult("localStorage中的登录用户", false, "未找到登录用户");
      }
    } else {
      addTestResult("localStorage可用", false, "localStorage不可用");
    }
    
    // 检查chrome.storage.local（Chrome扩展环境）
    if (chrome && chrome.storage) {
      const storageResult = await new Promise(resolve => chrome.storage.local.get('loggedInUser', resolve));
      
      if (storageResult.loggedInUser) {
        const { username, token, email } = storageResult.loggedInUser;
        addTestResult("chrome.storage.local中的登录用户", true, `找到登录用户: ${username}`);
        console.log(`   - 用户名: ${username}`);
        console.log(`   - Token: ${token ? '已设置' : '未设置'}`);
        console.log(`   - 邮箱: ${email}`);
        
        return storageResult.loggedInUser;
      } else {
        addTestResult("chrome.storage.local中的登录用户", false, "未找到登录用户");
      }
    }
  } catch (error) {
    addTestResult("登录用户信息检查", false, error.message);
  }
  
  return null;
}

// 直接测试API调用
async function testApiDirectly(username) {
  console.log("=== 3. 直接测试API调用 ===");
  
  try {
    if (!username) {
      addTestResult("API测试", false, "未提供用户名");
      return;
    }
    
    // 直接从Supabase API获取用户信息
    console.log(`   - 使用用户名${username}查询用户信息`);
    const accountResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/account?username=eq.${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });
    
    if (!accountResponse.ok) {
      addTestResult("获取用户信息API", false, `API请求失败: ${accountResponse.status}`);
      return;
    }
    
    const accountData = await accountResponse.json();
    
    if (!accountData || accountData.length === 0) {
      addTestResult("获取用户信息API", false, "未找到用户");
      return;
    }
    
    const user = accountData[0];
    addTestResult("获取用户信息API", true, `成功获取用户信息: ${user.username} (ID: ${user.id})`);
    
    // 获取用户的提示词数据
    console.log(`   - 获取用户${user.username}的提示词数据`);
    const promptsResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/prompt?account_id=eq.${user.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_CONFIG.key,
        "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
      }
    });
    
    if (!promptsResponse.ok) {
      addTestResult("获取提示词API", false, `API请求失败: ${promptsResponse.status}`);
      return;
    }
    
    const promptsData = await promptsResponse.json();
    addTestResult("获取提示词API", true, `成功获取${promptsData.length}条提示词数据`);
    
    // 显示前3条提示词
    if (promptsData.length > 0) {
      console.log("   - 前3条提示词:");
      promptsData.slice(0, 3).forEach((prompt, index) => {
        console.log(`     ${index + 1}. ${prompt.promptname}`);
      });
    }
    
    return promptsData;
  } catch (error) {
    addTestResult("API测试", false, error.message);
  }
  
  return null;
}

// 测试消息传递
async function testMessagePassing() {
  console.log("=== 4. 测试消息传递 ===");
  
  try {
    if (!chrome || !chrome.runtime) {
      addTestResult("消息传递测试", false, "Chrome Runtime API不可用");
      return;
    }
    
    // 测试获取用户提示词
    console.log("   - 发送getUserPrompts消息");
    const getUserPromptsResult = await new Promise((resolve, reject) => {
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
    
    if (getUserPromptsResult.status === 'success' && getUserPromptsResult.data) {
      addTestResult("getUserPrompts消息传递", true, `成功获取${getUserPromptsResult.data.length}条提示词数据`);
      
      // 显示响应内容
      console.log("   - 响应数据:");
      console.log(`     状态: ${getUserPromptsResult.status}`);
      console.log(`     消息: ${getUserPromptsResult.msg}`);
      console.log(`     数据长度: ${getUserPromptsResult.data.length}`);
      
      // 显示前3条提示词
      if (getUserPromptsResult.data.length > 0) {
        console.log("   - 前3条提示词:");
        getUserPromptsResult.data.slice(0, 3).forEach((prompt, index) => {
          console.log(`     ${index + 1}. ${prompt.promptname}`);
        });
      }
      
      return getUserPromptsResult.data;
    } else {
      addTestResult("getUserPrompts消息传递", false, `失败: ${getUserPromptsResult.msg || getUserPromptsResult.message}`);
      console.log("   - 响应数据:", getUserPromptsResult);
    }
  } catch (error) {
    addTestResult("消息传递测试", false, error.message);
  }
  
  return null;
}

// 检查DOM元素
function checkDOM() {
  console.log("=== 5. 检查DOM元素 ===");
  
  try {
    // 检查prompt-list元素
    const promptList = document.querySelector('#prompt-list');
    if (promptList) {
      addTestResult("prompt-list元素", true, "找到#prompt-list元素");
      console.log(`   - prompt-list元素: ${promptList.outerHTML}`);
    } else {
      addTestResult("prompt-list元素", false, "未找到#prompt-list元素");
    }
    
    // 检查提示词管理器弹窗
    const promptManagerModal = document.querySelector('#prompt-manager-modal');
    if (promptManagerModal) {
      addTestResult("prompt-manager-modal元素", true, "找到#prompt-manager-modal元素");
      console.log(`   - 弹窗元素: ${promptManagerModal.outerHTML}`);
    } else {
      addTestResult("prompt-manager-modal元素", false, "未找到#prompt-manager-modal元素");
    }
  } catch (error) {
    addTestResult("DOM元素检查", false, error.message);
  }
}

// 检查promptManagerModule.js是否正确加载
function checkPromptManagerModule() {
  console.log("=== 6. 检查promptManagerModule.js加载 ===");
  
  try {
    // 检查是否存在promptManagerModule全局变量
    if (typeof promptManagerModule !== 'undefined') {
      addTestResult("promptManagerModule加载", true, "promptManagerModule已加载");
      console.log(`   - promptManagerModule: ${promptManagerModule}`);
    } else {
      addTestResult("promptManagerModule加载", false, "promptManagerModule未加载");
    }
  } catch (error) {
    addTestResult("promptManagerModule检查", false, error.message);
  }
}

// 执行完整诊断
async function runCompleteDiagnostic() {
  console.log("=== 开始前端环境诊断 ===");
  console.log(`诊断开始时间: ${new Date().toISOString()}`);
  console.log("========================\n");
  
  // 1. 检查Chrome API
  checkChromeAPI();
  
  // 2. 检查登录用户信息
  const loggedInUser = await checkLoggedInUser();
  
  // 3. 直接测试API调用
  if (loggedInUser?.username) {
    await testApiDirectly(loggedInUser.username);
  }
  
  // 4. 测试消息传递
  await testMessagePassing();
  
  // 5. 检查DOM元素
  checkDOM();
  
  // 6. 检查promptManagerModule.js加载
  checkPromptManagerModule();
  
  // 显示测试结果汇总
  showDiagnosticSummary();
}

// 显示诊断结果汇总
function showDiagnosticSummary() {
  console.log("\n========================");
  console.log("=== 诊断结果汇总 ===");
  console.log(`诊断结束时间: ${new Date().toISOString()}`);
  
  let totalTests = diagnosticResults.length;
  let passedTests = diagnosticResults.filter(result => result.success).length;
  let failedTests = totalTests - passedTests;
  
  console.log(`总计: ${totalTests} 个测试`);
  console.log(`通过: ${passedTests} 个测试`);
  console.log(`失败: ${failedTests} 个测试`);
  
  console.log("\n详细结果:");
  diagnosticResults.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    console.log(`${index + 1}. ${status} ${result.testName}: ${result.message}`);
  });
  
  console.log("\n========================");
  
  if (failedTests === 0) {
    console.log("🎉 所有测试通过！前端环境正常工作。");
  } else {
    console.log("❌ 有测试失败！请根据失败的测试结果检查问题。");
    
    // 提供修复建议
    const failedTestNames = diagnosticResults.filter(result => !result.success).map(result => result.testName);
    console.log("\n修复建议:");
    
    if (failedTestNames.includes("chrome.storage.local中的登录用户")) {
      console.log("- 问题: 未在chrome.storage.local中找到登录用户信息");
      console.log("- 建议: 重新登录扩展，确保登录信息被正确保存");
    }
    
    if (failedTestNames.includes("getUserPrompts消息传递")) {
      console.log("- 问题: 消息传递失败");
      console.log("- 建议: 检查background.js中的消息处理函数是否正确");
    }
    
    if (failedTestNames.includes("prompt-list元素")) {
      console.log("- 问题: 未找到#prompt-list元素");
      console.log("- 建议: 检查HTML结构是否正确");
    }
  }
}

// 执行诊断
runCompleteDiagnostic();

// 导出诊断函数（如果需要）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runCompleteDiagnostic,
    checkChromeAPI,
    checkLoggedInUser,
    testApiDirectly,
    testMessagePassing,
    checkDOM,
    checkPromptManagerModule
  };
}