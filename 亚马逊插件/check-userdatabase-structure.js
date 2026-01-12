// 检查 userdatabase 表的实际结构
const { createClient } = require('@supabase/supabase-js');

// 使用正确的 Supabase 配置
const SUPABASE_CONFIG = {
  url: "https://xarrfzqxwpuurjrsaant.supabase.co",
  key: "sb_secret_HH69MF3MkF6z46Oof0b8Iw_F164QI-f"
};

const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.key
);

// 检查表结构和数据
async function checkUserdatabaseStructure() {
  console.log('开始检查 userdatabase 表结构...');
  
  try {
    // 1. 查询表数据，查看实际字段
    console.log('\n1. 查询表数据，查看实际字段...');
    const { data: tableData, error: tableError } = await supabase
      .from('userdatabase')
      .select('*')
      .limit(5);
    
    if (tableError) {
      console.error('✗ 查询表数据失败:', tableError.message);
      return false;
    }
    
    console.log('✓ 查询到表数据:', tableData);
    
    if (tableData && tableData.length > 0) {
      console.log('\n2. 表字段列表:');
      const fields = Object.keys(tableData[0]);
      fields.forEach(field => {
        console.log(`   - ${field}`);
      });
    }
    
    // 3. 检查 account 表和 userdatabase 表的关系
    console.log('\n3. 检查 account 表和 userdatabase 表的关系...');
    const { data: relationData, error: relationError } = await supabase
      .from('account')
      .select(`
        *, 
        userdatabase (*)
      `)
      .eq('user', '12345')
      .single();
    
    if (relationError) {
      console.error('✗ 检查关联关系失败:', relationError.message);
    } else {
      console.log('✓ 关联关系查询结果:', relationData);
    }
    
    return true;
    
  } catch (error) {
    console.error('✗ 执行异常:', error.message);
    console.error('异常堆栈:', error.stack);
    return false;
  }
}

// 运行检查
checkUserdatabaseStructure()
  .then(success => {
    if (success) {
      console.log('\n✅ 表结构检查完成!');
    } else {
      console.log('\n❌ 表结构检查失败');
    }
  });
