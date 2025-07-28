-- 启用RLS (Row Level Security) 并创建安全策略

-- 1. 启用所有表的RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 2. 用户表策略：用户只能看到和修改自己的信息
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 3. 项目策略：只能访问自己参与的项目
CREATE POLICY "Users can view projects they are members of" ON projects
  FOR SELECT USING (
    id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Project creators can update their projects" ON projects
  FOR UPDATE USING (auth.uid() = creator_id);

-- 4. 项目成员策略
CREATE POLICY "Users can view project memberships" ON project_members
  FOR SELECT USING (user_id = auth.uid() OR 
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project managers can manage members" ON project_members
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE creator_id = auth.uid()
    )
  );

-- 5. 任务策略：只能访问自己项目的任务
CREATE POLICY "Users can view project tasks" ON tasks
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their projects" ON tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their assigned tasks" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid() OR 
    project_id IN (
      SELECT id FROM projects WHERE creator_id = auth.uid()
    )
  );

-- 6. 聊天记录策略
CREATE POLICY "Users can view project chat history" ON chat_history
  FOR SELECT USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat messages" ON chat_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 7. 文档策略
CREATE POLICY "Users can view project documents" ON documents
  FOR SELECT USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents" ON documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (user_id = auth.uid());

-- 8. 组织策略：用户只能看到自己的组织
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ); 