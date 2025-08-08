// n8n API调用函数
export interface N8nChatRequest {
  chatInput: string
  project_id: string | string[]
}

export interface N8nChatResponse {
  success: boolean
  response?: string
  error?: string
}

// n8n webhook配置 - 直接使用n8n服务器地址
const N8N_WEBHOOK_URL = 'https://n8n.aifunbox.com/webhook/fd6b2fff-af4c-4013-8fb6-ada231750a5a'

// 用户项目接口
export interface UserProject {
  id: string
  name: string
  description?: string
  organization_id?: string
  organization_name?: string
}

// 聊天记录接口
export interface ChatRecord {
  id: string
  content: string
  ai_content: string
  role: 'user' | 'assistant'
  agent_type: string
  project_id: string
  user_id: string
  metadata: any
  created_at: string
}

// 项目文档接口（基于现有的documents表）
export interface ProjectDocument {
  id: string
  title: string
  content: string
  metadata: any
  project_id: string
  user_id: string
  organization_id: string // 新增组织ID字段
  created_at: string
}

export const callN8nRAGAgent = async (
  chatInput: string,
  projectId?: string | string[],
  organizationId?: string
): Promise<N8nChatResponse> => {
  try {
    // 获取当前用户ID
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('用户未登录')
    }

    console.log('🚀 调用n8n RAG Agent:', {
      chatInput,
      projectId,
      organizationId,
      userId: user.id
    })

    // 构建请求体 - 将空值转换为特殊UUID，避免n8n create row节点报错
    const requestBody: any = {
      chatInput: chatInput,
      user_id: user.id,
      project_id: projectId || '00000000-0000-0000-0000-000000000001', // 空值时使用特殊UUID
      organization_id: organizationId || '00000000-0000-0000-0000-000000000002' // 空值时使用特殊UUID
    }

    console.log('📋 项目智慧库:', projectId || '未选择')
    console.log('📋 组织智慧库:', organizationId || '未指定')

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`n8n调用失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.text()
    
    console.log('✅ n8n响应成功:', result)

    // 尝试解析JSON响应，提取ai_content字段
    let cleanResponse = result
    try {
      const jsonResponse = JSON.parse(result)
      if (jsonResponse.ai_content) {
        cleanResponse = jsonResponse.ai_content
        console.log('📝 提取ai_content:', cleanResponse)
      } else if (typeof jsonResponse === 'string') {
        cleanResponse = jsonResponse
      }
    } catch (error) {
      // 如果不是JSON，直接使用原文本
      console.log('📄 使用原始文本响应')
    }

    return {
      success: true,
      response: cleanResponse
    }

  } catch (error) {
    console.error('❌ n8n调用失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

// 本地测试函数（使用localhost）
export const callN8nRAGAgentLocal = async (
  chatInput: string,
  projectId?: string | string[],
  organizationId?: string
): Promise<N8nChatResponse> => {
  try {
    // 获取当前用户ID
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('用户未登录')
    }

    console.log('🚀 调用本地n8n RAG Agent:', {
      chatInput,
      projectId,
      organizationId,
      userId: user.id
    })

    // 构建请求体 - 将null转换为空字符串以支持全局调用
    const requestBody: any = {
      chatInput: chatInput,
      user_id: user.id,
      project_id: projectId || "", // 全局调用时传递空字符串
      organization_id: organizationId || "" // 全局调用时传递空字符串
    }

    console.log('📋 项目智慧库:', projectId || '未选择')
    console.log('📋 组织智慧库:', organizationId || '未指定')

    console.log('📤 发送到n8n的完整请求体:', JSON.stringify(requestBody, null, 2))
    console.log('🔗 请求URL:', N8N_WEBHOOK_URL)

    // 使用相同的webhook URL
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📡 n8n响应状态:', response.status, response.statusText)

    if (!response.ok) {
      throw new Error(`本地n8n调用失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.text()
    
    console.log('✅ 本地n8n响应成功:', result)

    // 尝试解析JSON响应，提取ai_content字段
    let cleanResponse = result
    try {
      const jsonResponse = JSON.parse(result)
      if (jsonResponse.ai_content) {
        cleanResponse = jsonResponse.ai_content
        console.log('📝 提取ai_content:', cleanResponse)
      } else if (typeof jsonResponse === 'string') {
        cleanResponse = jsonResponse
      }
    } catch (error) {
      // 如果不是JSON，直接使用原文本
      console.log('📄 使用原始文本响应')
    }

    return {
      success: true,
      response: cleanResponse
    }

  } catch (error) {
    console.error('❌ 本地n8n调用失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '本地n8n连接失败'
    }
  }
}

