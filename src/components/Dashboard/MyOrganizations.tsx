import React, { useState, useEffect } from 'react'
import { Building2, Users, Crown, Plus, ChevronRight, Star, Trash2 } from 'lucide-react'
import { Organization, Project, organizationAPI } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface MyOrganizationsProps {
  onSelectOrganization: (org: Organization) => void
  onCreateOrganization: () => void
}

export function MyOrganizations({ onSelectOrganization, onCreateOrganization }: MyOrganizationsProps) {
  const { user } = useAuth()
  const [myOrganizations, setMyOrganizations] = useState<Organization[]>([])
  const [orgProjects, setOrgProjects] = useState<Record<string, Project[]>>({})
  const [loading, setLoading] = useState(true)
  const [deletingOrg, setDeletingOrg] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadMyOrganizations()
    }
  }, [user])

  const loadMyOrganizations = async () => {
    if (!user) return
    
    try {
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

  const handleDeleteOrganization = async (organizationId: string, organizationName: string, event: React.MouseEvent) => {
    event.stopPropagation() // 防止触发组织卡片的点击事件
    if (!user) return

    // 确认删除
    const confirmDelete = confirm(
      `确定要删除组织"${organizationName}"吗？\n\n此操作不可撤销，请确保组织内没有项目。`
    )
    
    if (!confirmDelete) return

    setDeletingOrg(organizationId)
    try {
      await organizationAPI.deleteOrganization(organizationId, user.id)
      
      // 重新加载组织列表
      await loadMyOrganizations()
      
      alert('组织删除成功！')
    } catch (error: any) {
      console.error('删除组织失败:', error)
      alert(`删除组织失败：${error.message || '请重试'}`)
    } finally {
      setDeletingOrg(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div>
        {/* 页面标题 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">
            我的组织
          </h1>
          <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
            管理你所属的组织，选择组织进入对应的工作台
          </p>
        </div>

        {/* 创建组织按钮 - 只在有组织时显示 */}
        {myOrganizations.length > 0 && (
          <div className="flex justify-center mb-8">
            <button
              onClick={onCreateOrganization}
              className="btn-primary flex items-center gap-2 text-lg px-8 py-3 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-5 w-5" />
              创建新组织
            </button>
          </div>
        )}

        {myOrganizations.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-20 w-20 text-secondary-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-secondary-900 mb-4">
              还没有加入任何组织
            </h3>
            <p className="text-secondary-600 mb-8 max-w-md mx-auto">
              创建你的第一个组织，或者在"探索组织"中寻找感兴趣的组织加入
            </p>
            <button
              onClick={onCreateOrganization}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              创建第一个组织
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myOrganizations.map((org) => {
              const projects = orgProjects[org.id] || []
              const activeProjects = projects.filter(p => p.status === 'active').length
              const completedProjects = projects.filter(p => p.status === 'completed').length

              return (
                <div
                  key={org.id}
                  onClick={() => onSelectOrganization(org)}
                  className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-secondary-100 overflow-hidden"
                >
                  {/* 卡片头部 */}
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeleteOrganization(org.id, org.name, e)}
                            disabled={deletingOrg === org.id}
                            className="p-2 bg-red-500 bg-opacity-0 hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="删除组织"
                          >
                            {deletingOrg === org.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-white" />
                            )}
                          </button>
                          <ChevronRight className="h-5 w-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-100 transition-colors">
                        {org.name}
                      </h3>
                      <p className="text-primary-100 text-sm line-clamp-2 opacity-90">
                        {org.description || '暂无描述'}
                      </p>
                    </div>
                  </div>

                  {/* 卡片内容 */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600 mb-1">
                          {activeProjects}
                        </div>
                        <div className="text-sm text-secondary-600">
                          进行中项目
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {completedProjects}
                        </div>
                        <div className="text-sm text-secondary-600">
                          已完成项目
                        </div>
                      </div>
                    </div>

                    {/* 项目预览 */}
                    {projects.length > 0 && (
                      <div className="border-t border-secondary-100 pt-4">
                        <p className="text-xs font-medium text-secondary-500 mb-3 uppercase tracking-wider">
                          最新项目
                        </p>
                        <div className="space-y-2">
                          {projects.slice(0, 2).map((project) => (
                            <div key={project.id} className="flex items-center gap-3 p-2 bg-secondary-50 rounded-lg">
                              <div className={`w-2 h-2 rounded-full ${
                                project.status === 'active' ? 'bg-green-500' :
                                project.status === 'completed' ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`} />
                              <span className="text-sm text-secondary-700 truncate flex-1">
                                {project.name}
                              </span>
                              {project.is_recruiting && (
                                <Star className="h-3 w-3 text-yellow-500" />
                              )}
                            </div>
                          ))}
                          {projects.length > 2 && (
                            <p className="text-xs text-secondary-500 italic text-center pt-1">
                              +{projects.length - 2} 个更多项目
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 进入工作台按钮 */}
                    <div className="mt-4 pt-4 border-t border-secondary-100">
                      <div className="bg-primary-50 rounded-lg p-3 text-center group-hover:bg-primary-100 transition-colors">
                        <span className="text-sm font-medium text-primary-700">
                          点击进入 {org.name} 工作台
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}