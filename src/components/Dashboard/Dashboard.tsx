import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Project, Task } from '@/lib/supabase'
import { Sidebar } from './Sidebar'
import { ProjectGrid } from './ProjectGrid'
import { TaskList } from './TaskList'
import { AIChat } from './AIChat'
import { Plus, MessageSquare } from 'lucide-react'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAIChat, setShowAIChat] = useState(false)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      // 获取用户参与的项目
      const { data: memberData } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', user.id)

      if (memberData) {
        const userProjects = memberData.map(item => item.projects).filter(Boolean) as Project[]
        setProjects(userProjects)
      }

      // 获取用户的任务
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, projects(name)')
        .eq('assignee_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })

      if (taskData) {
        setMyTasks(taskData)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
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
            <button className="btn-primary flex items-center gap-2">
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
              <ProjectGrid projects={projects} />
            </div>
          </div>
        </div>
      </div>

      {/* AI聊天弹窗 */}
      {showAIChat && (
        <AIChat onClose={() => setShowAIChat(false)} />
      )}
    </div>
  )
} 