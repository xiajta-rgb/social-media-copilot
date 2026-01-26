#!/usr/bin/env python3
"""
测试更新提示词 API
"""

import requests
from datetime import datetime

SUPABASE_URL = "https://xarrfzqxwpuurjrsaant.supabase.co"
SUPABASE_KEY = "sb_publishable_Q_tcn_K4HCXIriaMCm8_VQ_qtQYvit6"

headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def test_update_prompt(prompt_id, user_id):
    """测试更新提示词"""
    print(f"\n{'='*60}")
    print(f"  测试更新提示词 (ID: {prompt_id}, user_id: {user_id})")
    print('='*60)
    
    # 构建 PATCH 请求 URL
    # 使用 and 条件确保安全
    patchUrl = f"{SUPABASE_URL}/rest/v1/prompt?and(id=eq.{prompt_id},account_id=eq.{user_id})"
    print(f"\n请求URL: {patchUrl}")
    
    # 构建请求体
    requestBody = {
        "updatedAt": datetime.now().isoformat(),
        "pin": "0"
    }
    print(f"请求体: {requestBody}")
    
    # 发送请求
    print("\n发送请求...")
    response = requests.patch(patchUrl, headers=headers, json=requestBody)
    
    print(f"\n响应状态码: {response.status_code}")
    print(f"响应状态文本: {response.status_text}")
    print(f"响应头: {dict(response.headers)}")
    
    if response.status_code == 204:
        print("\n✅ 更新成功 (204 No Content)")
        return True
    else:
        try:
            error_data = response.json()
            print(f"\n❌ 更新失败: {error_data}")
        except:
            print(f"\n❌ 更新失败: {response.text}")
        return False

if __name__ == "__main__":
    # 测试更新提示词 73，user_id = 21
    success = test_update_prompt(73, 21)
    print(f"\n测试结果: {'成功' if success else '失败'}")
