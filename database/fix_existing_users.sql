-- 修复现有用户数据，使其与Supabase Auth关联

-- 重要说明：
-- 1. 这个脚本需要使用Service Role Key在Supabase SQL编辑器中执行
-- 2. 执行前请备份数据
-- 3. 执行后需要用户重新注册或更新用户ID

-- 方案1：清空现有测试数据（推荐用于开发阶段）
/*
-- 删除测试数据（注意：这会删除所有数据）
DELETE FROM chat_history;
DELETE FROM documents;
DELETE FROM tasks;
DELETE FROM project_members;
DELETE FROM projects;
DELETE FROM users;
DELETE FROM organizations;
*/

-- 方案2：手动更新现有用户ID（如果有重要数据）
/*
-- 查看当前认证用户
SELECT id, email FROM auth.users;

-- 查看当前应用用户
SELECT id, email, name FROM users;

-- 手动更新用户ID（替换为实际的auth.uid）
-- UPDATE users SET id = 'auth_user_uuid_here' WHERE email = 'user@example.com';
*/

-- 添加一个触发器，确保新用户注册时自动创建用户资料
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 