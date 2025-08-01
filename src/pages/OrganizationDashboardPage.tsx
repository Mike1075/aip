import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Dashboard } from '@/components/Dashboard/Dashboard'
import { Organization, organizationAPI } from '@/lib/supabase'

export function OrganizationDashboardPage() {
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
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return <Dashboard organization={organization} />
}
