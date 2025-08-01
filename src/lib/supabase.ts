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
    return data?.map(item => (item as any).organizations).filter(Boolean) || []
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
    
    // 先获取申请基本信息
    const { data: requests, error } = await supabase
      .from('organization_join_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
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

  // 调试功能：检查用户的组织成员关系
  async debugUserOrganizations(userId: string): Promise<void> {
    console.log('🔍 调试用户组织关系:')
    console.log('用户ID:', userId)
    
    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role_in_org,
        joined_at,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userId)
    
    if (error) {
      console.error('查询失败:', error)
      return
    }
    
    console.log('数据库中的组织关系:', data)
    if (data && data.length > 0) {
      data.forEach(rel => {
        console.log(`- 组织: ${rel.organizations?.name} (${rel.organization_id})`)
        console.log(`  角色: ${rel.role_in_org}`)
        console.log(`  加入时间: ${rel.joined_at}`)
      })
    } else {
      console.log('❌ 数据库中没有找到任何组织关系')
    }
  },

  // 调试功能：强制清理用户的组织关系（小心使用）
  async forceCleanUserOrganizations(userId: string, organizationId?: string): Promise<void> {
    console.log('⚠️ 强制清理用户组织关系')
    console.log('用户ID:', userId)
    
    let query = supabase
      .from('user_organizations')
      .delete()
      .eq('user_id', userId)
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
      console.log('清理特定组织:', organizationId)
    } else {
      console.log('清理所有组织关系')
    }
    
    const { error } = await query
    
    if (error) {
      console.error('清理失败:', error)
      throw error
    }
    
    console.log('✅ 清理完成')
  },

  // 调试功能：检查用户是否在数据库中存在
  async debugUserExists(userId: string): Promise<void> {
    console.log('🔍 检查用户是否在数据库中存在:')
    console.log('用户ID:', userId)
    
    // 检查认证用户信息
    const { data: authData, error: authError } = await supabase.auth.getUser()
    console.log('认证系统用户信息:', authData.user)
    console.log('认证错误:', authError)
    
    // 先查看users表结构，从现有用户中获取示例
    console.log('📋 查看users表结构...')
    const { data: sampleUsers, error: sampleError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    console.log('users表示例记录:', sampleUsers)
    console.log('示例查询错误:', sampleError)
    
    // 检查数据库中的用户记录
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    console.log('数据库用户查询结果:', { dbUser, dbError })
    
    if (dbError) {
      if (dbError.code === 'PGRST116') {
        console.log('❌ 数据库中没有找到用户记录')
        console.log('需要先创建用户记录')
      } else {
        console.log('❌ 查询用户记录时出错:', dbError)
      }
    } else {
      console.log('✅ 数据库中找到用户记录:', dbUser)
    }
  },

  // 自动创建用户记录（如果不存在）
  async ensureUserExists(userId: string, email: string, name?: string): Promise<void> {
    console.log('🔧 确保用户记录存在')
    console.log('参数:', { userId, email, name })
    
    // 先检查是否已存在
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('检查用户存在性失败:', checkError)
      throw checkError
    }
    
    if (existing) {
      console.log('✅ 用户记录已存在')
      return
    }
    
    // 创建用户记录（使用最少必需字段）
    console.log('📝 创建新用户记录...')
    const userData = {
      id: userId,
      email: email,
      name: name || email.split('@')[0],
    }
    console.log('用户数据:', userData)
    
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
    
    if (error) {
      console.error('❌ 创建用户记录失败:', error)
      throw error
    }
    
    console.log('✅ 用户记录创建成功:', data)
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
      
      query = query.or(`is_public.eq.true,id.in.(${memberProjectIds.join(',')})`)
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
    // 这里需要关联用户信息，但先返回基本数据
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
    
    // 获取这些项目的待审核申请
    const { data: requests, error: requestError } = await supabase
      .from('project_join_requests')
      .select(`
        *,
        user:users!project_join_requests_user_id_fkey(id, name, email),
        project:projects!project_join_requests_project_id_fkey(id, name)
      `)
      .in('project_id', projectIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (requestError) throw requestError
    return requests || []
  },

  // 审核项目加入申请
  async reviewProjectJoinRequest(requestId: string, status: 'approved' | 'rejected', reviewerId: string): Promise<void> {
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
      const { data: request } = await supabase
        .from('project_join_requests')
        .select('project_id, user_id')
        .eq('id', requestId)
        .single()
      
      if (request) {
        await supabase
          .from('project_members')
          .insert({
            project_id: request.project_id,
            user_id: request.user_id,
            role_in_project: 'developer', // 默认角色
            joined_at: new Date().toISOString()
          })
      }
    }
  },

  // 检查数据库中存在的表
  async checkDatabaseTables(): Promise<void> {
    console.log('🔍 检查数据库中的表...')
    
    // 尝试查询各个表，看哪些存在
    const tables = [
      'users',
      'organizations', 
      'user_organizations',
      'organization_join_requests',
      'project_join_requests',
      'projects'
    ]
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) {
          console.error(`❌ 表 ${tableName} 不存在或查询失败:`, error.message)
        } else {
          console.log(`✅ 表 ${tableName} 存在，记录数示例:`, data?.length || 0)
        }
      } catch (err) {
        console.error(`❌ 表 ${tableName} 查询出错:`, err)
      }
    }
  },

  // 调试功能：检查数据库中的申请数据
  async debugDatabaseState(): Promise<void> {
    console.log('🔍 === 数据库状态调试 ===')
    
    // 1. 检查所有用户
    console.log('👥 检查用户表...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(10)
    console.log('用户:', users)
    if (usersError) console.error('用户查询错误:', usersError)
    
    // 2. 检查所有组织
    console.log('🏢 检查组织表...')
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, description, created_at')
      .limit(10)
    console.log('组织:', orgs)
    if (orgsError) console.error('组织查询错误:', orgsError)
    
    // 3. 检查用户-组织关系（匹配实际表结构）
    console.log('🤝 检查用户-组织关系...')
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select(`
        id,
        user_id,
        organization_id,
        role_in_org,
        joined_at,
        created_at
      `)
      .limit(10)
    console.log('用户-组织关系（原始数据）:', userOrgs)
    if (userOrgsError) console.error('用户-组织关系查询错误:', userOrgsError)
    
    // 4. 检查所有组织加入申请
    console.log('📝 检查组织加入申请...')
    const { data: requests, error: requestsError } = await supabase
      .from('organization_join_requests')
      .select(`
        id,
        user_id,
        organization_id,
        status,
        message,
        created_at,
        reviewed_at,
        reviewed_by
      `)
      .order('created_at', { ascending: false })
      .limit(10)
    console.log('组织加入申请（原始数据）:', requests)
    if (requestsError) console.error('申请查询错误:', requestsError)
    
    console.log('🔍 === 数据库状态调试结束 ===')
  },

  // 更新组织名称
  async updateOrganizationName(organizationId: string, newName: string, userId: string): Promise<void> {
    console.log('🔧 更新组织名称:', { organizationId, newName, userId })
    
    // 检查用户是否为组织管理员
    const userRole = await this.getUserRoleInOrganization(userId, organizationId)
    if (userRole !== 'admin') {
      throw new Error('只有组织管理员可以修改组织名称')
    }
    
    const { error } = await supabase
      .from('organizations')
      .update({ name: newName })
      .eq('id', organizationId)
    
    if (error) {
      console.error('❌ 更新组织名称失败:', error)
      throw error
    }
    
    console.log('✅ 组织名称更新成功')
  },

  // 更新项目名称
  async updateProjectName(projectId: string, newName: string, userId: string): Promise<void> {
    console.log('🔧 更新项目名称:', { projectId, newName, userId })
    
    // 检查用户是否为项目管理员
    const userRole = await this.getUserProjectRole(projectId, userId)
    if (userRole !== 'manager') {
      throw new Error('只有项目管理员可以修改项目名称')
    }
    
    const { error } = await supabase
      .from('projects')
      .update({ name: newName })
      .eq('id', projectId)
    
    if (error) {
      console.error('❌ 更新项目名称失败:', error)
      throw error
    }
    
    console.log('✅ 项目名称更新成功')
  },

  // 为新项目创建智慧库文档
  async createKnowledgeBaseForNewProject(projectId: string, userId: string): Promise<void> {
    console.log('📚 为新项目创建智慧库文档:', { projectId, userId })
    
    const { error } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        user_id: userId,
        title: '项目智慧库',
        content: '', // 改为空字符串而不是 null
        metadata: {},
        embedding: null
      })
    
    if (error) {
      console.error('❌ 创建智慧库文档失败:', error)
      throw error
    }
    
    console.log('✅ 智慧库文档创建成功')
  },

  // 测试函数：手动创建智慧库文档
  async testCreateKnowledgeBase(projectId: string, userId: string): Promise<void> {
    console.log('🧪 测试创建智慧库文档')
    try {
      await this.createKnowledgeBaseForNewProject(projectId, userId)
      console.log('🎉 测试成功！')
    } catch (error) {
      console.error('💥 测试失败:', error)
    }
  },

  // 删除组织（仅创建者可删除）
  async deleteOrganization(organizationId: string, userId: string): Promise<void> {
    // 1. 检查用户是否为组织管理员
    const { data: userOrg, error: checkError } = await supabase
      .from('user_organizations')
      .select('role_in_org')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()
    
    if (checkError || !userOrg || userOrg.role_in_org !== 'admin') {
      throw new Error('只有组织管理员可以删除组织')
    }

    // 2. 检查组织内是否还有项目
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', organizationId)
    
    if (projectError) throw projectError
    
    if (projects && projects.length > 0) {
      throw new Error('请先删除组织内的所有项目，然后再删除组织')
    }

    // 3. 删除用户-组织关联
    const { error: memberError } = await supabase
      .from('user_organizations')
      .delete()
      .eq('organization_id', organizationId)
    
    if (memberError) throw memberError

    // 4. 删除组织
    const { error: orgError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId)
    
    if (orgError) throw orgError
  }
} 