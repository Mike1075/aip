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

// n8n webhook配置
const N8N_WEBHOOK_URL = import.meta.env.DEV 
  ? '/api/n8n/webhook/925b0339-e8ae-472d-ac10-cda35dca23c2'  // 开发环境使用代理
  : 'https://n8n.aifunbox.com/webhook/925b0339-e8ae-472d-ac10-cda35dca23c2'  // 生产环境直接调用

// 用户项目接口
export interface UserProject {
  id: string
  name: string
  selected?: boolean
}

export const callN8nRAGAgent = async (
  chatInput: string,
  projectId: string | string[]
): Promise<N8nChatResponse> => {
  try {
    console.log('🚀 调用n8n RAG Agent:', {
      chatInput,
      projectId
    })

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatInput: chatInput,
        project_id: projectId
      })
    })

    if (!response.ok) {
      throw new Error(`n8n调用失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.text()
    
    console.log('✅ n8n响应成功:', result)

    return {
      success: true,
      response: result
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
  projectId: string | string[]
): Promise<N8nChatResponse> => {
  try {
    console.log('🚀 调用本地n8n RAG Agent:', {
      chatInput,
      projectId
    })

    // 使用相同的webhook URL
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatInput: chatInput,
        project_id: projectId
      })
    })

    if (!response.ok) {
      throw new Error(`本地n8n调用失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.text()
    
    console.log('✅ 本地n8n响应成功:', result)

    return {
      success: true,
      response: result
    }

  } catch (error) {
    console.error('❌ 本地n8n调用失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '本地n8n连接失败'
    }
  }
}

// 获取用户项目列表
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

    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`获取项目失败: ${error.message}`)
    }

    return projects || []
  } catch (error) {
    console.error('获取用户项目失败:', error)
    return []
  }
}