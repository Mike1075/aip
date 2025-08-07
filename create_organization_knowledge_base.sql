-- 为现有组织创建"组织智慧库"文档
-- 根据 documents 表的实际字段结构

-- 1. 为所有现有组织添加"组织智慧库"文档（如果不存在的话）
INSERT INTO documents (
  id,
  title,
  content,
  metadata,
  embedding,
  project_id,
  user_id,
  created_at,
  updated_at,
  organization_id
)
SELECT 
  gen_random_uuid() as id,
  '组织智慧库' as title,
  '# ' || o.name || ' 组织智慧库

欢迎来到 ' || o.name || ' 的组织智慧库！

这里是我们组织的知识中心，用于存储和分享重要信息：

## 📚 主要用途
- 组织制度和流程文档
- 项目经验和最佳实践
- 常见问题解答
- 团队知识分享
- 重要决策记录

## 🎯 使用指南
1. 所有成员都可以查看和使用这些知识
2. 管理员可以编辑和维护内容
3. 支持 AI 智能问答，快速查找信息
4. 定期更新确保信息准确性

开始构建您的组织知识库吧！' as content,
  '{"type": "organization_knowledge_base", "description": "组织级别的知识库", "auto_generated": true}'::jsonb as metadata,
  null as embedding,
  null as project_id,
  (SELECT user_id FROM user_organizations WHERE organization_id = o.id AND role_in_org = 'admin' LIMIT 1) as user_id,
  NOW() as created_at,
  NOW() as updated_at,
  o.id as organization_id
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM documents d 
  WHERE d.organization_id = o.id 
  AND d.title = '组织智慧库'
);

-- 2. 查看创建结果
SELECT 
  o.name as organization_name,
  d.title,
  d.created_at
FROM organizations o
LEFT JOIN documents d ON o.id = d.organization_id AND d.title = '组织智慧库'
ORDER BY o.created_at;

-- 3. 统计信息
SELECT 
  COUNT(DISTINCT o.id) as total_organizations,
  COUNT(d.id) as knowledge_base_documents,
  COUNT(DISTINCT o.id) - COUNT(d.id) as missing_knowledge_bases
FROM organizations o
LEFT JOIN documents d ON o.id = d.organization_id AND d.title = '组织智慧库';