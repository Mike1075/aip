// 路由相关的类型定义
export interface RouteParams {
  organizationId?: string
  projectId?: string
}

export type AppRoute = 
  | '/'
  | '/my-organizations'
  | '/explore-organizations'
  | '/organizations/:organizationId'
  | '/organizations/:organizationId/dashboard'
  | '/organizations/:organizationId/projects/:projectId'
  | '/organizations/:organizationId/projects/:projectId/settings'
  | '/create-organization'

export interface NavigationState {
  selectedOrganization: any | null
  selectedProject: any | null
  isExploringOrganization: boolean
}