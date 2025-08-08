import React, { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { EmailConfirmation } from './EmailConfirmation'
import { Bot, Sparkles, UserX } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [confirmationEmail, setLocalConfirmationEmail] = useState<string | null>(null)
  const { enterAsGuest, emailConfirmationRequired, clearEmailConfirmation, confirmationEmail: ctxEmail } = useAuth()

  // 如果需要邮箱验证，显示验证页面（优先使用注册时输入的邮箱）
  const finalEmail = confirmationEmail || ctxEmail || ''
  if (emailConfirmationRequired || confirmationEmail) {
    return (
      <EmailConfirmation 
        email={finalEmail} 
        onBackToLogin={() => {
          setLocalConfirmationEmail(null)
          clearEmailConfirmation()
          setIsLogin(true)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
        {/* 左侧：品牌与卖点 */}
        <div className="hidden lg:block">
          <div className="p-8 rounded-2xl bg-white/70 backdrop-blur border border-secondary-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  AI项目助手
                </h2>
                <p className="text-secondary-600 text-sm">
                  智能检索知识、汇总项目状态、生成任务建议
                </p>
              </div>
            </div>
            
            <ul className="space-y-3 text-secondary-700">
              <li className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-primary-600 mt-1" />
                <span>一键汇总组织/项目的知识，作为AI上下文</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-primary-600 mt-1" />
                <span>自动识别你所在的组织/项目上下文进行提问</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-primary-600 mt-1" />
                <span>支持邀请成员入组/入项、管理成员与权限</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 右侧：认证表单 */}
        <div className="lg:pl-12">
          <div className="card max-w-md mx-auto lg:mx-0">
            {isLogin ? (
              <LoginForm onToggleMode={() => setIsLogin(false)} />
            ) : (
              <RegisterForm 
                onToggleMode={() => setIsLogin(true)} 
                onEmailConfirmationRequired={(email) => setLocalConfirmationEmail(email)}
              />
            )}
          </div>
          
          {/* 游客入口 */}
          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-secondary-50 text-secondary-500">或者</span>
              </div>
            </div>
            
            <button
              onClick={enterAsGuest}
              className="mt-4 w-full max-w-md mx-auto flex items-center justify-center gap-2 px-4 py-3 border border-secondary-300 rounded-lg text-secondary-700 bg-white hover:bg-secondary-50 transition-colors"
            >
              <UserX className="h-5 w-5" />
              <span className="font-medium">以游客身份浏览</span>
            </button>
            
            <p className="mt-2 text-xs text-secondary-500">
              游客模式下可以浏览公开项目，但无法参与项目协作
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 