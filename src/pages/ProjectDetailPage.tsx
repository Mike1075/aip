import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ProjectDetailPage as ProjectDetailComponent } from '@/components/Dashboard/ProjectDetailPage'
import { Project, organizationAPI } from '@/lib/supabase'
import { generatePath } from '@/config/routes'
import { useAuth } from '@/contexts/AuthContext'

export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
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
      navigate(generatePath.organizationDashboard(organizationId))
    } else {
      navigate('/explore-organizations')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载项目信息中...</p>
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
      <ProjectDetailComponent 
        project={project}
        onBack={handleBack}
        readOnly={false}
      />
  )
}
