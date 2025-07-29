import React from 'react'

interface EmailConfirmationProps {
  email: string
  onBackToLogin: () => void
}

export function EmailConfirmation({ email, onBackToLogin }: EmailConfirmationProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-secondary-900 mb-4">
            验证您的邮箱
          </h1>
          <p className="text-secondary-600 mb-6">
            验证链接已发送至：{email}
          </p>
          <button
            onClick={onBackToLogin}
            className="btn-primary w-full"
          >
            返回登录
          </button>
        </div>
      </div>
    </div>
  )
}