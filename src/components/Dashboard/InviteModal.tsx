import React, { useState, useEffect } from 'react'
import { X, Mail, Send, Building2, FolderOpen, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { invitationAPI, Organization, Project, organizationAPI } from '@/lib/supabase'

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

  // 目标（去哪里）
  const [targetOrganizations, setTargetOrganizations] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingTargets, setIsLoadingTargets] = useState(false)

  // 邀请谁：方式 + 源组织 + 成员
  const [inviteMethod, setInviteMethod] = useState<'member' | 'email'>('member')
  const [sourceOrganizations, setSourceOrganizations] = useState<Organization[]>([])
  const [selectedSourceOrg, setSelectedSourceOrg] = useState('')
  const [isLoadingSourceOrgs, setIsLoadingSourceOrgs] = useState(false)
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')

  // 加载“到哪里去”的可选目标 + “邀请谁”的源组织
  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      setIsLoadingTargets(true)
      setIsLoadingSourceOrgs(true)
      try {
        const [managedOrgs, managedProjs, myOrgs] = await Promise.all([
          invitationAPI.getUserManagedOrganizations(user.id),
          invitationAPI.getUserManagedProjects(user.id),
          organizationAPI.getUserOrganizations(user.id)
        ])
        setTargetOrganizations(managedOrgs)
        setProjects(managedProjs)
        setSourceOrganizations(myOrgs)

        if (managedOrgs.length > 0) {
          setInvitationType('organization')
          setSelectedTarget(managedOrgs[0].id)
        } else if (managedProjs.length > 0) {
          setInvitationType('project')
          setSelectedTarget(managedProjs[0].id)
        } else {
          setSelectedTarget('')
        }

        if (myOrgs.length > 0) {
          setSelectedSourceOrg(myOrgs[0].id)
        }
      } catch (err) {
        console.error('加载目标或组织失败:', err)
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setIsLoadingTargets(false)
        setIsLoadingSourceOrgs(false)
      }
    }
    loadData()
  }, [user])

  // 当“邀请谁”的方式或源组织变化时，加载成员
  useEffect(() => {
    const loadMembers = async () => {
      if (inviteMethod !== 'member' || !selectedSourceOrg) {
        setOrgMembers([])
        setSelectedMemberId('')
        return
      }
      setIsLoadingMembers(true)
      try {
        const members = await organizationAPI.getOrganizationMembers(selectedSourceOrg)
        const filtered = (members || []).filter(m => m.id !== user?.id)
        setOrgMembers(filtered)
        setSelectedMemberId('')
      } catch (err) {
        console.error('加载组织成员失败:', err)
      } finally {
        setIsLoadingMembers(false)
      }
    }
    loadMembers()
  }, [inviteMethod, selectedSourceOrg, user?.id])

  // 当邀请类型改变时重置目标
  useEffect(() => {
    if (invitationType === 'organization' && targetOrganizations.length > 0) {
      setSelectedTarget(targetOrganizations[0].id)
    } else if (invitationType === 'project' && projects.length > 0) {
      setSelectedTarget(projects[0].id)
    } else {
      setSelectedTarget('')
    }
  }, [invitationType, targetOrganizations, projects])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (inviteMethod === 'member' && !selectedMemberId) {
      setError('请选择成员')
      return
    }

    if (!email.trim()) {
      setError(inviteMethod === 'member' ? '请选择成员' : '请输入邮箱地址')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('请输入有效的邮箱地址')
      return
    }

    if (!selectedTarget) {
      setError('请选择邀请的目标（组织或项目）')
      return
    }

    const targetName = invitationType === 'organization'
      ? targetOrganizations.find(o => o.id === selectedTarget)?.name || ''
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
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      console.error('发送邀请失败:', err)
      setError(err instanceof Error ? err.message : '发送邀请失败')
    } finally {
      setIsLoading(false)
    }
  }

  const currentTargets = invitationType === 'organization' ? targetOrganizations : projects

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">邀请发送成功！</h3>
            <p className="text-secondary-600">邀请已发送到 {email}，您可以在消息盒子中查看邀请状态。</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Mail className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900">发送邀请</h3>
              <p className="text-sm text-secondary-500">先选择“邀请谁”，再选择“到哪里去”。</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-secondary-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 邀请谁 */}
          <section>
            <h4 className="text-sm font-semibold text-secondary-900 mb-3">邀请谁</h4>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setInviteMethod('member')}
                className={`flex-1 p-2 rounded border text-sm ${inviteMethod === 'member' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-secondary-200 text-secondary-700 hover:bg-secondary-50'}`}
              >从组织选择成员</button>
              <button
                type="button"
                onClick={() => setInviteMethod('email')}
                className={`flex-1 p-2 rounded border text-sm ${inviteMethod === 'email' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-secondary-200 text-secondary-700 hover:bg-secondary-50'}`}
              >填写邮箱</button>
            </div>

            {inviteMethod === 'member' ? (
              <div className="space-y-3">
                {/* 源组织选择 */}
                <div>
                  <label className="block text-xs font-medium text-secondary-700 mb-1">选择组织</label>
                  {isLoadingSourceOrgs ? (
                    <div className="flex items-center gap-2 text-secondary-500 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> 加载中...</div>
                  ) : sourceOrganizations.length === 0 ? (
                    <div className="text-secondary-500 text-sm">你尚未加入任何组织，无法从组织成员中选择。</div>
                  ) : (
                    <select
                      value={selectedSourceOrg}
                      onChange={(e) => setSelectedSourceOrg(e.target.value)}
                      className="input w-full"
                    >
                      {sourceOrganizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 成员下拉，不拉长面板 */}
                <div>
                  <label className="block text-xs font-medium text-secondary-700 mb-1">选择成员</label>
                  {isLoadingMembers ? (
                    <div className="flex items-center gap-2 text-secondary-500 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> 正在加载成员...</div>
                  ) : orgMembers.length === 0 ? (
                    <div className="text-secondary-500 text-sm">暂无可邀请成员</div>
                  ) : (
                    <select
                      value={selectedMemberId}
                      onChange={(e) => {
                        const id = e.target.value
                        setSelectedMemberId(id)
                        const picked = orgMembers.find(m => m.id === id)
                        setEmail(picked?.email || '')
                      }}
                      className="input w-full"
                    >
                      <option value="">选择成员...</option>
                      {orgMembers.map(m => (
                        <option key={m.id} value={m.id}>{`${m.name}（${m.email}）`}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-secondary-700 mb-1">邮箱地址</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入被邀请者的邮箱"
                  className="input w-full"
                  disabled={isLoading}
                />
              </div>
            )}
          </section>

          {/* 到哪里去 */}
          <section>
            <h4 className="text-sm font-semibold text-secondary-900 mb-3">到哪里去</h4>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setInvitationType('organization')}
                disabled={targetOrganizations.length === 0 || isLoading}
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-sm ${
                  invitationType === 'organization' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-secondary-200 text-secondary-700 hover:bg-secondary-50'
                } ${targetOrganizations.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Building2 className="h-4 w-4" /> 组织
              </button>
              <button
                type="button"
                onClick={() => setInvitationType('project')}
                disabled={projects.length === 0 || isLoading}
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-sm ${
                  invitationType === 'project' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-secondary-200 text-secondary-700 hover:bg-secondary-50'
                } ${projects.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FolderOpen className="h-4 w-4" /> 项目
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary-700 mb-1">选择{invitationType === 'organization' ? '组织' : '项目'}</label>
              {isLoadingTargets ? (
                <div className="flex items-center gap-2 text-secondary-500 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> 加载中...</div>
              ) : currentTargets.length === 0 ? (
                <div className="text-secondary-500 text-sm">暂无可邀请的{invitationType === 'organization' ? '组织' : '项目'}</div>
              ) : (
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="input w-full"
                  disabled={isLoading}
                >
                  {currentTargets.map(target => (
                    <option key={target.id} value={target.id}>{target.name}</option>
                  ))}
                </select>
              )}
            </div>
          </section>

          {/* 邀请消息 */}
          <section>
            <label htmlFor="message" className="block text-sm font-medium text-secondary-700 mb-2">邀请消息（可选）</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="输入一些个人化的邀请消息..."
              rows={3}
              className="input w-full resize-none"
              disabled={isLoading}
            />
          </section>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors" disabled={isLoading}>取消</button>
            <button type="submit" disabled={isLoading || currentTargets.length === 0} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> 发送中...</>) : (<><Send className="h-4 w-4" /> 发送邀请</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}