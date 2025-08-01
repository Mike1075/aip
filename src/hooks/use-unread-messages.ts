import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { organizationAPI, supabase } from '@/lib/supabase'

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
        const pendingRequests = orgRequests.filter((request: any) => request.status === 'pending')
        totalUnread += pendingRequests.length
      }

      // 2. 获取用户管理的项目收到的待处理申请
      const projectRequests = await organizationAPI.getProjectJoinRequestsForManager(user.id)
      const pendingProjectRequests = projectRequests.filter((request: any) => request.status === 'pending')
      totalUnread += pendingProjectRequests.length

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

  return {
    unreadCount,
    loading,
    refreshUnreadCount
  }
}