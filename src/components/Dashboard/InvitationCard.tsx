import React, { useState } from 'react'
import { Check, X, Building2, FolderOpen, Mail, Clock, Loader2 } from 'lucide-react'
import { invitationAPI, Invitation } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface InvitationCardProps {
  invitation: Invitation
  onResponded?: () => void
}

export function InvitationCard({ invitation, onResponded }: InvitationCardProps) {
  const [isResponding, setIsResponding] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')
  const [showResponseInput, setShowResponseInput] = useState(false)
  const [pendingResponse, setPendingResponse] = useState<'accepted' | 'rejected' | null>(null)

  const handleResponse = async (response: 'accepted' | 'rejected') => {
    if (response === 'rejected' && !showResponseInput) {
      setShowResponseInput(true)
      setPendingResponse(response)
      return
    }

    setIsResponding(true)
    try {
      await invitationAPI.respondToInvitation(
        invitation.id, 
        response, 
        responseMessage.trim() || undefined
      )
      onResponded?.()
    } catch (error) {
      console.error('响应邀请失败:', error)
      alert(`响应邀请失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsResponding(false)
      setShowResponseInput(false)
      setResponseMessage('')
      setPendingResponse(null)
    }
  }

  const isExpired = new Date(invitation.expires_at) < new Date()
  const canRespond = invitation.status === 'pending' && !isExpired
  const inviterName = (invitation as any)?.inviter_name || invitation.inviter_id

  return (
    <div className="border border-secondary-200 rounded-lg p-4">
      {/* 邀请头部信息 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            invitation.invitation_type === 'organization' 
              ? 'bg-blue-100' 
              : 'bg-green-100'
          }`}>
            {invitation.invitation_type === 'organization' ? (
              <Building2 className={`h-4 w-4 ${
                invitation.invitation_type === 'organization' 
                  ? 'text-blue-600' 
                  : 'text-green-600'
              }`} />
            ) : (
              <FolderOpen className={`h-4 w-4 ${
                invitation.invitation_type === 'organization' 
                  ? 'text-blue-600' 
                  : 'text-green-600'
              }`} />
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-secondary-900">
              邀请加入{invitation.invitation_type === 'organization' ? '组织' : '项目'}
            </h4>
            <p className="text-sm text-secondary-600 mt-1">
              <span className="font-medium">{invitation.target_name}</span>
            </p>
            <p className="text-sm text-secondary-500 mt-1">
              来自: {inviterName}
            </p>
          </div>
        </div>
        
        {/* 状态标识 */}
        <div className="flex items-center gap-2">
          {invitation.status === 'pending' && !isExpired && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <Clock className="w-3 h-3 mr-1" />
              待回复
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
          {isExpired && invitation.status === 'pending' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              已过期
            </span>
          )}
        </div>
      </div>

      {/* 邀请消息 */}
      {invitation.message && (
        <div className="mb-3 p-3 bg-secondary-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-secondary-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-secondary-700">{invitation.message}</p>
          </div>
        </div>
      )}

      {/* 时间信息 */}
      <div className="text-xs text-secondary-500 mb-3">
        邀请时间: {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true, locale: zhCN })}
        {invitation.expires_at && !isExpired && (
          <span className="ml-2">
            • 过期时间: {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true, locale: zhCN })}
          </span>
        )}
      </div>

      {/* 响应消息输入框 */}
      {showResponseInput && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            {pendingResponse === 'accepted' ? '接受' : '拒绝'}原因（可选）
          </label>
          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            placeholder={
              pendingResponse === 'accepted' 
                ? '感谢邀请...' 
                : '抱歉，因为...'
            }
            rows={2}
            className="input w-full resize-none text-sm"
          />
        </div>
      )}

      {/* 响应按钮 */}
      {canRespond && (
        <div className="flex gap-2">
          {!showResponseInput ? (
            <>
              <button
                onClick={() => handleResponse('accepted')}
                disabled={isResponding}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isResponding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                接受
              </button>
              <button
                onClick={() => handleResponse('rejected')}
                disabled={isResponding}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <X className="h-4 w-4" />
                拒绝
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleResponse(pendingResponse!)}
                disabled={isResponding}
                className={`flex items-center gap-2 px-3 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm ${
                  pendingResponse === 'accepted' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isResponding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  pendingResponse === 'accepted' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )
                )}
                确认{pendingResponse === 'accepted' ? '接受' : '拒绝'}
              </button>
              <button
                onClick={() => {
                  setShowResponseInput(false)
                  setResponseMessage('')
                  setPendingResponse(null)
                }}
                disabled={isResponding}
                className="px-3 py-2 text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors text-sm"
              >
                取消
              </button>
            </>
          )}
        </div>
      )}

      {/* 响应后的信息 */}
      {invitation.status !== 'pending' && invitation.response_message && (
        <div className="mt-3 p-3 bg-secondary-50 rounded-lg">
          <p className="text-sm text-secondary-700">
            <span className="font-medium">回复:</span> {invitation.response_message}
          </p>
          {invitation.responded_at && (
            <p className="text-xs text-secondary-500 mt-1">
              回复时间: {formatDistanceToNow(new Date(invitation.responded_at), { addSuffix: true, locale: zhCN })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}