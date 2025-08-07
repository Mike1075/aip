import React from 'react'
import { useNavigate } from 'react-router-dom'
import { OrganizationList } from '@/components/Dashboard/OrganizationList'
import { Organization, organizationAPI } from '@/lib/supabase'
import { generatePath } from '@/config/routes'
import { useAuth } from '@/contexts/AuthContext'

interface ExploreOrganizationsPageProps {
  showCreateModal?: boolean
}

export function ExploreOrganizationsPage({ showCreateModal }: ExploreOrganizationsPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSelectOrganization = async (org: Organization) => {
    // 如果用户已登录，检查是否为该组织的成员
    if (user) {
      try {
        const isMember = await organizationAPI.isOrganizationMember(org.id, user.id)
        if (isMember) {
          // 如果是成员，跳转到"我的组织"选项卡中的组织仪表板
          navigate(generatePath.organizationDashboard(org.id))
          return
        }
      } catch (error) {
        console.error('检查组织成员身份失败:', error)
      }
    }
    
    // 如果不是成员或检查失败，跳转到组织详情页
    navigate(generatePath.organizationDetail(org.id))
  }

  return (
    <OrganizationList 
      onSelectOrganization={handleSelectOrganization}
      showCreateModal={showCreateModal}
    />
  )
}
