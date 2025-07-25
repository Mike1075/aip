import { createClient } from '@supabase/supabase-js'

// 从环境变量读取配置，如果没有则使用开发环境的默认值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wfkazzdlfgurfmucuoqf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indma2F6emRsZmd1cmZtdWN1b3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNjI5NjQsImV4cCI6MjA2ODczODk2NH0.B-132nJtoXCKIuHmCHehnhOac8JohGs6rg4GjoV4v5M'

console.log('🔧 Supabase配置:')
console.log('URL:', supabaseUrl)
console.log('Key前6位:', supabaseAnonKey.substring(0, 6) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 测试连接
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase连接测试失败:', error)
  } else {
    console.log('✅ Supabase连接测试成功')
  }
})

// 数据库类型定义
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role_in_org: 'admin' | 'member'
  is_ai_assist_enabled: boolean
  settings: Record<string, any>
  organization_id: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  description?: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  is_public: boolean
  is_recruiting: boolean
  creator_id: string
  organization_id: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project_id: string
  assignee_id?: string
  created_by_id: string
  created_by_ai: boolean
  estimated_hours?: number
  actual_hours?: number
  due_date?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role_in_project: 'manager' | 'developer' | 'tester' | 'designer'
  joined_at: string
}

export interface ChatHistory {
  id: string
  content: string
  role: 'user' | 'assistant'
  agent_type: 'org_agent' | 'project_agent' | 'member_agent'
  project_id?: string
  user_id: string
  metadata: Record<string, any>
  created_at: string
} 