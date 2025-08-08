-- 修改chat_history表，允许project_id为NULL或设置默认值
ALTER TABLE chat_history 
ALTER COLUMN project_id DROP NOT NULL;

-- 或者设置默认值
ALTER TABLE chat_history 
ALTER COLUMN project_id SET DEFAULT 'no_project';

-- 如果需要，也可以对organization_id做同样处理
ALTER TABLE chat_history 
ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE chat_history 
ALTER COLUMN organization_id SET DEFAULT 'no_org';