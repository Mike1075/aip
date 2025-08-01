import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { Organization, Project } from '@/lib/supabase'
import { ROUTES, generatePath } from '@/config/routes'

export function useAppNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  
  // 从 URL 解析当前状态
  const getCurrentView = () => {
    const path = location.pathname
    
    if (path === '/' || path === '/my-organizations') return 'my-organizations'
    if (path === '/explore-organizations') return 'explore-organizations'
    if (path === '/create-organization') return 'create-organization'
    if (path.includes('/dashboard')) return 'dashboard'
    if (path.includes('/settings')) return 'project-settings'
    if (path.includes('/projects/')) return 'project-detail'
    if (path.includes('/organizations/')) return 'organization-detail'
    
    return 'my-organizations'
  }

  const currentView = getCurrentView()
  const organizationId = params.organizationId
  const projectId = params.projectId

  // 导航函数
  const navigateToMyOrganizations = () => {
    navigate(ROUTES.MY_ORGANIZATIONS)
  }

  const navigateToExploreOrganizations = () => {
    navigate(ROUTES.EXPLORE_ORGANIZATIONS)
  }

  const navigateToOrganizationDetail = (orgId: string) => {
    navigate(generatePath.organizationDetail(orgId))
  }

  const navigateToOrganizationDashboard = (orgId: string) => {
    navigate(generatePath.organizationDashboard(orgId))
  }

  const navigateToProjectDetail = (orgId: string, projId: string) => {
    navigate(generatePath.projectDetail(orgId, projId))
  }

  const navigateToProjectSettings = (orgId: string, projId: string) => {
    navigate(generatePath.projectSettings(orgId, projId))
  }

  const navigateToCreateOrganization = () => {
    navigate(ROUTES.CREATE_ORGANIZATION)
  }

  return {
    currentView,
    organizationId,
    projectId,
    navigateToMyOrganizations,
    navigateToExploreOrganizations,
    navigateToOrganizationDetail,
    navigateToOrganizationDashboard,
    navigateToProjectDetail,
    navigateToProjectSettings,
    navigateToCreateOrganization
  }
}