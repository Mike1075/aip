-- 创建项目文档表
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  project_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_user_id ON project_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_created_at ON project_documents(created_at DESC);

-- 启用RLS (Row Level Security)
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- 创建RLS政策，用户只能访问自己上传的文档和所参与项目的文档
CREATE POLICY "Users can view project documents" ON project_documents
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id::text = project_documents.project_id::text 
      AND (projects.creator_id = auth.uid() OR projects.is_public = true)
    ) OR
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id::text = project_documents.project_id::text 
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project documents" ON project_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project documents" ON project_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project documents" ON project_documents
  FOR DELETE USING (auth.uid() = user_id);

-- 创建触发器更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_documents_updated_at 
    BEFORE UPDATE ON project_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();