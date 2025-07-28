import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Lock, LogIn } from 'lucide-react'

interface LoginFormProps {
  onToggleMode: () => void
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message || '登录失败，请检查您的邮箱和密码')
    }
    
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">
          欢迎回来
        </h1>
        <p className="text-secondary-600">
          登录您的AI项目管理平台账户
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            邮箱地址
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              type="email"
              required
              className="input pl-10"
              placeholder="请输入您的邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            密码
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              type="password"
              required
              className="input pl-10"
              placeholder="请输入您的密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              登录
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-secondary-600">
          还没有账户？{' '}
          <button
            onClick={onToggleMode}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            立即注册
          </button>
        </p>
      </div>
    </div>
  )
} 