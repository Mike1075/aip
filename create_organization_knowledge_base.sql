-- 为现有组织创建组织智慧库文档的SQL脚本
-- 执行前请确保备份数据库

-- 1. 首先检查现有组织数量
SELECT 
    COUNT(*) as total_organizations,
    'Current organizations count' as description
FROM organizations;

-- 2. 检查哪些组织还没有组织智慧库
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.created_at,
    CASE 
        WHEN d.id IS NULL THEN '缺少组织智慧库'
        ELSE '已有组织智慧库'
    END as knowledge_base_status
FROM organizations o
LEFT JOIN documents d ON (
    d.organization_id = o.id 
    AND d.title = '组织智慧库' 
    AND d.project_id IS NULL
)
ORDER BY o.created_at DESC;

-- 3. 为缺少组织智慧库的组织创建智慧库文档
-- 注意：这里使用组织的第一个管理员作为创建者
INSERT INTO documents (
    id,
    title,
    content,
    metadata,
    embedding,
    project_id,
    user_id,
    organization_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    '组织智慧库' as title,
    '' as content,
    jsonb_build_object(
        'type', 'organization_knowledge_base',
        'description', '组织级别的知识库，用于存储组织相关的文档和信息',
        'auto_created', true,
        'created_by_script', true
    ) as metadata,
    NULL as embedding,
    NULL as project_id,
    uo.user_id as user_id,  -- 使用组织的第一个管理员
    o.id as organization_id,
    NOW() as created_at,
    NOW() as updated_at
FROM organizations o
INNER JOIN (
    -- 获取每个组织的第一个管理员
    SELECT DISTINCT ON (organization_id) 
        organization_id, 
        user_id
    FROM user_organizations 
    WHERE role_in_org = 'admin'
    ORDER BY organization_id, joined_at ASC
) uo ON uo.organization_id = o.id
LEFT JOIN documents existing_kb ON (
    existing_kb.organization_id = o.id 
    AND existing_kb.title = '组织智慧库' 
    AND existing_kb.project_id IS NULL
)
WHERE existing_kb.id IS NULL;  -- 只为没有组织智慧库的组织创建

-- 4. 验证创建结果
SELECT 
    COUNT(*) as created_knowledge_bases,
    '新创建的组织智慧库数量' as description
FROM documents 
WHERE title = '组织智慧库' 
AND project_id IS NULL
AND metadata->>'auto_created' = 'true';

-- 5. 最终验证：检查所有组织是否都有组织智慧库
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    CASE 
        WHEN d.id IS NOT NULL THEN '✅ 已有组织智慧库'
        ELSE '❌ 缺少组织智慧库'
    END as status,
    d.created_at as knowledge_base_created_at,
    u.name as created_by_user
FROM organizations o
LEFT JOIN documents d ON (
    d.organization_id = o.id 
    AND d.title = '组织智慧库' 
    AND d.project_id IS NULL
)
LEFT JOIN users u ON u.id = d.user_id
ORDER BY o.created_at DESC;

-- 6. 统计信息
SELECT 
    'organizations' as table_name,
    COUNT(*) as total_count
FROM organizations
UNION ALL
SELECT 
    'organization_knowledge_bases' as table_name,
    COUNT(*) as total_count
FROM documents 
WHERE title = '组织智慧库' AND project_id IS NULL;