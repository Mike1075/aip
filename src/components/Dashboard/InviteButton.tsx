import React, { useState } from 'react'
import { UserPlus, Mail } from 'lucide-react'
import { EmailInvitation } from './EmailInvitation'

interface InviteButtonProps {
  type: 'organization' | 'project'
  targetId: string
  targetName: string
  className?: string
  variant?: 'primary' | 'secondary'
}

export function InviteButton({ 
  type, 
  targetId, 
  targetName, 
  className = '', 
  variant = 'primary' 
}: InviteButtonProps) {
  const [showInviteModal, setShowInviteModal] = useState(false)

  const buttonClasses = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'

  return (
    <>
      <button
        onClick={() => setShowInviteModal(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${buttonClasses} ${className}`}
      >
        <UserPlus className="w-4 h-4" />
        邀请成员
      </button>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    邀请新成员
                  </h2>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <EmailInvitation
                type={type}
                targetId={targetId}
                targetName={targetName}
                onSuccess={() => {
                  setShowInviteModal(false)
                }}
                onCancel={() => setShowInviteModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}