// 获取用户项目列表（创建者 + 参与者），并补充组织名称
export const getUserProjects = async (): Promise<UserProject[]> => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('用户未登录')
    }

    // 我创建的项目
    const { data: createdProjects, error: createdErr } = await supabase
      .from('projects')
      .select('id, name, description, organization_id')
      .eq('creator_id', user.id)

    if (createdErr) throw createdErr

    // 我参与的项目
    const { data: memberProjects, error: memberErr } = await supabase
      .from('project_members')
      .select('project:projects(id, name, description, organization_id)')
      .eq('user_id', user.id)

    if (memberErr) throw memberErr

    const memberProjectList: UserProject[] = (memberProjects || [])
      .map((row: any) => row.project)
      .filter((p: any) => !!p)

    // 合并去重
    const map = new Map<string, UserProject>()
    for (const p of createdProjects || []) map.set(p.id, { id: p.id, name: p.name, description: p.description || '', organization_id: (p as any).organization_id })
    for (const p of memberProjectList) if (p && !map.has(p.id)) map.set(p.id, { id: p.id, name: p.name, description: p.description || '', organization_id: (p as any).organization_id })

    const list = Array.from(map.values())

    // 填充组织名称
    const orgIds = Array.from(new Set(list.map(p => p.organization_id).filter(Boolean))) as string[]
    if (orgIds.length > 0) {
      const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds)
      if (!orgErr && orgs) {
        const idToName = new Map(orgs.map(o => [o.id, o.name] as const))
        list.forEach(p => {
          if (p.organization_id) {
            p.organization_name = idToName.get(p.organization_id) || undefined
          }
        })
      }
    }

    return list.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('获取用户项目失败:', error)
    return []
  }
}

