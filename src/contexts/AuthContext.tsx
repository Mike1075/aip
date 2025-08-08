import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  error: string | null
  needsOrganizationSelection: boolean
  isGuest: boolean
  emailConfirmationRequired: boolean
  confirmationEmail: string | null
  retry: () => void
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any, data?: any }>
  signOut: () => Promise<void>
  enterAsGuest: () => void
  completeOrganizationSelection: () => void
  resendConfirmation: (email: string) => Promise<{ error: any }>
  clearEmailConfirmation: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true) // 初始时loading，完成初始化后设为false
  const [error, setError] = useState<string | null>(null)
  const [needsOrganizationSelection, setNeedsOrganizationSelection] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false) // 防止重复初始化

  const clearEmailConfirmation = () => {
    setEmailConfirmationRequired(false)
    setConfirmationEmail(null)
  }

  const retry = () => {
    setError(null)
    setLoading(false)
    setSession(null)
    setUser(null)
  }

  // 初始化逻辑，防止重复执行
  useEffect(() => {
    if (initialized) return
    
    console.log('🔄 开始初始化认证状态...')
    setInitialized(true)
    
    // 检查当前会话
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ 获取会话失败:', error)
        setError(error.message)
      } else if (session) {
        console.log('✅ 发现现有会话')
        setSession(session)
        // 创建基本用户信息
        const basicUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
          role_in_org: 'member',
          is_ai_assist_enabled: false,
          settings: {},
          organization_id: '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setUser(basicUser)
        setIsGuest(false) // 确保已登录用户不是游客模式
        
        // 后台确保用户在数据库中存在（不阻塞UI）
        ensureUserExistsInDatabase(session.user).catch(error => {
          console.error('确保用户存在失败:', error)
        })
      } else {
        console.log('🚪 无会话，显示登录页面')
      }
      setLoading(false)
    })

    // 添加认证状态监听
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 认证状态变化:', event, session ? '有会话' : '无会话')
      console.log('📧 邮箱验证状态:', session?.user?.email_confirmed_at)
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ 用户登录成功')
        
        // 临时跳过邮箱验证检查进行调试
        console.log('🚫 跳过邮箱验证检查（调试模式）')
        
        console.log('🔧 开始设置用户状态...')
        setSession(session)
        console.log('✅ Session已设置')
        setError(null)
        setEmailConfirmationRequired(false)
        setConfirmationEmail(null)
        
        // 创建基本用户信息
        const basicUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
          role_in_org: 'member',
          is_ai_assist_enabled: false,
          settings: {},
          organization_id: '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setUser(basicUser)
        console.log('✅ User已设置:', basicUser.email)
        
        // 直接进入主界面，不需要组织选择
        setNeedsOrganizationSelection(false)
        setIsGuest(false) // 确保登录用户不是游客模式
        setLoading(false)
        console.log('✅ Loading已设置为false，应该跳转到主界面')
        
        // 后台确保用户在数据库中存在（不阻塞UI）
        ensureUserExistsInDatabase(session.user).catch(error => {
          console.error('确保用户存在失败:', error)
        })
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 用户登出')
        setSession(null)
        setUser(null)
        setLoading(false)
        setError(null)
        setEmailConfirmationRequired(false)
        setConfirmationEmail(null)
        setNeedsOrganizationSelection(false)
        setIsGuest(false)
      } else if (event === 'USER_UPDATED' && session) {
        console.log('👤 用户信息更新')
        // 处理邮箱验证完成
        if (session.user.email_confirmed_at && emailConfirmationRequired) {
          console.log('✅ 邮箱验证完成')
          setEmailConfirmationRequired(false)
          setConfirmationEmail(null)
          // 重新触发登录流程
          window.location.reload()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialized])

  const ensureUserExistsInDatabase = async (authUser: SupabaseUser) => {
    console.log('🔍 检查用户是否在数据库中存在...')
    
    // 检查用户是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }
    
    if (existingUser) {
      console.log('✅ 用户记录已存在')
      return
    }
    
    // 创建用户记录
    console.log('📝 创建用户记录...')
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
        role_in_org: 'member',
        is_ai_assist_enabled: true,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (insertError) {
      console.error('❌ 创建用户记录失败:', insertError)
      throw insertError
    }
    
    console.log('✅ 用户记录创建成功')
  }

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    // 暂时禁用用户资料获取，避免loading问题
    console.log('👤 跳过用户资料获取，避免loading问题')
    setLoading(false)
    return
  }

  const createUserProfile = async (authUser: SupabaseUser) => {
    // 暂时禁用用户资料创建
    console.log('🆕 跳过用户资料创建')
    return
  }

  const signUp = async (email: string, password: string, name: string) => {
    console.log('📝 开始注册用户:', email)
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name, // 按照官方建议添加full_name
          }
        }
      })

      if (error) {
        console.error('注册失败:', error.message)
        setError(error.message)
        return { error }
      }

      console.log('✅ 注册成功，等待邮箱验证')
      
      // 如果用户已经存在但未验证，需要等待验证
      if (data.user && !data.user.email_confirmed_at) {
        setEmailConfirmationRequired(true)
        setConfirmationEmail(email)
      }
      
      return { data, error: null }
    } catch (err: any) {
      console.error('注册过程中出错:', err)
      setError(err.message || '注册失败')
      return { error: err }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔑 开始登录用户:', email)
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('登录失败:', error.message)
        setError(error.message)
        return { error }
      }
      
      // 临时跳过邮箱验证检查进行调试
      console.log('🚫 signIn中跳过邮箱验证检查（调试模式）')
      
      // 手动设置用户状态（因为onAuthStateChange可能没有触发）
      console.log('🔧 在signIn中手动设置用户状态...')
      setSession(data.session)
      console.log('✅ Session已在signIn中设置')
      
      if (data.user) {
        const basicUser: User = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
          role_in_org: 'member',
          is_ai_assist_enabled: false,
          settings: {},
          organization_id: '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setUser(basicUser)
        console.log('✅ User已在signIn中设置:', basicUser.email)
        
        // 后台确保用户在数据库中存在（不阻塞UI）
        ensureUserExistsInDatabase(data.user).catch(error => {
          console.error('确保用户存在失败:', error)
        })
      }
      
      setError(null)
      setEmailConfirmationRequired(false)
      setConfirmationEmail(null)
      setNeedsOrganizationSelection(false)
      setIsGuest(false) // 确保登录用户不是游客模式
      
      console.log('✅ 登录成功，状态已手动设置')
      return { error: null }
    } catch (err: any) {
      console.error('登录过程中出错:', err)
      setError(err.message || '登录失败')
      return { error: err }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('🚪 用户登出')
    await supabase.auth.signOut()
    
    // 重置所有状态，包括initialized状态
    setSession(null)
    setUser(null)
    setLoading(false)
    setError(null)
    setNeedsOrganizationSelection(false)
    setIsGuest(false)
    setEmailConfirmationRequired(false)
    setConfirmationEmail(null)
    setInitialized(false) // 重置初始化状态，允许重新初始化
    
    // 清除本地存储
    localStorage.removeItem('orgSelectionCompleted')
  }

  const enterAsGuest = () => {
    console.log('👥 进入游客模式')
    setIsGuest(true)
    // 为游客填充一个轻量的User对象，提供固定ID供下游使用
    const guestUser: User = {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'guest@local',
      name: '游客',
      role_in_org: 'member',
      is_ai_assist_enabled: false,
      settings: {},
      organization_id: '00000000-0000-0000-0000-000000000000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setUser(guestUser)
    setSession(null)
    setNeedsOrganizationSelection(false)
    setLoading(false)
    setError(null)
    setEmailConfirmationRequired(false)
    setConfirmationEmail(null)
  }

  const completeOrganizationSelection = () => {
    setNeedsOrganizationSelection(false)
    localStorage.setItem('orgSelectionCompleted', 'true')
  }

  const resendConfirmation = async (email: string) => {
    console.log('📧 重发验证邮件:', email)
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })
      
      if (error) {
        console.error('重发验证邮件失败:', error.message)
        setError(error.message)
        return { error }
      }
      
      console.log('✅ 验证邮件已重发')
      return { error: null }
    } catch (err: any) {
      console.error('重发验证邮件过程中出错:', err)
      setError(err.message || '重发失败')
      return { error: err }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    session,
    user,
    loading,
    error,
    needsOrganizationSelection,
    isGuest,
    emailConfirmationRequired,
    confirmationEmail,
    retry,
    signIn,
    signUp,
    signOut,
    enterAsGuest,
    completeOrganizationSelection,
    resendConfirmation,
    clearEmailConfirmation,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 