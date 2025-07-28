import React, { useState, useEffect } from 'react'
import { Building2, ChevronRight, Users, FolderOpen, X, Menu } from 'lucide-react'
import { Organization, Project, organizationAPI } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface OrganizationSidebarProps {
  isOpen: boolean
  onClose: () => void
  onSelectOrganization: (org: Organization) => void
}

export function OrganizationSidebar({ isOpen, onClose, onSelectOrganization }: OrganizationSidebarProps) {
  const { user } = useAuth()
  const [myOrganizations, setMyOrganizations] = useState<Organization[]>([])
  const [orgProjects, setOrgProjects] = useState<Record<string, Project[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user && isOpen) {
      loadMyOrganizations()
    }
  }, [user, isOpen])

  const loadMyOrganizations = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      // 获取用户所属的组织
      const organizations = await organizationAPI.getUserOrganizations(user.id)
      setMyOrganizations(organizations)

      // 为每个组织加载项目数据
      const projectsData: Record<string, Project[]> = {}
      for (const org of organizations) {
        const projects = await organizationAPI.getOrganizationProjects(org.id, user.id)
        projectsData[org.id] = projects
      }
      setOrgProjects(projectsData)
    } catch (error) {
      console.error('加载我的组织失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleOrganization = (orgId: string) => {
    const newExpandedOrgs = new Set(expandedOrgs)
    if (newExpandedOrgs.has(orgId)) {
      newExpandedOrgs.delete(orgId)
    } else {
      newExpandedOrgs.add(orgId)
    }
    setExpandedOrgs(newExpandedOrgs)
  }

  const handleSelectOrganization = (org: Organization) => {
    onSelectOrganization(org)
    onClose() // 选择组织后自动关闭侧边栏
  }

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* 侧边栏 */}
      <div className={`
        fixed top-0 left-0 h-full bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-80 lg:w-80
      `}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Building2 className="h-5 w-5 text-primary-600" />
            </div>
            <h2 className="font-semibold text-secondary-900">我的组织</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
              <span className="ml-2 text-secondary-600">加载中...</span>
            </div>
          ) : myOrganizations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500 text-sm">暂无组织</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myOrganizations.map((org) => {
                const projects = orgProjects[org.id] || []
                const isExpanded = expandedOrgs.has(org.id)
                
                return (
                  <div key={org.id} className="border border-secondary-200 rounded-lg overflow-hidden">
                    {/* 组织头部 */}
                    <div className="p-3 bg-secondary-50 hover:bg-secondary-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleSelectOrganization(org)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <div className="p-2 bg-primary-100 rounded-lg">
                            <Building2 className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-secondary-900 truncate">
                              {org.name}
                            </h3>
                            <p className="text-xs text-secondary-500">
                              {projects.length} 个项目
                            </p>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => toggleOrganization(org.id)}
                          className="p-1 hover:bg-secondary-200 rounded transition-colors"
                        >
                          <ChevronRight className={`h-4 w-4 text-secondary-500 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`} />
                        </button>
                      </div>
                    </div>
                    
                    {/* 项目列表 */}
                    {isExpanded && projects.length > 0 && (
                      <div className="border-t border-secondary-200">
                        {projects.slice(0, 5).map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center gap-2 p-3 hover:bg-secondary-50 transition-colors border-b border-secondary-100 last:border-b-0"
                          >
                            <FolderOpen className="h-3 w-3 text-secondary-400" />
                            <span className="text-sm text-secondary-600 truncate">
                              {project.name}
                            </span>
                          </div>
                        ))}
                        {projects.length > 5 && (
                          <div className="p-3 text-center">
                            <span className="text-xs text-secondary-500">
                              +{projects.length - 5} 个更多项目
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          
          {/* 底部提示 */}
          {!loading && myOrganizations.length > 0 && (
            <div className="mt-6 p-3 bg-primary-50 rounded-lg">
              <p className="text-xs text-primary-600 text-center">
                点击组织名称进入工作台
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}