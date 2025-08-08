import React, { useState } from 'react'
import { Check, X, Loader2, Building, Users, Mail } from 'lucide-react'
import { organizationAPI, Notification } from '@/lib/supabase'

interface InvitationResponseProps {
  notification: Notification
  onResponse?: (accepted: boolean) => void
}

export function InvitationResponse({ notification, onResponse }: InvitationResponseProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [hasResponded, setHasResponded] = useState(
    notification.metadata.status !== 'pending'
  )

  const handleResponse = async (response: 'accept' | 'reject') => {
    setIsLoading(true)
    
    try {
      const result = await organizationAPI.respondToInvitation(
        notification.id,
        notification.user_id,
        response
      )
      
      if (result.success) {
        setHasResponded(true)
        onResponse?.(response === 'accept')
      } else {
        alert(result.error || '处理邀请失败')
      }
    } catch (error) {
      console.error('处理邀请失败:', error)
      alert('处理邀请时出现错误')
    } finally {
      setIsLoading(false)
    }
  }

  const { invitation_type, target_name, inviter_name, inviter_email, invited_role, invitation_message } = notification.metadata

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {invitation_type === 'organization' ? (
            <Building className="w-6 h-6 text-blue-600" />
          ) : (
            <Users className="w-6 h-6 text-green-600" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold text-gray-900">
              {notification.title}
            </h4>
            {hasResponded && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                notification.metadata.status === 'accepted'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {notification.metadata.status === 'accepted' ? '已接受' : '已拒绝'}
              </span>
            )}
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>来自：{inviter_name} ({inviter_email})</span>
            </div>
            
            <div>
              <span className="font-medium">
                {invitation_type === 'organization' ? '组织' : '项目'}：
              </span>
              <span className="ml-1">{target_name}</span>
            </div>
            
            {invited_role && (
              <div>
                <span className="font-medium">角色：</span>
                <span className="ml-1">
                  {invitation_type === 'organization' 
                    ? (invited_role === 'admin' ? '管理员' : '成员')
                    : (invited_role === 'manager' ? '项目经理' : 
                       invited_role === 'developer' ? '开发者' :
                       invited_role === 'designer' ? '设计师' :
                       invited_role === 'tester' ? '测试员' : invited_role)
                  }
                </span>
              </div>
            )}
            
            {invitation_message && (
              <div className="bg-gray-50 p-3 rounded-lg mt-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">邀请留言：</span>
                  <br />
                  {invitation_message}
                </p>
              </div>
            )}
          </div>
          
          {!hasResponded && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleResponse('accept')}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                接受
              </button>
              
              <button
                onClick={() => handleResponse('reject')}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                拒绝
              </button>
            </div>
          )}
          
          <div className="text-xs text-gray-400 mt-3">
            {new Date(notification.created_at).toLocaleString('zh-CN')}
          </div>
        </div>
      </div>
    </div>
  )
}