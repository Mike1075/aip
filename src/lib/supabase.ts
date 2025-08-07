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
  type: 'organization_request_approved' | 'organization_request_rejected' | 'project_request_approved' | 'project_request_rejected'
  title: string
  message: string
  is_read: boolean
  metadata: Record<string, any>
  created_at: string
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

欢迎来到 **${organization.name}** 的组织智慧库！

${organization.description ? `> ${organization.description}` : ''}

这里是我们组织的知识中心，用于存储和分享重要信息。

## 📚 主要用途
- **组织制度和流程文档** - 规章制度、工作流程、标准操作程序
- **项目经验和最佳实践** - 成功案例、经验教训、技术分享
- **常见问题解答** - FAQ、问题解决方案、技术支持
- **团队知识分享** - 培训材料、学习资源、技能分享
- **重要决策记录** - 会议纪要、决策过程、政策变更

## 🎯 使用指南
1. **查看权限** - 所有成员都可以查看和使用这些知识
2. **编辑权限** - 管理员可以编辑和维护内容
3. **AI 支持** - 支持 AI 智能问答，快速查找信息
4. **定期维护** - 请定期更新确保信息准确性

## 🚀 快速开始
- 点击编辑按钮开始添加您的第一份文档
- 使用 Markdown 格式进行内容编写
- 通过标签和分类来组织内容
- 利用 AI 助手来快速查找和整理信息

---

