# 🔧 N8N 查询 500 错误修复指南

## 🚨 问题诊断

### 当前问题
- **错误**: 500 Internal Server Error
- **原因**: UUID 查询参数处理问题
- **影响**: 无法从 PostgreSQL 返回组织智慧库内容

### 问题根源分析
1. **UUID 格式问题**: `00000000-0000-0000-0000-000000000000` 可能是测试数据
2. **参数传递问题**: n8n 中的 `$1` 参数可能类型不匹配
3. **数据不存在**: 数据库中可能没有对应的记录

## 🔍 调试步骤

### 步骤1: 检查数据库中的实际数据
在 Supabase SQL Editor 中运行：

```sql
-- 检查组织是否存在
SELECT id, name FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 检查组织智慧库文档是否存在
SELECT * FROM documents 
WHERE organization_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND title = '组织智慧库';
```

### 步骤2: 检查所有现有数据
```sql
-- 查看所有组织
SELECT id::text as org_id, name FROM organizations LIMIT 5;

-- 查看所有组织智慧库
SELECT organization_id::text as org_id, title, LENGTH(content) as content_size 
FROM documents WHERE title = '组织智慧库';
```

## 🛠️ N8N 修复方案

### 方案1: 修复 SQL 查询（推荐）

**当前有问题的查询**:
```sql
SELECT 
    content,
    title,
    '{{ $("1-Parse-Input-Parameters").item.json.organizationId }}' as organization_id,
    '{{ $("1-Parse-Input-Parameters").item.json.projectId }}' as project_id,
    '{{ $("1-Parse-Input-Parameters").item.json.userId }}' as user_id,
    id as document_id,
    created_at,
    updated_at
FROM documents
WHERE organization_id = $1
  AND title = '组织智慧库';
```

**修复后的查询**:
```sql
SELECT 
    content,
    title,
    organization_id::text as organization_id,
    project_id::text as project_id,
    user_id::text as user_id,
    id::text as document_id,
    created_at,
    updated_at
FROM documents
WHERE organization_id::text = $1
  AND title = '组织智慧库'
LIMIT 1;
```

### 方案2: 添加错误处理和调试

**增强版查询（带调试信息）**:
```sql
-- 先检查组织是否存在
WITH org_check AS (
  SELECT COUNT(*) as org_exists 
  FROM organizations 
  WHERE id::text = $1
),
doc_check AS (
  SELECT 
    content,
    title,
    organization_id::text as organization_id,
    project_id::text as project_id,
    user_id::text as user_id,
    id::text as document_id,
    created_at,
    updated_at
  FROM documents
  WHERE organization_id::text = $1
    AND title = '组织智慧库'
  LIMIT 1
)
SELECT 
  COALESCE(d.content, '# 组织智慧库不存在\n\n该组织暂无智慧库内容。') as content,
  COALESCE(d.title, '组织智慧库') as title,
  COALESCE(d.organization_id, $1) as organization_id,
  d.project_id,
  d.user_id,
  d.document_id,
  d.created_at,
  d.updated_at,
  o.org_exists
FROM org_check o
LEFT JOIN doc_check d ON true;
```

### 方案3: N8N 参数配置修复

**在 N8N 的 "Query Parameters" 部分**:
```javascript
// 确保参数正确传递
{{ $('1-Parse-Input-Parameters').item.json.organizationId }}
```

**检查参数格式**:
- 确保 `organizationId` 是有效的 UUID 格式
- 不要包含额外的引号或空格
- 确保不是 `null` 或 `undefined`

## 🎯 立即修复步骤

### 1. 更新 N8N 查询
将你的 "Execute a SQL query org" 节点的查询改为：

```sql
SELECT 
    content,
    title,
    organization_id::text as organization_id,
    project_id::text as project_id,
    user_id::text as user_id,
    id::text as document_id,
    created_at,
    updated_at
FROM documents
WHERE organization_id::text = $1
  AND title = '组织智慧库'
LIMIT 1;
```

### 2. 添加参数验证
在查询前添加一个 "Code" 节点来验证参数：

```javascript
// 验证 organizationId
const orgId = $('1-Parse-Input-Parameters').item.json.organizationId;

if (!orgId || orgId === '00000000-0000-0000-0000-000000000000') {
  throw new Error('Invalid organization ID: ' + orgId);
}

// 验证 UUID 格式
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(orgId)) {
  throw new Error('Invalid UUID format: ' + orgId);
}

return { organizationId: orgId };
```

### 3. 创建默认组织智慧库
如果数据库中没有对应的记录，运行：

```sql
-- 为测试组织创建智慧库
INSERT INTO documents (
  title,
  content,
  organization_id,
  user_id,
  metadata
) VALUES (
  '组织智慧库',
  '# 测试组织智慧库\n\n这是一个测试组织的智慧库内容。',
  '00000000-0000-0000-0000-000000000000'::uuid,
  (SELECT id FROM auth.users LIMIT 1),
  '{"type": "organization_knowledge_base", "auto_generated": true}'::jsonb
)
ON CONFLICT DO NOTHING;
```

## 🔍 调试技巧

### 在 N8N 中添加调试输出
在查询前添加一个 "Code" 节点：

```javascript
const params = $('1-Parse-Input-Parameters').item.json;
console.log('Debug - Input parameters:', JSON.stringify(params, null, 2));
console.log('Organization ID:', params.organizationId);
console.log('Organization ID type:', typeof params.organizationId);
return params;
```

### 检查 N8N 执行日志
1. 查看 N8N 的执行历史
2. 检查每个节点的输入/输出
3. 查看错误详情和堆栈跟踪

## ✅ 验证修复

修复后，测试以下场景：
1. ✅ 有效的组织ID查询
2. ✅ 无效的组织ID处理
3. ✅ 空组织ID处理
4. ✅ 不存在的组织智慧库处理

---

**修复优先级**: 🔥 高优先级
**预计修复时间**: 15-30分钟
**风险评估**: 低风险，主要是查询优化 