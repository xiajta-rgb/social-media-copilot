#!/usr/bin/env python3
"""
直接测试 getUserPrompts 的查询逻辑
"""

import requests

SUPABASE_URL = "https://xarrfzqxwpuurjrsaant.supabase.co"
SUPABASE_KEY = "sb_publishable_Q_tcn_K4HCXIriaMCm8_VQ_qtQYvit6"

headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def test_get_user_prompts(username):
    """模拟 getUserPrompts 函数的行为"""
    print(f"\n{'='*60}")
    print(f"  测试 getUserPrompts('{username}')")
    print('='*60)
    
    # 1. 查询账户
    print("\n1. 查询账户信息...")
    accountUrl = f"{SUPABASE_URL}/rest/v1/account?username=eq.{username}"
    print(f"   URL: {accountUrl}")
    
    resp = requests.get(accountUrl, headers=headers)
    print(f"   状态: {resp.status_code}")
    
    accountData = resp.json()
    print(f"   结果: {accountData}")
    
    if not accountData or len(accountData) == 0:
        print("   ❌ 用户不存在")
        return
    
    userId = accountData[0]['id']
    print(f"   ✅ 获取到 userId: {userId}")
    
    # 2. 查询提示词
    print("\n2. 查询提示词...")
    # 注意：数据库字段名 created_at(下划线), updatedAt(驼峰)
    fields = 'id,promptname,description,type,created_at,updatedAt,pin'
    promptUrl = f"{SUPABASE_URL}/rest/v1/prompt?account_id=eq.{userId}&select={fields}"
    print(f"   URL: {promptUrl}")
    
    resp = requests.get(promptUrl, headers=headers)
    print(f"   状态: {resp.status_code}")
    
    data = resp.json()
    print(f"   提示词数量: {len(data)}")
    print(f"   数据: {data}")
    
    if len(data) > 0:
        print("\n✅ 查询成功！数据应该能正常显示")
    else:
        print("\n⚠️  查询成功但没有数据")
        print("   可能的问题:")
        print("   1. Chrome 扩展使用了缓存")
        print("   2. 扩展没有重新加载")
        print("   3. 登录状态存储有问题")

if __name__ == "__main__":
    # 测试 username = xiajta
    test_get_user_prompts("xiajta")
