-- 创建邀请表，用于用户邀请其他用户加入组织或项目
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 邀请者信息
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 被邀请者信息
  invitee_email TEXT NOT NULL, -- 被邀请者邮箱
  invitee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 如果被邀请者已注册，关联其用户ID
  
  -- 邀请类型和目标
  invitation_type TEXT CHECK (invitation_type IN ('organization', 'project')) NOT NULL,
  target_id UUID NOT NULL, -- 组织ID或项目ID
  target_name TEXT NOT NULL, -- 组织名称或项目名称
  
  -- 邀请状态
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')) DEFAULT 'pending',
  
  -- 邀请消息
  message TEXT, -- 可选的邀请消息
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'), -- 7天后过期
  
  -- 响应信息
  responded_at TIMESTAMP WITH TIME ZONE,
  response_message TEXT -- 接受或拒绝时的消息
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_id ON invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_target ON invitations(invitation_type, target_id);
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at DESC);

-- 启用RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS 政策：邀请者可以查看自己发送的邀请
CREATE POLICY "Users can view invitations they sent" ON invitations
  FOR SELECT USING (inviter_id = auth.uid());

-- RLS 政策：被邀请者可以查看发给自己的邀请
CREATE POLICY "Users can view invitations sent to them" ON invitations
  FOR SELECT USING (
    invitee_id = auth.uid() OR 
    (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- RLS 政策：邀请者可以创建邀请
CREATE POLICY "Users can create invitations" ON invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- RLS 政策：被邀请者可以更新邀请状态（接受/拒绝）
CREATE POLICY "Users can respond to their invitations" ON invitations
  FOR UPDATE USING (
    invitee_id = auth.uid() OR 
    (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  ) WITH CHECK (
    invitee_id = auth.uid() OR 
    (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- 创建触发器，自动更新 updated_at
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invitations_updated_at_trigger
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_invitations_updated_at();

-- 创建触发器，当邀请状态改变时自动设置 responded_at
CREATE OR REPLACE FUNCTION set_invitation_responded_at()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果状态从 pending 变为 accepted 或 rejected
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
        NEW.responded_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invitations_responded_at_trigger
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_responded_at();

-- 创建触发器，自动设置被邀请者ID（当被邀请者注册后）
CREATE OR REPLACE FUNCTION auto_set_invitee_id()
RETURNS TRIGGER AS $$
BEGIN
    -- 当用户注册时，自动更新相关邀请的 invitee_id
    UPDATE invitations 
    SET invitee_id = NEW.id 
    WHERE invitee_email = NEW.email AND invitee_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 注意：这个触发器需要在 auth.users 表上创建，但由于权限限制，可能需要手动处理
-- CREATE TRIGGER auto_set_invitee_id_trigger
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION auto_set_invitee_id();

-- 查看创建的表结构
\d invitations;