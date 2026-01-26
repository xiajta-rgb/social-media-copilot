// promptModule.js - 提示词管理模块，处理与账号关联的逻辑

// 配置Supabase信息
const SUPABASE_CONFIG = {
  url: "https://xarrfzqxwpuurjrsaant.supabase.co",
  // 使用可发布密钥（public key）
  key: "sb_publishable_Q_tcn_K4HCXIriaMCm8_VQ_qtQYvit6"
};

// Supabase API请求辅助函数
async function supabaseRequest(endpoint, method = 'GET', body = null, params = {}) {
  // 构建URL查询参数
  const queryParams = new URLSearchParams(params);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  // 构建完整URL
  const url = `${SUPABASE_CONFIG.url}/rest/v1/${endpoint}${queryString}`;
  
  console.log(`[Supabase] ${method} ${url}`); // 调试日志
  
  // 构建请求选项
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_CONFIG.key,
      "Authorization": `Bearer ${SUPABASE_CONFIG.key}`
    }
  };
  
  // 添加请求体
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    
    console.log(`[Supabase] 响应状态: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `请求失败：${response.status}`;
      } catch {
        errorMessage = `请求失败：${response.status} ${response.statusText}`;
      }
      console.error(`[Supabase] 请求失败: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    // 如果是DELETE请求，返回空响应
    if (method === 'DELETE') {
      return { status: 'success' };
    }
    
    // 尝试解析响应数据
    try {
      const data = await response.json();
      console.log(`[Supabase] 解析到数据条数: ${Array.isArray(data) ? data.length : '非数组'}`);
      return data;
    } catch (e) {
      console.log('[Supabase] 响应体为空或解析失败');
      return {};
    }
  } catch (error) {
    console.error('Supabase请求错误:', error);
    throw error;
  }
}

// 提示词相关操作
const promptDB = {
  // 添加提示词
  async addPrompt(prompt) {
    // 将应用字段转换为Supabase数据库字段
    const dbPrompt = {
      promptname: prompt.title,
      description: prompt.content,
      account_id: prompt.account_id,
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: prompt.type || 'text'
    };
    return supabaseRequest('prompt', 'POST', dbPrompt);
  },

  // 更新提示词
  async updatePrompt(prompt) {
    // 将应用字段转换为Supabase数据库字段
    const dbPrompt = {
      promptname: prompt.title,
      description: prompt.content,
      updatedAt: new Date().toISOString(),
      type: prompt.type || 'text'
    };
    return supabaseRequest(`prompt?id=eq.${prompt.id}`, 'PATCH', dbPrompt);
  },

  // 删除提示词
  async deletePrompt(id) {
    return supabaseRequest(`prompt?id=eq.${id}`, 'DELETE');
  },

  // 根据ID获取提示词
  async getPromptById(id) {
    const results = await supabaseRequest(`prompt?id=eq.${id}`, 'GET');
    if (results.length > 0) {
      // 将数据库字段转换为应用字段
      return this._convertFromSupabase(results[0]);
    }
    return null;
  },

  // 获取用户的所有提示词
  async getUserPrompts(accountId) {
    console.log('[getUserPrompts] 开始获取, accountId:', accountId);
    const results = await supabaseRequest('prompt', 'GET', null, {
      account_id: `eq.${accountId}`,
      order: 'created_at.desc'
    });
    console.log('[getUserPrompts] 获取到数据条数:', results?.length || 0);
    // 将数据库字段转换为应用字段
    return results.map(prompt => this._convertFromSupabase(prompt));
  },

  // 获取所有提示词
  async getAllPrompts() {
    const results = await supabaseRequest('prompt', 'GET', null, {
      order: 'created_at.desc'
    });
    // 将数据库字段转换为应用字段
    return results.map(prompt => this._convertFromSupabase(prompt));
  },

  // 搜索提示词
  async searchPrompts(accountId, searchTerm) {
    // 直接构建包含or条件的URL，因为URLSearchParams处理复杂条件时可能有问题
    const encodedSearchTerm = encodeURIComponent(`%${searchTerm}%`);
    const url = `prompt?account_id=eq.${accountId}&or=(promptname.ilike.${encodedSearchTerm},description.ilike.${encodedSearchTerm})&order=created_at.desc`;
    const results = await supabaseRequest(url, 'GET');
    // 将数据库字段转换为应用字段
    return results.map(prompt => this._convertFromSupabase(prompt));
  },

  // 将Supabase数据库字段转换为应用字段
  _convertFromSupabase(prompt) {
    return {
      id: prompt.id,
      title: prompt.promptname,
      content: prompt.description,
      account_id: prompt.account_id,
      type: prompt.type || 'text',
      created_at: prompt.created_at,
      updatedAt: prompt.updatedAt
    };
  }
};