*创建时间：${new Date().toLocaleString('zh-CN')}*
*这是一个自动生成的组织智慧库模板，您可以根据需要自由修改和完善。*`
    
    const { error } = await supabase
      .from('documents')
      .insert({
        title: '组织智慧库',
        content: knowledgeBaseContent,
        metadata: { 
          type: 'organization_knowledge_base',
          description: '组织级别的知识库，用于存储组织相关的文档和信息',
          template_version: '1.0',
          auto_generated: true
        },
        embedding: null,
        project_id: null, // 组织级文档不关联具体项目
        user_id: userId,
        organization_id: organizationId
      })
    
    if (error) {
      console.error('❌ 创建组织智慧库文档失败:', error)
      throw error
    }
    
    console.log('✅ 组织智慧库文档创建成功，组织ID:', organizationId)
  },

  // ===== 通知系统 API =====
  
  // 创建通知
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

  // 获取用户的未读通知数量
  async getUnreadNotificationCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (error) throw error
    return count || 0
  },

  // 获取用户的所有通知
  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
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

  // 标记用户所有通知为已读
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (error) throw error
  },

  // 获取组织智慧库文档
  async getOrganizationKnowledgeBase(organizationId: string): Promise<Document | null> {
    console.log('📚 获取组织智慧库文档:', { organizationId })
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('title', '组织智慧库')
      .is('project_id', null) // 组织级文档不关联具体项目
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ 获取组织智慧库失败:', error)
      throw error
    }
    
    if (!data) {
      console.log('📝 组织智慧库不存在')
      return null
    }
    
    console.log('✅ 获取组织智慧库成功')
    return data
  },

  // 获取组织的所有文档（包括组织级和项目级）
  async getOrganizationAllDocuments(organizationId: string): Promise<Document[]> {
    console.log('📚 获取组织所有文档:', { organizationId })
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ 获取组织文档失败:', error)
      throw error
    }
    
    console.log('✅ 获取组织文档成功，文档数量:', data?.length || 0)
    return data || []
  },

  // 删除组织
  async deleteOrganization(organizationId: string, userId: string): Promise<void> {
    console.log('🗑️ 删除组织:', { organizationId, userId })
    
    // 1. 检查用户是否为组织管理员
    const userRole = await this.getUserRoleInOrganization(userId, organizationId)
    if (userRole !== 'admin') {
      throw new Error('只有组织管理员才能删除组织')
    }
    
    // 2. 检查组织是否还有项目
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', organizationId)
    
    if (projectError) {
      console.error('❌ 检查组织项目失败:', projectError)
      throw projectError
    }
    
    if (projects && projects.length > 0) {
      throw new Error('无法删除组织：组织内还有项目，请先删除所有项目')
    }
    
    // 3. 删除组织相关数据（按依赖关系顺序删除）
    try {
      // 删除组织文档（包括组织智慧库）
      const { error: docsError } = await supabase
        .from('documents')
        .delete()
        .eq('organization_id', organizationId)
      
      if (docsError) {
        console.error('❌ 删除组织文档失败:', docsError)
        throw docsError
      }
      
      // 删除组织加入申请
      const { error: requestsError } = await supabase
        .from('organization_join_requests')
        .delete()
        .eq('organization_id', organizationId)
      
      if (requestsError) {
        console.error('❌ 删除组织申请失败:', requestsError)
        throw requestsError
      }
      
      // 删除用户-组织关联
      const { error: membersError } = await supabase
        .from('user_organizations')
        .delete()
        .eq('organization_id', organizationId)
      
      if (membersError) {
        console.error('❌ 删除组织成员关系失败:', membersError)
        throw membersError
      }
      
      // 最后删除组织本身
      const { error: orgError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId)
      
      if (orgError) {
        console.error('❌ 删除组织失败:', orgError)
        throw orgError
      }
      
      console.log('✅ 组织删除成功')
      
    } catch (error) {
      console.error('❌ 删除组织过程中出现错误:', error)
      throw error
    }
  },

  // ===== 文档管理 API =====
  
  // 创建文档（自动关联组织ID）
  async createDocument(
    projectId: string,
    userId: string,
    title: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<Document> {
    // 获取项目信息以获取organization_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()
    
    if (projectError) throw projectError
    
    const { data, error } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        user_id: userId,
        organization_id: project.organization_id,
        title,
        content,
        metadata,
        embedding: null
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 获取组织的所有文档
  async getOrganizationDocuments(organizationId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 获取项目的所有文档
  async getProjectDocuments(projectId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // ===== 聊天记录管理 API =====
  
  // 删除单条聊天记录
  async deleteChatRecord(recordId: string): Promise<void> {
    console.log('🗑️ 删除聊天记录:', recordId)
    
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('id', recordId)
    
    if (error) {
      console.error('❌ 删除聊天记录失败:', error)
      throw error
    }
    
    console.log('✅ 聊天记录删除成功')
  },

  // 清空用户消息内容（保留AI回复）
  async clearUserMessage(userContent: string, timestamp: Date, userId: string): Promise<void> {
    console.log('🗑️ 清空用户消息:', { userContent, timestamp, userId })
    
    // 查找匹配的聊天记录
    const { data: records, error: findError } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .eq('content', userContent)
      .gte('created_at', new Date(timestamp.getTime() - 5000).toISOString())
      .lte('created_at', new Date(timestamp.getTime() + 5000).toISOString())
    
    if (findError) {
      console.error('❌ 查找聊天记录失败:', findError)
      throw findError
    }
    
    if (!records || records.length === 0) {
      console.log('⚠️ 未找到匹配的聊天记录')
      return
    }
    
    // 清空用户消息内容并检查是否需要删除记录
    for (const record of records) {
      // 先检查AI回复是否为空
      const aiContentEmpty = !record.ai_content || record.ai_content.trim() === ''
      
      if (aiContentEmpty) {
        // 如果AI回复也为空，直接删除整条记录
        await this.deleteChatRecord(record.id)
        console.log('✅ 记录已完全删除（AI回复也为空）')
      } else {
        // 如果AI回复不为空，只清空用户消息
        const { error: updateError } = await supabase
          .from('chat_history')
          .update({ content: '' })
          .eq('id', record.id)
        
        if (updateError) {
          console.error('❌ 清空用户消息失败:', updateError)
          throw updateError
        }
        console.log('✅ 用户消息已清空，AI回复保留')
      }
    }
    
    console.log('✅ 用户消息清空操作完成')
  },

  // 清空AI回复内容（保留用户消息）- 改为通过时间戳范围查找
  async clearAIMessage(originalUserContent: string, timestamp: Date, userId: string): Promise<void> {
    console.log('🗑️ 清空AI回复:', { originalUserContent, timestamp, userId })
    
    // 通过时间戳范围查找聊天记录，不依赖content内容
    const { data: records, error: findError } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(timestamp.getTime() - 10000).toISOString()) // 扩大到前后10秒
      .lte('created_at', new Date(timestamp.getTime() + 10000).toISOString())
    
    if (findError) {
      console.error('❌ 查找聊天记录失败:', findError)
      throw findError
    }
    
    if (!records || records.length === 0) {
      console.log('⚠️ 未找到匹配的聊天记录')
      return
    }
    
    console.log('🔍 找到的记录:', records.map(r => ({ 
      id: r.id, 
      content: r.content?.substring(0, 50) + '...', 
      ai_content: r.ai_content?.substring(0, 50) + '...',
      created_at: r.created_at 
    })))
    
    // 清空AI回复内容并检查是否需要删除记录
    for (const record of records) {
      // 检查这条记录是否有AI回复内容
      if (!record.ai_content || record.ai_content.trim() === '') {
        console.log('⚠️ 记录中AI回复已为空，跳过:', record.id)
        continue
      }
      
      // 先检查用户消息是否为空
      const userContentEmpty = !record.content || record.content.trim() === ''
      
      if (userContentEmpty) {
        // 如果用户消息也为空，直接删除整条记录
        await this.deleteChatRecord(record.id)
        console.log('✅ 记录已完全删除（用户消息也为空）:', record.id)
      } else {
        // 如果用户消息不为空，只清空AI回复
        const { error: updateError } = await supabase
          .from('chat_history')
          .update({ ai_content: '' })
          .eq('id', record.id)
        
        if (updateError) {
          console.error('❌ 清空AI回复失败:', updateError)
          throw updateError
        }
        console.log('✅ AI回复已清空，用户消息保留:', record.id)
      }
    }
    
    console.log('✅ AI回复清空操作完成')
  },

  // 检查并删除空记录（当用户消息和AI回复都为空时）- 保留此方法以备其他地方使用
  async checkAndDeleteEmptyRecord(recordId: string): Promise<void> {
    const { data: record, error: getError } = await supabase
      .from('chat_history')
      .select('content, ai_content')
      .eq('id', recordId)
      .single()
    
    if (getError) {
      console.error('❌ 获取记录失败:', getError)
      return
    }
    
    // 如果用户消息和AI回复都为空，删除整条记录
    if ((!record.content || record.content.trim() === '') && 
        (!record.ai_content || record.ai_content.trim() === '')) {
      await this.deleteChatRecord(recordId)
      console.log('✅ 空记录已删除')
    }
  },

  // 根据用户消息内容和时间戳删除对应的AI回复（保留原方法以兼容）
  async deleteChatPair(userContent: string, timestamp: Date, userId: string): Promise<void> {
    console.log('🗑️ 删除聊天对话对:', { userContent, timestamp, userId })
    
    // 查找匹配的聊天记录（用户消息和AI回复通常在同一条记录中）
    const { data: records, error: findError } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .eq('content', userContent)
      .gte('created_at', new Date(timestamp.getTime() - 5000).toISOString()) // 前后5秒范围
      .lte('created_at', new Date(timestamp.getTime() + 5000).toISOString())
    
    if (findError) {
      console.error('❌ 查找聊天记录失败:', findError)
      throw findError
    }
    
    if (!records || records.length === 0) {
      console.log('⚠️ 未找到匹配的聊天记录')
      return
    }
    
    // 删除找到的记录
    for (const record of records) {
      await this.deleteChatRecord(record.id)
    }
    
    console.log('✅ 聊天对话对删除成功')
  }
}
