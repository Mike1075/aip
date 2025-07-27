-- 创建聊天记录表
CREATE TABLE IF NOT EXISTS chat_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_chat_records_user_id ON chat_records(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_records_created_at ON chat_records(created_at DESC);

-- 启用RLS (Row Level Security)
ALTER TABLE chat_records ENABLE ROW LEVEL SECURITY;

-- 创建RLS政策，用户只能访问自己的聊天记录
CREATE POLICY "Users can view own chat records" ON chat_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat records" ON chat_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat records" ON chat_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat records" ON chat_records
  FOR DELETE USING (auth.uid() = user_id);