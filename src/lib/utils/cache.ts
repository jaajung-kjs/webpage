/**
 * 영구 캐시 레이어 - localStorage 기반
 * 새로고침 후에도 데이터 유지
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

export class PersistentCache {
  private static PREFIX = 'kepco-cache-'
  
  /**
   * 캐시에 데이터 저장
   */
  static set<T>(key: string, data: T, ttl?: number): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || 300000 // 기본 5분
      }
      localStorage.setItem(this.PREFIX + key, JSON.stringify(item))
    } catch (error) {
      // localStorage 가득 참 등의 에러 처리
      console.warn('Cache set failed:', error)
      // 오래된 캐시 항목 정리
      this.cleanup()
    }
  }
  
  /**
   * 캐시에서 데이터 가져오기
   */
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key)
      if (!item) return null
      
      const parsed = JSON.parse(item) as CacheItem<T>
      
      // TTL 확인
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(this.PREFIX + key)
        return null
      }
      
      return parsed.data
    } catch (error) {
      console.warn('Cache get failed:', error)
      return null
    }
  }
  
  /**
   * 캐시 무효화
   */
  static invalidate(pattern?: string): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        if (!pattern || key.includes(pattern)) {
          localStorage.removeItem(key)
        }
      }
    })
  }
  
  /**
   * 특정 키의 캐시 삭제
   */
  static remove(key: string): void {
    localStorage.removeItem(this.PREFIX + key)
  }
  
  /**
   * 캐시 크기 확인
   */
  static getSize(): number {
    let size = 0
    const keys = Object.keys(localStorage)
    
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        const item = localStorage.getItem(key)
        if (item) size += item.length
      }
    })
    
    return size
  }
  
  /**
   * 오래된 캐시 정리
   */
  static cleanup(): void {
    const keys = Object.keys(localStorage)
    const now = Date.now()
    
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        try {
          const item = localStorage.getItem(key)
          if (!item) return
          
          const parsed = JSON.parse(item) as CacheItem<any>
          if (now - parsed.timestamp > parsed.ttl) {
            localStorage.removeItem(key)
          }
        } catch {
          // 잘못된 캐시 항목 삭제
          localStorage.removeItem(key)
        }
      }
    })
  }
  
  /**
   * 전체 캐시 초기화
   */
  static clear(): void {
    this.invalidate()
  }
}

/**
 * 낙관적 업데이트 헬퍼
 */
export async function optimisticUpdate<T>(
  cacheKey: string,
  optimisticData: T | ((prev: T) => T),
  apiCall: () => Promise<any>,
  options?: {
    ttl?: number
    onError?: (error: Error, previousData: T | null) => void
  }
): Promise<any> {
  // 1. 현재 캐시된 데이터 가져오기
  const previousData = PersistentCache.get<T>(cacheKey)
  
  // 2. 낙관적 업데이트 적용
  const newData = typeof optimisticData === 'function' 
    ? (optimisticData as (prev: T) => T)(previousData as T)
    : optimisticData
    
  PersistentCache.set(cacheKey, newData, options?.ttl)
  
  try {
    // 3. 실제 API 호출
    const result = await apiCall()
    
    // 4. 성공 시 실제 데이터로 업데이트
    if (result.success && result.data) {
      PersistentCache.set(cacheKey, result.data, options?.ttl)
    }
    
    return result
  } catch (error) {
    // 5. 실패 시 이전 데이터로 롤백
    if (previousData !== null) {
      PersistentCache.set(cacheKey, previousData, options?.ttl)
    } else {
      PersistentCache.remove(cacheKey)
    }
    
    // 에러 콜백 실행
    if (options?.onError && error instanceof Error) {
      options.onError(error, previousData)
    }
    
    throw error
  }
}

/**
 * 캐시 키 생성 헬퍼
 */
export function createCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`
}

/**
 * 메모리 + 영구 캐시 조합
 */
export class HybridCache {
  private static memoryCache = new Map<string, CacheItem<any>>()
  
  static set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 300000
    }
    
    // 메모리 캐시 저장
    this.memoryCache.set(key, item)
    
    // 영구 캐시 저장
    PersistentCache.set(key, data, ttl)
  }
  
  static get<T>(key: string): T | null {
    // 1. 먼저 메모리 캐시 확인
    const memoryItem = this.memoryCache.get(key)
    if (memoryItem) {
      const now = Date.now()
      if (now - memoryItem.timestamp <= memoryItem.ttl) {
        return memoryItem.data
      }
      // 만료된 경우 삭제
      this.memoryCache.delete(key)
    }
    
    // 2. 영구 캐시 확인
    const data = PersistentCache.get<T>(key)
    if (data !== null) {
      // 메모리 캐시에도 저장
      this.memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: 300000
      })
    }
    
    return data
  }
  
  static invalidate(pattern?: string): void {
    // 메모리 캐시 정리
    if (pattern) {
      Array.from(this.memoryCache.keys()).forEach(key => {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key)
        }
      })
    } else {
      this.memoryCache.clear()
    }
    
    // 영구 캐시 정리
    PersistentCache.invalidate(pattern)
  }
}