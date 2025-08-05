import React, { useState, useEffect } from 'react'
import { MessageSquare as LogIcon, Users, FolderOpen, Clock, Check, X, User, Send, Inbox, Eye, Bell } from 'lucide-react'
import { organizationAPI, OrganizationJoinRequest, supabase, Notification } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface InteractionLogProps {
  onClose: () => void
}

type RequestType = 'organization' | 'project' | 'notification'
type InteractionType = 'received' | 'sent' | 'notification'

interface UnifiedInteraction {
  id: string
  type: RequestType
  interactionType: InteractionType
  title: string
  description: string
  targetName: string // 组织名或项目名
  otherPartyName: string // 对方用户名
  otherPartyEmail: string // 对方邮箱
  message?: string
  status: 'pending' | 'approved' | 'rejected' | 'read' | 'unread'
  createdAt: string
  reviewedAt?: string
  organizationId?: string
  projectId?: string
  originalRequest: any
}

export function InteractionLog({ onClose }: InteractionLogProps) {
  const { user } = useAuth()
  const [interactions, setInteractions] = useState<UnifiedInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'received' | 'sent' | 'notifications'>('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      loadAllInteractions()
    }
  }, [user])

  const loadAllInteractions = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      console.log('🔄 开始加载交互日志，用户ID:', user.id)
      
      const allInteractions: UnifiedInteraction[] = []

      // 1. 获取用户接收到的请求（用户管理的组织收到的申请）
      console.log('📥 获取接收到的请求...')
      let managedOrgs: any[] = []
      try {
        managedOrgs = await organizationAPI.getUserManagedOrganizations(user.id)
        console.log('🔍 用户管理的组织:', managedOrgs)
        console.log('🔍 管理的组织数量:', managedOrgs.length)
      } catch (error) {
        console.error('❌ 获取用户管理的组织失败:', error)
        console.log('⚠️ 将使用空数组继续执行')
        managedOrgs = []
      }
      
      for (const org of managedOrgs) {
        const orgRequests = await organizationAPI.getOrganizationJoinRequests(org.id)
        console.log(`📋 组织 ${org.name} 的申请:`, orgRequests)
        
        orgRequests.forEach((request: any) => {
          allInteractions.push({
            id: request.id,
            type: 'organization',
            interactionType: 'received',
            title: `加入组织申请`,
            description: `${request.user?.name || '未知用户'} 申请加入您管理的组织 ${org.name}`,
            targetName: org.name,
            otherPartyName: request.user?.name || '未知用户',
            otherPartyEmail: request.user?.email || '',
            message: request.message || '',
            status: request.status,
            createdAt: request.created_at,
            reviewedAt: request.reviewed_at,
            organizationId: org.id,
            originalRequest: request
          })
        })
      }

      // 2. 获取用户发送的请求
      console.log('📤 获取发送的请求...')
      await loadSentRequests(allInteractions)

      // 3. 获取项目相关的交互
      const projectRequests = await organizationAPI.getProjectJoinRequestsForManager(user.id)
      projectRequests.forEach((request: any) => {
        allInteractions.push({
          id: request.id,
          type: 'project',
          interactionType: 'received',
          title: `加入项目申请`,
          description: `${request.user?.name || '未知用户'} 申请加入您管理的项目 ${request.project?.name || '未知项目'}`,
          targetName: request.project?.name || '未知项目',
          otherPartyName: request.user?.name || '未知用户',
          otherPartyEmail: request.user?.email || '',
          message: request.message || '',
          status: request.status,
          createdAt: request.created_at,
          reviewedAt: request.reviewed_at,
          projectId: request.project_id,
          originalRequest: request
        })
      })

      // 4. 🆕 获取用户的通知
      console.log('🔔 获取用户通知...')
      try {
        const notifications = await organizationAPI.getUserNotifications(user.id)
        console.log('📋 用户通知:', notifications)
        
        notifications.forEach((notification: Notification) => {
          allInteractions.push({
            id: notification.id,
            type: 'notification',
            interactionType: 'notification',
            title: notification.title,
            description: notification.message,
            targetName: notification.metadata?.organization_name || notification.metadata?.project_name || '系统通知',
            otherPartyName: '系统',
            otherPartyEmail: '',
            message: notification.message,
            status: notification.is_read ? 'read' : 'unread',
            createdAt: notification.created_at,
            organizationId: notification.metadata?.organization_id,
            projectId: notification.metadata?.project_id,
            originalRequest: notification
          })
        })
      } catch (error) {
        console.log('获取通知失败，可能是数据库表不存在:', error)
      }

      console.log('📨 所有交互:', allInteractions)
      console.log('📨 交互数量:', allInteractions.length)

      // 按时间倒序排列
      allInteractions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      setInteractions(allInteractions)
      console.log('✅ 交互数据设置完成，当前interactions状态:', allInteractions)
      
      // 临时添加更多调试，看看实际数据库中的数据
      console.log('🔍 最终结果检查:')
      console.log('- managedOrgs数量:', managedOrgs.length)
      console.log('- allInteractions数量:', allInteractions.length)
      
      // 直接查询数据库看看有没有数据
      try {
        console.log('🔍 直接查询数据库...')
        const { data: allOrgRequests, error: allOrgError } = await supabase
          .from('organization_join_requests')
          .select('*')
          .limit(10)
        
        const { data: allProjectRequests, error: allProjectError } = await supabase
          .from('project_join_requests')
          .select('*')
          .limit(10)
          
        console.log('📊 数据库中的组织申请:', allOrgRequests)
        console.log('📊 数据库中的项目申请:', allProjectRequests)
        console.log('📊 组织申请查询错误:', allOrgError)
        console.log('📊 项目申请查询错误:', allProjectError)
      } catch (dbError) {
        console.error('❌ 直接查询数据库失败:', dbError)
      }
    } catch (error) {
      console.error('加载交互日志失败:', error)
      // 即使出错也要显示错误信息而不是空白
      setInteractions([])
    } finally {
      setLoading(false)
    }
  }

  const loadSentRequests = async (allInteractions: UnifiedInteraction[]) => {
    try {
      // 获取用户发送的组织加入申请
      const { data: sentOrgRequests, error: orgError } = await supabase
        .from('organization_join_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!orgError && sentOrgRequests) {
        for (const request of sentOrgRequests) {
          // 获取组织信息
          const { data: org, error: orgInfoError } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', request.organization_id)
            .single()

          if (!orgInfoError && org) {
            allInteractions.push({
              id: request.id,
              type: 'organization',
              interactionType: 'sent',
              title: `申请加入组织`,
              description: `您申请加入组织 ${org.name}`,
              targetName: org.name,
              otherPartyName: '组织管理员',
              otherPartyEmail: '',
              message: request.message || '',
              status: request.status,
              createdAt: request.created_at,
              reviewedAt: request.reviewed_at,
              organizationId: request.organization_id,
              originalRequest: request
            })
          }
        }
      }

      // TODO: 添加用户发送的项目申请
    } catch (error) {
      console.error('加载发送的请求失败:', error)
    }
  }

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!user) return
    
    setProcessing(requestId)
    
    try {
      const interaction = interactions.find(r => r.id === requestId)
      if (!interaction || interaction.interactionType !== 'received') return

      if (interaction.type === 'organization') {
        await organizationAPI.reviewJoinRequest(requestId, action, user.id)
      } else if (interaction.type === 'project') {
        await organizationAPI.reviewProjectJoinRequest(requestId, action === 'approve' ? 'approved' : 'rejected', user.id)
      }

      // 重新加载交互列表
      await loadAllInteractions()
      
      alert(action === 'approve' ? '申请已批准' : '申请已拒绝')
    } catch (error: any) {
      console.error('处理请求失败:', error)
      alert(`操作失败：${error.message || '请重试'}`)
    } finally {
      setProcessing(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 0) {
      return `${diffDays}天前`
    } else if (diffHours > 0) {
      return `${diffHours}小时前`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分钟前`
    } else {
      return '刚刚'
    }
  }

  const getInteractionIcon = (type: RequestType, interactionType: InteractionType) => {
    if (interactionType === 'sent') {
      return <Send className="h-5 w-5 text-blue-600" />
    } else {
      switch (type) {
        case 'organization':
          return <Users className="h-5 w-5 text-green-600" />
        case 'project':
          return <FolderOpen className="h-5 w-5 text-purple-600" />
        default:
          return <Inbox className="h-5 w-5 text-secondary-600" />
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">待处理</span>
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">已批准</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">已拒绝</span>
      case 'unread':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">未读</span>
      case 'read':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">已读</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{status}</span>
    }
  }

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const filteredInteractions = interactions.filter(interaction => {
    if (activeTab === 'all') return true
    if (activeTab === 'notifications') return interaction.interactionType === 'notification'
    return interaction.interactionType === activeTab
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <LogIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-secondary-900">交互日志</h2>
              <p className="text-sm text-secondary-600">
                查看所有申请的发送和接收记录
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-600" />
          </button>
        </div>

        {/* 选项卡 */}
        <div className="flex border-b border-secondary-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-600 hover:text-secondary-900'
            }`}
          >
            全部 ({interactions.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'received'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-600 hover:text-secondary-900'
            }`}
          >
            接收的 ({interactions.filter(i => i.interactionType === 'received').length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sent'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-600 hover:text-secondary-900'
            }`}
          >
            发送的 ({interactions.filter(i => i.interactionType === 'sent').length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-600 hover:text-secondary-900'
            }`}
          >
            通知 ({interactions.filter(i => i.interactionType === 'notification').length})
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : filteredInteractions.length === 0 ? (
            <div className="text-center py-12">
              <LogIcon className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">
                暂无交互记录
              </h3>
              <p className="text-secondary-600">
                {activeTab === 'all' && '还没有任何申请记录'}
                {activeTab === 'received' && '还没有收到任何申请'}
                {activeTab === 'sent' && '还没有发送任何申请'}
                {activeTab === 'notifications' && '还没有任何通知'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredInteractions.map((interaction) => {
                const isExpanded = expandedItems.has(interaction.id)
                const isPending = interaction.status === 'pending'
                
                return (
                  <div
                    key={interaction.id}
                    className={`border rounded-lg transition-all duration-200 ${
                      isPending && interaction.interactionType === 'received'
                        ? 'border-orange-200 bg-orange-50' 
                        : 'border-secondary-200 bg-white hover:bg-secondary-50'
                    }`}
                  >
                    {/* 简约的默认视图 */}
                    <div 
                      className="p-3 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleExpanded(interaction.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-shrink-0">
                          {getInteractionIcon(interaction.type, interaction.interactionType)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-secondary-900 truncate">
                              {interaction.title} - {interaction.targetName}
                            </span>
                            {getStatusBadge(interaction.status)}
                          </div>
                          <div className="text-sm text-secondary-600 truncate">
                            {interaction.interactionType === 'sent' ? '发送给' : '来自'} {interaction.otherPartyName}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-secondary-500">
                          {formatDate(interaction.createdAt)}
                        </span>
                        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* 展开的详细信息 */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-secondary-100">
                        <div className="pt-3 space-y-3">
                          {/* 描述信息 */}
                          <p className="text-sm text-secondary-700">
                            {interaction.description}
                          </p>
                          
                          {/* 用户信息 */}
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-secondary-500" />
                            <span className="text-sm font-medium text-secondary-900">
                              {interaction.otherPartyName}
                            </span>
                            {interaction.otherPartyEmail && (
                              <span className="text-sm text-secondary-600">
                                ({interaction.otherPartyEmail})
                              </span>
                            )}
                          </div>

                          {/* 申请理由 */}
                          {interaction.message && (
                            <div className="bg-secondary-50 rounded-md p-3">
                              <p className="text-sm text-secondary-700">
                                <span className="font-medium">申请理由：</span>
                                {interaction.message || '（未填写）'}
                              </p>
                            </div>
                          )}

                          {/* 处理时间 */}
                          {interaction.reviewedAt && (
                            <div className="text-xs text-secondary-500">
                              处理时间：{formatDate(interaction.reviewedAt)}
                            </div>
                          )}

                          {/* 操作按钮 */}
                          {interaction.interactionType === 'received' && interaction.status === 'pending' && (
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRequest(interaction.id, 'approve')
                                }}
                                disabled={processing === interaction.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm disabled:opacity-50"
                              >
                                <Check className="h-3 w-3" />
                                {processing === interaction.id ? '处理中...' : '批准'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRequest(interaction.id, 'reject')
                                }}
                                disabled={processing === interaction.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                                {processing === interaction.id ? '处理中...' : '拒绝'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}