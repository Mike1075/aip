import { useState, useEffect, useCallback } from 'react'

interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface CacheConfig {
  ttl?: number // 缓存时间（毫秒），默认5分钟
  maxSize?: number // 最大缓存条目数，默认100
}

class DataCache {
  private cache = new Map<string, CacheItem<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5分钟
  private maxSize = 100

  constructor(config?: CacheConfig) {
    if (config?.ttl) this.defaultTTL = config.ttl
    if (config?.maxSize) this.maxSize = config.maxSize
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const expiresAt = now + (ttl || this.defaultTTL)
    
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    })

    console.log(`📦 缓存已设置: ${key}, 过期时间: ${new Date(expiresAt).toLocaleTimeString()}`)
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      console.log(`❌ 缓存未命中: ${key}`)
      return null
    }

    const now = Date.now()
    if (now > item.expiresAt) {
      console.log(`⏰ 缓存已过期: ${key}`)
      this.cache.delete(key)
      return null
    }

    console.log(`✅ 缓存命中: ${key}, 剩余时间: ${Math.round((item.expiresAt - now) / 1000)}秒`)
    return item.data
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    const now = Date.now()
    if (now > item.expiresAt) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
    console.log(`🗑️ 缓存已删除: ${key}`)
  }

  clear(): void {
    this.cache.clear()
    console.log('🧹 缓存已清空')
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期缓存`)
    }
  }

  // 获取缓存统计信息
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 全局缓存实例
const globalCache = new DataCache({
  ttl: 3 * 60 * 1000, // 3分钟默认缓存
  maxSize: 200
})

// 定期清理过期缓存
setInterval(() => {
  globalCache.cleanup()
}, 60 * 1000) // 每分钟清理一次

export function useDataCache() {
  const [cacheStats, setCacheStats] = useState(globalCache.getStats())

  // 更新缓存统计
  const updateStats = useCallback(() => {
    setCacheStats(globalCache.getStats())
  }, [])

  // 缓存数据的通用方法
  const cacheData = useCallback(<T>(key: string, data: T, ttl?: number) => {
    globalCache.set(key, data, ttl)
    updateStats()
  }, [updateStats])

  // 获取缓存数据的通用方法
  const getCachedData = useCallback(<T>(key: string): T | null => {
    return globalCache.get<T>(key)
  }, [])

  // 检查缓存是否存在
  const hasCachedData = useCallback((key: string): boolean => {
    return globalCache.has(key)
  }, [])

  // 删除特定缓存
  const deleteCachedData = useCallback((key: string) => {
    globalCache.delete(key)
    updateStats()
  }, [updateStats])

  // 清空所有缓存
  const clearCache = useCallback(() => {
    globalCache.clear()
    updateStats()
  }, [updateStats])

  // 带缓存的数据获取方法
  const fetchWithCache = useCallback(async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    // 先检查缓存
    const cachedData = getCachedData<T>(key)
    if (cachedData !== null) {
      return cachedData
    }

    // 缓存未命中，执行获取函数
    console.log(`🔄 开始获取数据: ${key}`)
    const startTime = Date.now()
    
    try {
      const data = await fetchFn()
      const endTime = Date.now()
      console.log(`✅ 数据获取成功: ${key}, 耗时: ${endTime - startTime}ms`)
      
      // 缓存数据
      cacheData(key, data, ttl)
      return data
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ 数据获取失败: ${key}, 耗时: ${endTime - startTime}ms`, error)
      throw error
    }
  }, [getCachedData, cacheData])

  return {
    cacheData,
    getCachedData,
    hasCachedData,
    deleteCachedData,
    clearCache,
    fetchWithCache,
    cacheStats
  }
}

// 专门用于组织数据的缓存Hook
export function useOrganizationCache() {
  const { fetchWithCache, deleteCachedData } = useDataCache()

  const fetchOrganizationWithCache = useCallback(async (
    organizationId: string,
    fetchFn: () => Promise<any>
  ) => {
    return fetchWithCache(
      `organization:${organizationId}`,
      fetchFn,
      10 * 60 * 1000 // 组织信息缓存10分钟
    )
  }, [fetchWithCache])

  const fetchOrganizationProjectsWithCache = useCallback(async (
    organizationId: string,
    userId: string,
    fetchFn: () => Promise<any>
  ) => {
    return fetchWithCache(
      `org_projects:${organizationId}:${userId}`,
      fetchFn,
      3 * 60 * 1000 // 项目列表缓存3分钟
    )
  }, [fetchWithCache])

  const fetchUserTasksWithCache = useCallback(async (
    userId: string,
    fetchFn: () => Promise<any>
  ) => {
    return fetchWithCache(
      `user_tasks:${userId}`,
      fetchFn,
      2 * 60 * 1000 // 任务列表缓存2分钟
    )
  }, [fetchWithCache])

  const fetchUserOrganizationsWithCache = useCallback(async (
    userId: string,
    fetchFn: () => Promise<any>
  ) => {
    return fetchWithCache(
      `user_organizations:${userId}`,
      fetchFn,
      5 * 60 * 1000 // 用户组织列表缓存5分钟
    )
  }, [fetchWithCache])

  // 清除组织相关缓存
  const clearOrganizationCache = useCallback((organizationId: string, userId?: string) => {
    deleteCachedData(`organization:${organizationId}`)
    if (userId) {
      deleteCachedData(`org_projects:${organizationId}:${userId}`)
      deleteCachedData(`user_tasks:${userId}`)
      deleteCachedData(`user_organizations:${userId}`)
    }
  }, [deleteCachedData])

  return {
    fetchOrganizationWithCache,
    fetchOrganizationProjectsWithCache,
    fetchUserTasksWithCache,
    fetchUserOrganizationsWithCache,
    clearOrganizationCache
  }
}