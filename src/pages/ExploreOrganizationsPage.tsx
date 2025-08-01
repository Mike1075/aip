import React from 'react'
import { useNavigate } from 'react-router-dom'
import { OrganizationList } from '@/components/Dashboard/OrganizationList'
import { Organization } from '@/lib/supabase'
import { generatePath } from '@/config/routes'

interface ExploreOrganizationsPageProps {
  showCreateModal?: boolean
}

export function ExploreOrganizationsPage({ showCreateModal }: ExploreOrganizationsPageProps) {
  const navigate = useNavigate()

  const handleSelectOrganization = (org: Organization) => {
    navigate(generatePath.organizationDetail(org.id))
  }

  return (
    <OrganizationList 
      onSelectOrganization={handleSelectOrganization}
      showCreateModal={showCreateModal}
    />
  )
}