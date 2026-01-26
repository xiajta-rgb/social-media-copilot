#!/usr/bin/env python3
"""
检查当前登录用户的账号和提示词关联情况
"""

import requests
import json

SUPABASE_URL = "https://xarrfzqxwpuurjrsaant.supabase.co"
SUPABASE_KEY = "sb_publishable_Q_tcn_K4HCXIriaMCm8_VQ_qtQYvit6"

headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def check_accounts():
    """检查所有账户"""
    print("\n" + "=" * 60)
    print("  检查账户表 (account)")
    print("=" * 60)
    
    url = f"{SUPABASE_URL}/rest/v1/account?select=*"
    response = requests.get(url, headers=headers)
    print(f"状态码: {response.status_code}")
    
    accounts = response.json()
    print(f"\n账户列表:")
    for acc in accounts:
        print(f"  ID: {acc['id']}")
        print(f"  username: {acc['username']}")
        print(f"  password: {acc['password']}")
        print()
    
    return accounts

def check_prompts_by_account(account_id):
    """根据account_id检查提示词"""
    print(f"\n" + "=" * 60)
    print(f"  检查 account_id={account_id} 的提示词")
    print("=" * 60)
    
    url = f"{SUPABASE_URL}/rest/v1/prompt?account_id=eq.{account_id}&select=*"
    response = requests.get(url, headers=headers)
    print(f"状态码: {response.status_code}")
    
    prompts = response.json()
    print(f"\n提示词数量: {len(prompts)}")
    for p in prompts:
        print(f"  ID: {p['id']}, 名称: {p['promptname']}, account_id: {p['account_id']}")
    
    return prompts

def check_all_prompts():
    """检查所有提示词"""
    print(f"\n" + "=" * 60)
    print("  检查所有提示词")
    print("=" * 60)
    
    url = f"{SUPABASE_URL}/rest/v1/prompt?select=*"
    response = requests.get(url, headers=headers)
    print(f"状态码: {response.status_code}")
    
    prompts = response.json()
    print(f"\n总提示词数量: {len(prompts)}")
    for p in prompts:
        print(f"  ID: {p['id']}, 名称: {p['promptname']}, account_id: {p['account_id']}")
    
    return prompts

def main():
    print("检查提示词和账户的关联情况...")
    
    # 1. 检查所有账户
    accounts = check_accounts()
    
    # 2. 检查所有提示词
    all_prompts = check_all_prompts()
    
    # 3. 为每个账户检查其提示词
    for acc in accounts:
        check_prompts_by_account(acc['id'])
    
    print("\n" + "=" * 60)
    print("  分析结论")
    print("=" * 60)
    
    if len(accounts) == 0:
        print("❌ 没有账户，需要先注册")
    elif len(all_prompts) == 0:
        print("❌ 数据库中没有提示词，需要添加")
    else:
        print(f"✅ 数据库中有 {len(accounts)} 个账户，{len(all_prompts)} 条提示词")
        print("\n可能的问题:")
        print("1. 你当前登录的用户名对应的账户ID不在提示词的account_id中")
        print("2. 需要确认你用哪个用户名登录")
        print("3. 或者需要把提示词的account_id改成你当前登录用户的account_id")

if __name__ == "__main__":
    main()
