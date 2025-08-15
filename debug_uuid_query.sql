-- 调试 UUID 查询问题
-- 检查组织和文档数据

-- 1. 检查所有组织
SELECT 
    id as organization_id,
    name,
    created_at,
    id::text as id_as_text
FROM organizations
ORDER BY created_at DESC
LIMIT 10;

-- 2. 检查所有组织智慧库文档
SELECT 
    id as document_id,
    title,
    organization_id,
    organization_id::text as org_id_as_text,
    created_at,
    LENGTH(content) as content_length
FROM documents 
WHERE title = '组织智慧库'
ORDER BY created_at DESC;

-- 3. 检查特定组织ID是否存在
SELECT 
    'Organization exists' as check_type,
    COUNT(*) as count
FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 4. 检查特定组织的智慧库文档
SELECT 
    'Knowledge base exists' as check_type,
    COUNT(*) as count
FROM documents 
WHERE organization_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND title = '组织智慧库';

-- 5. 测试不同的 UUID 查询方式
-- 方式1: 直接 UUID 比较
SELECT 'Direct UUID comparison' as method, COUNT(*) as count
FROM documents 
WHERE organization_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND title = '组织智慧库';

-- 方式2: 字符串转换比较
SELECT 'String conversion comparison' as method, COUNT(*) as count
FROM documents 
WHERE organization_id::text = '00000000-0000-0000-0000-000000000000'
  AND title = '组织智慧库';

-- 6. 检查数据类型
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name IN ('organization_id', 'project_id', 'user_id');

-- 7. 查看所有文档的组织ID分布
SELECT 
    organization_id,
    organization_id::text as org_id_text,
    COUNT(*) as document_count
FROM documents 
GROUP BY organization_id
ORDER BY document_count DESC; 