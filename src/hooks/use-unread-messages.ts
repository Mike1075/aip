import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { organizationAPI } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

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
      // 使用后端聚合计数，已包含待处理申请与邀请
      const unread = await organizationAPI.getUnreadCount(user.id)
      setUnreadCount(unread)
    } catch (error) {
      console.error('获取未读消息数量失败:', error)
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnreadCount()

    if (!user) return

    // Realtime 订阅：任一相关表有变动时刷新
    const channel = supabase
      .channel(`unread-updates-${user.id}`)
      // 通知（只订阅当前用户）
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => loadUnreadCount())
      // 邀请（与当前用户相关）
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: `inviter_id=eq.${user.id}` }, () => loadUnreadCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: user.email ? `invitee_email=eq.${user.email}` : 'id=gt.0' }, () => loadUnreadCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: `invitee_id=eq.${user.id}` }, () => loadUnreadCount())
      // 组织/项目加入申请（范围较广，先全表订阅，回调内部刷新即可）
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organization_join_requests' }, () => loadUnreadCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_join_requests' }, () => loadUnreadCount())
      .subscribe()

    // 定时兜底，每30秒刷新一次
    const interval = setInterval(loadUnreadCount, 30000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [user?.id, user?.email])

  // 手动刷新未读数量的方法
  const refreshUnreadCount = () => {
    loadUnreadCount()
  }

  // 强制清除所有缓存并重新加载
  const forceRefresh = async () => {
    setLoading(true)
    setUnreadCount(0)
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