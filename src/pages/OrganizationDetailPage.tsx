import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { OrganizationDetail } from '@/components/Dashboard/OrganizationDetail'
import { Organization, Project, organizationAPI } from '@/lib/supabase'
import { generatePath } from '@/config/routes'
import { useAuth } from '@/contexts/AuthContext'

export function OrganizationDetailPage() {
  const navigate = useNavigate()
  const { isGuest } = useAuth()
  const { organizationId } = useParams<{ organizationId: string }>()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!organizationId) {
        setError('组织ID不存在')
        setLoading(false)
        return
      }

      try {
        const org = await organizationAPI.getOrganizationById(organizationId)
        setOrganization(org)
      } catch (err) {
        console.error('获取组织信息失败:', err)
        setError('获取组织信息失败')
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [organizationId])

  const handleBack = () => {
    navigate('/explore-organizations')
  }

  const handleSelectProject = (project: Project) => {
    if (!organization) return
    navigate(generatePath.projectSettings(organization.id, project.id))
  }

  const handleViewProject = (project: Project) => {
    if (!organization) return
    navigate(generatePath.projectDetail(organization.id, project.id))
  }

  const handleCreateProject = () => {
    if (isGuest) {
      alert('请先登录才能创建项目')
      return
    }
    if (!organization) return
    navigate(generatePath.organizationDashboard(organization.id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载组织信息中...</p>
        </div>
      </div>
    )
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '组织不存在'}</p>
          <button 
            onClick={() => navigate('/explore-organizations')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            返回组织列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <OrganizationDetail
      organization={organization}
      onBack={handleBack}
      onSelectProject={handleSelectProject}
      onViewProject={handleViewProject}
      onCreateProject={handleCreateProject}
      showManagementButtons={false}
      showProjectManagementButton={false}
    />
  )
}
