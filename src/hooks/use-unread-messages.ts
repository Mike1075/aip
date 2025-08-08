import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { organizationAPI, invitationAPI } from '@/lib/supabase'

export function useUnreadMessages() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let totalUnread = 0

      // 1. 获取用户管理的组织收到的待处理申请
      const managedOrgs = await organizationAPI.getUserManagedOrganizations(user.id)
      
      for (const org of managedOrgs) {
        const orgRequests = await organizationAPI.getOrganizationJoinRequests(org.id)
        console.log(`📊 组织 ${org.name} 的所有申请:`, orgRequests)
        const pendingRequests = orgRequests.filter((request: any) => request.status === 'pending')
        console.log(`📊 组织 ${org.name} 的待处理申请:`, pendingRequests)
        totalUnread += pendingRequests.length
      }

      // 2. 获取用户管理的项目收到的待处理申请
      const projectRequests = await organizationAPI.getProjectJoinRequestsForManager(user.id)
      console.log(`📊 用户管理的项目申请:`, projectRequests)
      const pendingProjectRequests = projectRequests.filter((request: any) => request.status === 'pending')
      console.log(`📊 用户管理的项目待处理申请:`, pendingProjectRequests)
      totalUnread += pendingProjectRequests.length

      // 3. 🆕 获取用户收到的申请状态变化通知（未读）
      try {
        console.log('📔 开始获取用户通知...')
        const unreadCount = await organizationAPI.getUnreadCount(user.id)
        console.log('📔 用户未读消息总数:', unreadCount)
        // 注意：getUnreadCount 已经包含了所有类型的未读消息，所以我们直接使用它
        setUnreadCount(unreadCount)
        return // 直接返回，不需要累加
      } catch (error) {
        console.error('❌ 获取通知失败:', error)
        console.log('通知功能可能未完全实现或数据库表不存在，使用旧方法计数')
        // 如果新方法失败，继续使用旧的累加方法
      }

      setUnreadCount(totalUnread)
    } catch (error) {
      console.error('获取未读消息数量失败:', error)
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnreadCount()
    
    // 设置定时刷新，每30秒检查一次未读消息
    const interval = setInterval(loadUnreadCount, 30000)
    
    return () => clearInterval(interval)
  }, [user])

  // 手动刷新未读数量的方法
  const refreshUnreadCount = () => {
    loadUnreadCount()
  }

  // 强制清除所有缓存并重新加载
  const forceRefresh = async () => {
    setLoading(true)
    setUnreadCount(0)
    
    // 清除可能的缓存（如果有）
    try {
      await loadUnreadCount()
    } catch (error) {
      console.error('强制刷新失败:', error)
      setUnreadCount(0)
    }
  }

  return {
    unreadCount,
    loading,
    refreshUnreadCount,
    forceRefresh
  }
}