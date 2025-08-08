import React, { useState } from 'react'
import { Building2, Users, Home, Settings, LogOut, User, Globe, Menu, Inbox, Bot, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Organization, Project } from '@/lib/supabase'
import { Dashboard } from './Dashboard'
import { OrganizationList } from './OrganizationList'
import { OrganizationDetail } from './OrganizationDetail'
import { ProjectSettings } from './ProjectSettings'
import { ProjectDetailPage } from './ProjectDetailPage'
import { MyOrganizations } from './MyOrganizations'
import { OrganizationSidebar } from './OrganizationSidebar'
import { InteractionLog } from './InteractionLog'
import { AIChat } from './AIChat'
import { InviteModal } from './InviteModal'
import { useUnreadMessages } from '@/hooks/use-unread-messages'

type ViewType = 'dashboard' | 'my-organizations' | 'explore-organizations' | 'organization-detail' | 'project-settings' | 'project-detail' | 'create-organization'

export function MainDashboard() {
  const { user, signOut, isGuest } = useAuth()
  const [currentView, setCurrentView] = useState<ViewType>(isGuest ? 'explore-organizations' : 'my-organizations')
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isExploringOrganization, setIsExploringOrganization] = useState(false) // 标记是否是在探索模式
  const { unreadCount, refreshUnreadCount, forceRefresh } = useUnreadMessages()

  // 导航处理函数
  const handleNavigateToMyOrganizations = () => {
    setCurrentView('my-organizations')
    setSelectedOrganization(null)
    setSelectedProject(null)
  }

  const handleNavigateToExploreOrganizations = () => {
    setCurrentView('explore-organizations')
    setSelectedOrganization(null)
    setSelectedProject(null)
  }

  const handleSelectOrganizationForWorkspace = (org: Organization) => {
    // 从"我的组织"选择组织进入工作台
    setSelectedOrganization(org)
    setCurrentView('dashboard')
    setSelectedProject(null)
  }

  const handleSelectOrganizationForExplore = (org: Organization) => {
    // 从"探索组织"进入组织详情
    setSelectedOrganization(org)
    setCurrentView('organization-detail')
    setSelectedProject(null)
    setIsExploringOrganization(true) // 标记为探索模式
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    setCurrentView('project-settings')
  }

  const handleViewProject = (project: Project) => {
    setSelectedProject(project)
    setCurrentView('project-detail')
  }

  const handleCreateOrganization = () => {
    setCurrentView('create-organization')
  }

  const handleSidebarOrganizationSelect = (org: Organization) => {
    setSelectedOrganization(org)
    setCurrentView('dashboard')
    setSelectedProject(null)
    setSidebarOpen(false)
  }

  const handleBackToMyOrganizations = () => {
    setCurrentView('my-organizations')
    setSelectedOrganization(null)
    setSelectedProject(null)
  }

  const handleBackToExploreOrganizations = () => {
    setCurrentView('explore-organizations')
    setSelectedOrganization(null)
    setSelectedProject(null)
    setIsExploringOrganization(false) // 重置探索模式标记
  }

  const handleBackToOrganizationDetail = () => {
    if (selectedOrganization) {
      setCurrentView('organization-detail')
    } else {
      setCurrentView('explore-organizations')
    }
    setSelectedProject(null)
  }


  const handleProjectSave = (updatedProject: Project) => {
    setSelectedProject(updatedProject)
    // 可以选择返回组织详情或保持在设置页面
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        // 组织工作台 - 需要选中组织且用户已登录
        if (isGuest) {
          return (
            <MyOrganizations 
              onSelectOrganization={handleSelectOrganizationForWorkspace}
              onCreateOrganization={handleCreateOrganization}
            />
          )
        }
        return selectedOrganization ? (
          <Dashboard organization={selectedOrganization} />
        ) : (
          <MyOrganizations 
            onSelectOrganization={handleSelectOrganizationForWorkspace}
            onCreateOrganization={handleCreateOrganization}
          />
        )
      
      case 'my-organizations':
        if (isGuest) {
          return (
            <OrganizationList 
              onSelectOrganization={handleSelectOrganizationForExplore}
            />
          )
        }
        return (
          <MyOrganizations 
            onSelectOrganization={handleSelectOrganizationForWorkspace}
            onCreateOrganization={handleCreateOrganization}
          />
        )
      
      case 'explore-organizations':
        return (
          <OrganizationList 
            onSelectOrganization={handleSelectOrganizationForExplore}
          />
        )
        
      case 'create-organization':
        return (
          <OrganizationList 
            onSelectOrganization={handleSelectOrganizationForExplore}
            showCreateModal={true}
          />
        )
      
      case 'organization-detail':
        return selectedOrganization ? (
          <OrganizationDetail
            organization={selectedOrganization}
            onBack={handleBackToExploreOrganizations}
            onSelectProject={handleSelectProject}
            onViewProject={handleViewProject}
            // 只有在非探索模式下才传递创建项目功能
            onCreateProject={!isExploringOrganization ? () => {
              if (isGuest) {
                alert('请先登录才能创建项目')
                return
              }
              setCurrentView('dashboard')
            } : undefined}
          />
        ) : null
      
      case 'project-settings':
        if (isGuest) {
          return (
            <OrganizationList 
              onSelectOrganization={handleSelectOrganizationForExplore}
            />
          )
        }
        return selectedProject ? (
          <ProjectSettings
            project={selectedProject}
            onBack={handleBackToOrganizationDetail}
            onSave={handleProjectSave}
          />
        ) : null
      
      case 'project-detail':
        return selectedProject ? (
          <ProjectDetailPage
            project={selectedProject}
            onBack={handleBackToOrganizationDetail}
            readOnly={isGuest || !user} // 游客或未登录用户为只读模式
          />
        ) : null
      
      default:
        return isGuest ? (
          <OrganizationList 
            onSelectOrganization={handleSelectOrganizationForExplore}
          />
        ) : (
          <MyOrganizations 
            onSelectOrganization={handleSelectOrganizationForWorkspace}
            onCreateOrganization={handleCreateOrganization}
          />
        )
    }
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
                onClick={() => {
                  setCurrentView(isGuest ? 'explore-organizations' : 'my-organizations')
                  setSelectedOrganization(null)
                  setSelectedProject(null)
                  setIsExploringOrganization(false)
                }}
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
                    onClick={handleNavigateToMyOrganizations}
                    className={`nav-tab ${currentView === 'my-organizations' || currentView === 'dashboard' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
                  >
                    <Building2 className="h-4 w-4" />
                    我的组织
                  </button>
                  <button
                    onClick={handleNavigateToExploreOrganizations}
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
              {/* 全局AI聊天按钮 */}
              <button
                onClick={() => setShowAIChat(true)}
                className="p-2 hover:bg-primary-100 rounded-lg transition-colors relative group"
                title="AI助手"
              >
                <Bot className="h-5 w-5 text-primary-600 group-hover:text-primary-700" />
              </button>

              {user && !isGuest && (
                <button
                  onClick={() => setShowInbox(true)}
                  onDoubleClick={() => {
                    console.log('🔄 双击收件箱，强制刷新权限和未读消息')
                    forceRefresh()
                  }}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors relative"
                  title="消息盒子 (双击强制刷新)"
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
                      {/* 调试信息 */}
                      {console.log('🔍 用户菜单调试:', { user: user?.email, isGuest })}
                      {/* 临时强制显示邀请按钮来测试 */}
                      <button
                        onClick={() => {
                          setShowInviteModal(true)
                          setShowUserMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        发送邀请 {isGuest ? '(游客模式)' : '(已登录)'}
                      </button>
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

      {/* 主内容区域 */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {renderContent()}
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
            forceRefresh() // 关闭收件箱时强制刷新，确保权限变更生效
          }}
          onUnreadCountChange={refreshUnreadCount} // 传递刷新未读计数的回调
        />
      )}

      {/* 全局AI聊天 */}
      {showAIChat && (
        <AIChat 
          onClose={() => setShowAIChat(false)}
          organization={selectedOrganization || undefined}
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
