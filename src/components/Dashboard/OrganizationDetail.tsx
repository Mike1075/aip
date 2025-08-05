import React, { useState, useEffect } from 'react'
import { ArrowLeft, Building2, Eye, Lock, Users, Calendar, Plus, ExternalLink, Cog, UserPlus } from 'lucide-react'
import { Organization, Project, organizationAPI, ProjectJoinRequest, OrganizationJoinRequest } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { InlineEdit } from '@/components/Common/InlineEdit'

interface OrganizationDetailProps {
  organization: Organization
  onBack: () => void
  onSelectProject: (project: Project) => void
  onViewProject?: (project: Project) => void  // 查看项目详情
  onCreateProject?: () => void  // 跳转到创建项目
}

export function OrganizationDetail({ organization, onBack, onSelectProject, onViewProject, onCreateProject }: OrganizationDetailProps) {
  const { user, signOut } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [joinRequests, setJoinRequests] = useState<{[projectId: string]: ProjectJoinRequest}>({})
  const [submittingRequest, setSubmittingRequest] = useState<{[projectId: string]: boolean}>({})
  const [orgJoinRequests, setOrgJoinRequests] = useState<OrganizationJoinRequest[]>([])
  const [isOrgAdmin, setIsOrgAdmin] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [orgJoinRequestStatus, setOrgJoinRequestStatus] = useState<OrganizationJoinRequest | null>(null)
  const [submittingOrgRequest, setSubmittingOrgRequest] = useState(false)
  const [currentOrganization, setCurrentOrganization] = useState<Organization>(organization)
  const [projectEditPermissions, setProjectEditPermissions] = useState<{[projectId: string]: boolean}>({})

  useEffect(() => {
    loadProjects()
  }, [organization.id, user])

  useEffect(() => {
    setCurrentOrganization(organization)
  }, [organization])

  const loadProjects = async () => {
    try {
      const orgProjects = await organizationAPI.getOrganizationProjects(
        organization.id,
        user?.id
      )
      setProjects(orgProjects)
      
      // 如果用户已登录，检查权限和申请状态
      if (user) {
        // 检查是否是组织成员和管理员
        const userRole = await organizationAPI.getUserRoleInOrganization(user.id, organization.id)
        const isAdmin = userRole === 'admin'
        const isMemberStatus = userRole !== null
        setIsOrgAdmin(isAdmin)
        setIsMember(isMemberStatus)
        
        // 如果不是成员，检查是否有待审核的申请
        if (!isMemberStatus) {
          const joinRequestStatus = await organizationAPI.getUserJoinRequestStatus(user.id, organization.id)
          setOrgJoinRequestStatus(joinRequestStatus)
        }
        
        // 如果是管理员，加载组织加入申请
        if (isAdmin) {
          const orgRequests = await organizationAPI.getOrganizationJoinRequests(organization.id)
          setOrgJoinRequests(orgRequests)
        }
        
        // 检查每个招募中项目的申请状态和编辑权限
        const requests: {[projectId: string]: ProjectJoinRequest} = {}
        const editPermissions: {[projectId: string]: boolean} = {}
        
        for (const project of orgProjects) {
          // 检查申请状态
          if (project.is_recruiting) {
            const request = await organizationAPI.hasJoinRequest(project.id, user.id)
            if (request) {
              requests[project.id] = request
            }
          }
          
          // 检查编辑权限
          try {
            const userRole = await organizationAPI.getUserProjectRole(project.id, user.id)
            editPermissions[project.id] = userRole === 'manager'
          } catch {
            editPermissions[project.id] = false
          }
        }
        
        setJoinRequests(requests)
        setProjectEditPermissions(editPermissions)
      }
    } catch (error) {
      console.error('加载项目失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOrganizationName = async (newName: string) => {
    if (!user) throw new Error('用户未登录')
    
    await organizationAPI.updateOrganizationName(organization.id, newName, user.id)
    
    // 更新本地状态
    setCurrentOrganization(prev => ({
      ...prev,
      name: newName
    }))
  }

  const handleUpdateProjectName = async (projectId: string, newName: string) => {
    if (!user) throw new Error('用户未登录')
    
    await organizationAPI.updateProjectName(projectId, newName, user.id)
    
    // 更新本地项目列表状态
    setProjects(prev => prev.map(project => 
      project.id === projectId 
        ? { ...project, name: newName }
        : project
    ))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-secondary-100 text-secondary-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中'
      case 'completed': return '已完成'
      case 'paused': return '已暂停'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const handleJoinRequest = async (projectId: string) => {
    if (!user) return

    setSubmittingRequest(prev => ({ ...prev, [projectId]: true }))
    
    try {
      const message = prompt('请输入申请理由（可选）：')
      if (message === null) return // 用户取消

      const request = await organizationAPI.submitJoinRequest(projectId, user.id, message)
      setJoinRequests(prev => ({ ...prev, [projectId]: request }))
      alert('申请已提交，请等待项目经理审核')
    } catch (error) {
      console.error('提交申请失败:', error)
      alert('提交申请失败，请重试')
    } finally {
      setSubmittingRequest(prev => ({ ...prev, [projectId]: false }))
    }
  }

  const getJoinButtonText = (project: Project) => {
    const request = joinRequests[project.id]
    if (request) {
      switch (request.status) {
        case 'pending': return '申请审核中'
        case 'approved': return '已加入'
        case 'rejected': return '重新申请'
      }
    }
    return '申请加入'
  }

  const canJoinProject = (project: Project) => {
    if (!user || !project.is_recruiting) return false
    const request = joinRequests[project.id]
    return !request || request.status === 'rejected'
  }

  const handleJoinOrganization = async () => {
    if (!user) return

    setSubmittingOrgRequest(true)
    
    try {
      const message = prompt('请输入申请理由（可选）：')
      if (message === null) return // 用户取消

      const request = await organizationAPI.applyToJoinOrganization(user.id, organization.id, message)
      setOrgJoinRequestStatus(request)
      alert('申请已提交，请等待组织管理员审核')
    } catch (error: any) {
      console.error('提交申请失败:', error)
      alert(`申请失败：${error.message || '请重试'}`)
    } finally {
      setSubmittingOrgRequest(false)
    }
  }

  const getOrgJoinButtonText = () => {
    if (orgJoinRequestStatus) {
      switch (orgJoinRequestStatus.status) {
        case 'pending': return '申请审核中'
        case 'approved': return '已加入'
        case 'rejected': return '重新申请'
      }
    }
    return '申请加入'
  }

  const canJoinOrganization = () => {
    if (!user || isMember) return false
    return !orgJoinRequestStatus || orgJoinRequestStatus.status === 'rejected'
  }

  const handleReviewJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!user) return
    
    try {
      await organizationAPI.reviewJoinRequest(requestId, action, user.id)
      alert(action === 'approve' ? '申请已批准' : '申请已拒绝')
      
      // 重新加载申请列表
      const orgRequests = await organizationAPI.getOrganizationJoinRequests(organization.id)
      setOrgJoinRequests(orgRequests)
    } catch (error: any) {
      console.error('审核申请失败:', error)
      alert(`操作失败：${error.message || '请重试'}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-secondary-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-100 rounded-xl">
            <Building2 className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              <InlineEdit
                value={currentOrganization.name}
                onSave={handleUpdateOrganizationName}
                canEdit={isOrgAdmin}
                className="text-2xl font-bold text-secondary-900"
                placeholder="组织名称"
                maxLength={50}
              />
            </h1>
            <p className="text-secondary-600">
              {currentOrganization.description || '暂无描述'}
            </p>
          </div>
        </div>
      </div>

      {/* 组织信息卡片 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">组织信息</h2>
          {user && !isMember && canJoinOrganization() && (
            <button 
              onClick={handleJoinOrganization}
              disabled={submittingOrgRequest}
              className="btn-primary flex items-center gap-2"
            >
              {submittingOrgRequest ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {submittingOrgRequest ? '提交中...' : getOrgJoinButtonText()}
            </button>
          )}
          {user && !isMember && !canJoinOrganization() && orgJoinRequestStatus && (
            <span className="btn-secondary flex items-center gap-2 cursor-not-allowed opacity-60">
              <UserPlus className="h-4 w-4" />
              {getOrgJoinButtonText()}
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-secondary-500" />
            <div>
              <p className="text-sm text-secondary-600">创建时间</p>
              <p className="font-medium text-secondary-900">
                {formatDate(organization.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-secondary-500" />
            <div>
              <p className="text-sm text-secondary-600">项目数量</p>
              <p className="font-medium text-secondary-900">
                {projects.length} 个项目
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-secondary-500" />
            <div>
              <p className="text-sm text-secondary-600">公开项目</p>
              <p className="font-medium text-secondary-900">
                {projects.filter(p => p.is_public).length} 个
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 组织申请审核 - 只有管理员可见 */}
      {isOrgAdmin && orgJoinRequests.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-secondary-900">
              加入申请 ({orgJoinRequests.length})
            </h2>
          </div>

          <div className="space-y-4">
            {orgJoinRequests.map((request: any) => (
              <div key={request.id} className="border border-secondary-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <UserPlus className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-secondary-900">
                        {request.user?.name || '未知用户'}
                      </h3>
                      <p className="text-sm text-secondary-600">
                        {request.user?.email}
                      </p>
                      {request.message && (
                        <p className="text-sm text-secondary-700 mt-1">
                          申请理由：{request.message}
                        </p>
                      )}
                      <p className="text-xs text-secondary-500 mt-1">
                        申请时间：{formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewJoinRequest(request.id, 'approve')}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
                    >
                      批准
                    </button>
                    <button
                      onClick={() => handleReviewJoinRequest(request.id, 'reject')}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 项目列表 */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-secondary-900">
            项目列表 ({projects.length})
          </h2>
          {user && isOrgAdmin && onCreateProject && (
            <button 
              onClick={onCreateProject}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建项目
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h3 className="font-semibold text-secondary-900 mb-2">
              暂无项目
            </h3>
            <p className="text-secondary-600">
              {user && isOrgAdmin ? '成为第一个在此组织创建项目的人' : '该组织暂时没有公开项目'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="p-4 border border-secondary-200 rounded-lg hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {project.is_public ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-xs text-secondary-500">
                      {project.is_public ? '公开' : '私有'}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {getStatusText(project.status)}
                  </span>
                </div>

                <h3 className="font-semibold text-secondary-900 mb-2">
                  <InlineEdit
                    value={project.name}
                    onSave={(newName) => handleUpdateProjectName(project.id, newName)}
                    canEdit={projectEditPermissions[project.id] || false}
                    className="font-semibold text-secondary-900"
                    placeholder="项目名称"
                    maxLength={50}
                  />
                </h3>
                
                <p className="text-sm text-secondary-600 line-clamp-2 mb-4">
                  {project.description || '暂无描述'}
                </p>

                <div className="flex items-center justify-between text-xs text-secondary-500 mb-3">
                  <span>创建于 {formatDate(project.created_at)}</span>
                  <div className="flex items-center gap-2">
                    {project.is_recruiting && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <UserPlus className="h-3 w-3" />
                        招募中
                      </span>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewProject ? onViewProject(project) : onSelectProject(project)}
                    className="flex-1 btn-secondary btn-sm flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    查看详情
                  </button>
                  
                  {/* 招募申请按钮 */}
                  {project.is_recruiting && user && canJoinProject(project) && (
                    <button
                      onClick={() => handleJoinRequest(project.id)}
                      disabled={submittingRequest[project.id]}
                      className="btn-primary btn-sm flex items-center justify-center gap-1"
                      title="申请加入项目"
                    >
                      {submittingRequest[project.id] ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                      ) : (
                        <UserPlus className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  
                  {/* 申请状态显示 */}
                  {project.is_recruiting && user && !canJoinProject(project) && (
                    <span className="btn-sm text-xs px-2 py-1 bg-secondary-100 text-secondary-600 rounded flex items-center gap-1">
                      {getJoinButtonText(project)}
                    </span>
                  )}
                  
                  {/* 项目管理按钮（项目成员可见） */}
                  {user && (
                    <button
                      onClick={() => onSelectProject(project)}
                      className="btn-primary btn-sm flex items-center justify-center gap-1"
                      title="项目管理"
                    >
                      <Cog className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!user && (
        <div className="card bg-secondary-50 border-secondary-200">
          <div className="text-center py-6">
            <Users className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="font-semibold text-secondary-900 mb-2">
              登录获取更多权限
            </h3>
            <p className="text-secondary-600 mb-4">
              登录后可以查看更多项目、创建新项目和参与项目协作
            </p>
            <button 
              onClick={signOut}
              className="btn-primary"
            >
              立即登录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}