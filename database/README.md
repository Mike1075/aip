# 🔐 数据库安全配置指南

## ⚠️ 当前安全状态

**重要**：当前数据库没有启用RLS安全策略，存在安全风险！

## 🚀 立即实施步骤

### 1. 登录Supabase控制台
- 访问：https://supabase.com/dashboard
- 进入您的AIP项目

### 2. 执行安全策略脚本

**在Supabase SQL编辑器中执行以下脚本：**

1. **首先执行**：`setup_rls.sql`
   - 启用RLS
   - 创建所有安全策略

2. **然后执行**：`fix_existing_users.sql` 
   - 修复用户数据关联
   - 添加自动触发器

### 3. 验证安全策略

执行以下查询验证RLS已启用：

```sql
-- 检查RLS状态
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- 检查策略数量
SELECT schemaname, tablename, count(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename;
```

## 🛡️ 安全策略说明

### 用户隔离原则
- 用户只能访问自己创建或参与的项目
- 任务和文档按项目成员权限隔离
- 聊天记录仅项目成员可见

### 权限级别
1. **项目创建者**：完全管理权限
2. **项目成员**：查看和编辑指定内容
3. **其他用户**：无法访问

## ❓ 常见问题

### Q: 需要Service Role Key吗？
**A: 不需要！** 
- 前端只使用Anon Key
- RLS策略自动处理权限控制
- Service Role Key仅用于管理任务

### Q: 现有测试数据怎么办？
**A: 开发阶段建议清空重建**
- 执行清空脚本
- 重新注册测试用户
- 数据将正确关联

### Q: 生产环境如何迁移？
**A: 谨慎操作**
1. 备份所有数据
2. 执行RLS脚本
3. 手动更新用户ID关联
4. 验证功能正常

## ✅ 完成后的效果

- ✅ 多租户数据完全隔离
- ✅ 用户只能看到自己的数据
- ✅ 前端应用安全可靠
- ✅ 无需Service Role Key暴露 