import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
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

      // 1) 未读通知（与前端一致，排除邀请类通知）
      const notifRes = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .neq('type', 'invitation_sent')
        .neq('type', 'invitation_received')
      const notif = notifRes.count || 0

      // 2) 组织待处理申请（仅统计我管理的组织）
      const orgsRes = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('role_in_org', 'admin')
      const orgIds = (orgsRes.data || []).map((o: any) => o.organization_id)
      let orgPending = 0
      if (orgIds.length > 0) {
        const r = await supabase
          .from('organization_join_requests')
          .select('*', { count: 'exact', head: true })
          .in('organization_id', orgIds)
          .eq('status', 'pending')
        orgPending = r.count || 0
      }

      // 3) 项目待处理申请（仅统计我管理的项目）
      const mgrRes = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role_in_project', 'manager')
      const pids = (mgrRes.data || []).map((p: any) => p.project_id)
      let projPending = 0
      if (pids.length > 0) {
        const r = await supabase
          .from('project_join_requests')
          .select('*', { count: 'exact', head: true })
          .in('project_id', pids)
          .eq('status', 'pending')
        projPending = r.count || 0
      }

      // 4) 我收到的待处理邀请（与前端“收到的邀请”一致）
      const invRes = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .or(`invitee_id.eq.${user.id},invitee_email.eq.${user.email}`)
      const invPending = invRes.count || 0

      setUnreadCount((notif || 0) + orgPending + projPending + invPending)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => loadUnreadCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: `invitee_id=eq.${user.id}` }, () => loadUnreadCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: user.email ? `invitee_email=eq.${user.email}` : 'id=gt.0' }, () => loadUnreadCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organization_join_requests' }, () => loadUnreadCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_join_requests' }, () => loadUnreadCount())
      .subscribe()

    const interval = setInterval(loadUnreadCount, 30000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [user?.id, user?.email])

  const refreshUnreadCount = () => {
    loadUnreadCount()
  }

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