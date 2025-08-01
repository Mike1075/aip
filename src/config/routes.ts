// 路由配置
export const ROUTES = {
  HOME: '/',
  MY_ORGANIZATIONS: '/my-organizations',
  EXPLORE_ORGANIZATIONS: '/explore-organizations',
  ORGANIZATION_DETAIL: '/organizations/:organizationId',
  ORGANIZATION_DASHBOARD: '/organizations/:organizationId/dashboard',
  PROJECT_DETAIL: '/organizations/:organizationId/projects/:projectId',
  PROJECT_SETTINGS: '/organizations/:organizationId/projects/:projectId/settings',
  CREATE_ORGANIZATION: '/create-organization'
} as const

// 路由路径生成器
export const generatePath = {
  organizationDetail: (organizationId: string) => `/organizations/${organizationId}`,
  organizationDashboard: (organizationId: string) => `/organizations/${organizationId}/dashboard`,
  projectDetail: (organizationId: string, projectId: string) => 
    `/organizations/${organizationId}/projects/${projectId}`,
  projectSettings: (organizationId: string, projectId: string) => 
    `/organizations/${organizationId}/projects/${projectId}/settings`
}