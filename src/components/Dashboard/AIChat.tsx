import React, { useState, useEffect } from 'react'
import { X, Send, Bot, User, ChevronDown, ChevronUp, Trash2, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProjectSelector } from './ProjectSelector'
import { OrganizationSelector } from './OrganizationSelector'
import { callN8nRAGAgent, callN8nRAGAgentLocal, getChatRecords, saveChatRecord, deleteChatMessage } from '../../lib/n8n'
import { Organization, organizationAPI } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface AIChatProps {
  onClose: () => void
  organization?: Organization
  showProjectSelector?: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIChat({ onClose, organization, showProjectSelector = true }: AIChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([])
  const [isProjectSelectorExpanded, setIsProjectSelectorExpanded] = useState(false)
  const [isOrganizationSelectorExpanded, setIsOrganizationSelectorExpanded] = useState(false)
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
    console.log('🚀 开始删除消息流程:', { messageId, message, userId: user?.id })
    
    if (!user?.id) {
      console.error('❌ 用户未登录，无法删除消息')
      alert('请先登录')
      return
    }

    // 跳过删除欢迎消息和时间戳生成的消息
    if (messageId === 'welcome') {
      console.log('⚠️ 跳过删除欢迎消息')
      alert('无法删除欢迎消息')
      return
    }

    // 检查是否为历史消息（格式：user-uuid 或 ai-uuid）
    if (!messageId.includes('-')) {
      console.log('⚠️ 跳过删除临时消息（未保存到数据库）:', messageId)
      alert('只能删除已保存的历史消息，刚发送的消息请等待保存后再删除')
      return
    }

    // 检查UUID格式
    const parts = messageId.split('-')
    if (parts.length < 2) {
      console.log('⚠️ 消息ID格式不正确:', messageId)
      alert('消息ID格式错误')
      return
    }

    // 用户确认
    if (!confirm('确定要删除这条消息吗？')) {
      console.log('⚠️ 用户取消删除')
      return
    }

    try {
      console.log('🗑️ 智能删除聊天消息:', { messageId, message })
      
      // 从消息ID中提取数据库记录ID
      // messageId格式: "user-{uuid}" 或 "ai-{uuid}"
      const parts = messageId.split('-')
      const recordId = parts.slice(1).join('-') // 重新组合UUID，因为UUID本身包含连字符
      
      if (!recordId) {
        console.error('❌ 无法解析消息ID:', messageId)
        alert('消息ID格式错误')
        return
      }

      // 简单的UUID格式验证
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(recordId)) {
        console.error('❌ 无效的UUID格式:', recordId)
        alert('无效的消息ID格式')
        return
      }

      console.log('📋 准备删除记录ID:', recordId)

      // 确定消息类型
      const messageType = message.role === 'user' ? 'user' : 'ai'
      console.log('📝 消息类型:', messageType)

      // 先从UI中移除指定的消息
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== messageId)
        console.log('🔄 UI消息过滤:', { 
          原始消息数: prev.length, 
          过滤后: filtered.length,
          删除的消息ID: messageId 
        })
        return filtered
      })
      
      // 调用新的智能删除API
      console.log('🗄️ 调用数据库智能删除API...')
      await deleteChatMessage(recordId, messageType)
      console.log('✅ 聊天消息删除成功:', { recordId, messageType })
      
      // 重新加载聊天历史以确保UI与数据库同步
      console.log('🔄 重新加载聊天历史...')
      await refreshChatHistory()
      
    } catch (error) {
      console.error('❌ 删除消息失败:', error)
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
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
      
      // 确定组织ID - 优先使用选择的组织，其次使用当前组织上下文
      let organizationId = ""
      if (selectedOrganizations.length > 0) {
        organizationId = selectedOrganizations.length === 1 ? selectedOrganizations[0] : selectedOrganizations.join(',')
      } else if (organization?.id) {
        organizationId = organization.id
      }
      
      // 调用n8n RAG系统 - 确保传递空字符串而不是undefined
      const result = await callN8nRAGAgentLocal(
        input.trim(), 
        projectId, 
        organizationId // 传递组织ID或空字符串
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
                  <Bot className="h-5 w-5 text-primary-600" />
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
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('🖱️ 双击删除按钮:', { messageId: message.id, message })
                        handleDeleteMessage(message.id, message)
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('🖱️ 单击删除按钮:', message.id)
                      }}
                      className={`opacity-30 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 peer cursor-pointer ${
                        message.role === 'user' ? 'order-first' : ''
                      }`}
                      title="双击删除此消息"
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
                <Bot className="h-5 w-5 text-primary-600" />
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
          {/* 可折叠组织选择器 - 只在没有项目选择器或没有组织上下文时显示 */}
          {!showProjectSelector && (
            <div className="mb-3">
              <button
                onClick={() => setIsOrganizationSelectorExpanded(!isOrganizationSelectorExpanded)}
                className="flex items-center justify-between w-full p-2 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors text-sm"
              >
                <span className="font-medium text-secondary-700">
                  选择组织 (可选) {selectedOrganizations.length > 0 && `- ${selectedOrganizations.length}个已选择`}
                </span>
                {isOrganizationSelectorExpanded ? (
                  <ChevronUp className="h-4 w-4 text-secondary-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-secondary-500" />
                )}
              </button>
              
              {isOrganizationSelectorExpanded && (
                <div className="mt-2">
                  <OrganizationSelector
                    selectedOrganizations={selectedOrganizations}
                    onOrganizationsChange={setSelectedOrganizations}
                    currentOrganization={organization}
                  />
                </div>
              )}
            </div>
          )}

          {/* 可折叠项目选择器 - 只在showProjectSelector为true时显示 */}
          {showProjectSelector && (
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
          )}
          
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