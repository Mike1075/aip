import React from 'react'
import { Project } from '@/lib/supabase'
import { Calendar, Users, Activity, FolderOpen } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ProjectGridProps {
  projects: Project[]
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-secondary-100 text-secondary-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中'
      case 'paused':
        return '暂停'
      case 'completed':
        return '已完成'
      case 'cancelled':
        return '已取消'
      default:
        return status
    }
  }

  if (projects.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">我的项目</h2>
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <p className="text-secondary-600 mb-4">还没有参与任何项目</p>
          <button className="btn-primary">创建第一个项目</button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-secondary-900">我的项目</h2>
        <span className="text-sm text-secondary-500">{projects.length} 个项目</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="border border-secondary-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-secondary-900 line-clamp-2">
                {project.name}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                {getStatusText(project.status)}
              </span>
            </div>
            
            {project.description && (
              <p className="text-sm text-secondary-600 mb-3 line-clamp-2">
                {project.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-secondary-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(project.created_at), 'MMM dd', { locale: zhCN })}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                团队项目
              </div>
              {project.is_public && (
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  公开项目
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 