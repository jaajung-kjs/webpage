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
  
  static remove(key: string): void {
    this.memoryCache.delete(key)
    PersistentCache.remove(key)
  }
}

/**
 * 메시지 시스템 캐시 전략
 */
export class MessageCache {
  private static readonly CACHE_KEYS = {
    INBOX: (userId: string) => createCacheKey('messages', 'inbox', userId),
    CONVERSATION: (conversationId: string) => createCacheKey('messages', 'conversation', conversationId),
    UNREAD_COUNT: (userId: string) => createCacheKey('messages', 'unread', userId),
    CONVERSATION_META: (conversationId: string) => createCacheKey('messages', 'meta', conversationId),
    USER_CONVERSATIONS: (userId: string) => createCacheKey('messages', 'user-conversations', userId),
    PERFORMANCE_METRICS: () => createCacheKey('messages', 'performance-metrics')
  }
  
  private static readonly TTL = {
    INBOX: 300000, // 5분
    CONVERSATION: 600000, // 10분
    UNREAD_COUNT: 60000, // 1분 (자주 업데이트)
    CONVERSATION_META: 300000, // 5분
    USER_CONVERSATIONS: 300000, // 5분
    PERFORMANCE_METRICS: 1800000 // 30분
  }
  
  // 성능 메트릭 추적
  private static performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    averageResponseTime: 0
  }
  
  // 받은 메시지함 캐시
  static setInbox(userId: string, messages: any[]): void {
    HybridCache.set(
      this.CACHE_KEYS.INBOX(userId),
      messages,
      this.TTL.INBOX
    )
  }
  
  static getInbox(userId: string): any[] | null {
    const startTime = performance.now()
    const result = HybridCache.get<any[]>(this.CACHE_KEYS.INBOX(userId))
    const responseTime = performance.now() - startTime
    
    // 성능 메트릭 업데이트
    this.updatePerformanceMetrics(result !== null, responseTime)
    
    return result
  }
  
  static invalidateInbox(userId: string): void {
    HybridCache.remove(this.CACHE_KEYS.INBOX(userId))
  }
  
  // 대화 메시지 캐시
  static setConversation(conversationId: string, messages: any[]): void {
    HybridCache.set(
      this.CACHE_KEYS.CONVERSATION(conversationId),
      messages,
      this.TTL.CONVERSATION
    )
  }
  
  static getConversation(conversationId: string): any[] | null {
    return HybridCache.get<any[]>(this.CACHE_KEYS.CONVERSATION(conversationId))
  }
  
  static invalidateConversation(conversationId: string): void {
    HybridCache.remove(this.CACHE_KEYS.CONVERSATION(conversationId))
  }
  
  // 새 메시지를 대화 캐시에 추가 (낙관적 업데이트)
  static addMessageToConversation(conversationId: string, message: any): void {
    const existingMessages = this.getConversation(conversationId) || []
    const updatedMessages = [...existingMessages, message]
    this.setConversation(conversationId, updatedMessages)
  }
  
  // 안읽은 메시지 카운트 캐시
  static setUnreadCount(userId: string, count: number): void {
    HybridCache.set(
      this.CACHE_KEYS.UNREAD_COUNT(userId),
      count,
      this.TTL.UNREAD_COUNT
    )
  }
  
  static getUnreadCount(userId: string): number | null {
    return HybridCache.get<number>(this.CACHE_KEYS.UNREAD_COUNT(userId))
  }
  
  static invalidateUnreadCount(userId: string): void {
    HybridCache.remove(this.CACHE_KEYS.UNREAD_COUNT(userId))
  }
  
  // 대화방 메타데이터 캐시 (참여자, 마지막 메시지 등)
  static setConversationMeta(conversationId: string, meta: any): void {
    HybridCache.set(
      this.CACHE_KEYS.CONVERSATION_META(conversationId),
      meta,
      this.TTL.CONVERSATION_META
    )
  }
  
  static getConversationMeta(conversationId: string): any | null {
    return HybridCache.get<any>(this.CACHE_KEYS.CONVERSATION_META(conversationId))
  }
  
  static invalidateConversationMeta(conversationId: string): void {
    HybridCache.remove(this.CACHE_KEYS.CONVERSATION_META(conversationId))
  }
  
  // 사용자의 모든 대화방 목록 캐시
  static setUserConversations(userId: string, conversations: any[]): void {
    HybridCache.set(
      this.CACHE_KEYS.USER_CONVERSATIONS(userId),
      conversations,
      this.TTL.USER_CONVERSATIONS
    )
  }
  
  static getUserConversations(userId: string): any[] | null {
    return HybridCache.get<any[]>(this.CACHE_KEYS.USER_CONVERSATIONS(userId))
  }
  
  static invalidateUserConversations(userId: string): void {
    HybridCache.remove(this.CACHE_KEYS.USER_CONVERSATIONS(userId))
  }
  
  // 특정 사용자의 모든 메시지 관련 캐시 무효화
  static invalidateUserCache(userId: string): void {
    this.invalidateInbox(userId)
    this.invalidateUnreadCount(userId)
    this.invalidateUserConversations(userId)
  }
  
  // 새 메시지 도착 시 관련 캐시 무효화
  static onNewMessage(senderId: string, recipientId: string, conversationId: string): void {
    // 받는 사람의 받은 메시지함 무효화
    this.invalidateInbox(recipientId)
    
    // 받는 사람의 안읽은 메시지 카운트 무효화
    this.invalidateUnreadCount(recipientId)
    
    // 대화방 캐시 무효화
    this.invalidateConversation(conversationId)
    
    // 양쪽 사용자의 대화방 목록 무효화
    this.invalidateUserConversations(senderId)
    this.invalidateUserConversations(recipientId)
  }
  
  // 메시지 읽음 처리 시 캐시 무효화
  static onMessagesRead(userId: string, conversationId: string): void {
    // 안읽은 메시지 카운트 무효화
    this.invalidateUnreadCount(userId)
    
    // 받은 메시지함 무효화 (읽음 상태 변경)
    this.invalidateInbox(userId)
    
    // 대화방 캐시 무효화 (읽음 상태 변경)
    this.invalidateConversation(conversationId)
  }
  
  // 성능 메트릭 업데이트
  private static updatePerformanceMetrics(isHit: boolean, responseTime: number): void {
    this.performanceMetrics.totalRequests++
    
    if (isHit) {
      this.performanceMetrics.cacheHits++
    } else {
      this.performanceMetrics.cacheMisses++
    }
    
    // 평균 응답 시간 계산 (이동 평균)
    const alpha = 0.1 // 가중치
    this.performanceMetrics.averageResponseTime = 
      (1 - alpha) * this.performanceMetrics.averageResponseTime + alpha * responseTime
    
    // 성능 메트릭 캐시에 저장 (30분마다)
    if (this.performanceMetrics.totalRequests % 100 === 0) {
      HybridCache.set(
        this.CACHE_KEYS.PERFORMANCE_METRICS(),
        { ...this.performanceMetrics, timestamp: Date.now() },
        this.TTL.PERFORMANCE_METRICS
      )
    }
  }
  
  // 성능 메트릭 조회
  static getPerformanceMetrics() {
    const cached = HybridCache.get<typeof this.performanceMetrics>(this.CACHE_KEYS.PERFORMANCE_METRICS())
    return cached || this.performanceMetrics
  }
  
  // 캐시 히트율 계산
  static getCacheHitRate(): number {
    const { cacheHits, totalRequests } = this.performanceMetrics
    return totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0
  }
  
  // 캐시 상태 리포트
  static generateCacheReport() {
    const hitRate = this.getCacheHitRate()
    const metrics = this.getPerformanceMetrics()
    
    return {
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests: metrics.totalRequests,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      averageResponseTime: Math.round(metrics.averageResponseTime * 100) / 100,
      efficiency: hitRate > 80 ? 'Excellent' : hitRate > 60 ? 'Good' : hitRate > 40 ? 'Fair' : 'Poor'
    }
  }
}