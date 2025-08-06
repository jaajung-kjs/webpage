/**
 * Unified Cache Manager
 * 
 * 일관성 있는 캐싱 전략을 위한 통합 캐시 매니저
 * 모든 API 레이어에서 사용할 수 있는 표준화된 캐싱 인터페이스 제공
 */

import { HybridCache, createCacheKey } from './cache'
import { supabase } from '@/lib/supabase/client'
import { realtimeManager } from '@/lib/realtime/RealtimeManager'

// 캐시 구성 타입
export interface CacheConfig {
  ttl: number // Time to live in milliseconds
  staleWhileRevalidate?: boolean // 오래된 데이터를 먼저 반환하고 백그라운드에서 갱신
  invalidateOnMutation?: boolean // 뮤테이션 시 자동 무효화
  realtime?: boolean // 실시간 업데이트 구독
}

// 기본 캐시 설정
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // 콘텐츠 관련
  'content:list': { ttl: 300000, staleWhileRevalidate: true, realtime: true }, // 5분
  'content:detail': { ttl: 600000, staleWhileRevalidate: true, realtime: true }, // 10분
  'content:stats': { ttl: 60000, realtime: true }, // 1분 (조회수 등)
  
  // 사용자 관련
  'user:profile': { ttl: 1800000, staleWhileRevalidate: true, realtime: true }, // 30분
  'user:list': { ttl: 300000, staleWhileRevalidate: true }, // 5분
  'user:stats': { ttl: 300000 }, // 5분
  
  // 메시지 관련
  'message:inbox': { ttl: 300000, realtime: true }, // 5분
  'message:conversation': { ttl: 600000, realtime: true }, // 10분
  'message:unread': { ttl: 60000, realtime: true }, // 1분
  
  // 댓글 관련
  'comment:list': { ttl: 300000, realtime: true }, // 5분
  
  // 인증 관련
  'auth:session': { ttl: 300000 }, // 5분
  'auth:profile': { ttl: 1800000, realtime: true }, // 30분
  
  // 통계 관련
  'stats:dashboard': { ttl: 300000 }, // 5분
  'stats:analytics': { ttl: 600000 }, // 10분
}

// 캐시 관리자 클래스
export class CacheManager {
  private static activeSubscriptions = new Map<string, any>()
  private static revalidationQueue = new Map<string, NodeJS.Timeout>()
  
  // 재검증 콜백 저장소
  private static revalidationCallbacks = new Map<string, () => Promise<void>>()
  
  // 백그라운드 복귀 시 캐시 재검증을 위한 콜백 등록
  static {
    if (typeof window !== 'undefined') {
      (window as any).cacheRevalidationCallback = () => {
        console.log('CacheManager: Background recovery detected, revalidating caches')
        // 만료된 캐시들 재검증
        this.revalidateExpiredCaches()
      }
    }
  }
  
  /**
   * 캐시에서 데이터 가져오기 (stale-while-revalidate 지원)
   */
  static async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    const cacheConfig = { ...CACHE_CONFIGS[key.split(':')[0] + ':' + key.split(':')[1]], ...config }
    const cacheKey = key
    
    // 캐시된 데이터 확인
    const cached = HybridCache.get<{ data: T; timestamp: number }>(cacheKey)
    
    if (cached) {
      const age = Date.now() - cached.timestamp
      const isStale = age > cacheConfig.ttl
      
      // stale-while-revalidate 전략
      if (cacheConfig.staleWhileRevalidate && isStale) {
        // 오래된 데이터를 먼저 반환하고 백그라운드에서 갱신
        this.scheduleRevalidation(cacheKey, fetcher, cacheConfig)
        return cached.data
      }
      
      // 아직 유효한 캐시
      if (!isStale) {
        return cached.data
      }
    }
    
