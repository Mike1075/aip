-- 修改chat_history表，允许content和ai_content字段为NULL
-- 这样支持部分删除功能

-- 首先检查当前表结构
\d chat_history;

-- 修改content字段，允许NULL
ALTER TABLE chat_history 
ALTER COLUMN content DROP NOT NULL;

-- 修改ai_content字段，允许NULL（如果它也有NOT NULL约束）
ALTER TABLE chat_history 
ALTER COLUMN ai_content DROP NOT NULL;

-- 添加检查约束，确保至少有一个字段不为空
ALTER TABLE chat_history 
ADD CONSTRAINT content_or_ai_content_not_both_null 
CHECK (content IS NOT NULL OR ai_content IS NOT NULL);

-- 验证表结构
\d chat_history;

-- 查看约束
SELECT conname, contype, consrc 
FROM pg_constraint 
WHERE conrelid = 'chat_history'::regclass;