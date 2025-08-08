import { createClient } from '@supabase/supabase-js'

// 从环境变量读取配置，如果没有则使用开发环境的默认值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wfkazzdlfgurfmucuoqf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indma2F6emRsZmd1cmZtdWN1b3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNjI5NjQsImV4cCI6MjA2ODczODk2NH0.B-132nJtoXCKIuHmCHehnhOac8JohGs6rg4GjoV4v5M'

console.log('🔧 Supabase配置:')
console.log('URL:', supabaseUrl)
console.log('Key前6位:', supabaseAnonKey.substring(0, 6) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 测试连接
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase连接测试失败:', error)
  } else {
    console.log('✅ Supabase连接测试成功')
  }
})

// 通知接口定义
export interface Notification {
  id: string
  user_id: string
  type: 'organization_request_approved' | 'organization_request_rejected' | 'project_request_approved' | 'project_request_rejected' | 'organization_invitation' | 'project_invitation' | 'invitation_accepted' | 'invitation_rejected' | 'invitation_received' | 'invitation_sent'
  title: string
  message: string
  is_read: boolean
  metadata: Record<string, any>
  created_at: string
}

// 邀请接口定义
export interface Invitation {
  id: string
  inviter_id: string
  invitee_email: string
  invitee_id?: string
  invitation_type: 'organization' | 'project'
  target_id: string
  target_name: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  message?: string
  created_at: string
  updated_at: string
  expires_at: string
  responded_at?: string
  response_message?: string
}

// 数据库类型定义
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role_in_org: 'admin' | 'member'
  is_ai_assist_enabled: boolean
  settings: Record<string, any>
  organization_id: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  description?: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  is_public: boolean
  is_recruiting: boolean
  creator_id: string
  organization_id: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project_id: string
  assignee_id?: string
  created_by_id: string
  created_by_ai: boolean
  estimated_hours?: number
  actual_hours?: number
  due_date?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role_in_project: 'manager' | 'developer' | 'tester' | 'designer'
  joined_at: string
}

export interface ChatHistory {
  id: string
  content: string
  role: 'user' | 'assistant'
  agent_type: 'org_agent' | 'project_agent' | 'member_agent'
  project_id?: string
  user_id: string
  metadata: Record<string, any>
  created_at: string
}

// 用户-组织关联表
export interface UserOrganization {
  user_id: string
  organization_id: string
  role_in_org: 'admin' | 'member'
  joined_at: string
}

// 项目加入申请表
export interface ProjectJoinRequest {
  id: string
  project_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  message?: string
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
  is_read?: boolean
}

// 组织加入申请表
export interface OrganizationJoinRequest {
  id: string
  user_id: string
  organization_id: string
  status: 'pending' | 'approved' | 'rejected'
  message?: string
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
  is_read?: boolean
}

// 项目文档表
export interface Document {
  id: string
  title: string
  content: string
  metadata: Record<string, any>
  embedding: string // public.vector(1536)
  project_id: string
  user_id: string
  organization_id: string // 新增组织ID字段
  created_at: string
  updated_at: string
}

