import React, { useState } from 'react'
import { X, Send, Bot, User } from 'lucide-react'
import { ProjectSelector } from './ProjectSelector'
import { callN8nRAGAgent, callN8nRAGAgentLocal } from '../../lib/n8n'

interface AIChatProps {
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIChat({ onClose }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是您的AI项目管理助手。我可以帮您分析项目进度、分配任务、回答问题。请选择要查询的项目，然后输入您的问题。',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])

  const handleSend = async () => {
    if (!input.trim()) return
    
    if (selectedProjects.length === 0) {
      alert('请先选择至少一个项目')
      return
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInput('')
    setIsLoading(true)

    try {
      // 调用n8n RAG系统
      const result = await callN8nRAGAgentLocal(
        input.trim(),
        selectedProjects.length === 1 ? selectedProjects[0] : selectedProjects
      )

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.success ? result.response || '收到回复但内容为空' : `调用失败: ${result.error}`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `系统错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[600px] flex flex-col mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Bot className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-medium text-secondary-900">AI项目助手</h3>
              <p className="text-sm text-secondary-500">智能项目管理顾问</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-600" />
          </button>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Bot className="h-4 w-4 text-primary-600" />
                </div>
              )}
              
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>

              {message.role === 'user' && (
                <div className="p-2 bg-secondary-200 rounded-lg">
                  <User className="h-4 w-4 text-secondary-600" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Bot className="h-4 w-4 text-primary-600" />
              </div>
              <div className="bg-secondary-100 px-4 py-2 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-secondary-200">
          {/* 项目选择器 */}
          <ProjectSelector
            selectedProjects={selectedProjects}
            onProjectsChange={setSelectedProjects}
          />
          
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="请输入您的问题..."
                className="input resize-none"
                rows={2}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || selectedProjects.length === 0}
              className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 