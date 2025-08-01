import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MyOrganizations } from '@/components/Dashboard/MyOrganizations'
import { Organization } from '@/lib/supabase'
import { generatePath } from '@/config/routes'

export function MyOrganizationsPage() {
  const navigate = useNavigate()

  const handleSelectOrganization = (org: Organization) => {
    navigate(generatePath.organizationDashboard(org.id))
  }

  const handleCreateOrganization = () => {
    navigate('/create-organization')
  }

  return (
    <MyOrganizations 
      onSelectOrganization={handleSelectOrganization}
      onCreateOrganization={handleCreateOrganization}
    />
  )
}