import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Project, Task, Organization, organizationAPI } from '@/lib/supabase'
import { ProjectGrid } from './ProjectGrid'
import { CompactTaskList } from './CompactTaskList'
import { AIChat } from './AIChat'
import { CreateProjectModal } from './CreateProjectModal'
import { EditDescriptionModal } from './EditDescriptionModal'
import { generatePath } from '@/config/routes'
import { useOrganizationCache } from '@/hooks/use-data-cache'
import { Plus, Building2, Users, Trophy, RefreshCw } from 'lucide-react'
import { FloatingChatBot } from './FloatingChatBot'

interface DashboardProps {
  organization?: Organization
}

export function Dashboard({ organization }: DashboardProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { 
    fetchOrganizationProjectsWithCache, 
    fetchUserTasksWithCache, 
    fetchUserOrganizationsWithCache,
    clearOrganizationCache 
  } = useOrganizationCache()
  
  const [projects, setProjects] = useState<Project[]>([])  // 所有项目
  const [myCreatedProjects, setMyCreatedProjects] = useState<Project[]>([])  // 我创建的项目
  const [organizationProjects, setOrganizationProjects] = useState<Project[]>([])  // 组织中其他成员创建的项目
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [showEditDescription, setShowEditDescription] = useState(false)
  const [editingProject, setEditingProject] = useState<{id: string, name: string, description: string} | null>(null)
  const [updatingDescription, setUpdatingDescription] = useState(false)
  const [userProjectPermissions, setUserProjectPermissions] = useState<Record<string, 'manager' | 'member' | 'none'>>({})
  const [isOrganizationMember, setIsOrganizationMember] = useState(false)

  useEffect(() => {
    if (user && organization) {
      // 组件加载完成，设置loading为false
      setLoading(false)
      loadDashboardData()
    }
  }, [user, organization])

  const loadDashboardData = async (forceRefresh = false) => {
    if (!user || !organization) return

    try {
      console.log(`🔄 开始加载仪表板数据 ${forceRefresh ? '(强制刷新)' : '(使用缓存)'}`)
      
      // 使用缓存获取当前组织的项目
      const projects = await fetchOrganizationProjectsWithCache(
        organization.id, 
        user.id,
        () => organizationAPI.getOrganizationProjects(organization.id, user.id)
      )
      setProjects(projects)

      // 获取用户在各项目中的权限
      const permissions: Record<string, 'manager' | 'member' | 'none'> = {}
      for (const project of projects) {
        try {
          const role = await organizationAPI.getUserProjectRole(project.id, user.id)
          // 将项目角色映射到权限类型
          if (role === 'manager') {
            permissions[project.id] = 'manager'
          } else if (role) {
            // 只要有任何角色（如 member/developer/tester/designer 等），都视为成员
            permissions[project.id] = 'member'
          } else {
            permissions[project.id] = 'none'
          }
        } catch (error) {
          console.error(`获取项目 ${project.id} 权限失败:`, error)
          permissions[project.id] = 'none'
        }
      }
      setUserProjectPermissions(permissions)
      
      // 分离我的项目（创建的+加入的）和组织中其他项目（我未参与的）
      const myProjectsList = projects.filter(project => {
        // 检查是否是我创建的项目，或者我是项目成员
        return project.creator_id === user.id || permissions[project.id] !== 'none'
      })
      
      const organizationList = projects.filter(project => {
        // 组织项目：不是我创建的，且我没有参与的项目
        return project.creator_id !== user.id && permissions[project.id] === 'none'
      })
      
      setMyCreatedProjects(myProjectsList)
      setOrganizationProjects(organizationList)
      
      console.log(`🔍 项目分类结果:`, {
        总项目数: projects.length,
        我的项目: myProjectsList.length,
        组织项目: organizationList.length
      })

      // 使用缓存检查用户是否是该组织的成员
      try {
        const userOrgs = await fetchUserOrganizationsWithCache(
          user.id,
          () => organizationAPI.getUserOrganizations(user.id)
        )
        const isMember = userOrgs.some(userOrg => userOrg.id === organization.id)
        setIsOrganizationMember(isMember)
        console.log(`🔍 用户 ${user.id} 在组织 ${organization.name} 的成员身份: ${isMember ? '是成员' : '非成员'}`)
      } catch (error) {
        console.error('检查组织成员身份失败:', error)
        setIsOrganizationMember(false)
      }

      // 获取分配给当前用户的任务
      await loadUserTasks(forceRefresh)
      
    } catch (error) {
      console.error('❌ 加载仪表板数据失败:', error)
      setProjects([])
      setMyTasks([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadUserTasks = async (forceRefresh = false) => {
    if (!user) return

    try {
      console.log(`📋 开始加载用户任务... ${forceRefresh ? '(强制刷新)' : '(使用缓存)'}`)
      
      // 使用缓存获取分配给当前用户的任务
      const userTasks = await fetchUserTasksWithCache(
        user.id,
        async () => {
          const { data, error } = await supabase
            .from('tasks')
            .select(`
              *,
              project:projects!tasks_project_id_fkey(id, name)
            `)
            .eq('assignee_id', user.id)
            .order('created_at', { ascending: false })

          if (error) {
            console.error('❌ 获取用户任务失败:', error)
            throw error
          }

          return data || []
        }
      )

      console.log('📋 用户任务查询结果:', userTasks)
      setMyTasks(userTasks)
      
    } catch (error) {
      console.error('❌ 加载用户任务失败:', error)
      setMyTasks([])
    }
  }

  // 手动刷新数据
  const handleRefresh = async () => {
    if (!user || !organization) return
    
    setRefreshing(true)
    console.log('🔄 手动刷新数据，清除缓存')
    
    // 清除相关缓存
    clearOrganizationCache(organization.id, user.id)
    
    // 强制重新加载数据
    await loadDashboardData(true)
  }

  const handleCreateProject = async (projectName: string, description?: string) => {
    if (!user || !organization) return

    console.log('🚀 开始创建项目调试信息:')
    console.log('用户ID:', user.id)
    console.log('组织ID:', organization.id)
    console.log('组织名称:', organization.name)
    console.log('是否组织成员:', isOrganizationMember)
    console.log('项目名称:', projectName)

    setCreatingProject(true)
    
    try {
      // 第一步：创建项目
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            name: projectName,
            description: description || '',
            status: 'active',
            is_public: false,
            is_recruiting: false,
            creator_id: user.id,
            organization_id: organization.id,
            settings: {}
          }
        ])
        .select()
        .single()

      if (projectError) {
        console.error('❌ 项目创建失败，详细错误信息:', projectError)
        console.error('错误代码:', projectError.code)
        console.error('错误消息:', projectError.message)
        console.error('错误详情:', projectError.details)
        throw projectError
      }

      console.log('✅ 项目创建成功:', project)

      // 第二步：为项目创建智慧库文档
      try {
        await organizationAPI.createKnowledgeBaseForNewProject(project.id, user.id)
        console.log('✅ 项目智慧库文档创建成功')
      } catch (docError) {
        console.error('⚠️ 创建智慧库文档失败，但项目创建成功:', docError)
        // 不阻止项目创建流程
      }

      // 第三步：添加创建者为项目成员
      const { error: memberError } = await supabase
        .from('project_members')
        .insert([
          {
            project_id: project.id,
            user_id: user.id,
            role_in_project: 'manager'
          }
        ])

      if (memberError) {
        console.error('项目成员添加失败:', memberError)
        // 不抛出错误，项目已创建成功
      }

      // 清除缓存并重新加载数据
      clearOrganizationCache(organization.id, user.id)
      await loadDashboardData(true)
      setShowCreateProject(false)
      
    } catch (error: any) {
      console.error('❌ 创建项目过程中出错:', error)
      console.error('错误类型:', typeof error)
      console.error('错误对象:', JSON.stringify(error, null, 2))
      
      let errorMessage = '未知错误'
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error_description) {
        errorMessage = error.error_description
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      alert(`创建项目失败: ${errorMessage}`)
    } finally {
      setCreatingProject(false)
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!user) return
    
    // 确认删除
    const confirmDelete = window.confirm(`确定要删除项目"${projectName}"吗？此操作将同时删除项目中的所有文档，且无法恢复。`)
    if (!confirmDelete) return

    try {
      console.log('🗑️ 开始删除项目:', projectId)
      
      // 第一步：删除documents表中的相关数据
      console.log('📄 删除项目文档...')
      const { data: deletedDocs, error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('project_id', projectId)
        .select()

      if (documentsError) {
        console.error('❌ 删除文档失败:', documentsError)
        throw documentsError
      }
      console.log('📄 删除的文档数量:', deletedDocs?.length || 0)

      // 第二步：删除project_members表中的相关数据
      console.log('👥 删除项目成员...')
      const { data: deletedMembers, error: membersError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .select()

      if (membersError) {
        console.error('❌ 删除项目成员失败:', membersError)
        throw membersError
      }
      console.log('👥 删除的成员数量:', deletedMembers?.length || 0)

      // 第三步：删除projects表中的项目
      console.log('📁 删除项目...')
      const { data: deletedProject, error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('creator_id', user.id) // 确保只能删除自己创建的项目
        .select()

      if (projectError) {
        console.error('❌ 删除项目失败:', projectError)
        throw projectError
      }
      console.log('📁 删除的项目:', deletedProject)

      console.log('✅ 项目删除成功！')
      
      // 清除缓存并重新加载数据
      console.log('🔄 开始重新加载数据...')
      clearOrganizationCache(organization.id, user.id)
      await loadDashboardData(true)
      console.log('🔄 数据重新加载完成')
      
    } catch (error) {
      console.error('❌ 删除项目失败:', error)
      alert('删除项目失败，请重试')
    }
  }

  const handleEditDescription = (projectId: string, projectName: string, currentDescription: string) => {
    setEditingProject({ id: projectId, name: projectName, description: currentDescription })
    setShowEditDescription(true)
  }

  const handleUpdateDescription = async (newDescription: string) => {
    if (!user || !editingProject) return

    setUpdatingDescription(true)
    try {
      console.log('✏️ 更新项目描述:', editingProject.id, newDescription)
      
      const { error } = await supabase
        .from('projects')
        .update({ description: newDescription })
        .eq('id', editingProject.id)
        .eq('creator_id', user.id) // 确保只能编辑自己的项目

      if (error) {
        console.error('❌ 更新描述失败:', error)
        throw error
      }

      console.log('✅ 描述更新成功！')
      
      // 清除缓存并重新加载数据
      clearOrganizationCache(organization.id, user.id)
      await loadDashboardData(true)
      setShowEditDescription(false)
      setEditingProject(null)
      
    } catch (error) {
      console.error('❌ 更新描述失败:', error)
      alert('更新描述失败，请重试')
    } finally {
      setUpdatingDescription(false)
    }
  }

  const handleProjectClick = (project: Project) => {
    if (!organization) return
    // 跳转到项目详情页面
    navigate(generatePath.projectDetail(organization.id, project.id))
  }

  const handleTaskStatusChange = (taskId: string, newStatus: string) => {
    // 只更新本地任务状态，避免重新加载整个页面
    setMyTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus as Task['status'] } : task
    ))
  }

  const handleTogglePublic = async (projectId: string, isPublic: boolean) => {
    if (!user) return

    try {
      console.log('🔄 切换项目可见性:', projectId, isPublic ? '公开' : '私有')
      
      const { error } = await supabase
        .from('projects')
        .update({ is_public: isPublic })
        .eq('id', projectId)
        .eq('creator_id', user.id) // 确保只能修改自己的项目

      if (error) {
        console.error('❌ 切换项目可见性失败:', error)
        throw error
      }

      console.log('✅ 项目可见性切换成功！')
      
      // 清除缓存并重新加载数据
      clearOrganizationCache(organization.id, user.id)
      await loadDashboardData(true)
      
    } catch (error) {
      console.error('❌ 切换项目可见性失败:', error)
      alert('切换项目可见性失败，请重试')
    }
  }

  const handleToggleRecruiting = async (projectId: string, isRecruiting: boolean) => {
    if (!user) return

    try {
      console.log('🔄 切换项目招募状态:', projectId, isRecruiting ? '招募中' : '停止招募')
      
      const { error } = await supabase
        .from('projects')
        .update({ is_recruiting: isRecruiting })
        .eq('id', projectId)
        .eq('creator_id', user.id) // 确保只能修改自己的项目

      if (error) {
        console.error('❌ 切换项目招募状态失败:', error)
        throw error
      }

      console.log('✅ 项目招募状态切换成功！')
      
      // 清除缓存并重新加载数据
      clearOrganizationCache(organization.id, user.id)
      await loadDashboardData(true)
      
    } catch (error) {
      console.error('❌ 切换项目招募状态失败:', error)
      alert('切换项目招募状态失败，请重试')
    }
  }

  const handleApplyToJoin = async (projectId: string, projectName: string) => {
    if (!user) return

    // 简单的确认对话框
    const message = prompt(`请输入申请加入项目 "${projectName}" 的理由：`, '我希望加入这个项目并贡献我的技能')
    if (!message) return

    try {
      console.log('📋 申请加入项目:', projectId, projectName)
      
      const { error } = await supabase
        .from('project_join_requests')
        .insert([
          {
            project_id: projectId,
            user_id: user.id,
            message: message,
            status: 'pending'
          }
        ])

      if (error) {
        console.error('❌ 申请加入项目失败:', error)
        throw error
      }

      console.log('✅ 申请发送成功！')
      alert('申请已发送，请等待项目管理员审核')
      
    } catch (error: any) {
      console.error('❌ 申请加入项目失败:', error)
      if (error.code === '23505') {
        alert('您已经申请过此项目，请等待审核结果')
      } else {
        alert(`申请失败：${error.message || '请重试'}`)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* 主内容区 */}
      <div className="flex-1">
            <>
              {/* 页头 */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary-100 rounded-xl">
                    <Building2 className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-secondary-900">
                      {organization?.name || '组织工作台'}
                    </h1>
                    <p className="text-secondary-600">
                      欢迎回来，{user?.name || '用户'}！
                    </p>
                  </div>
                </div>
                <p className="text-secondary-600">
                  您有 {myTasks.length} 个待处理任务，{myCreatedProjects.length} 个我的项目，{organizationProjects.length} 个组织项目
                </p>
              </div>

              {/* 提示信息 */}
              {!isOrganizationMember && (
                <div className="mb-8">
                  <div className="text-sm text-secondary-500 italic px-3 py-2 bg-secondary-50 rounded-lg inline-block">
                    只有组织成员才能创建项目
                  </div>
                </div>
              )}

              {/* 主要内容布局 */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* 左侧：我的任务 */}
                <div className="xl:col-span-1">
                                      <CompactTaskList 
                      tasks={myTasks} 
                      projects={myCreatedProjects}
                      userId={user?.id}
                      onTaskStatusChange={handleTaskStatusChange}
                      onTaskUpdate={() => loadUserTasks(true)} 
                    />
                </div>
                
                {/* 右侧：项目区域 */}
                <div className="xl:col-span-3 space-y-6">
                  {/* 我创建的项目 */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Users className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-secondary-900">
                          我的项目 ({myCreatedProjects.length})
                        </h2>
                        <p className="text-sm text-secondary-600">
                          您创建和参与的项目
                        </p>
                      </div>
                      {isOrganizationMember && (
                        <button 
                          onClick={() => setShowCreateProject(true)}
                          className="ml-auto btn-primary flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          创建项目
                        </button>
                      )}
                    </div>
                    
                    {myCreatedProjects.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-lg border border-secondary-200">
                        <Trophy className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                        <h3 className="font-semibold text-secondary-900 mb-2">
                          {isOrganizationMember ? '创建您的第一个项目' : '暂无项目'}
                        </h3>
                        <p className="text-secondary-600">
                          {isOrganizationMember ? '开始您的第一个项目吧！' : '您还没有在此组织创建任何项目'}
                        </p>
                        {isOrganizationMember && (
                          <button 
                            onClick={() => setShowCreateProject(true)}
                            className="mt-4 btn-primary"
                          >
                            创建项目
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="card">
                        <ProjectGrid 
                          projects={myCreatedProjects} 
                          onDeleteProject={handleDeleteProject}
                          onEditDescription={handleEditDescription}
                          onProjectClick={handleProjectClick}
                          onTogglePublic={handleTogglePublic}
                          onToggleRecruiting={handleToggleRecruiting}
                          userProjectPermissions={userProjectPermissions}
                          showCreateButton={false}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* 组织项目 */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-secondary-900">
                          组织项目 ({organizationProjects.length})
                        </h2>
                        <p className="text-sm text-secondary-600">
                          您尚未参与的组织项目
                        </p>
                      </div>
                    </div>
                    
                    {organizationProjects.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-lg border border-secondary-200">
                        <Building2 className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                        <h3 className="font-semibold text-secondary-900 mb-2">
                          暂无组织项目
                        </h3>
                        <p className="text-secondary-600">
                          组织中暂无您未参与的项目
                        </p>
                      </div>
                    ) : (
                      <div className="card">
                        <ProjectGrid 
                          projects={organizationProjects} 
                          onProjectClick={handleProjectClick}
                          onApplyToJoin={handleApplyToJoin}
                          userProjectPermissions={userProjectPermissions}
                          showCreateButton={false}
                          showEditControls={false}
                          showApplyButton={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
      </div>

      {/* 统一的悬浮聊天机器人 */}
      <FloatingChatBot organization={organization} />

      {/* 创建项目弹窗 */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onConfirm={handleCreateProject}
        loading={creatingProject}
      />

      {/* 编辑描述弹窗 */}
      {showEditDescription && editingProject && (
        <EditDescriptionModal
          isOpen={showEditDescription}
          onClose={() => {
            setShowEditDescription(false)
            setEditingProject(null)
          }}
          onConfirm={handleUpdateDescription}
          projectName={editingProject.name}
          currentDescription={editingProject.description}
          loading={updatingDescription}
        />
      )}

    </div>
  )
} 