import React from 'react'
import { User } from '@/lib/supabase'
import { Home, FolderOpen, Settings, LogOut, Bot, Zap } from 'lucide-react'

interface SidebarProps {
  user: User | null
  onSignOut: () => void
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:block hidden">
      <div className="flex flex-col h-full">
        {/* Logo区域 */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-secondary-100">
          <div className="p-2 bg-primary-600 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-secondary-900">AI项目管理</h1>
            <p className="text-xs text-secondary-500">智能化协作平台</p>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="px-6 py-4 border-b border-secondary-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-medium">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-secondary-900">{user?.name}</p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-secondary-500">{user?.email}</span>
                                 {user?.is_ai_assist_enabled && (
                   <span title="AI辅助已开启">
                     <Zap className="h-3 w-3 text-primary-500" />
                   </span>
                 )}
              </div>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-6 py-4">
          <ul className="space-y-2">
            <li>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 text-secondary-700 rounded-lg hover:bg-secondary-50 hover:text-primary-600 transition-colors"
              >
                <Home className="h-4 w-4" />
                仪表板
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 text-secondary-700 rounded-lg hover:bg-secondary-50 hover:text-primary-600 transition-colors"
              >
                <FolderOpen className="h-4 w-4" />
                我的项目
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 text-secondary-700 rounded-lg hover:bg-secondary-50 hover:text-primary-600 transition-colors"
              >
                <Settings className="h-4 w-4" />
                设置
              </a>
            </li>
          </ul>
        </nav>

        {/* 退出按钮 */}
        <div className="px-6 py-4 border-t border-secondary-100">
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 px-3 py-2 text-secondary-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </div>
    </div>
  )
} 