    // 캐시 미스 또는 만료 - 새로 가져오기
    try {
      const data = await fetcher()
      this.set(cacheKey, data, cacheConfig)
      return data
    } catch (error) {
      // 에러 발생 시 오래된 캐시라도 반환
      if (cached) {
        console.warn('Fetcher failed, returning stale cache:', error instanceof Error ? error.message : JSON.stringify(error))
        return cached.data
      }
      throw error
    }
  }
  
  /**
   * 캐시에 데이터 저장
   */
  static set<T>(key: string, data: T, config?: Partial<CacheConfig>): void {
    const cacheConfig = { ...CACHE_CONFIGS[key.split(':')[0] + ':' + key.split(':')[1]], ...config }
    
    HybridCache.set(key, {
      data,
      timestamp: Date.now()
    }, cacheConfig.ttl)
    
    // 실시간 업데이트 구독 설정
    if (cacheConfig.realtime) {
      this.setupRealtimeSubscription(key, cacheConfig)
    }
  }
  
  /**
   * 캐시 무효화
   */
  static invalidate(pattern?: string): void {
    if (pattern) {
      HybridCache.invalidate(pattern)
      
      // 관련 실시간 구독 정리
      Array.from(this.activeSubscriptions.keys()).forEach(key => {
        if (key.includes(pattern)) {
          const subscription = this.activeSubscriptions.get(key)
          if (subscription && subscription.unsubscribe) {
            subscription.unsubscribe()
            this.activeSubscriptions.delete(key)
          }
        }
      })
    } else {
      HybridCache.invalidate()
      
      // 모든 실시간 구독 정리
      this.activeSubscriptions.forEach(subscription => {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe()
        }
      })
      this.activeSubscriptions.clear()
    }
    
    // 재검증 큐 정리
    Array.from(this.revalidationQueue.keys()).forEach(key => {
      if (!pattern || key.includes(pattern)) {
        const timeout = this.revalidationQueue.get(key)
        if (timeout) {
          clearTimeout(timeout)
          this.revalidationQueue.delete(key)
        }
      }
    })
  }
  
  /**
   * 백그라운드 재검증 스케줄링
   */
  private static scheduleRevalidation<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): void {
    // 이미 재검증이 예약되어 있으면 중복 방지
    if (this.revalidationQueue.has(key)) {
      return
    }
    
    // 즉시 백그라운드에서 재검증 시작
    const timeout = setTimeout(async () => {
      try {
        const data = await fetcher()
        this.set(key, data, config)
      } catch (error) {
        console.error('Background revalidation failed:', error instanceof Error ? error.message : JSON.stringify(error))
      } finally {
        this.revalidationQueue.delete(key)
      }
    }, 0)
    
    this.revalidationQueue.set(key, timeout)
  }
  
  /**
   * 실시간 업데이트 구독 설정
   */
  private static setupRealtimeSubscription(key: string, config: CacheConfig): void {
    // 이미 구독 중이면 스킵
    if (this.activeSubscriptions.has(key)) {
      return
    }
    
    const [domain, type] = key.split(':')
    
    // 도메인별 실시간 구독 설정
    switch (domain) {
      case 'content':
        this.subscribeToContent(key, type)
        break
      case 'message':
        this.subscribeToMessages(key, type)
        break
      case 'comment':
        this.subscribeToComments(key, type)
        break
      case 'user':
      case 'auth':
        this.subscribeToProfile(key, type)
        break
    }
  }
  
  /**
   * 콘텐츠 실시간 구독
   */
  private static subscribeToContent(key: string, type: string): void {
    const unsubscribe = realtimeManager.subscribe({
      name: `cache_${key}`,
      table: 'content',
      event: '*',
      callback: () => {
        // 캐시 무효화
        this.invalidate(key)
      }
    })
    
    this.activeSubscriptions.set(key, { unsubscribe })
  }
  
  /**
   * 메시지 실시간 구독
   */
  private static subscribeToMessages(key: string, type: string): void {
    const unsubscribe = realtimeManager.subscribe({
      name: `cache_${key}`,
      table: 'messages',
      event: '*',
      callback: () => {
        // 메시지 관련 캐시 무효화
        this.invalidate('message:')
      }
    })
    
    this.activeSubscriptions.set(key, { unsubscribe })
  }
  
  /**
   * 댓글 실시간 구독
   */
  private static subscribeToComments(key: string, type: string): void {
    const unsubscribe = realtimeManager.subscribe({
      name: `cache_${key}`,
      table: 'comments',
      event: '*',
      callback: () => {
        // 댓글 캐시 무효화
        this.invalidate(key)
      }
    })
    
    this.activeSubscriptions.set(key, { unsubscribe })
  }
  
  /**
   * 프로필 실시간 구독
   */
  private static subscribeToProfile(key: string, type: string): void {
    const unsubscribe = realtimeManager.subscribe({
      name: `cache_${key}`,
      table: 'users',
      event: '*',
      callback: () => {
        // 사용자 관련 캐시 무효화
        this.invalidate('user:')
        this.invalidate('auth:')
      }
    })
    
    this.activeSubscriptions.set(key, { unsubscribe })
  }
  
  /**
   * 재검증 콜백 등록
   */
  static registerRevalidationCallback(key: string, callback: () => Promise<void>): void {
    this.revalidationCallbacks.set(key, callback)
  }
  
  /**
   * 재검증 콜백 제거
   */
  static unregisterRevalidationCallback(key: string): void {
    this.revalidationCallbacks.delete(key)
  }
  
  /**
   * 성능 메트릭 수집
   */
  static getMetrics() {
    return {
      activeSubscriptions: this.activeSubscriptions.size,
      pendingRevalidations: this.revalidationQueue.size,
      revalidationCallbacks: this.revalidationCallbacks.size,
      cacheSize: 0 // HybridCache doesn't expose size information
    }
  }
  
  /**
   * 만료된 캐시 재검증 (백그라운드 복귀 시 호출)
   */
  private static async revalidateExpiredCaches(): Promise<void> {
    console.log('CacheManager: Starting cache revalidation after background recovery')
    
    // 모든 등록된 재검증 콜백 실행
    const revalidationPromises: Promise<void>[] = []
    
    for (const [key, callback] of this.revalidationCallbacks) {
      console.log(`CacheManager: Triggering revalidation for: ${key}`)
      
      // 비동기로 재검증 실행 (에러가 나도 다른 재검증은 계속)
      const promise = callback().catch(error => {
        console.error(`CacheManager: Revalidation failed for ${key}:`, error)
      })
      
      revalidationPromises.push(promise)
    }
    
    // 모든 재검증이 완료될 때까지 대기
    if (revalidationPromises.length > 0) {
      await Promise.allSettled(revalidationPromises)
      console.log(`CacheManager: Completed ${revalidationPromises.length} revalidations`)
    }
    
    // 추가로 활성 구독들에 대해서도 캐시 확인
    for (const [key, subscription] of this.activeSubscriptions) {
      const [domain, type] = key.split(':')
      const config = CACHE_CONFIGS[`${domain}:${type}`]
      
      if (config && config.staleWhileRevalidate) {
        // stale-while-revalidate가 활성화된 캐시들 재검증
        const cached = HybridCache.get<any>(key)
        if (cached) {
          const age = Date.now() - (cached.timestamp || 0)
          if (age > config.ttl) {
            console.log(`CacheManager: Cache expired, invalidating: ${key}`)
            // 캐시 무효화
            this.invalidate(key)
          }
        }
      }
    }
  }
}

// 캐시 헬퍼 함수들
export function getCacheKey(domain: string, type: string, ...params: (string | number)[]): string {
  return createCacheKey(domain, type, ...params)
}

export function invalidateCache(pattern?: string): void {
  CacheManager.invalidate(pattern)
}

// React Query 스타일의 캐시 훅을 위한 유틸리티
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: Partial<CacheConfig>
): Promise<T> {
  return CacheManager.get(key, fetcher, options)
}