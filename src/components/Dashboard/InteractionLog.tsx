import React, { useState, useEffect } from 'react'
import { MessageSquare as LogIcon, Users, FolderOpen, Clock, Check, X, User, Send, Inbox, Eye, Bell, Trash2, Eraser, Mail, Building2 } from 'lucide-react'
import { organizationAPI, OrganizationJoinRequest, supabase, Notification, invitationAPI, Invitation } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { InvitationResponse } from './InvitationResponse'
import { InvitationCard } from './InvitationCard'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 为 Invitation 扩展一个 inviter_name 字段以展示
type InvitationWithInviter = Invitation & { inviter_name?: string }

interface InteractionLogProps {
  onClose: () => void
  onUnreadCountChange?: () => void
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

export function InteractionLog({ onClose, onUnreadCountChange }: InteractionLogProps) {
  const { user } = useAuth()
  const [interactions, setInteractions] = useState<UnifiedInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'received' | 'sent' | 'notifications'>('all')
  const [invitations, setInvitations] = useState<InvitationWithInviter[]>([])
  const [sentInvitations, setSentInvitations] = useState<InvitationWithInviter[]>([])
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
      
      // 并行拉取每个组织的申请，显著降低等待时间
      const orgReqBatches = await Promise.all(
        managedOrgs.map(async (org: any) => {
          const reqs = await organizationAPI.getOrganizationJoinRequests(org.id)
          return { org, reqs }
        })
      )

      for (const batch of orgReqBatches) {
        const { org, reqs } = batch
        reqs.forEach((request: any) => {
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

      // 2) 获取用户发送的请求（批量查询组织名称）
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
          // 跳过邀请类通知，避免与“收到的邀请/发送的邀请”重复
          if (notification.type === 'invitation_received' || notification.type === 'invitation_sent') {
            return
          }
          allInteractions.push({
            id: notification.id,
            type: 'notification',
            interactionType: 'notification',
            title: notification.title,
            description: notification.message,
            targetName: notification.metadata?.organization_name || notification.metadata?.project_name || '系统通知',
            otherPartyName: '系统',
            otherPartyEmail: '',
            // 避免在详情区重复显示“申请理由”
            message: undefined,
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

            // 按时间倒序排列
      allInteractions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setInteractions(allInteractions)

      // 加载邀请数据
      console.log('💌 加载邀请数据...')
      try {
        const [receivedInvites, sentInvites] = await Promise.all([
          invitationAPI.getReceivedInvitations(user.email, user.id),
          invitationAPI.getSentInvitations(user.id)
        ])
        
        // 补充邀请者名称
        const enrichInvites = async (invites: Invitation[]): Promise<InvitationWithInviter[]> => {
          const inviterIds = Array.from(new Set(invites.map(i => i.inviter_id)))
          const { data: users } = await supabase.from('users').select('id,name').in('id', inviterIds)
          const idToName = new Map((users || []).map(u => [u.id, u.name || '']))
          return invites.map(i => ({ ...i, inviter_name: idToName.get(i.inviter_id) }))
        }

        setInvitations(await enrichInvites(receivedInvites))
        setSentInvitations(await enrichInvites(sentInvites))
        console.log('✅ 邀请数据加载完成:', { 
          received: receivedInvites.length, 
          sent: sentInvites.length 
        })
      } catch (invitationError) {
        console.error('❌ 加载邀请数据失败:', invitationError)
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
        .eq('user_id', user!.id)
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

  const handleMarkAsRead = async (interaction: UnifiedInteraction) => {
    if (!user) return
    
    try {
      // 根据交互类型标记为已读
      if (interaction.type === 'notification') {
        await organizationAPI.markNotificationAsRead(interaction.id)
      } else if (interaction.type === 'organization' && (interaction.status === 'approved' || interaction.status === 'rejected')) {
        await organizationAPI.markOrganizationRequestAsRead(interaction.id)
      } else if (interaction.type === 'project' && (interaction.status === 'approved' || interaction.status === 'rejected')) {
        await organizationAPI.markProjectRequestAsRead(interaction.id)
      }
      
      // 更新本地状态
      setInteractions(prev => prev.map(item => 
        item.id === interaction.id 
          ? { 
              ...item, 
              status: item.type === 'notification' ? 'read' : item.status,
              originalRequest: item.originalRequest ? { ...item.originalRequest, is_read: true } : item.originalRequest
            }
          : item
      ))
      
      // 通知父组件刷新未读计数
      if (onUnreadCountChange) {
        onUnreadCountChange()
      }
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const handleDeleteInteraction = async (interaction: UnifiedInteraction) => {
    if (!user) return
    
    try {
      console.log('🗑️ 开始删除消息:', interaction)
      
      // 根据交互类型删除
      if (interaction.type === 'notification') {
        console.log('🔔 删除通知，ID:', interaction.id)
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', interaction.id)
        if (error) throw error
      } else if (interaction.type === 'organization') {
        console.log('🏢 删除组织申请，ID:', interaction.id)
        const { error } = await supabase
          .from('organization_join_requests')
          .delete()
          .eq('id', interaction.id)
        if (error) throw error
      } else if (interaction.type === 'project') {
        console.log('📁 删除项目申请，ID:', interaction.id)
        const { error } = await supabase
          .from('project_join_requests')
          .delete()
          .eq('id', interaction.id)
        if (error) throw error
      }
      
      console.log('✅ 数据库删除成功，更新本地状态')
    } catch (error: any) {
      // 如果后端删除失败（例如记录不存在），仍从前端移除
      console.warn('⚠️ 后端删除失败，仍移除前端项:', error?.message)
    } finally {
      setInteractions(prev => prev.filter(item => item.id !== interaction.id))
      onUnreadCountChange?.()
    }
  }

  // 一键清空已完成的消息（无确认弹窗）
  const handleClearCompleted = async () => {
    if (!user) return
    try {
      setProcessing('clear')
      // 可删除的交互
      const deletableInteractions = interactions.filter(canDelete)
      const notifications = deletableInteractions.filter(i => i.type === 'notification')
      const orgRequests = deletableInteractions.filter(i => i.type === 'organization')
      const projectRequests = deletableInteractions.filter(i => i.type === 'project')

      // 后端尝试删除（失败不阻断）
      try {
        if (notifications.length > 0) {
          const ids = notifications.map(n => n.id)
          await supabase.from('notifications').delete().in('id', ids)
        }
        if (orgRequests.length > 0) {
          const orgRequestIds = orgRequests.map(r => r.id)
          await supabase.from('organization_join_requests').delete().in('id', orgRequestIds)
        }
        if (projectRequests.length > 0) {
          const projectRequestIds = projectRequests.map(r => r.id)
          await supabase.from('project_join_requests').delete().in('id', projectRequestIds)
        }
        // 同步清理已完成的邀请
        const deletableInviteIds = invitations.filter(i => i.status !== 'pending').map(i => i.id)
        if (deletableInviteIds.length > 0) {
          await supabase.from('invitations').delete().in('id', deletableInviteIds)
        }
      } catch (e) {
        console.warn('⚠️ 批量清空存在部分失败：', e)
      } finally {
        // 前端直接过滤掉
        const deletableIds = new Set(deletableInteractions.map(i => i.id))
        setInteractions(prev => prev.filter(i => !deletableIds.has(i.id)))
        setInvitations(prev => prev.filter(i => i.status === 'pending'))
        onUnreadCountChange?.()
      }
    } finally {
      setProcessing(null)
    }
  }

  // 判断是否可以删除
  const canDelete = (interaction: UnifiedInteraction) => {
    // 通知可以直接删除
    if (interaction.type === 'notification') {
      return true
    }
    
    // 邀请通知或申请通知只有在状态为完成（approved/rejected）后才可删除
    if (interaction.type === 'organization' || interaction.type === 'project') {
      return interaction.status === 'approved' || interaction.status === 'rejected'
    }
    
    return false
  }

  const toggleExpanded = async (itemId: string) => {
    if (!user) return
    
    const interaction = interactions.find(i => i.id === itemId)
    if (!interaction) return

    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
      
      // 当展开未读消息时，自动标记为已读
      if ((interaction.type === 'notification' && interaction.status === 'unread') ||
          ((interaction.type === 'organization' || interaction.type === 'project') && 
           (interaction.status === 'approved' || interaction.status === 'rejected') &&
           interaction.originalRequest?.is_read === false)) {
        await handleMarkAsRead(interaction)
      }
    }
    setExpandedItems(newExpanded)
  }

  const filteredInteractions = interactions.filter(interaction => {
    if (activeTab === 'all') return true
    if (activeTab === 'notifications') return interaction.interactionType === 'notification'
    return interaction.interactionType === activeTab
  })

  // 获取"发送的"栏目需要显示的邀请
  const getSentInvitations = () => {
    if (activeTab === 'sent') {
      return sentInvitations
    }
    return []
  }

  // 刷新邀请并触发未读计数刷新
  const reloadInvitations = async () => {
    if (!user) return
    try {
      const [receivedInvites, sentInvites] = await Promise.all([
        invitationAPI.getReceivedInvitations(user!.email, user!.id),
        invitationAPI.getSentInvitations(user!.id)
      ])
      // 补充邀请者名称
      const enrichInvites = async (invites: Invitation[]): Promise<InvitationWithInviter[]> => {
        const inviterIds = Array.from(new Set(invites.map(i => i.inviter_id)))
        const { data: users } = await supabase.from('users').select('id,name').in('id', inviterIds)
        const idToName = new Map((users || []).map(u => [u.id, u.name || '']))
        return invites.map(i => ({ ...i, inviter_name: idToName.get(i.inviter_id) }))
      }
      setInvitations(await enrichInvites(receivedInvites))
      setSentInvitations(await enrichInvites(sentInvites))
    } finally {
      onUnreadCountChange?.()
    }
  }

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
              <h2 className="text-xl font-semibold text-secondary-900">消息盒子</h2>
              <p className="text-sm text-secondary-600">
                查看所有申请的发送和接收记录
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 一键清空按钮 */}
            {interactions.filter(canDelete).length > 0 && (
              <button
                onClick={handleClearCompleted}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                title="清空所有已完成的消息（保留待处理的申请）"
              >
                <Eraser className="h-4 w-4" />
                清空已完成
                <span className="bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full text-xs">
                  {interactions.filter(canDelete).length}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-secondary-600" />
            </button>
          </div>
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
            发送的 ({interactions.filter(i => i.interactionType === 'sent').length + sentInvitations.length})
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
          ) : (activeTab === 'sent' ? (filteredInteractions.length === 0 && sentInvitations.length === 0) : filteredInteractions.length === 0) ? (
            <div className="text-center py-12">
              <LogIcon className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">
                暂无交互记录
              </h3>
              <p className="text-secondary-600">
                {activeTab === 'all' && '还没有任何申请记录'}
                {activeTab === 'received' && '还没有收到任何申请'}
                {activeTab === 'sent' && '还没有发送任何申请或邀请'}
                {activeTab === 'notifications' && '还没有任何通知'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {/* "发送的"tab特殊处理 - 包含邀请 */}
              {activeTab === 'sent' ? (
                <>
                  {/* 发送的申请 */}
                  {filteredInteractions.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-secondary-700 mb-3 flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        发送的申请 ({filteredInteractions.length})
                      </h4>
                      <div className="space-y-3">
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
                                className="p-3 cursor-pointer flex items-center justify-between hover:bg-secondary-25 group"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  toggleExpanded(interaction.id)
                                }}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="flex-shrink-0">
                                    {getInteractionIcon(interaction.type, interaction.interactionType)}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-secondary-900 truncate">
                                      {interaction.title}
                                    </h3>
                                    <p className="text-xs text-secondary-600 truncate">
                                      {interaction.description}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {getStatusBadge(interaction.status)}
                                  {canDelete(interaction) && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleDeleteInteraction(interaction)
                                      }}
                                      className="p-1 hover:bg-red-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                                      title="删除消息"
                                    >
                                      <Trash2 className="h-4 w-4 text-secondary-400 hover:text-red-600" />
                                    </button>
                                  )}
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
                                    <p className="text-sm text-secondary-700">
                                      {interaction.description}
                                    </p>
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
                                    {interaction.message && (
                                      <div className="bg-secondary-50 rounded-md p-3">
                                        <p className="text-sm text-secondary-700">
                                          <span className="font-medium">申请理由：</span>
                                          {interaction.message || '（未填写）'}
                                        </p>
                                      </div>
                                    )}
                                    {interaction.reviewedAt && (
                                      <div className="text-xs text-secondary-500">
                                        处理时间：{formatDate(interaction.reviewedAt)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 发送的邀请 */}
                  {sentInvitations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-secondary-700 mb-3 flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        发送的邀请 ({sentInvitations.length})
                      </h4>
                      <div className="space-y-3">
                        {sentInvitations.map((invitation) => (
                          <div key={invitation.id} className="border border-secondary-200 rounded-lg p-4">
                            {/* 保持原有“发送的邀请”展示 */}
                            {/* 邀请类型图标 */}
                            <div className={`p-2 rounded-lg ${
                              invitation.invitation_type === 'organization' 
                                ? 'bg-blue-100' 
                                : 'bg-green-100'
                            }`}>
                              {invitation.invitation_type === 'organization' ? (
                                <Building2 className="h-4 w-4 text-blue-600" />
                              ) : (
                                <FolderOpen className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                邀请 {invitation.invitee_email}
                              </p>
                              <p className="text-sm text-secondary-600">
                                加入{invitation.invitation_type === 'organization' ? '组织' : '项目'}: {invitation.target_name}
                              </p>
                              <p className="text-xs text-secondary-500 mt-1">
                                {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true, locale: zhCN })}
                              </p>
                            </div>
                            <div>
                              {invitation.status === 'pending' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Clock className="w-3 h-3 mr-1" />
                                  等待回复
                                </span>
                              )}
                              {invitation.status === 'accepted' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <Check className="w-3 h-3 mr-1" />
                                  已接受
                                </span>
                              )}
                              {invitation.status === 'rejected' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <X className="w-3 h-3 mr-1" />
                                  已拒绝
                                </span>
                              )}
                            </div>
                            {invitation.message && (
                              <div className="mt-3 p-3 bg-secondary-50 rounded-lg">
                                <p className="text-sm text-secondary-700">{invitation.message}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* 其他tab：在上方插入“收到的邀请”，其余保留原申请/通知列表 */
                <>
                  {(activeTab === 'received' || activeTab === 'all') && invitations.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-secondary-700 mb-3 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        收到的邀请 ({invitations.length})
                      </h4>
                      <div className="space-y-3">
                        {invitations.map((invitation) => (
                          <InvitationCard key={invitation.id} invitation={invitation as any} onResponded={reloadInvitations} onDeleted={(id) => setInvitations(prev => prev.filter(i => i.id !== id))} />
                        ))}
                      </div>
                    </div>
                  )}

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
                        className="p-3 cursor-pointer flex items-center justify-between hover:bg-secondary-25 group"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleExpanded(interaction.id)
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-shrink-0">
                            {getInteractionIcon(interaction.type, interaction.interactionType)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-secondary-900 truncate">
                              {interaction.title}
                            </h3>
                            <p className="text-xs text-secondary-600 truncate">
                              {interaction.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* 状态标识 */}
                          {getStatusBadge(interaction.status)}
                          
                          {/* 未读标识 */}
                          {((interaction.type === 'notification' && interaction.status === 'unread') ||
                            ((interaction.type === 'organization' || interaction.type === 'project') && 
                             (interaction.status === 'approved' || interaction.status === 'rejected') &&
                             interaction.originalRequest?.is_read === false)) && (
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          )}
                          
                          {/* 删除按钮 */}
                          {canDelete(interaction) && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteInteraction(interaction)
                              }}
                              className="p-1 hover:bg-red-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="删除消息"
                            >
                              <Trash2 className="h-4 w-4 text-secondary-400 hover:text-red-600" />
                            </button>
                          )}
                          
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
                            <p className="text-sm text-secondary-700">
                              {interaction.description}
                            </p>
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

                            {/* 仅对申请类显示“申请理由”，通知不重复内容 */}
                            {interaction.type !== 'notification' && interaction.message && (
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

                            {/* 操作按钮（保持原有） */}
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

                            {/* 标记为已读按钮 - 用于已处理但未读的申请 */}
                            {interaction.interactionType === 'received' && 
                             (interaction.status === 'approved' || interaction.status === 'rejected') &&
                             interaction.originalRequest?.is_read === false && (
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMarkAsRead(interaction)
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                                >
                                  <Eye className="h-3 w-3" />
                                  标记为已读
                                </button>
                              </div>
                            )}

                            {/* 通知标记为已读按钮 */}
                            {interaction.type === 'notification' && interaction.status === 'unread' && (
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMarkAsRead(interaction)
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                                >
                                  <Eye className="h-3 w-3" />
                                  标记为已读
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}