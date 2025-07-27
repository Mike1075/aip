import React, { useState, useEffect } from 'react'
import { Check, Folder } from 'lucide-react'
import { getUserProjects, UserProject } from '../../lib/n8n'

interface ProjectSelectorProps {
  selectedProjects: string[]
  onProjectsChange: (projectIds: string[]) => void
}

export function ProjectSelector({ selectedProjects, onProjectsChange }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<UserProject[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const userProjects = await getUserProjects()
      setProjects(userProjects)
    } catch (error) {
      console.error('加载项目失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleProject = (projectId: string) => {
    const newSelectedProjects = selectedProjects.includes(projectId)
      ? selectedProjects.filter(id => id !== projectId)
      : [...selectedProjects, projectId]
    
    onProjectsChange(newSelectedProjects)
  }

  const toggleAll = () => {
    if (selectedProjects.length === projects.length) {
      onProjectsChange([])
    } else {
      onProjectsChange(projects.map(p => p.id))
    }
  }

  if (isLoading) {
    return (
      <div className="bg-secondary-50 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 text-sm text-secondary-600">
          <Folder className="h-4 w-4" />
          <span>加载项目中...</span>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="bg-secondary-50 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 text-sm text-secondary-600">
          <Folder className="h-4 w-4" />
          <span>暂无项目</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary-50 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary-700">
          <Folder className="h-4 w-4" />
          <span>选择项目 ({selectedProjects.length}/{projects.length})</span>
        </div>
        <button
          onClick={toggleAll}
          className="text-xs text-primary-600 hover:text-primary-700 transition-colors"
        >
          {selectedProjects.length === projects.length ? '取消全选' : '全选'}
        </button>
      </div>
      
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => toggleProject(project.id)}
            className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer transition-colors"
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
              selectedProjects.includes(project.id)
                ? 'bg-primary-600 border-primary-600'
                : 'border-secondary-300'
            }`}>
              {selectedProjects.includes(project.id) && (
                <Check className="h-3 w-3 text-white" />
              )}
            </div>
            <span className="text-sm text-secondary-700 truncate">{project.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}