import React, { useState, useEffect } from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { Building2, Users, Home, Settings, LogOut, User, Globe, Menu, Inbox, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Organization, Project, organizationAPI } from '@/lib/supabase'
import { OrganizationSidebar } from './OrganizationSidebar'
import { InteractionLog } from './InteractionLog'
import { useUnreadMessages } from '@/hooks/use-unread-messages'
import { useAppNavigation } from '@/hooks/use-app-navigation'

// 导入页面组件
import { MyOrganizationsPage } from '@/pages/MyOrganizationsPage'
import { ExploreOrganizationsPage } from '@/pages/ExploreOrganizationsPage'
import { OrganizationDetailPage } from '@/pages/OrganizationDetailPage'
import { OrganizationDashboardPage } from '@/pages/OrganizationDashboardPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { ProjectSettingsPage } from '@/pages/ProjectSettingsPage'
import { InviteModal } from './InviteModal'

export function RoutedMainDashboard() {
  const { user, signOut, isGuest } = useAuth()
  const { currentView, organizationId, projectId } = useAppNavigation()
  const navigate = useNavigate()
  
  // UI 状态
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const { unreadCount, refreshUnreadCount } = useUnreadMessages()
  const [showInviteModal, setShowInviteModal] = useState(false)
  
  // 数据状态
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)

  // 根据 URL 参数加载数据
  useEffect(() => {
    const loadData = async () => {
      if (organizationId && organizationId !== selectedOrganization?.id) {
        setLoading(true)
        try {
          const org = await organizationAPI.getOrganizationById(organizationId)
          setSelectedOrganization(org)
        } catch (error) {
          console.error('加载组织失败:', error)
          navigate('/explore-organizations')
        } finally {
          setLoading(false)
        }
      }

      if (projectId && organizationId && projectId !== selectedProject?.id) {
        setLoading(true)
        try {
          const project = await organizationAPI.getProjectById(projectId)
          setSelectedProject(project)
        } catch (error) {
          console.error('加载项目失败:', error)
          if (selectedOrganization) {
            navigate(`/organizations/${selectedOrganization.id}`)
          }
        } finally {
          setLoading(false)
        }
      }
    }

    loadData()
  }, [organizationId, projectId, navigate])

  const handleSidebarOrganizationSelect = (org: Organization) => {
    navigate(`/organizations/${org.id}/dashboard`)
    setSidebarOpen(false)
  }

  const handleLogoClick = () => {
    navigate(isGuest ? '/explore-organizations' : '/my-organizations')
    setSelectedOrganization(null)
    setSelectedProject(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-secondary-200/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo和品牌 */}
            <div className="flex items-center gap-8">
              {/* 汉堡菜单按钮 */}
              {!isGuest && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                  title="我的组织"
                >
                  <Menu className="h-5 w-5 text-secondary-600" />
                </button>
              )}
              
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleLogoClick}
              >
                <div className="p-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                    AI项目管理平台
                  </h1>
                  {selectedOrganization && currentView === 'dashboard' && (
                    <p className="text-sm text-secondary-600">
                      {selectedOrganization.name}
                    </p>
                  )}
                </div>
              </div>
              
              {/* 导航标签 */}
              {!isGuest && (
                <nav className="flex items-center gap-1">
                  <button
                    onClick={() => navigate('/my-organizations')}
                    className={`nav-tab ${currentView === 'my-organizations' || currentView === 'dashboard' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
                  >
                    <Building2 className="h-4 w-4" />
                    我的组织
                  </button>
                  <button
                    onClick={() => navigate('/explore-organizations')}
                    className={`nav-tab ${currentView === 'explore-organizations' || currentView === 'organization-detail' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
                  >
                    <Globe className="h-4 w-4" />
                    探索组织
                  </button>
                </nav>
              )}
            </div>
            
            {/* 用户菜单 */}
            <div className="flex items-center gap-3">
              {user && !isGuest && (
                <button
                  onClick={() => setShowInbox(true)}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors relative"
                  title="消息盒子"
                >
                  <Inbox className="h-5 w-5 text-secondary-600" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </div>
                  )}
                </button>
              )}
              
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary-50 transition-colors"
                  >
                    <div className="text-right">
                      <p className="text-sm font-medium text-secondary-900">{user.name}</p>
                      <p className="text-xs text-secondary-500">
                        {isGuest ? '游客模式' : user.email}
                      </p>
                    </div>
                    <div className="h-9 w-9 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-sm font-medium text-white">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-secondary-200 py-2 z-50">
                      {!isGuest && (
                        <button
                          onClick={() => {
                            setShowInviteModal(true)
                            setShowUserMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 flex items-center gap-2"
                        >
                          <Mail className="h-4 w-4" />
                          发送邀请
                        </button>
                      )}
                      <button
                        onClick={() => {
                          signOut()
                          setShowUserMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        {isGuest ? '登录' : '退出登录'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                  <User className="h-4 w-4" />
                  登录
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区域 - 使用路由 */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={isGuest ? <ExploreOrganizationsPage /> : <MyOrganizationsPage />} />
            <Route path="/my-organizations" element={<MyOrganizationsPage />} />
            <Route path="/explore-organizations" element={<ExploreOrganizationsPage />} />
            <Route path="/create-organization" element={<ExploreOrganizationsPage showCreateModal={true} />} />
            
            {/* 组织相关路由 - 不依赖于 selectedOrganization 状态 */}
            <Route 
              path="/organizations/:organizationId" 
              element={<OrganizationDetailPage />} 
            />
            <Route 
              path="/organizations/:organizationId/dashboard" 
              element={<OrganizationDashboardPage />} 
            />
            <Route 
              path="/organizations/:organizationId/projects/:projectId" 
              element={<ProjectDetailPage />} 
            />
            <Route 
              path="/organizations/:organizationId/projects/:projectId/settings" 
              element={<ProjectSettingsPage />} 
            />
          </Routes>
        </div>
      </main>

      {/* 组织侧边栏 */}
      <OrganizationSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectOrganization={handleSidebarOrganizationSelect}
      />

      {/* 消息盒子 */}
      {showInbox && (
        <InteractionLog 
          onClose={() => {
            setShowInbox(false)
            refreshUnreadCount()
          }}
          onUnreadCountChange={refreshUnreadCount} // 传递刷新未读计数的回调
        />
      )}

      {/* 邀请弹窗 */}
      {showInviteModal && (
        <InviteModal 
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}