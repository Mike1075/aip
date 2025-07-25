import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AuthPage } from '@/components/Auth/AuthPage'
import { Dashboard } from '@/components/Dashboard/Dashboard'

function AppContent() {
  const { session, loading, error, retry } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600 mb-4">加载中...</p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600 text-sm mb-2">{error}</p>
              <button 
                onClick={retry}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                重试
              </button>
            </div>
          )}
          <div className="text-xs text-secondary-400 mt-4">
            如果长时间无响应，请检查网络连接
          </div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      {session ? <Dashboard /> : <AuthPage />}
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App 