-- 简化版：为现有组织创建组织智慧库
-- 一键执行脚本

-- 为所有缺少组织智慧库的组织创建智慧库文档
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
    gen_random_uuid(),
    '组织智慧库',
    '',
    '{"type": "organization_knowledge_base", "description": "组织级别的知识库，用于存储组织相关的文档和信息", "auto_created": true}'::jsonb,
    NULL,
    NULL,
    (
        SELECT user_id 
        FROM user_organizations 
        WHERE organization_id = o.id 
        AND role_in_org = 'admin' 
        ORDER BY joined_at ASC 
        LIMIT 1
    ),
    o.id,
    NOW(),
    NOW()
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 
    FROM documents d 
    WHERE d.organization_id = o.id 
    AND d.title = '组织智慧库' 
    AND d.project_id IS NULL
);

-- 验证结果
SELECT 
    o.name as "组织名称",
    CASE 
        WHEN d.id IS NOT NULL THEN '✅ 已创建'
        ELSE '❌ 创建失败'
    END as "智慧库状态"
FROM organizations o
LEFT JOIN documents d ON (
    d.organization_id = o.id 
    AND d.title = '组织智慧库' 
    AND d.project_id IS NULL
)
ORDER BY o.created_at DESC;