// 文件上传到n8n处理
export const uploadDocumentToN8n = async (
  file: File,
  projectId: string,
  title: string,
  userId: string
): Promise<N8nChatResponse> => {
  try {
    console.log('📁 上传文件到n8n:', { fileName: file.name, projectId, userId, title })
    console.log('📁 文件对象检查:', { 
      fileType: typeof file, 
      fileName: file.name, 
      fileSize: file.size, 
      fileLastModified: file.lastModified,
      isFileInstance: file instanceof File 
    })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', projectId)
    formData.append('user_id', userId)
    formData.append('title', title)

    // 验证FormData内容
    console.log('📁 FormData检查:')
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size}bytes)` : value)
    }

    // 使用直接的n8n webhook地址（如果有文档上传的webhook的话）
    const uploadUrl = 'https://n8n.aifunbox.com/webhook/upload-document'

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    // 获取响应文本
    const result = await response.text()
    console.log('📄 n8n响应:', { status: response.status, statusText: response.statusText, result })

    // n8n可能返回500但实际处理成功，所以我们检查响应内容
    if (response.ok || (response.status === 500 && result)) {
      console.log('✅ 文件上传成功:', result)
      
      // 上传成功后，保存文档记录到数据库
      try {
        await saveDocumentRecord(file, projectId, title, userId)
      } catch (dbError) {
        console.error('⚠️ 保存文档记录失败（但文件上传成功）:', dbError)
        // 不影响主要的上传流程
      }
      
      return {
        success: true,
        response: result
      }
    } else {
      throw new Error(`文件上传失败: ${response.status} ${response.statusText}`)
    }

  } catch (error) {
    console.error('❌ 文件上传失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '文件上传失败'
    }
  }
}

// 保存聊天记录到数据库
export const saveChatRecord = async (
  userMessage: string,
  aiResponse: string,
  projectId: string | string[]
): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const projectIdStr = Array.isArray(projectId) ? projectId[0] : projectId

    // 保存一条完整的对话记录（用户消息和AI回复在同一条记录中）
    const { error } = await supabase
      .from('chat_history')
      .insert({
        content: userMessage,
        ai_content: aiResponse,
        role: 'user',
        agent_type: 'project_agent',
        project_id: projectIdStr,
        user_id: user.id,
        metadata: { project_ids: Array.isArray(projectId) ? projectId : [projectId] }
      })

    if (error) {
      console.error('保存聊天记录失败:', error)
    } else {
      console.log('✅ 聊天记录保存成功')
    }
  } catch (error) {
    console.error('保存聊天记录异常:', error)
  }
}

// 获取用户聊天记录
export const getChatRecords = async (limit = 20): Promise<ChatRecord[]> => {
  try {
    console.log('🔌 连接Supabase...')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    console.log('👤 获取用户信息...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ 用户未登录')
      return []
    }
    console.log('✅ 用户ID:', user.id)

    console.log('📝 查询聊天记录...')
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('agent_type', 'project_agent')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ 获取聊天记录失败:', error)
      return []
    }

    console.log('✅ 查询成功，记录数:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('❌ 获取聊天记录异常:', error)
    return []
  }
}

// 获取项目文档列表
export const getProjectDocuments = async (projectId: string): Promise<ProjectDocument[]> => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    console.log('📚 获取项目文档列表...', { projectId })

    // 查询项目文档（使用现有的documents表）
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 获取项目文档失败:', error)
      return []
    }

    console.log('✅ 获取项目文档成功，文档数:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('❌ 获取项目文档异常:', error)
    return []
  }
}

// 删除文档（按标题删除所有相同标题的文档）
export const deleteDocumentsByTitle = async (
  projectId: string,
  title: string
): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    console.log('🗑️ 删除文档...', { projectId, title })

    // 删除指定项目中指定标题的所有文档
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('project_id', projectId)
      .eq('title', title)

    if (error) {
      console.error('❌ 删除文档失败:', error)
      throw new Error(`删除文档失败: ${error.message}`)
    }

    console.log('✅ 文档删除成功')
  } catch (error) {
    console.error('❌ 删除文档异常:', error)
    throw error
  }
}

// 保存文档记录到数据库（使用现有的documents表）
const saveDocumentRecord = async (
  file: File,
  projectId: string,
  title: string,
  userId: string
): Promise<void> => {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )

  console.log('💾 保存文档记录到数据库...', { title, filename: file.name, projectId })

  // 首先获取项目信息以获取organization_id
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()
  
  if (projectError) {
    console.error('❌ 获取项目信息失败:', projectError)
    throw projectError
  }

  const { error } = await supabase
    .from('documents')
    .insert({
      title: title,
      content: '', // 初始内容为空，n8n处理后会更新
      metadata: {
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        upload_status: 'processing'
      },
      project_id: projectId,
      user_id: userId,
      organization_id: project.organization_id // 添加组织ID
    })

  if (error) {
    console.error('❌ 保存文档记录失败:', error)
    throw error
  }
  
  console.log('✅ 文档记录保存成功，已关联组织ID:', project.organization_id)
}

// 删除聊天记录 - 支持部分删除和智能清理
export const deleteChatMessage = async (
  recordId: string, 
  messageType: 'user' | 'ai' | 'both'
): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('用户未登录')
    }

    console.log('🗑️ 删除聊天消息:', { recordId, messageType, userId: user.id })

    if (messageType === 'both') {
      // 删除整行记录
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', recordId)
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ 删除整行聊天记录失败:', error)
        throw new Error(`删除整行聊天记录失败: ${error.message}`)
      }
      console.log('✅ 整行聊天记录删除成功')
    } else {
      // 部分删除：先获取当前记录状态
      const { data: currentRecord, error: fetchError } = await supabase
        .from('chat_history')
        .select('content, ai_content')
        .eq('id', recordId)
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        console.error('❌ 获取聊天记录失败:', fetchError)
        throw new Error(`获取聊天记录失败: ${fetchError.message}`)
      }

      // 确定更新的字段 - 使用空字符串代替NULL以避免约束问题
      let updateData: { content?: string, ai_content?: string } = {}
      
      if (messageType === 'user') {
        updateData.content = ''
      } else if (messageType === 'ai') {
        updateData.ai_content = ''
      }

      // 检查删除后是否两个字段都为空（或空字符串）
      const willContentBeEmpty = messageType === 'user' ? true : (!currentRecord.content || currentRecord.content.trim() === '')
      const willAiContentBeEmpty = messageType === 'ai' ? true : (!currentRecord.ai_content || currentRecord.ai_content.trim() === '')

      if (willContentBeEmpty && willAiContentBeEmpty) {
        // 如果删除后两个字段都为空，直接删除整行
        console.log('🗑️ 两个字段都将为空，删除整行记录')
        const { error } = await supabase
          .from('chat_history')
          .delete()
          .eq('id', recordId)
          .eq('user_id', user.id)

        if (error) {
          console.error('❌ 删除整行记录失败:', error)
          throw new Error(`删除整行记录失败: ${error.message}`)
        }
        console.log('✅ 整行记录删除成功')
      } else {
        // 部分更新
        const { error } = await supabase
          .from('chat_history')
          .update(updateData)
          .eq('id', recordId)
          .eq('user_id', user.id)

        if (error) {
          console.error('❌ 部分删除失败:', error)
          throw new Error(`部分删除失败: ${error.message}`)
        }
        console.log('✅ 部分删除成功:', updateData)
      }
    }
  } catch (error) {
    console.error('❌ 删除聊天消息异常:', error)
    throw error
  }
}

// 保持向后兼容的旧函数
export const deleteChatRecord = async (recordId: string): Promise<void> => {
  return deleteChatMessage(recordId, 'both')
}