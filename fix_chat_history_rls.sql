-- 为chat_history表添加缺失的RLS策略
-- 允许用户删除和更新自己的聊天记录

-- 删除可能存在的旧策略（如果存在）
DROP POLICY IF EXISTS "Users can delete own chat messages" ON chat_history;
DROP POLICY IF EXISTS "Users can update own chat messages" ON chat_history;

-- 添加DELETE策略 - 用户只能删除自己的聊天记录
CREATE POLICY "Users can delete own chat messages" ON chat_history
  FOR DELETE USING (user_id = auth.uid());

-- 添加UPDATE策略 - 用户只能更新自己的聊天记录（包括部分删除）
CREATE POLICY "Users can update own chat messages" ON chat_history
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 检查现有策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'chat_history'
ORDER BY policyname;