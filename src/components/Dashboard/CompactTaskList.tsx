import React, { useState, memo, useMemo, useEffect } from 'react'
import { Task, Project } from '@/lib/supabase'
import { CheckCircle, Circle, Clock, FolderOpen, Plus, X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface CompactTaskListProps {
  tasks: Task[]
  projects: Project[]
  userId?: string
  onTaskUpdate?: () => void
  onTaskStatusChange?: (taskId: string, newStatus: string) => void
}

/**
 * 任务紧凑列表
 * - 点击行内圆圈：切换完成/未完成
 * - 点击行内其他区域：打开简约详情抽屉
 */
export const CompactTaskList = memo(function CompactTaskList({ tasks, projects, userId, onTaskUpdate, onTaskStatusChange }: CompactTaskListProps) {
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set())
  const [animatingTasks, setAnimatingTasks] = useState<Set<string>>(new Set())
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set()) // 完全隐藏的任务
  const [addingTaskToProject, setAddingTaskToProject] = useState<string | null>(null) // 正在添加任务的项目
  const [newTaskTitle, setNewTaskTitle] = useState('') // 新任务标题
  const [creatingTask, setCreatingTask] = useState(false) // 创建任务加载状态
  // 新增：选中的任务用于显示详情抽屉
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // 当tasks数组更新时，清理不存在的隐藏任务，避免状态不同步
  useEffect(() => {
    const currentTaskIds = new Set(tasks.map(t => t.id))
    setHiddenTasks(prev => new Set([...prev].filter(id => currentTaskIds.has(id))))
  }, [tasks])


  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      // 优先使用自定义的状态更新回调，避免全量刷新
      if (onTaskStatusChange) {
        onTaskStatusChange(taskId, newStatus)
      } else if (onTaskUpdate) {
        onTaskUpdate()
      }
    } catch (error) {
      console.error('更新任务状态失败:', error)
    }
  }

  /**
   * 点击圆圈：切换完成状态
   */
  const handleToggleComplete = async (task: Task) => {
    if (completingTasks.has(task.id)) return // 防止重复点击

    setCompletingTasks(prev => new Set([...prev, task.id]))

    if (task.status === 'completed') {
      // 如果已完成，切换回待处理
      await updateTaskStatus(task.id, 'pending')
      setCompletingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(task.id)
        return newSet
      })
    } else {
      // 启动多阶段完成动画
      setAnimatingTasks(prev => new Set([...prev, task.id]))
      
      // 第一阶段：动画开始 (300ms)
      setTimeout(async () => {
        // 更新数据库但不触发父组件重新渲染
        await updateTaskStatus(task.id, 'completed')
      }, 300)
      
      // 第二阶段：完全隐藏任务 (600ms)
      setTimeout(() => {
        // 将任务添加到隐藏列表，不再显示
        setHiddenTasks(prev => new Set([...prev, task.id]))
        
        // 清理动画状态
        setAnimatingTasks(prev => {
          const newSet = new Set(prev)
          newSet.delete(task.id)
          return newSet
        })
        setCompletingTasks(prev => {
          const newSet = new Set(prev)
          newSet.delete(task.id)
          return newSet
        })
        
        // 项目组不再消失，始终保持显示以便快速添加新任务
      }, 600)
    }
  }

  const handleCreateTask = async (projectId: string) => {
    if (!userId || !newTaskTitle.trim() || creatingTask) return

    setCreatingTask(true)
    try {
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: newTaskTitle.trim(),
          description: '', // 默认无描述
          status: 'pending',
          priority: 'medium', // 默认中等优先级
          project_id: projectId,
          assignee_id: userId,
          created_by_id: userId,
          created_by_ai: false,
          metadata: {}
        })
        .select()
        .single()

      if (error) throw error

      // 重置状态
      setNewTaskTitle('')
      setAddingTaskToProject(null)
      
      // 通知父组件更新
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    } catch (error) {
      console.error('创建任务失败:', error)
      alert('创建任务失败，请重试')
    } finally {
      setCreatingTask(false)
    }
  }

  const handleCancelAddTask = () => {
    setNewTaskTitle('')
    setAddingTaskToProject(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent, projectId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateTask(projectId)
    } else if (e.key === 'Escape') {
      handleCancelAddTask()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-400'
      case 'high':
        return 'border-l-orange-400'
      case 'medium':
        return 'border-l-blue-400'
      case 'low':
        return 'border-l-green-400'
      default:
        return 'border-l-secondary-300'
    }
  }

  // 按项目分组显示任务（项目始终显示，仅过滤任务）
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, { project: Project; tasks: Task[] }> = {}
    
    // 首先初始化所有项目
    projects.forEach(project => {
      grouped[project.id] = { project, tasks: [] }
    })
    
    // 然后添加未完成且未隐藏的任务
    const pendingTasks = tasks.filter(task => 
      task.status !== 'completed' && !hiddenTasks.has(task.id)
    )
    
    pendingTasks.forEach(task => {
      if (grouped[task.project_id]) {
        grouped[task.project_id].tasks.push(task)
      }
    })
    
    return Object.values(grouped)
  }, [tasks, projects, hiddenTasks])
  
  const totalPendingTasks = tasksByProject.reduce((sum, group) => sum + group.tasks.length, 0)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-secondary-900">我的任务</h2>
        <span className="text-xs text-secondary-500">
          {totalPendingTasks > 0 ? `${totalPendingTasks} 个待办` : '无待办任务'}
        </span>
      </div>
      
      {tasksByProject.length === 0 ? (
        <div className="text-center py-8">
          <FolderOpen className="h-10 w-10 text-secondary-300 mx-auto mb-3" />
          <p className="text-secondary-600 text-sm">还没有创建项目</p>
          <p className="text-xs text-secondary-500 mt-1">创建项目后可在此管理任务</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasksByProject.map((group) => (
          <div key={group.project.id} className="space-y-2 mb-4">
            {/* 项目标题 */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-secondary-50 rounded-md border-l-2 border-primary-200">
              <FolderOpen className="h-3.5 w-3.5 text-primary-500" />
              <span className="text-xs font-medium text-secondary-700 truncate">
                {group.project.name}
              </span>
              <span className="text-xs text-secondary-500 ml-auto">
                {group.tasks.length}
              </span>
              {userId && (
                <button
                  onClick={() => setAddingTaskToProject(group.project.id)}
                  className="p-1 hover:bg-primary-100 rounded transition-colors duration-200 group/add"
                  title="快速添加任务"
                >
                  <Plus className="h-3 w-3 text-secondary-400 group-hover/add:text-primary-600" />
                </button>
              )}
            </div>

            {/* 快速添加任务输入框 */}
            {addingTaskToProject === group.project.id && (
              <div className="px-2 py-2 bg-white rounded-md border border-primary-200 shadow-sm ml-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, group.project.id)}
                    placeholder="输入任务标题..."
                    className="flex-1 text-xs px-2 py-1.5 border border-secondary-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    autoFocus
                    disabled={creatingTask}
                  />
                  <button
                    onClick={() => handleCreateTask(group.project.id)}
                    disabled={!newTaskTitle.trim() || creatingTask}
                    className="p-1.5 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    title="创建任务 (Enter)"
                  >
                    {creatingTask ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={handleCancelAddTask}
                    className="p-1.5 bg-secondary-200 text-secondary-600 rounded hover:bg-secondary-300 transition-colors duration-200"
                    title="取消 (Esc)"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-1 text-xs text-secondary-500">
                  按 Enter 创建，Esc 取消 • 默认分配给你，中等优先级
                </div>
              </div>
            )}
            
            {/* 该项目下的任务 */}
            <div className="space-y-1.5 ml-2">
              {group.tasks.length === 0 ? (
                <div className="text-xs text-secondary-500 italic px-2 py-3 text-center bg-secondary-50 rounded-md border border-secondary-100">
                  ✨ 暂无任务，点击上方 + 号添加
                </div>
              ) : (
                group.tasks.map((task) => (
          <div
            key={task.id}
            className={`
              flex items-center gap-2.5 p-2 rounded-md border-l-2 bg-white hover:bg-secondary-50 
              transition-all duration-300 ease-in-out cursor-pointer group relative overflow-hidden
              ${getPriorityColor(task.priority)}
              ${animatingTasks.has(task.id) 
                ? 'opacity-0 transform scale-95 -translate-y-2' 
                : 'opacity-100 transform scale-100 translate-y-0'
              }
              ${completingTasks.has(task.id) ? 'bg-green-50' : ''}
            `}
            style={{
              maxHeight: animatingTasks.has(task.id) ? '0px' : '70px',
              marginBottom: animatingTasks.has(task.id) ? '0px' : '6px',
              paddingTop: animatingTasks.has(task.id) ? '0px' : '8px',
              paddingBottom: animatingTasks.has(task.id) ? '0px' : '8px',
              transition: 'all 0.3s ease-in-out, max-height 0.25s ease-in-out 0.35s, margin-bottom 0.25s ease-in-out 0.35s, padding 0.25s ease-in-out 0.35s'
            }}
            onClick={() => setSelectedTask(task)}
          >
            {/* 完成按钮（仅点此切换完成） */}
            <button
              className="flex-shrink-0 transition-all duration-200 hover:scale-110"
              disabled={completingTasks.has(task.id)}
              onClick={(e) => { e.stopPropagation(); handleToggleComplete(task) }}
              aria-label="切换完成状态"
              title={task.status === 'completed' ? '标记为未完成' : '标记为完成'}
            >
              {completingTasks.has(task.id) ? (
                <div className="relative">
                  <Circle className="h-5 w-5 text-green-300 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
                </div>
              ) : task.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-secondary-400 group-hover:text-green-500 transition-colors duration-200" />
              )}
            </button>
            
            {/* 完成效果遮罩 */}
            {completingTasks.has(task.id) && (
              <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-green-100 opacity-50 animate-pulse rounded-lg" />
            )}
            
            {/* 任务内容（点击打开详情） */}
            <div className="flex-1 min-w-0">
              <p className={`
                text-sm font-medium truncate transition-all duration-300
                ${task.status === 'completed' 
                  ? 'line-through text-secondary-500' 
                  : completingTasks.has(task.id)
                    ? 'text-green-700 font-semibold'
                    : 'text-secondary-900 group-hover:text-primary-700'
                }
              `}>
                {task.title}
              </p>
              
              {/* 优先级和时间指示器 */}
              <div className="flex items-center gap-2 mt-1">
                {task.priority === 'urgent' && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                    🔥 紧急
                  </span>
                )}
                {task.priority === 'high' && (
                  <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full font-medium">
                    ⚡ 高优先级
                  </span>
                )}
                {task.due_date && (
                  <div className="flex items-center gap-1 text-xs text-secondary-500">
                    <Clock className="h-3 w-3" />
                    截止日期
                  </div>
                )}
              </div>
            </div>
          </div>
                ))
              )}
            </div>
          </div>
        ))}
        </div>
      )}

      {/* 简约任务详情抽屉 */}
      {selectedTask && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedTask(null)} />
          <aside className="absolute right-0 top-0 h-full w-[360px] max-w-[90vw] bg-white shadow-xl border-l border-secondary-200 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-secondary-900 truncate">{selectedTask.title}</h3>
              <button className="p-1.5 hover:bg-secondary-100 rounded" onClick={() => setSelectedTask(null)} aria-label="关闭">
                <X className="h-4 w-4 text-secondary-600" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm text-secondary-700">
              <div className="flex items-center gap-2"><span className="text-secondary-500">所属项目:</span><span className="truncate">{projects.find(p => p.id === selectedTask.project_id)?.name || '—'}</span></div>
              <div className="flex items-center gap-2"><span className="text-secondary-500">优先级:</span><span className="truncate">{selectedTask.priority}</span></div>
              <div className="flex items-center gap-2"><span className="text-secondary-500">状态:</span><span className="truncate">{selectedTask.status}</span></div>
              {selectedTask.description && (
                <div>
                  <div className="text-secondary-500 mb-1">描述</div>
                  <div className="text-secondary-800 whitespace-pre-wrap break-words text-sm bg-secondary-50 rounded p-2">{selectedTask.description}</div>
                </div>
              )}
            </div>
            <div className="mt-auto p-4 border-t flex gap-2">
              <button
                className="flex-1 px-3 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 transition"
                onClick={async () => {
                  const next = selectedTask.status === 'completed' ? 'pending' : 'completed'
                  await updateTaskStatus(selectedTask.id, next)
                  setSelectedTask({ ...selectedTask, status: next })
                }}
              >
                {selectedTask.status === 'completed' ? '标记为未完成' : '标记为完成'}
              </button>
              <button className="px-3 py-2 rounded bg-secondary-200 text-secondary-700 hover:bg-secondary-300" onClick={() => setSelectedTask(null)}>关闭</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
})