// 组织管理API
export const organizationAPI = {
  // 获取所有组织（公开访问）
  async getAllOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 根据ID获取单个组织
  async getOrganizationById(organizationId: string): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    if (error) throw error
    if (!data) throw new Error('组织不存在')
    return data
  },

  // 根据ID获取单个项目
  async getProjectById(projectId: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    
    if (error) throw error
    if (!data) throw new Error('项目不存在')
    return data
  },

  // 获取用户所属的组织
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role_in_org,
        organizations (*)
      `)
      .eq('user_id', userId)
    
    if (error) throw error
    return (data?.map(item => item.organizations as Organization).filter(Boolean) as Organization[]) || []
  },

  // 创建组织
  async createOrganization(name: string, description: string, creatorId: string): Promise<Organization> {
    // 1. 创建组织
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        description,
        settings: {}
      })
      .select()
      .single()
    
    if (orgError) throw orgError

    // 2. 自动将创建者设为组织管理员
    const { error: memberError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: creatorId,
        organization_id: organization.id,
        role_in_org: 'admin',
        joined_at: new Date().toISOString()
      })
    
    if (memberError) {
      // 如果添加成员失败，删除已创建的组织
      await supabase.from('organizations').delete().eq('id', organization.id)
      throw memberError
    }

    // 3. 为新组织创建组织智慧库文档
    try {
      await this.createKnowledgeBaseForNewOrganization(organization.id, creatorId)
      console.log('✅ 组织智慧库创建成功')
    } catch (knowledgeBaseError) {
      console.error('⚠️ 创建组织智慧库失败（但组织创建成功）:', knowledgeBaseError)
      // 不影响组织创建的主要流程，只记录错误
    }

    return organization
  },

  // 申请加入组织
  async applyToJoinOrganization(userId: string, organizationId: string, message?: string): Promise<OrganizationJoinRequest> {
    console.log('🔧 申请加入组织:', { userId, organizationId, message })

    // 检查用户是否已经是成员
    const { data: existing, error: checkError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existing) {
      throw new Error('您已经是该组织的成员')
    }

    // 检查是否已有待审核申请
    const { data: pendingRequest, error: pendingError } = await supabase
      .from('organization_join_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .single()

    if (pendingError && pendingError.code !== 'PGRST116') {
      throw pendingError
    }

    if (pendingRequest) {
      throw new Error('您已有待审核的申请')
    }

    // 创建申请
    console.log('📝 创建组织加入申请...')
    const { data, error } = await supabase
      .from('organization_join_requests')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        message: message || '',
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 创建申请失败:', error)
      throw error
    }

    console.log('✅ 申请创建成功:', data)
    return data
  },

  // 获取组织的加入申请
  async getOrganizationJoinRequests(organizationId: string): Promise<any[]> {
    console.log('🔍 getOrganizationJoinRequests - 查询组织加入申请')
    console.log('组织ID:', organizationId)
    
    // 先获取申请基本信息 - 临时移除pending限制，查看所有状态
    const { data: requests, error } = await supabase
      .from('organization_join_requests')
      .select('*')
      .eq('organization_id', organizationId)
      // .eq('status', 'pending')  // 临时注释掉，查看所有申请
      .order('created_at', { ascending: false })

    console.log('📊 组织申请查询结果:', { requests, error })
    
    if (error) {
      console.error('❌ 查询组织申请失败:', error)
      throw error
    }
    
    if (!requests || requests.length === 0) {
      console.log('✅ 没有找到待处理的申请')
      return []
    }
    
    // 手动关联用户信息
    const requestsWithUsers = []
    for (const request of requests) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', request.user_id)
        .single()
      
      if (!userError && user) {
        requestsWithUsers.push({
          ...request,
          user: user
        })
      } else {
        // 如果找不到用户信息，仍然包含申请但用户信息为空
        requestsWithUsers.push({
          ...request,
          user: {
            id: request.user_id,
            name: '未知用户',
            email: '未知邮箱'
          }
        })
      }
    }
    
    console.log('✅ 找到的申请数量:', requestsWithUsers.length)
    return requestsWithUsers
  },

  // 审核申请
  async reviewJoinRequest(requestId: string, action: 'approve' | 'reject', reviewerId: string): Promise<void> {
    // 获取申请详情
    const { data: request, error: getError } = await supabase
      .from('organization_join_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (getError) throw getError
    if (!request) throw new Error('申请不存在')

    // 获取组织信息用于通知
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', request.organization_id)
      .single()

    if (orgError) throw orgError

    // 更新申请状态
    const { error: updateError } = await supabase
      .from('organization_join_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId
      })
      .eq('id', requestId)

    if (updateError) throw updateError

    // 如果批准，添加到组织成员
    if (action === 'approve') {
      const { error: memberError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: request.user_id,
          organization_id: request.organization_id,
          role_in_org: 'member',
          joined_at: new Date().toISOString()
        })

      if (memberError) throw memberError
    }

    // 创建通知给申请者
    try {
      console.log('📔 开始为申请者创建通知...')
      const notificationType = action === 'approve' ? 'organization_request_approved' : 'organization_request_rejected'
      const title = action === 'approve' ? '组织申请已批准' : '组织申请已拒绝'
      const message = action === 'approve' 
        ? `您申请加入组织"${organization.name}"的请求已被批准，欢迎加入！`
        : `很抱歉，您申请加入组织"${organization.name}"的请求已被拒绝。`

      console.log('📔 通知参数:', {
        userId: request.user_id,
        type: notificationType,
        title,
        message
      })

      const notification = await this.createNotification(
        request.user_id,
        notificationType,
        title,
        message,
        {
          organization_id: request.organization_id,
          organization_name: organization.name,
          request_id: requestId,
          reviewed_by: reviewerId
        }
      )
      
      console.log('✅ 通知创建成功:', notification)
    } catch (notificationError) {
      console.error('❌ 创建通知失败:', notificationError)
      // 不抛出错误，避免影响主要流程
    }
  },

  // 获取用户的申请状态
  async getUserJoinRequestStatus(userId: string, organizationId: string): Promise<OrganizationJoinRequest | null> {
    const { data, error } = await supabase
      .from('organization_join_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  },

  // 获取用户在特定组织中的角色
  async getUserRoleInOrganization(userId: string, organizationId: string): Promise<'admin' | 'member' | null> {
    const { data, error } = await supabase
      .from('user_organizations')
      .select('role_in_org')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data?.role_in_org || null
  },

  // 获取用户管理的组织
  async getUserManagedOrganizations(userId: string): Promise<Organization[]> {
    console.log('🔍 getUserManagedOrganizations - 查询用户管理的组织')
    console.log('用户ID:', userId)
    
    // 先检查用户是否存在任何组织关系
    const { data: allRelations, error: allError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', userId)
    
    console.log('📊 用户的所有组织关系:', { allRelations, allError })
    
    // 获取用户作为admin的组织ID
    const { data: adminRelations, error } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('role_in_org', 'admin')

    console.log('📊 管理员组织关系查询结果:', { adminRelations, error })
    
    if (error) {
      console.error('❌ 查询用户管理的组织失败:', error)
      throw error
    }
    
    if (!adminRelations || adminRelations.length === 0) {
      console.log('✅ 用户没有管理任何组织')
      return []
    }
    
    // 手动获取组织信息
    const organizationIds = adminRelations.map(rel => rel.organization_id)
    const organizations = []
    
    for (const orgId of organizationIds) {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()
      
      if (!orgError && org) {
        organizations.push(org)
      }
    }
    
    console.log('✅ 用户管理的组织:', organizations)
    return organizations
  },

  // 获取组织的项目（根据权限过滤）
  async getOrganizationProjects(organizationId: string, userId?: string): Promise<Project[]> {
    let query = supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)

    // 如果用户未登录，只显示公开项目
    if (!userId) {
      query = query.eq('is_public', true)
    } else {
      // 如果用户已登录，显示公开项目 + 用户参与的私有项目
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
      
      const memberProjectIds = memberProjects?.map(p => p.project_id) || []
      
      if (memberProjectIds.length > 0) {
        query = query.or(`is_public.eq.true,id.in.(${memberProjectIds.join(',')})`)
      } else {
        query = query.eq('is_public', true)
      }
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 检查用户是否为项目成员
  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()
    
    if (error) return false
    return !!data
  },

  // 检查用户是否为组织成员
  async isOrganizationMember(organizationId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single()
    
    if (error) return false
    return !!data
  },

  /**
   * 将用户加入组织（接受邀请或管理员添加）
   */
  async addMember(organizationId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<void> {
    // 已是成员则无需重复插入，如角色不同可更新
    const { data: existing, error: existErr } = await supabase
      .from('user_organizations')
      .select('id, role_in_org')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existErr && existErr.code !== 'PGRST116') throw existErr

    if (existing) {
      // 若已有记录且角色不同，做一次轻量更新
      if (existing.role_in_org !== role) {
        const { error: updateErr } = await supabase
          .from('user_organizations')
          .update({ role_in_org: role })
          .eq('id', existing.id)
        if (updateErr) throw updateErr
      }
      return
    }

    const { error } = await supabase
      .from('user_organizations')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role_in_org: role,
        joined_at: new Date().toISOString()
      })
    if (error) throw error
  },

  // 获取用户在项目中的角色
  async getUserProjectRole(projectId: string, userId: string): Promise<'manager' | 'developer' | 'tester' | 'designer' | null> {
    const { data, error } = await supabase
      .from('project_members')
      .select('role_in_project')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()
    
    if (error) return null
    return data?.role_in_project || null
  },

  // 检查用户是否为项目经理
  async isProjectManager(projectId: string, userId: string): Promise<boolean> {
    const role = await this.getUserProjectRole(projectId, userId)
    return role === 'manager'
  },

  // 获取项目成员列表
  async getProjectMembers(projectId: string): Promise<Array<{
    user_id: string,
    role_in_project: string,
    joined_at: string,
  }>> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        user_id,
        role_in_project,
        joined_at
      `)
      .eq('project_id', projectId)
      .order('joined_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // 项目加入申请相关API
  
  // 提交加入申请
  async submitJoinRequest(projectId: string, userId: string, message?: string): Promise<ProjectJoinRequest> {
    const { data, error } = await supabase
      .from('project_join_requests')
      .insert({
        project_id: projectId,
        user_id: userId,
        message: message || '',
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 检查用户是否已申请加入项目
  async hasJoinRequest(projectId: string, userId: string): Promise<ProjectJoinRequest | null> {
    const { data, error } = await supabase
      .from('project_join_requests')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()
    
    if (error) return null
    return data
  },

  // 获取项目的待审核申请（项目经理用）
  async getPendingJoinRequests(projectId: string): Promise<ProjectJoinRequest[]> {
    const { data, error } = await supabase
      .from('project_join_requests')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // 获取用户管理的项目的加入申请
  async getProjectJoinRequestsForManager(userId: string): Promise<any[]> {
    // 首先获取用户管理的项目
    const { data: managedProjects, error: projectError } = await supabase
      .from('project_members')
      .select(`
        project_id,
        projects!inner(*)
      `)
      .eq('user_id', userId)
      .eq('role_in_project', 'manager')

    if (projectError) throw projectError
    
    if (!managedProjects || managedProjects.length === 0) {
      return []
    }

    const projectIds = managedProjects.map(pm => pm.project_id)
    
    // 获取这些项目的申请 - 临时移除pending限制，查看所有状态
    const { data: requests, error: requestError } = await supabase
      .from('project_join_requests')
      .select(`
        *,
        user:users!project_join_requests_user_id_fkey(id, name, email),
        project:projects!project_join_requests_project_id_fkey(id, name)
      `)
      .in('project_id', projectIds)
      // .eq('status', 'pending')  // 临时注释掉，查看所有申请
      .order('created_at', { ascending: false })

    if (requestError) throw requestError
    return requests || []
  },

  // 审核项目加入申请
  async reviewProjectJoinRequest(requestId: string, status: 'approved' | 'rejected', reviewerId: string): Promise<void> {
    // 获取申请详情
    const { data: request, error: getError } = await supabase
      .from('project_join_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (getError) throw getError
    if (!request) throw new Error('申请不存在')

    // 获取项目信息用于通知
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name')
      .eq('id', request.project_id)
      .single()

    if (projectError) throw projectError

    // 更新申请状态
    const { error } = await supabase
      .from('project_join_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId
      })
      .eq('id', requestId)
    
    if (error) throw error

    // 如果批准，则添加到项目成员
    if (status === 'approved') {
      await supabase
        .from('project_members')
        .insert({
          project_id: request.project_id,
          user_id: request.user_id,
          role_in_project: 'developer', // 默认角色
          joined_at: new Date().toISOString()
        })
    }

    // 创建通知给申请者
    try {
      const notificationType = status === 'approved' ? 'project_request_approved' : 'project_request_rejected'
      const title = status === 'approved' ? '项目申请已批准' : '项目申请已拒绝'
      const message = status === 'approved' 
        ? `您申请加入项目"${project.name}"的请求已被批准，欢迎加入！`
        : `很抱歉，您申请加入项目"${project.name}"的请求已被拒绝。`

      await this.createNotification(
        request.user_id,
        notificationType,
        title,
        message,
        {
          project_id: request.project_id,
          project_name: project.name,
          request_id: requestId,
          reviewed_by: reviewerId
        }
      )
    } catch (notificationError) {
      console.error('创建通知失败:', notificationError)
      // 不抛出错误，避免影响主要流程
    }
  },

  // 为新项目创建智慧库文档
  async createKnowledgeBaseForNewProject(projectId: string, userId: string): Promise<void> {
    console.log('📚 为新项目创建智慧库文档:', { projectId, userId })
    
    // 首先获取项目信息以获取organization_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()
    
    if (projectError) {
      console.error('❌ 获取项目信息失败:', projectError)
      throw projectError
    }
    
    const { error } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        user_id: userId,
        organization_id: project.organization_id, // 添加组织ID
        title: '项目智慧库',
        content: '', // 改为空字符串而不是 null
        metadata: { type: 'project_knowledge_base' },
        embedding: null
      })
    
    if (error) {
      console.error('❌ 创建智慧库文档失败:', error)
      throw error
    }
    
    console.log('✅ 项目智慧库文档创建成功，已关联组织ID:', project.organization_id)
  },

  // 为新组织创建组织智慧库文档
  async createKnowledgeBaseForNewOrganization(organizationId: string, userId: string): Promise<void> {
    console.log('🏢 为新组织创建组织智慧库文档:', { organizationId, userId })
    
    // 获取组织名称用于生成个性化内容
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, description')
      .eq('id', organizationId)
      .single()
    
    if (orgError) {
      console.error('❌ 获取组织信息失败:', orgError)
      throw orgError
    }
    
    const knowledgeBaseContent = `# ${organization.name} 组织智慧库

## 组织简介
${organization.description || '这是一个新创建的组织，暂无详细描述。'}

## 使用指南
这是您组织的智慧库，您可以在这里添加组织的重要信息、规范和指导文档。
所有组织成员都可以访问这些内容，帮助大家更好地了解组织和协作。

## 常见问题
1. 如何邀请新成员加入组织？
   - 在组织页面，点击"邀请成员"按钮发送邀请。

2. 如何创建新项目？
   - 在组织工作台页面，点击"创建项目"按钮。

3. 如何管理组织成员权限？
   - 组织管理员可以在成员列表中修改成员角色。
`

    const { error } = await supabase
      .from('documents')
      .insert({
        project_id: null, // 组织级别文档，不属于特定项目
        user_id: userId,
        organization_id: organizationId,
        title: '组织智慧库',
        content: knowledgeBaseContent,
        metadata: { type: 'organization_knowledge_base' },
        embedding: null
      })
    
    if (error) {
      console.error('❌ 创建组织智慧库文档失败:', error)
      throw error
    }
    
    console.log('✅ 组织智慧库文档创建成功')
  },

  // 通知相关API
  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        is_read: false,
        metadata
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 获取用户通知
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 标记通知为已读
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    
    if (error) throw error
  },

  // 标记组织申请为已读
  async markOrganizationRequestAsRead(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_join_requests')
      .update({ is_read: true })
      .eq('id', requestId)
    
    if (error) throw error
  },

  // 标记项目申请为已读
  async markProjectRequestAsRead(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('project_join_requests')
      .update({ is_read: true })
      .eq('id', requestId)
    
    if (error) throw error
  },

  // 获取未读消息数量
  async getUnreadCount(userId: string): Promise<number> {
    // 获取未读通知数量（排除邀请类通知，邀请在“收到的邀请”中处理）
    const { count: notificationCount, error: notificationError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .neq('type', 'invitation_sent')
      .neq('type', 'invitation_received')
    
    if (notificationError) {
      console.error('获取未读通知数量失败:', notificationError)
      return 0
    }

    // 获取用户管理的组织的未读申请数量
    const managedOrgs = await this.getUserManagedOrganizations(userId)
    let orgRequestCount = 0
    
    for (const org of managedOrgs) {
      const { count, error } = await supabase
        .from('organization_join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'pending')
        .eq('is_read', false)
      
      if (!error && count) {
        orgRequestCount += count
      }
    }

    // 获取用户管理的项目的未读申请数量
    const { data: managedProjects, error: projectError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .eq('role_in_project', 'manager')

    let projectRequestCount = 0
    
    if (!projectError && managedProjects) {
      const projectIds = managedProjects.map(pm => pm.project_id)
      
      if (projectIds.length > 0) {
        const { count, error } = await supabase
          .from('project_join_requests')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .eq('status', 'pending')
          .eq('is_read', false)
        
        if (!error && count) {
          projectRequestCount = count
        }
      }
    }

    // 待处理邀请数量（针对当前用户）
    let pendingInvitationCount = 0
    try {
      const { data: authUser } = await supabase.auth.getUser()
      const currentEmail = authUser.user?.email
      const currentUserId = authUser.user?.id
      if (currentEmail || currentUserId) {
        const { count, error } = await supabase
          .from('invitations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .or([
            currentUserId ? `invitee_id.eq.${currentUserId}` : '',
            currentEmail ? `invitee_email.eq.${currentEmail}` : ''
          ].filter(Boolean).join(','))
        if (!error && typeof count === 'number') pendingInvitationCount = count
      }
    } catch (e) {
      console.warn('统计待处理邀请失败：', e)
    }

    // 仅按“未读/待处理”显示红点
    return (notificationCount || 0) + orgRequestCount + projectRequestCount + pendingInvitationCount
  }
}

// 邀请系统API
export const invitationAPI = {
  /**
   * 发送邀请
   * @param invitation 邀请参数
   * @returns 创建的邀请记录
   */
  async sendInvitation(invitation: {
    invitee_email: string
    invitation_type: 'organization' | 'project'
    target_id: string
    target_name: string
    message?: string
  }): Promise<Invitation> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('用户未登录，无法发送邀请')

    // 检查是否已经发送过相同的邀请（允许 0 行返回，不将其视为错误）
    const { data: existingInvitation, error: existingError } = await supabase
      .from('invitations')
      .select('*')
      .eq('inviter_id', user.id)
      .eq('invitee_email', invitation.invitee_email)
      .eq('invitation_type', invitation.invitation_type)
      .eq('target_id', invitation.target_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingError && existingError.code !== 'PGRST116') { // 非“未找到”错误
      throw new Error(`检查重复邀请失败：${existingError.message || existingError.details || existingError.hint || '未知错误'}`)
    }

    if (existingInvitation) {
      throw new Error('已经向该邮箱发送过相同的邀请，请等待对方回复')
    }

    // 通过安全的 RPC 获取被邀请者 user_id（如果存在）
    const { data: inviteeId, error: inviteeQueryError } = await supabase
      .rpc('get_user_id_by_email', { p_email: invitation.invitee_email })

    if (inviteeQueryError) {
      throw new Error(`查询被邀请者信息失败：${inviteeQueryError.message || inviteeQueryError.details || '未知错误'}`)
    }

    // 插入邀请
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        inviter_id: user.id,
        invitee_email: invitation.invitee_email,
        invitee_id: inviteeId || null,
        invitation_type: invitation.invitation_type,
        target_id: invitation.target_id,
        target_name: invitation.target_name,
        message: invitation.message
      })
      .select()
      .single()

    if (error) {
      throw new Error(`创建邀请失败：${error.message || error.details || error.hint || '未知错误'}`)
    }

    // 创建发送者的通知记录（失败不阻断主流程）
    const { error: notifySenderError } = await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'invitation_sent',
      title: `邀请已发送`,
      message: `您已向 ${invitation.invitee_email} 发送加入${invitation.invitation_type === 'organization' ? '组织' : '项目'} "${invitation.target_name}" 的邀请`,
      metadata: { invitation_id: data.id }
    })
    if (notifySenderError) {
      console.warn('创建发送者通知失败：', notifySenderError)
    }

    // 如果被邀请者已注册，创建接收者的通知记录（失败不阻断）
    if (inviteeId) {
      const { error: notifyReceiverError } = await supabase.from('notifications').insert({
        user_id: inviteeId as string,
        type: 'invitation_received',
        title: `收到邀请`,
        message: `${user.email} 邀请您加入${invitation.invitation_type === 'organization' ? '组织' : '项目'} "${invitation.target_name}"`,
        metadata: { invitation_id: data.id }
      })
      if (notifyReceiverError) {
        console.warn('创建接收者通知失败：', notifyReceiverError)
      }
    }

    return data
  },

  // 获取发送的邀请
  async getSentInvitations(userId: string): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // 获取收到的邀请
  async getReceivedInvitations(userEmail: string, userId?: string): Promise<Invitation[]> {
    let query = supabase
      .from('invitations')
      .select('*')
      .eq('invitee_email', userEmail)
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.or(`invitee_id.eq.${userId}`)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  // 响应邀请（接受或拒绝）
  async respondToInvitation(invitationId: string, response: 'accepted' | 'rejected', responseMessage?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('用户未登录')

    // 获取邀请详情
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (invitationError) throw invitationError
    if (!invitation) throw new Error('邀请不存在')

    // 检查邀请是否已过期
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('邀请已过期')
    }

    // 更新邀请状态
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: response,
        response_message: responseMessage,
        invitee_id: user.id
      })
      .eq('id', invitationId)

    if (updateError) throw updateError

    // 如果接受邀请，添加用户到组织或项目
    if (response === 'accepted') {
      if (invitation.invitation_type === 'organization') {
        // 添加到组织
        await organizationAPI.addMember(invitation.target_id, user.id, 'member')
      } else {
        // 添加到项目
        const { error: projectError } = await supabase
          .from('project_members')
          .insert({
            project_id: invitation.target_id,
            user_id: user.id,
            role_in_project: 'member'
          })
        
        if (projectError && !projectError.message.includes('duplicate')) {
          throw projectError
        }
      }
    }

    // 通知邀请者
    await supabase.from('notifications').insert({
      user_id: invitation.inviter_id,
      type: response === 'accepted' ? 'invitation_accepted' : 'invitation_rejected',
      title: response === 'accepted' ? '邀请已接受' : '邀请已拒绝',
      message: `${user.email} ${response === 'accepted' ? '接受了' : '拒绝了'}您的邀请加入${invitation.invitation_type === 'organization' ? '组织' : '项目'} "${invitation.target_name}"${responseMessage ? `，回复：${responseMessage}` : ''}`,
      metadata: { invitation_id: invitationId }
    })
  },

  // 获取用户可以邀请的组织列表
  async getUserManagedOrganizations(userId: string): Promise<Organization[]> {
    return organizationAPI.getUserManagedOrganizations(userId)
  },

  // 获取用户可以邀请的项目列表
  async getUserManagedProjects(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        project_id,
        projects!inner(*)
      `)
      .eq('user_id', userId)
      .eq('role_in_project', 'manager')

    if (error) throw error
    return data?.map(pm => pm.projects).filter(Boolean) || []
  }
}
