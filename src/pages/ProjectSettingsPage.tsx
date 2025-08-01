import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ProjectSettings } from '@/components/Dashboard/ProjectSettings'
import { Project, organizationAPI } from '@/lib/supabase'
import { generatePath } from '@/config/routes'

export function ProjectSettingsPage() {
  const navigate = useNavigate()
  const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId || !organizationId) {
        setError('项目ID或组织ID不存在')
        setLoading(false)
        return
      }

      try {
        const proj = await organizationAPI.getProjectById(projectId)
        setProject(proj)
      } catch (err) {
        console.error('获取项目信息失败:', err)
        setError('获取项目信息失败')
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [projectId, organizationId])

  const handleBack = () => {
    if (organizationId) {
      navigate(generatePath.organizationDetail(organizationId))
    } else {
      navigate('/explore-organizations')
    }
  }

  const handleSave = (updatedProject: Project) => {
    // 保存后可以选择留在设置页面或跳转到其他页面
    console.log('项目已保存:', updatedProject)
    setProject(updatedProject)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载项目设置中...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '项目不存在'}</p>
          <button 
            onClick={handleBack}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <ProjectSettings
      project={project}
      onBack={handleBack}
      onSave={handleSave}
    />
  )
}
