import React, { useState } from 'react'
import { Mail, Send, Loader2, CheckCircle, XCircle, Users, Building } from 'lucide-react'
import { organizationAPI } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface EmailInvitationProps {
  type: 'organization' | 'project'
  targetId: string
  targetName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function EmailInvitation({ 
  type, 
  targetId, 
  targetName, 
  onSuccess, 
  onCancel 
}: EmailInvitationProps) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(type === 'organization' ? 'member' : 'developer')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !email.trim()) return

    setIsLoading(true)
    setResult(null)

    try {
      const response = await organizationAPI.sendPermissionInvitation(
        email.trim(),
        user.id,
        type,
        targetId,
        targetName,
        role,
        message.trim() || undefined
      )

      if (response.success) {
        setResult({ 
          success: true, 
          message: '邀请已发送！对方将收到通知并可以选择接受或拒绝邀请。' 
        })
        setEmail('')
        setMessage('')
        setTimeout(() => {
          onSuccess?.()
        }, 2000)
      } else {
        setResult({ 
          success: false, 
          message: response.error || '发送邀请失败' 
        })
      }
    } catch (error) {
      console.error('发送邀请失败:', error)
      setResult({ 
        success: false, 
        message: '发送邀请时出现错误，请稍后重试' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const organizationRoles = [
    { value: 'admin', label: '管理员', description: '可以管理组织和审核申请' },
    { value: 'member', label: '成员', description: '可以参与组织项目' }
  ]

  const projectRoles = [
    { value: 'manager', label: '项目经理', description: '可以管理项目和分配任务' },
    { value: 'developer', label: '开发者', description: '参与项目开发工作' },
    { value: 'designer', label: '设计师', description: '负责项目设计工作' },
    { value: 'tester', label: '测试员', description: '负责项目测试工作' }
  ]

  const roles = type === 'organization' ? organizationRoles : projectRoles

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {type === 'organization' ? (
          <Building className="w-6 h-6 text-blue-600" />
        ) : (
          <Users className="w-6 h-6 text-green-600" />
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            邀请加入{type === 'organization' ? '组织' : '项目'}
          </h3>
          <p className="text-sm text-gray-600">{targetName}</p>
        </div>
      </div>

      {result && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          result.success 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {result.success ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="text-sm">{result.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-1" />
            邮箱地址
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入要邀请的用户邮箱"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            角色权限
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            {roles.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {roles.find(r => r.value === role)?.description}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            邀请留言（可选）
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="向被邀请者说明邀请原因或项目情况..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isLoading ? '发送中...' : '发送邀请'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
          )}
        </div>
      </form>
    </div>
  )
}