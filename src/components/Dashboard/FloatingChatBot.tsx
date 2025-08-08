import React, { useState } from 'react'
import { Bot, X } from 'lucide-react'
import { AIChat } from './AIChat'
import { Organization } from '@/lib/supabase'

interface FloatingChatBotProps {
  organization?: Organization
  showProjectSelector?: boolean
}

export function FloatingChatBot({ organization, showProjectSelector = true }: FloatingChatBotProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* 浮动聊天按钮 - 1.6倍尺寸，离边缘更远 */}
      <div className="fixed bottom-12 right-12 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group border-0 outline-none"
          title="AI智能助手"
          style={{ 
            width: '102px', 
            height: '102px',
            minWidth: '102px',
            minHeight: '102px'
          }}
        >
          <Bot className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* AI聊天窗口 */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <AIChat 
            onClose={() => setIsOpen(false)}
            organization={organization}
            showProjectSelector={showProjectSelector}
          />
        </div>
      )}
    </>
  )
}
