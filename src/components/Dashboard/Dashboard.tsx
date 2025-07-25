import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Project, Task } from '@/lib/supabase'
import { Sidebar } from './Sidebar'
import { ProjectGrid } from './ProjectGrid'
import { TaskList } from './TaskList'
import { AIChat } from './AIChat'
import { CreateProjectModal } from './CreateProjectModal'
import { Plus, MessageSquare } from 'lucide-react'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAIChat, setShowAIChat] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      console.log('📊 开始加载仪表板数据 (本地模式)...')
      
      // 本地模式：初始化为空数组
      console.log('📁 初始化空项目列表')
      setProjects([])

      // 任务也初始化为空
      console.log('📋 初始化空任务列表')
      setMyTasks([])
      
    } catch (error) {
      console.error('❌ 加载仪表板数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (projectName: string) => {
    if (!user) return

    setCreatingProject(true)
    console.log('🚀 开始创建项目 (本地模式):', projectName)
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      // 创建本地项目对象
      const newProject: Project = {
        id: `project_${Date.now()}`, // 临时ID
        name: projectName,
        description: '',
        status: 'active',
        is_public: false,
        is_recruiting: false,
        creator_id: user.id,
        organization_id: '00000000-0000-0000-0000-000000000000',
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('✅ 本地项目创建成功:', newProject)

      // 添加到本地状态
      setProjects(prevProjects => [newProject, ...prevProjects])
      setShowCreateProject(false)
      console.log('🎉 项目创建完成!')
      
    } catch (error) {
      console.error('❌ 创建项目过程中出错:', error)
      alert(`创建项目失败: ${error.message || '未知错误'}`)
    } finally {
      setCreatingProject(false)
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
    <div className="min-h-screen bg-secondary-50 flex">
      {/* 侧边栏 */}
      <Sidebar user={user} onSignOut={signOut} />
      
      {/* 主内容区 */}
      <div className="flex-1 lg:ml-64">
        <div className="p-6">
          {/* 页头 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">
              欢迎回来，{user?.name || '用户'}！
            </h1>
            <p className="text-secondary-600">
              您有 {myTasks.length} 个待处理任务，{projects.length} 个活跃项目
            </p>
          </div>

          {/* 快速操作按钮 */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button 
              onClick={() => setShowCreateProject(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              创建项目
            </button>
            <button 
              onClick={() => setShowAIChat(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              与AI对话
            </button>
          </div>

          {/* 主要内容网格 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 我的任务 */}
            <div className="xl:col-span-1">
              <TaskList tasks={myTasks} onTaskUpdate={loadDashboardData} />
            </div>
            
            {/* 我的项目 */}
            <div className="xl:col-span-2">
              <ProjectGrid 
                projects={projects} 
                onCreateProject={() => setShowCreateProject(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI聊天弹窗 */}
      {showAIChat && (
        <AIChat onClose={() => setShowAIChat(false)} />
      )}

      {/* 创建项目弹窗 */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onConfirm={handleCreateProject}
        loading={creatingProject}
      />
    </div>
  )
} 