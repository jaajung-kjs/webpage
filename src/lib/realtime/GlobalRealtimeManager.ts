/**
 * GlobalRealtimeManager - 실시간 동기화 관리자
 * 
 * 모든 사용자가 같은 정보를 실시간으로 동기화해서 볼 수 있도록 관리
 * 단순화된 버전 - 새로운 subscribe API 사용
 */

import { QueryClient } from '@tanstack/react-query'
import { realtimeCore } from '@/lib/core/realtime-core'

class GlobalRealtimeManager {
  private static instance: GlobalRealtimeManager
  private queryClient: QueryClient | null = null
  private isInitialized = false
  private unsubscribers: Map<string, () => void> = new Map()

  private constructor() {}

  static getInstance(): GlobalRealtimeManager {
    if (!GlobalRealtimeManager.instance) {
      GlobalRealtimeManager.instance = new GlobalRealtimeManager()
    }
    return GlobalRealtimeManager.instance
  }

  setQueryClient(queryClient: QueryClient): void {
    if (this.queryClient !== queryClient) {
      console.log('[GlobalRealtime] Updating QueryClient reference')
      this.queryClient = queryClient
      
      // 재연결 후 QueryClient가 업데이트되면 캐시를 한 번 무효화
      if (this.isInitialized) {
        console.log('[GlobalRealtime] Triggering cache refresh after QueryClient update')
        // 글로벌 쿼리들만 무효화 (메시지 관련 쿼리는 UserMessageSubscriptionManager에서 처리)
        queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
        queryClient.invalidateQueries({ queryKey: ['users_v2'] })
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[GlobalRealtime] Already initialized')
      return
    }

    if (!this.queryClient) {
      throw new Error('[GlobalRealtime] QueryClient not set')
    }

    console.log('[GlobalRealtime] Initializing global subscriptions...')
    
    try {
      // 모든 사용자가 구독하는 테이블들 (메시지 관련 테이블 제외)
      await Promise.all([
        this.subscribeToContentTable(),
        this.subscribeToUsersTable(),
        this.subscribeToCommentsTable(),
        this.subscribeToActivityParticipantsTable(),
        this.subscribeToInteractionsTable()
      ])
      
      this.isInitialized = true
      console.log('[GlobalRealtime] Initialization complete')
    } catch (error) {
      console.error('[GlobalRealtime] Initialization failed:', error)
      throw error
    }
  }

  /**
   * content_v2 테이블 구독 - 모든 콘텐츠 변경사항 실시간 동기화
   */
  private async subscribeToContentTable(): Promise<void> {
    // INSERT 이벤트
    const unsubInsert = await realtimeCore.subscribe(
      'content_v2',
      'INSERT',
      (payload) => {
        console.log('[GlobalRealtime] Content inserted:', payload.new)
        // 콘텐츠 목록 캐시 무효화 - 올바른 키 사용
        this.queryClient?.invalidateQueries({ queryKey: ['contents-v2'], exact: false })
        this.queryClient?.invalidateQueries({ queryKey: ['infinite-contents-v2'], exact: false })
        this.queryClient?.invalidateQueries({ queryKey: ['trending-contents-v2'], exact: false })
      }
    )

    // UPDATE 이벤트
    const unsubUpdate = await realtimeCore.subscribe(
      'content_v2',
      'UPDATE',
      (payload) => {
        console.log('[GlobalRealtime] Content updated:', payload.new?.id)
        // 특정 콘텐츠 및 목록 캐시 무효화 - 올바른 키 사용
        this.queryClient?.invalidateQueries({ queryKey: ['content-v2', payload.new?.id] })
        this.queryClient?.invalidateQueries({ queryKey: ['contents-v2'], exact: false })
        this.queryClient?.invalidateQueries({ queryKey: ['infinite-contents-v2'], exact: false })
      }
    )

    // DELETE 이벤트
    const unsubDelete = await realtimeCore.subscribe(
      'content_v2',
      'DELETE',
      (payload) => {
        console.log('[GlobalRealtime] Content deleted:', payload.old?.id)
        // 콘텐츠 목록 캐시 무효화 - 올바른 키 사용
        this.queryClient?.invalidateQueries({ queryKey: ['contents-v2'], exact: false })
        this.queryClient?.invalidateQueries({ queryKey: ['infinite-contents-v2'], exact: false })
      }
    )

    this.unsubscribers.set('content-insert', unsubInsert)
    this.unsubscribers.set('content-update', unsubUpdate)
    this.unsubscribers.set('content-delete', unsubDelete)
  }

  /**
   * users_v2 테이블 구독 - 사용자 정보 실시간 동기화
   */
  private async subscribeToUsersTable(): Promise<void> {
    const unsubscribe = await realtimeCore.subscribe(
      'users_v2',
      '*',
      (payload) => {
        console.log('[GlobalRealtime] User changed:', payload.new?.id || payload.old?.id)
        // 사용자 관련 캐시 무효화
        const userId = payload.new?.id || payload.old?.id
        if (userId) {
          this.queryClient?.invalidateQueries({ queryKey: ['user', userId] })
          this.queryClient?.invalidateQueries({ queryKey: ['profile', userId] })
        }
      }
    )

    this.unsubscribers.set('users', unsubscribe)
  }

  /**
   * comments_v2 테이블 구독 - 댓글 실시간 동기화
   */
  private async subscribeToCommentsTable(): Promise<void> {
    const unsubscribe = await realtimeCore.subscribe(
      'comments_v2',
      '*',
      (payload) => {
        console.log('[GlobalRealtime] Comment changed')
        // 댓글 관련 캐시 무효화 - 올바른 키 사용
        const contentId = payload.new?.content_id || payload.old?.content_id
        if (contentId) {
          this.queryClient?.invalidateQueries({ queryKey: ['comments-v2', contentId] })
          // 콘텐츠의 댓글 수도 업데이트되어야 함
          this.queryClient?.invalidateQueries({ queryKey: ['content-v2', contentId] })
        }
      }
    )

    this.unsubscribers.set('comments', unsubscribe)
  }

  /**
   * activity_participants_v2 테이블 구독 - 활동 참여 실시간 동기화
   */
  private async subscribeToActivityParticipantsTable(): Promise<void> {
    const unsubscribe = await realtimeCore.subscribe(
      'activity_participants_v2',
      '*',
      (payload) => {
        console.log('[GlobalRealtime] Activity participant changed')
        // 활동 참여 관련 캐시 무효화
        const activityId = payload.new?.activity_id || payload.old?.activity_id
        if (activityId) {
          this.queryClient?.invalidateQueries({ queryKey: ['participants', activityId] })
          this.queryClient?.invalidateQueries({ queryKey: ['activity', activityId] })
        }
      }
    )

    this.unsubscribers.set('participants', unsubscribe)
  }

  /**
   * interactions_v2 테이블 구독 - 좋아요/북마크 실시간 동기화
   */
  private async subscribeToInteractionsTable(): Promise<void> {
    const unsubscribe = await realtimeCore.subscribe(
      'interactions_v2',
      '*',
      (payload) => {
        console.log('[GlobalRealtime] Interaction changed')
        // 상호작용 관련 캐시 무효화 - 올바른 키 사용
        const targetId = payload.new?.target_id || payload.old?.target_id
        if (targetId) {
          this.queryClient?.invalidateQueries({ queryKey: ['interactions-v2', targetId] })
          this.queryClient?.invalidateQueries({ queryKey: ['content-v2', targetId] })
          // 목록에서도 좋아요 수 업데이트 필요
          this.queryClient?.invalidateQueries({ queryKey: ['contents-v2'], exact: false })
        }
      }
    )

    this.unsubscribers.set('interactions', unsubscribe)
  }

  cleanup(): void {
    console.log('[GlobalRealtime] Cleaning up subscriptions...')
    
    // 모든 구독 해제
    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.unsubscribers.clear()
    
    this.isInitialized = false
    console.log('[GlobalRealtime] Cleanup complete')
  }

  // 호환성을 위한 메서드들
  async setupUserSubscriptions(userId: string): Promise<void> {
    console.log(`[GlobalRealtime] User subscriptions for ${userId} (handled separately)`)
  }

  async cleanupUserSubscriptions(): Promise<void> {
    console.log('[GlobalRealtime] User subscriptions cleanup (handled separately)')
  }

  isChannelSubscribed(channelName: string): boolean {
    return this.unsubscribers.has(channelName)
  }

  getSubscriptionMetrics() {
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsByChannel: {},
      errorCount: 0
    }
  }

  getSubscriptionStates() {
    return new Map()
  }
}

export const globalRealtimeManager = GlobalRealtimeManager.getInstance()