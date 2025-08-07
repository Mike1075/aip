import React, { useState, useEffect } from 'react'
import { X, Send, Bot, User, ChevronDown, ChevronUp, Trash2, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProjectSelector } from './ProjectSelector'
import { callN8nRAGAgent, callN8nRAGAgentLocal, getChatRecords, saveChatRecord } from '../../lib/n8n'
import { Organization, organizationAPI } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface AIChatProps {
  onClose: () => void
  organization?: Organization
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIChat({ onClose, organization }: AIChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [isProjectSelectorExpanded, setIsProjectSelectorExpanded] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // 获取清空点时间戳
  const getClearTimestamp = (): string | null => {
    return localStorage.getItem('chatClearTimestamp')
  }

  // 设置清空点时间戳
  const setClearTimestamp = (timestamp: string) => {
    localStorage.setItem('chatClearTimestamp', timestamp)
  }

  // 智能删除单个聊天消息
  const handleDeleteMessage = async (messageId: string, message: ChatMessage) => {
    if (!user?.id) {
      console.error('❌ 用户未登录，无法删除消息')
      return
    }

    try {
      console.log('🗑️ 智能删除聊天消息:', { messageId, message })
      
      // 先从UI中移除消息
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      
      if (message.role === 'user') {
        // 删除用户消息：只清空content字段，保留ai_content
        await organizationAPI.clearUserMessage(message.content, message.timestamp, user.id)
        console.log('✅ 用户消息已清空')
      } else {
        // 删除AI消息：通过时间戳直接定位记录
        // 从消息ID中提取原始记录ID
        const recordId = message.id.replace('ai-', '')
        console.log('🔍 尝试删除AI回复，记录ID:', recordId, '时间戳:', message.timestamp)
        
        // 使用消息的时间戳和一个占位符内容来调用清空方法
        await organizationAPI.clearAIMessage('', message.timestamp, user.id)
        console.log('✅ AI回复已清空')
      }
      
      // 重新加载聊天历史以反映数据库变化
      await refreshChatHistory()
      
    } catch (error) {
      console.error('❌ 删除消息失败:', error)
      // 如果删除失败，重新加载聊天历史恢复正确状态
      await refreshChatHistory()
    }
  }

  // 刷新聊天历史
  const refreshChatHistory = async () => {
    try {
      console.log('🔄 刷新聊天历史...')
      const records = await getChatRecords(20)
      
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是您的AI项目管理助手。我可以帮您回答问题、分析项目进度、分配任务等。您可以直接开始对话，也可以选择特定项目进行更精准的查询。',
        timestamp: new Date()
      }
      
      // 获取清空点时间戳
      const clearTimestamp = getClearTimestamp()
      
      if (records.length > 0) {
        let filteredRecords = records
        
        // 如果有清空点，只显示清空点之后的记录
        if (clearTimestamp) {
          const clearTime = new Date(clearTimestamp)
          filteredRecords = records.filter(record => {
            const recordTime = new Date(record.created_at)
            return recordTime > clearTime
          })
        }
        
        if (filteredRecords.length > 0) {
          const historyMessages: ChatMessage[] = []
          
          filteredRecords.reverse().forEach((record) => {
            // 只有当content不为空时才添加用户消息
            if (record.content && record.content.trim() !== '') {
              historyMessages.push({
                id: `user-${record.id}`,
                role: 'user',
                content: record.content,
                timestamp: new Date(record.created_at)
              })
            }
            
            // 只有当ai_content不为空时才添加AI回复
            if (record.ai_content && record.ai_content.trim() !== '') {
              historyMessages.push({
                id: `ai-${record.id}`,
                role: 'assistant',
                content: record.ai_content,
                timestamp: new Date(record.created_at)
              })
            }
          })
          
          setMessages([welcomeMessage, ...historyMessages])
          console.log('✅ 聊天历史刷新完成')
        } else {
          setMessages([welcomeMessage])
        }
      } else {
        setMessages([welcomeMessage])
      }
    } catch (error) {
      console.error('❌ 刷新聊天历史失败:', error)
    }
  }

  // 初始化聊天窗口 - 显示清空点之后的历史记录
  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log('🔍 初始化聊天窗口...')
        const records = await getChatRecords(20)
        
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: '您好！我是您的AI项目管理助手。我可以帮您回答问题、分析项目进度、分配任务等。您可以直接开始对话，也可以选择特定项目进行更精准的查询。',
          timestamp: new Date()
        }
        
        // 获取清空点时间戳
        const clearTimestamp = getClearTimestamp()
        
        if (records.length > 0) {
          let filteredRecords = records
          
          // 如果有清空点，只显示清空点之后的记录
          if (clearTimestamp) {
            const clearTime = new Date(clearTimestamp)
            filteredRecords = records.filter(record => {
              const recordTime = new Date(record.created_at)
              return recordTime > clearTime
            })
            console.log(`🔄 过滤记录: 清空点${clearTimestamp}之后有${filteredRecords.length}条记录`)
          }
          
          if (filteredRecords.length > 0) {
            const historyMessages: ChatMessage[] = []
            
            filteredRecords.reverse().forEach((record) => {
              // 只有当content不为空时才添加用户消息
              if (record.content && record.content.trim() !== '') {
                historyMessages.push({
                  id: `user-${record.id}`,
                  role: 'user',
                  content: record.content,
                  timestamp: new Date(record.created_at)
                })
              }
              
              // 只有当ai_content不为空时才添加AI回复
              if (record.ai_content && record.ai_content.trim() !== '') {
                historyMessages.push({
                  id: `ai-${record.id}`,
                  role: 'assistant',
                  content: record.ai_content,
                  timestamp: new Date(record.created_at)
                })
              }
            })
            
            setMessages([welcomeMessage, ...historyMessages])
            console.log('✅ 历史记录加载完成')
          } else {
            setMessages([welcomeMessage])
            console.log('✅ 清空点之后无新记录，显示欢迎消息')
          }
        } else {
          setMessages([welcomeMessage])
          console.log('✅ 无历史记录，显示欢迎消息')
        }
      } catch (error) {
        console.error('❌ 初始化失败:', error)
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '您好！我是您的AI项目管理助手。我可以帮您分析项目进度、分配任务、回答问题。请选择要查询的项目，然后输入您的问题。',
          timestamp: new Date()
        }])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    initializeChat()
  }, [])

  // 清空聊天记录（设置清空点）
  const handleClearSession = () => {
    const currentTime = new Date().toISOString()
    setClearTimestamp(currentTime)
    
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是您的AI项目管理助手。这是一个全新的对话会话。请选择要查询的项目，然后输入您的问题。',
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
    console.log('✅ 清空点已设置:', currentTime)
  }

  const handleSend = async () => {
    if (!input.trim()) return
    
    // 允许在没有选择项目的情况下也能聊天
    // 只有在既没有选择项目也没有组织上下文时才提示
    // if (selectedProjects.length === 0 && !organization?.id) {
    //   alert('请先选择至少一个项目或确保在组织页面中')
    //   return
    // }

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
      // 根据选择情况决定传递的参数
      let projectId: string | string[] | undefined = undefined
      if (selectedProjects.length > 0) {
        projectId = selectedProjects.length === 1 ? selectedProjects[0] : selectedProjects
      }
      
      // 调用n8n RAG系统
      const result = await callN8nRAGAgentLocal(
        input.trim(), 
        projectId, 
        organization?.id // 传递组织ID以启用组织智慧库
      )

      // 清理AI回复中的转义字符
      let aiResponseContent = result.success ? result.response || '收到回复但内容为空' : `调用失败: ${result.error}`
      
      if (result.success && result.response) {
        aiResponseContent = result.response
          .replace(/\\n\\n/g, '\n\n')  // 将 \n\n 转换为真正的换行
          .replace(/\\n/g, '\n')       // 将 \n 转换为真正的换行
          .replace(/\\t/g, '\t')       // 处理制表符
          .replace(/\\"/g, '"')        // 处理引号
          .replace(/\\\\/g, '\\')      // 处理反斜杠
          .trim()                      // 去除首尾空白
      }
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseContent,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiResponse])

      // 前端不再保存聊天记录到数据库，由n8n工作流处理
      // if (result.success) {
      //   await saveChatRecord(input.trim(), aiResponseContent, projectId)
      // }
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearSession}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors group"
              title="清空聊天记录"
            >
              <Trash2 className="h-4 w-4 text-secondary-500 group-hover:text-red-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-secondary-600" />
            </button>
          </div>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-secondary-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                <span>加载中...</span>
              </div>
            </div>
          ) : (
            <>
              
              {messages.map((message) => (
            <div
              key={message.id}
              className={`group flex items-start gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Bot className="h-4 w-4 text-primary-600" />
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-100 text-secondary-900'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="text-sm prose prose-sm max-w-none prose-headings:text-secondary-900 prose-p:text-secondary-900 prose-strong:text-secondary-900 prose-code:text-secondary-800 prose-code:bg-secondary-200 prose-code:px-1 prose-code:rounded prose-pre:bg-secondary-200 prose-pre:text-secondary-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                
                {/* 删除按钮 - 只在hover时显示，双击删除 */}
                {message.id !== 'welcome' && (
                  <div className="relative">
                    <button
                      onDoubleClick={() => handleDeleteMessage(message.id, message)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 peer ${
                        message.role === 'user' ? 'order-first' : ''
                      }`}
                    >
                      <X className="h-3 w-3 text-red-500 hover:text-red-700" />
                    </button>
                    {/* 立即显示的提示框 */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 peer-hover:opacity-100 transition-opacity duration-0 pointer-events-none z-10">
                      双击删除
                    </div>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="p-2 bg-secondary-200 rounded-lg">
                  <User className="h-4 w-4 text-secondary-600" />
                </div>
              )}
            </div>
          ))}
            </>
          )}
          
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
          {/* 可折叠项目选择器 */}
          <div className="mb-3">
            <button
              onClick={() => setIsProjectSelectorExpanded(!isProjectSelectorExpanded)}
              className="flex items-center justify-between w-full p-2 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors text-sm"
            >
              <span className="font-medium text-secondary-700">
                选择项目 (可选) {selectedProjects.length > 0 && `- ${selectedProjects.length}个已选择`}
              </span>
              {isProjectSelectorExpanded ? (
                <ChevronUp className="h-4 w-4 text-secondary-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-secondary-500" />
              )}
            </button>
            
            {isProjectSelectorExpanded && (
              <div className="mt-2">
                <ProjectSelector
                  selectedProjects={selectedProjects}
                  onProjectsChange={setSelectedProjects}
                  organization={organization}
                />
              </div>
            )}
          </div>
          
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
              disabled={!input.trim() || isLoading}
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