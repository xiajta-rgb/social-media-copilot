#!/usr/bin/env python3
"""
Supabase 连接测试脚本
测试提示词(prompt)表的实际字段和通信情况
"""

import requests
import json
from datetime import datetime

# Supabase 配置 - 从扩展代码中复制
SUPABASE_URL = "https://xarrfzqxwpuurjrsaant.supabase.co"
SUPABASE_KEY = "sb_publishable_Q_tcn_K4HCXIriaMCm8_VQ_qtQYvit6"

headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def print_header(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def print_response(response):
    print(f"\n状态码: {response.status_code}")
    print(f"响应头: {dict(response.headers)}")
    try:
        data = response.json()
        print(f"响应体: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return data
    except json.JSONDecodeError:
        print(f"响应体(非JSON): {response.text}")
        return None

def test_account_table():
    """测试账户表"""
    print_header("测试账户表 (account)")
    
    url = f"{SUPABASE_URL}/rest/v1/account?select=*"
    response = requests.get(url, headers=headers)
    data = print_response(response)
    
    if data and len(data) > 0:
        print(f"\n字段列表: {list(data[0].keys())}")
        print(f"记录数量: {len(data)}")
    return data

def test_prompt_table():
    """测试提示词表"""
    print_header("测试提示词表 (prompt)")
    
    # 1. 先获取所有字段
    url = f"{SUPABASE_URL}/rest/v1/prompt?limit=1"
    response = requests.get(url, headers=headers)
    data = print_response(response)
    
    if data and len(data) > 0:
        print(f"\n字段列表: {list(data[0].keys())}")
    
    # 2. 尝试获取所有提示词
    url = f"{SUPABASE_URL}/rest/v1/prompt?select=*"
    response = requests.get(url, headers=headers)
    data = print_response(response)
    
    if data is not None:
        print(f"\n总记录数: {len(data) if isinstance(data, list) else 'N/A'}")
    
    return data

def test_prompt_with_specific_fields():
    """测试指定字段获取"""
    print_header("测试指定字段获取")
    
    # 注意：数据库字段名是驼峰命名 updatedAt，不是下划线命名 updated_at
    fields = "id,promptname,description,type,created_at,updatedAt,pin"
    url = f"{SUPABASE_URL}/rest/v1/prompt?select={fields}"
    response = requests.get(url, headers=headers)
    data = print_response(response)
    
    if data and len(data) > 0:
        print(f"\n字段验证: {list(data[0].keys())}")
    return data

def test_insert_prompt():
    """测试插入提示词"""
    print_header("测试插入提示词")
    
    url = f"{SUPABASE_URL}/rest/v1/prompt"
    
    test_data = {
        "promptname": "测试提示词",
        "description": f"这是一个测试提示词内容，更新于 {datetime.now().isoformat()}",
        "type": "text",
        "pin": "0",
        "updatedAt": datetime.now().isoformat()
    }
    
    print(f"\n请求体: {json.dumps(test_data, indent=2, ensure_ascii=False)}")
    
    response = requests.post(url, headers=headers, json=test_data)
    data = print_response(response)
    
    return response.status_code, data

def test_update_prompt(prompt_id):
    """测试更新提示词"""
    print_header(f"测试更新提示词 (ID: {prompt_id})")
    
    url = f"{SUPABASE_URL}/rest/v1/prompt?id=eq.{prompt_id}"
    
    update_data = {
        "description": f"更新于 {datetime.now().isoformat()}",
        "updatedAt": datetime.now().isoformat()
    }
    
    print(f"请求URL: {url}")
    print(f"请求体: {json.dumps(update_data, indent=2, ensure_ascii=False)}")
    
    response = requests.patch(url, headers=headers, json=update_data)
    print(f"\n状态码: {response.status_code}")
    print(f"响应头: {dict(response.headers)}")
    
    return response.status_code

def test_delete_prompt(prompt_id):
    """测试删除提示词"""
    print_header(f"测试删除提示词 (ID: {prompt_id})")
    
    url = f"{SUPABASE_URL}/rest/v1/prompt?id=eq.{prompt_id}"
    response = requests.delete(url, headers=headers)
    print(f"状态码: {response.status_code}")
    
    return response.status_code

def get_table_schema():
    """获取表的Schema信息"""
    print_header("获取表结构信息")
    
    # 这需要更高级的权限，这里尝试获取information_schema
    url = f"{SUPABASE_URL}/rest/v1/"
    response = requests.get(url, headers=headers)
    print(f"状态码: {response.status_code}")
    
    try:
        data = response.json()
        print(f"可用表: {json.dumps(data, indent=2, ensure_ascii=False)}")
    except:
        print(f"响应: {response.text}")

def main():
    print("\n" + "=" * 60)
    print("  Supabase API 连接测试")
    print("=" * 60)
    print(f"\nURL: {SUPABASE_URL}")
    print(f"Key: {SUPABASE_KEY[:20]}...")
    
    # 1. 测试账户表
    account_data = test_account_table()
    
    # 2. 测试提示词表
    prompt_data = test_prompt_table()
    
    # 3. 测试指定字段
    test_prompt_with_specific_fields()
    
    # 4. 如果有数据，测试更新
    if prompt_data and len(prompt_data) > 0:
        first_id = prompt_data[0].get('id')
        if first_id:
            test_update_prompt(first_id)
    
    # 5. 测试插入（可选）
    print("\n" + "=" * 60)
    print("  是否需要测试插入新记录? (y/n)")
    choice = input("> ")
    if choice.lower() == 'y':
        status, _ = test_insert_prompt()
        if status in [200, 201]:
            print("\n插入成功！重新获取数据...")
            test_prompt_table()
    
    print("\n" + "=" * 60)
    print("  测试完成!")
    print("=" * 60)

if __name__ == "__main__":
    main()