// 生成唯一的提示词ID
function generatePromptId(title, content) {
  const timestamp = Date.now();
  const uniqueString = `${title.trim()}::${content.trim()}::${timestamp}`;
  const hash = Array.from(uniqueString).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  return `p${hash.toString(36)}`;
}

// 提示词数据模型
export class Prompt {
  constructor({
    id,
    title,
    content,
    account_id,
    type = 'text'
  }) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.account_id = account_id;
    this.type = type;
    this.created_at = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
}

// 分类数据模型
export class Category {
  constructor({
    id,
    name,
    description = '',
    color = '#6366f1',
    enabled = true
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.color = color;
    this.enabled = enabled;
    this.created_at = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
}

// 提示词管理核心类
export class PromptManager {
  constructor() {
    this.currentAccountId = null;
  }

  // 设置当前用户（使用account_id而不是username）
  setCurrentUser(accountId) {
    this.currentAccountId = accountId;
  }

  // 获取当前用户
  getCurrentUser() {
    return this.currentAccountId;
  }

  // 验证用户是否已设置
  _validateUser() {
    if (!this.currentAccountId) {
      throw new Error('未设置当前用户，请先登录');
    }
  }

  // ==================== 提示词相关方法 ====================

  // 添加提示词
  async addPrompt(promptData) {
    this._validateUser();
    // 转换字段名以匹配Supabase结构
    const formattedData = {
      ...promptData,
      account_id: this.currentAccountId
    };
    
    const prompt = new Prompt(formattedData);
    return await promptDB.addPrompt(prompt);
  }

  // 更新提示词
  async updatePrompt(promptData) {
    this._validateUser();
    const existingPrompt = await promptDB.getPromptById(promptData.id);
    if (!existingPrompt) {
      throw new Error('提示词不存在');
    }
    if (existingPrompt.account_id !== this.currentAccountId) {
      throw new Error('无权修改其他用户的提示词');
    }
    
    // 转换字段名以匹配Supabase结构
    const formattedData = {
      ...existingPrompt,
      ...promptData,
      updatedAt: new Date().toISOString()
    };
    
    return await promptDB.updatePrompt(formattedData);
  }

  // 删除提示词
  async deletePrompt(promptId) {
    this._validateUser();
    const existingPrompt = await promptDB.getPromptById(promptId);
    if (!existingPrompt) {
      throw new Error('提示词不存在');
    }
    if (existingPrompt.account_id !== this.currentAccountId) {
      throw new Error('无权删除其他用户的提示词');
    }
    return await promptDB.deletePrompt(promptId);
  }

  // 获取提示词详情
  async getPromptById(promptId) {
    this._validateUser();
    const prompt = await promptDB.getPromptById(promptId);
    if (!prompt) {
      throw new Error('提示词不存在');
    }
    if (prompt.account_id !== this.currentAccountId) {
      throw new Error('无权查看其他用户的提示词');
    }
    return prompt;
  }

  // 获取当前用户的所有提示词
  async getAllPrompts() {
    this._validateUser();
    return await promptDB.getUserPrompts(this.currentAccountId);
  }

  // 搜索提示词
  async searchPrompts(searchTerm) {
    this._validateUser();
    return await promptDB.searchPrompts(this.currentAccountId, searchTerm);
  }

  // ==================== 批量操作 ====================

  // 批量删除提示词
  async batchDeletePrompts(promptIds) {
    this._validateUser();
    const results = [];
    for (const id of promptIds) {
      try {
        await this.deletePrompt(id);
        results.push({ id, success: true });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return results;
  }

  // ==================== 变量解析 ====================

  // 解析提示词中的变量
  parseVariables(content) {
    const variableRegex = /{{(\s*\w+\s*)}}/g;
    const variables = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  // 替换提示词中的变量
  replaceVariables(content, variables) {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\s*${key}\s*}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  // ==================== 统计信息 ====================

  // 获取用户提示词统计
  async getPromptStats() {
    this._validateUser();
    const prompts = await this.getAllPrompts();

    return {
      total: prompts.length
    };
  }
}

// 创建单例实例
const promptManager = new PromptManager();

export default promptManager;
