import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Project, Task, Organization, organizationAPI } from '@/lib/supabase'
import { ProjectGrid } from './ProjectGrid'
import { CompactTaskList } from './CompactTaskList'
import { AIChat } from './AIChat'
import { CreateProjectModal } from './CreateProjectModal'
import { EditDescriptionModal } from './EditDescriptionModal'
import { Plus, MessageSquare, Building2, Users, Trophy } from 'lucide-react'

interface DashboardProps {
  organization?: Organization
}

export function Dashboard({ organization }: DashboardProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])  // 所有项目
  const [myCreatedProjects, setMyCreatedProjects] = useState<Project[]>([])  // 我创建的项目
  const [organizationProjects, setOrganizationProjects] = useState<Project[]>([])  // 组织中其他成员创建的项目
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAIChat, setShowAIChat] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [showEditDescription, setShowEditDescription] = useState(false)
  const [editingProject, setEditingProject] = useState<{id: string, name: string, description: string} | null>(null)
  const [updatingDescription, setUpdatingDescription] = useState(false)
  const [userProjectPermissions, setUserProjectPermissions] = useState<Record<string, 'manager' | 'member' | 'none'>>({})
  const [isOrganizationMember, setIsOrganizationMember] = useState(false)

  useEffect(() => {
    if (user && organization) {
      loadDashboardData()
    }
  }, [user, organization])

  const loadDashboardData = async () => {
    if (!user || !organization) return

    setLoading(true)
    try {
      // 获取当前组织的项目（用户参与的）
      const projects = await organizationAPI.getOrganizationProjects(organization.id, user.id)
      setProjects(projects)
      
      // 分离我创建的项目和组织中其他成员创建的项目
      const myCreatedList = projects.filter(project => project.creator_id === user.id)
      const organizationList = projects.filter(project => project.creator_id !== user.id)
      
      setMyCreatedProjects(myCreatedList)
      setOrganizationProjects(organizationList)
      
      console.log(`🔍 项目分类结果:`, {
        总项目数: projects.length,
        我创建的: myCreatedList.length,
        组织项目: organizationList.length
      })

      // 批量获取用户在各项目中的权限（性能优化）
      const permissions: Record<string, 'manager' | 'member' | 'none'> = {}
      if (projects.length > 0) {
        try {
          const projectIds = projects.map(p => p.id)
          const { data: memberRoles, error: rolesError } = await supabase
            .from('project_members')
            .select('project_id, role_in_project')
            .eq('user_id', user.id)
            .in('project_id', projectIds)
          
          if (rolesError) {
            console.error('批量获取项目权限失败:', rolesError)
            // 设置默认权限
            projects.forEach(project => {
              permissions[project.id] = 'none'
            })
          } else {
            // 处理查询结果
            projects.forEach(project => {
              const memberRole = memberRoles?.find(role => role.project_id === project.id)
              if (memberRole) {
                if (memberRole.role_in_project === 'manager') {
                  permissions[project.id] = 'manager'
                } else if (['developer', 'tester', 'designer'].includes(memberRole.role_in_project)) {
                  permissions[project.id] = 'member'
                } else {
                  permissions[project.id] = 'none'
                }
              } else {
                permissions[project.id] = 'none'
              }
            })
          }
        } catch (error) {
          console.error('批量权限查询出错:', error)
          projects.forEach(project => {
            permissions[project.id] = 'none'
          })
        }
      }
      setUserProjectPermissions(permissions)

      // 并行执行剩余的查询（性能优化）
      const myCreatedProjectIds = myCreatedList.map(p => p.id) // 只获取我创建的项目的任务
      const [orgMemberResult, tasksResult] = await Promise.allSettled([
        // 检查用户是否是该组织的成员
        organizationAPI.getUserOrganizations(user.id),
        // 加载用户在我创建的项目中的任务
        myCreatedProjectIds.length > 0 ? supabase
          .from('tasks')
          .select('*')
          .eq('assignee_id', user.id)
          .in('project_id', myCreatedProjectIds)
          .order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null })
      ])

      // 处理组织成员身份结果
      if (orgMemberResult.status === 'fulfilled') {
        const isMember = orgMemberResult.value.some(userOrg => userOrg.id === organization.id)
        setIsOrganizationMember(isMember)
        console.log(`🔍 用户在组织 ${organization.name} 的成员身份: ${isMember ? '是成员' : '非成员'}`)
      } else {
        console.error('检查组织成员身份失败:', orgMemberResult.reason)
        setIsOrganizationMember(false)
      }

      // 处理任务查询结果
      if (tasksResult.status === 'fulfilled') {
        const { data: userTasks, error: tasksError } = tasksResult.value
        if (tasksError) {
          console.error('加载任务失败:', tasksError)
          setMyTasks([])
        } else {
          setMyTasks(userTasks || [])
        }
      } else {
        console.error('加载任务出错:', tasksResult.reason)
        setMyTasks([])
      }
      
    } catch (error) {
      console.error('❌ 加载仪表板数据失败:', error)
      setProjects([])
      setMyTasks([])
    } finally {
      setLoading(false)
    }
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

      // 重新加载数据
      await loadDashboardData()
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
      
      // 重新加载数据
      console.log('🔄 开始重新加载数据...')
      await loadDashboardData()
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
      
      // 重新加载数据
      await loadDashboardData()
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
    navigate(`/organizations/${organization.id}/projects/${project.id}`)
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
      
      // 重新加载数据
      await loadDashboardData()
      
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
      
      // 重新加载数据
      await loadDashboardData()
      
    } catch (error) {
      console.error('❌ 切换项目招募状态失败:', error)
      alert('切换项目招募状态失败，请重试')
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

              {/* 快速操作按钮 */}
              <div className="flex flex-wrap gap-4 mb-8">
                <button 
                  onClick={() => setShowAIChat(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  与AI对话
                </button>
              </div>

              {/* 主要内容布局 */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* 左侧：我的任务 */}
                <div className="xl:col-span-1">
                  <CompactTaskList 
                    tasks={myTasks} 
                    projects={myCreatedProjects}
                    userId={user?.id}
                    onTaskStatusChange={handleTaskStatusChange}
                    onTaskUpdate={loadDashboardData} 
                  />
                </div>
                
                {/* 右侧：项目区域 */}
                <div className="xl:col-span-3 space-y-6">
                  {/* 我创建的项目 */}
                  <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Trophy className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-secondary-900">
                          我的项目 ({myCreatedProjects.length})
                        </h2>
                        <p className="text-sm text-secondary-600">
                          由我创建和管理的项目
                        </p>
                      </div>
                    </div>
                    {isOrganizationMember && (
                      <button 
                        onClick={() => setShowCreateProject(true)}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        创建项目
                      </button>
                    )}
                  </div>
                  
                  {myCreatedProjects.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-secondary-200">
                      <Trophy className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                      <h3 className="font-semibold text-secondary-900 mb-2">
                        还没有创建项目
                      </h3>
                      <p className="text-secondary-600 mb-4">
                        {isOrganizationMember ? '创建您的第一个项目开始协作' : '加入组织后即可创建项目'}
                      </p>
                      {isOrganizationMember && (
                        <button 
                          onClick={() => setShowCreateProject(true)}
                          className="btn-primary"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          创建项目
                        </button>
                      )}
                    </div>
                  ) : (
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
                  )}
                </div>
                
                {/* 组织项目 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-secondary-900">
                        组织项目 ({organizationProjects.length})
                      </h2>
                      <p className="text-sm text-secondary-600">
                        组织中其他成员创建的项目
                      </p>
                    </div>
                  </div>
                  
                  {organizationProjects.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-secondary-200">
                      <Users className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                      <h3 className="font-semibold text-secondary-900 mb-2">
                        暂无组织项目
                      </h3>
                      <p className="text-secondary-600">
                        组织中还没有其他成员创建的项目
                      </p>
                    </div>
                  ) : (
                    <ProjectGrid 
                      projects={organizationProjects} 
                      onProjectClick={handleProjectClick}
                      userProjectPermissions={userProjectPermissions}
                      showCreateButton={false}
                      showEditControls={false}
                    />
                  )}
                </div>
                </div>
              </div>
      </div>

      {/* AI聊天弹窗 */}
      {showAIChat && (
        <AIChat onClose={() => setShowAIChat(false)} organization={organization} />
      )}

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