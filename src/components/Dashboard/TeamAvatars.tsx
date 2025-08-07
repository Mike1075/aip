import React, { useState } from 'react'
import { Users, ChevronDown, ChevronUp } from 'lucide-react'

interface TeamMember {
  user_id: string
  role_in_project: string
  user?: {
    name?: string
    email?: string
  }
}

interface TeamAvatarsProps {
  members: TeamMember[]
  maxVisible?: number
  disabled?: boolean
}

export function TeamAvatars({ members, maxVisible = 9, disabled = false }: TeamAvatarsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const visibleMembers = isExpanded ? members : members.slice(0, maxVisible)
  const hasMore = members.length > maxVisible

  const getInitials = (member: TeamMember): string => {
    if (member.user?.name) {
      return member.user.name.slice(0, 2).toUpperCase()
    }
    if (member.user?.email) {
      return member.user.email.slice(0, 2).toUpperCase()
    }
    return member.user_id.slice(0, 2).toUpperCase()
  }

  const getDisplayName = (member: TeamMember): string => {
    if (member.user?.name) {
      return member.user.name
    }
    if (member.user?.email) {
      return member.user.email
    }
    return `用户${member.user_id.slice(-4)}`
  }

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'manager':
        return 'bg-purple-500'
      case 'member':
        return 'bg-blue-500'
      case 'viewer':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getRoleText = (role: string): string => {
    switch (role) {
      case 'manager':
        return '管理员'
      case 'member':
        return '成员'
      case 'viewer':
        return '查看者'
      default:
        return role
    }
  }

  if (disabled) {
    return (
      <div className="flex items-center justify-center p-4 bg-secondary-100 rounded-lg">
        <Users className="h-5 w-5 text-secondary-400 mr-2" />
        <span className="text-sm text-secondary-500">团队成员仅限成员查看</span>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 bg-secondary-50 rounded-lg border-2 border-dashed border-secondary-200">
        <Users className="h-5 w-5 text-secondary-400 mr-2" />
        <span className="text-sm text-secondary-500">暂无团队成员</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 头像网格 */}
      <div className="flex flex-wrap gap-2">
        {visibleMembers.map((member) => (
          <div
            key={member.user_id}
            className="group relative"
          >
            {/* 头像 */}
            <div
              className={`w-10 h-10 rounded-full ${getRoleColor(member.role_in_project)} 
                         flex items-center justify-center text-white text-sm font-medium
                         cursor-pointer hover:scale-110 transition-transform duration-200
                         shadow-md hover:shadow-lg`}
              title={`${getDisplayName(member)} (${getRoleText(member.role_in_project)})`}
            >
              {getInitials(member)}
            </div>
            
            {/* 悬浮提示卡片 */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200
                          pointer-events-none z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap
                            shadow-lg">
                <div className="font-medium">{getDisplayName(member)}</div>
                <div className="text-gray-300">{getRoleText(member.role_in_project)}</div>
                {/* 小箭头 */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 展开/收起按钮 */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center w-full py-2 text-sm text-primary-600 
                   hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors
                   border border-primary-200 hover:border-primary-300"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              收起 ({members.length - maxVisible} 个成员)
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              展开查看更多 ({members.length - maxVisible} 个成员)
            </>
          )}
        </button>
      )}

      {/* 成员统计 */}
      <div className="text-xs text-secondary-500 text-center">
        共 {members.length} 名团队成员
      </div>
    </div>
  )
}