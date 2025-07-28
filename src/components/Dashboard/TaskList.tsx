import React from 'react'
import { Task } from '@/lib/supabase'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface TaskListProps {
  tasks: Task[]
  onTaskUpdate?: () => void
}

export function TaskList({ tasks }: TaskListProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50'
      case 'high':
        return 'text-orange-600 bg-orange-50'
      case 'medium':
        return 'text-blue-600 bg-blue-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-secondary-600 bg-secondary-50'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '紧急'
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
      default:
        return priority
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待开始'
      case 'in_progress':
        return '进行中'
      case 'review':
        return '待审查'
      case 'completed':
        return '已完成'
      case 'blocked':
        return '已阻塞'
      default:
        return status
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">我的任务</h2>
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <p className="text-secondary-600">暂无待处理任务</p>
          <p className="text-sm text-secondary-500 mt-2">太棒了！您已经完成了所有任务</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-secondary-900">我的任务</h2>
        <span className="text-sm text-secondary-500">{tasks.length} 个任务</span>
      </div>
      
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="border border-secondary-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-secondary-900 line-clamp-2">
                {task.title}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {getPriorityText(task.priority)}
              </span>
            </div>
            
            {task.description && (
              <p className="text-sm text-secondary-600 mb-3 line-clamp-2">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-secondary-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.created_at), 'MMM dd', { locale: zhCN })}
                </div>
                {task.created_by_ai && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    AI创建
                  </div>
                )}
              </div>
              <span className="text-xs font-medium text-secondary-700">
                {getStatusText(task.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 