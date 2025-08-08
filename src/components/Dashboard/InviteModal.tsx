import React, { useState, useEffect } from 'react'
import { X, Mail, Send, Building2, FolderOpen, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { invitationAPI, Organization, Project } from '@/lib/supabase'

interface InviteModalProps {
  onClose: () => void
}

type InvitationType = 'organization' | 'project'

export function InviteModal({ onClose }: InviteModalProps) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [invitationType, setInvitationType] = useState<InvitationType>('organization')
  const [selectedTarget, setSelectedTarget] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 可邀请的组织和项目列表
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingTargets, setIsLoadingTargets] = useState(false)

  // 加载用户可以邀请的组织和项目
  useEffect(() => {
    const loadTargets = async () => {
      if (!user) return

      setIsLoadingTargets(true)
      try {
        const [orgs, projs] = await Promise.all([
          invitationAPI.getUserManagedOrganizations(user.id),
          invitationAPI.getUserManagedProjects(user.id)
        ])
        setOrganizations(orgs)
        setProjects(projs)

        // 如果只有组织或只有项目，自动选择类型
        if (orgs.length > 0 && projs.length === 0) {
          setInvitationType('organization')
          setSelectedTarget(orgs[0].id)
        } else if (projs.length > 0 && orgs.length === 0) {
          setInvitationType('project')
          setSelectedTarget(projs[0].id)
        } else if (orgs.length > 0) {
          setSelectedTarget(orgs[0].id)
        }
      } catch (err) {
        console.error('加载目标列表失败:', err)
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setIsLoadingTargets(false)
      }
    }

    loadTargets()
  }, [user])

  // 当邀请类型改变时，重置选择的目标
  useEffect(() => {
    if (invitationType === 'organization' && organizations.length > 0) {
      setSelectedTarget(organizations[0].id)
    } else if (invitationType === 'project' && projects.length > 0) {
      setSelectedTarget(projects[0].id)
    } else {
      setSelectedTarget('')
    }
  }, [invitationType, organizations, projects])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 验证表单
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }

    if (!selectedTarget) {
      setError('请选择要邀请加入的组织或项目')
      return
    }

    // 简单的邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('请输入有效的邮箱地址')
      return
    }

    // 获取目标名称
    const targetName = invitationType === 'organization' 
      ? organizations.find(o => o.id === selectedTarget)?.name || ''
      : projects.find(p => p.id === selectedTarget)?.name || ''

    if (!targetName) {
      setError('无法获取目标名称')
      return
    }

    setIsLoading(true)

    try {
      await invitationAPI.sendInvitation({
        invitee_email: email.trim(),
        invitation_type: invitationType,
        target_id: selectedTarget,
        target_name: targetName,
        message: message.trim() || undefined
      })

      setIsSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error('发送邀请失败:', err)
      setError(err instanceof Error ? err.message : '发送邀请失败')
    } finally {
      setIsLoading(false)
    }
  }

  const currentTargets = invitationType === 'organization' ? organizations : projects

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              邀请发送成功！
            </h3>
            <p className="text-secondary-600">
              邀请已发送到 {email}，您可以在消息盒子中查看邀请状态。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Mail className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900">发送邀请</h3>
              <p className="text-sm text-secondary-500">邀请用户加入您的组织或项目</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-600" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 邮箱输入 */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
              邮箱地址 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="输入被邀请者的邮箱地址"
              className="input w-full"
              disabled={isLoading}
              required
            />
          </div>

          {/* 邀请类型选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              邀请类型 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInvitationType('organization')}
                disabled={organizations.length === 0 || isLoading}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  invitationType === 'organization'
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-white border-secondary-200 text-secondary-700 hover:bg-secondary-50'
                } ${organizations.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Building2 className="h-4 w-4" />
                <span className="text-sm">组织</span>
              </button>
              <button
                type="button"
                onClick={() => setInvitationType('project')}
                disabled={projects.length === 0 || isLoading}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  invitationType === 'project'
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-white border-secondary-200 text-secondary-700 hover:bg-secondary-50'
                } ${projects.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="text-sm">项目</span>
              </button>
            </div>
          </div>

          {/* 目标选择 */}
          <div className="mb-4">
            <label htmlFor="target" className="block text-sm font-medium text-secondary-700 mb-2">
              选择{invitationType === 'organization' ? '组织' : '项目'} <span className="text-red-500">*</span>
            </label>
            {isLoadingTargets ? (
              <div className="flex items-center justify-center py-3 text-secondary-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            ) : currentTargets.length === 0 ? (
              <div className="text-center py-3 text-secondary-500 text-sm">
                您没有可以邀请的{invitationType === 'organization' ? '组织' : '项目'}
              </div>
            ) : (
              <select
                id="target"
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="input w-full"
                disabled={isLoading}
                required
              >
                {currentTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 邀请消息 */}
          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-secondary-700 mb-2">
              邀请消息（可选）
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="输入一些个人化的邀请消息..."
              rows={3}
              className="input w-full resize-none"
              disabled={isLoading}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
              disabled={isLoading}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || currentTargets.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  发送邀请
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}