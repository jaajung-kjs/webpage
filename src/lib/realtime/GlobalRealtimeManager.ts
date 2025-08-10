/**
 * GlobalRealtimeManager - 전역 실시간 데이터 동기화 관리자
 * 
 * 목적:
 * - Supabase Realtime 구독을 중앙에서 관리
 * - React Query 캐시 자동 업데이트
 * - 모든 사용자에게 실시간 데이터 동기화
 */

import { RealtimeChannel } from '@supabase/supabase-js'
import { QueryClient } from '@tanstack/react-query'
import { connectionCore } from '@/lib/core/connection-core'

// Realtime 이벤트 페이로드 타입
interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, any>
  old: Record<string, any> | null
  commit_timestamp?: string
  errors?: string[] | null
  schema?: string
  table?: string
}

export class GlobalRealtimeManager {
  private static instance: GlobalRealtimeManager
  private queryClient: QueryClient | null = null
  private channels: Map<string, RealtimeChannel> = new Map()
  private isInitialized = false
  
  private constructor() {
    console.log('[GlobalRealtime] Manager created')
  }
  
  static getInstance(): GlobalRealtimeManager {
    if (!GlobalRealtimeManager.instance) {
      GlobalRealtimeManager.instance = new GlobalRealtimeManager()
    }
    return GlobalRealtimeManager.instance
  }
  
  /**
   * QueryClient 설정
   */
  setQueryClient(client: QueryClient) {
    this.queryClient = client
    console.log('[GlobalRealtime] QueryClient set')
  }
  
  /**
   * 전역 구독 초기화
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[GlobalRealtime] Already initialized')
      return
    }
    
    if (!this.queryClient) {
      console.error('[GlobalRealtime] QueryClient not set')
      return
    }
    
    console.log('[GlobalRealtime] Initializing global subscriptions...')
    
    try {
      // content_v2 테이블 구독
      await this.subscribeToContentTable()
      
      // users_v2 테이블 구독
      await this.subscribeToUsersTable()
      
      // comments_v2 테이블 구독 (프로필 대신)
      await this.subscribeToCommentsTable()
      
      // activity_participants_v2 테이블 구독
      await this.subscribeToActivityParticipantsTable()
      
      this.isInitialized = true
      console.log('[GlobalRealtime] ✅ All subscriptions initialized successfully')
    } catch (error) {
      console.error('[GlobalRealtime] ❌ Failed to initialize subscriptions:', error)
      this.isInitialized = false
    }
  }
  
  /**
   * content_v2 테이블 구독
   */
  private async subscribeToContentTable() {
    const client = connectionCore.getClient()
    const channel = client
      .channel('content_v2_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_v2'
        },
        (payload) => {
          console.log('[GlobalRealtime] 🆕 Content INSERT event received:', payload)
          this.handleContentInsert(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_v2'
        },
        (payload) => {
          console.log('[GlobalRealtime] 🔄 Content UPDATE event received:', payload)
          this.handleContentUpdate(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'content_v2'
        },
        (payload) => {
          console.log('[GlobalRealtime] 🗑️ Content DELETE event received:', payload)
          this.handleContentDelete(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[GlobalRealtime] ✅ Successfully subscribed to content_v2')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[GlobalRealtime] ❌ Failed to subscribe to content_v2')
        } else if (status === 'TIMED_OUT') {
          console.error('[GlobalRealtime] ⏱️ Subscription to content_v2 timed out')
        } else {
          console.log('[GlobalRealtime] content_v2 subscription status:', status)
        }
      })
    
    this.channels.set('content_v2', channel)
    
    // 구독 상태 확인을 위해 짧게 대기
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  /**
   * users_v2 테이블 구독
   */
  private async subscribeToUsersTable() {
    const client = connectionCore.getClient()
    const channel = client
      .channel('users_v2_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users_v2'
        },
        (payload) => {
          console.log('[GlobalRealtime] 👤 User event received:', payload.eventType)
          this.handleUsersChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[GlobalRealtime] ✅ Successfully subscribed to users_v2')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[GlobalRealtime] ❌ Failed to subscribe to users_v2')
        }
      })
    
    this.channels.set('users_v2', channel)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  /**
   * comments_v2 테이블 구독
   */
  private async subscribeToCommentsTable() {
    const client = connectionCore.getClient()
    const channel = client
      .channel('comments_v2_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments_v2'
        },
        (payload) => {
          console.log('[GlobalRealtime] 💬 Comment event received:', payload.eventType)
          this.handleCommentsChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[GlobalRealtime] ✅ Successfully subscribed to comments_v2')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[GlobalRealtime] ❌ Failed to subscribe to comments_v2')
        }
      })
    
    this.channels.set('comments_v2', channel)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  /**
   * 콘텐츠 INSERT 처리
   */
  private handleContentInsert(payload: any) {
    console.log('[GlobalRealtime] ✨ Processing content INSERT')
    console.log('[GlobalRealtime] INSERT payload:', {
      id: payload.new?.id,
      type: payload.new?.content_type,
      title: payload.new?.title,
      author: payload.new?.author_id,
      timestamp: payload.commit_timestamp
    })
    
    if (!this.queryClient) {
      console.error('[GlobalRealtime] ❌ QueryClient not available')
      return
    }
    
    // 캐시 무효화 전 상태 확인
    const beforeQueries = this.queryClient.getQueryCache().findAll({ 
      queryKey: ['contents-v2'],
      exact: false 
    })
    console.log('[GlobalRealtime] 📊 Before invalidation - Active content queries:', beforeQueries.length)
    
    // 모든 contents-v2 쿼리 무효화 (새 데이터 가져오기)
    const invalidatedContents = this.queryClient.invalidateQueries({
      queryKey: ['contents-v2'],
      exact: false
    })
    
    // 트렌딩 콘텐츠도 업데이트
    const invalidatedTrending = this.queryClient.invalidateQueries({
      queryKey: ['trending-contents-v2'],
      exact: false
    })
    
    // 무한 스크롤 쿼리도 무효화
    const invalidatedInfinite = this.queryClient.invalidateQueries({
      queryKey: ['infinite-contents-v2'],
      exact: false
    })
    
    // 캐시 무효화 후 상태 확인
    const afterQueries = this.queryClient.getQueryCache().findAll({ 
      queryKey: ['contents-v2'],
      exact: false 
    })
    
    console.log('[GlobalRealtime] ✅ Cache invalidation complete:', {
      contents: 'invalidated',
      trending: 'invalidated', 
      infinite: 'invalidated',
      activeQueries: afterQueries.length,
      newContentId: payload.new?.id
    })
    
    // 즉시 강제 refetch 시도
    console.log('[GlobalRealtime] 🔄 Attempting immediate refetch')
    const refetchPromise = this.queryClient.refetchQueries({
      queryKey: ['contents-v2'],
      exact: false,
      type: 'active'
    })
    
    // 추가적으로 약간의 지연 후에도 다시 시도 (네트워크 지연 대비)
    setTimeout(() => {
      console.log('[GlobalRealtime] 🔄 Secondary refetch after 50ms')
      if (this.queryClient) {
        this.queryClient.refetchQueries({
          queryKey: ['contents-v2'],
          exact: false,
          type: 'active'
        })
      }
    }, 50)
  }
  
  /**
   * 콘텐츠 UPDATE 처리
   */
  private handleContentUpdate(payload: any) {
    console.log('[GlobalRealtime] Content updated:', payload.new?.id)
    
    if (!this.queryClient) return
    
    // 특정 콘텐츠 캐시 업데이트
    if (payload.new?.id) {
      this.queryClient.invalidateQueries({
        queryKey: ['content-v2', payload.new.id],
        exact: true
      })
    }
    
    // 목록도 업데이트
    this.queryClient.invalidateQueries({
      queryKey: ['contents-v2'],
      exact: false
    })
  }
  
  /**
   * 콘텐츠 DELETE 처리
   */
  private handleContentDelete(payload: any) {
    console.log('[GlobalRealtime] Content deleted:', payload.old?.id)
    
    if (!this.queryClient) return
    
    // 삭제된 콘텐츠 캐시 제거
    if (payload.old?.id) {
      this.queryClient.removeQueries({
        queryKey: ['content-v2', payload.old.id],
        exact: true
      })
    }
    
    // 목록 업데이트
    this.queryClient.invalidateQueries({
      queryKey: ['contents-v2'],
      exact: false
    })
  }
  
  // 사용자 변경 처리를 위한 debounce 타이머
  private userUpdateTimeout: NodeJS.Timeout | null = null
  
  /**
   * 사용자 변경 처리 (강화된 필터링 및 debounced)
   */
  private handleUsersChange(payload: any) {
    console.log('[GlobalRealtime] User changed:', payload.eventType, 'User ID:', payload.new?.id)
    
    if (!this.queryClient) return
    
    // 🚨 강화된 필터링: Supabase 내장 heartbeat 감지 및 차단
    const newData = payload.new || {}
    const oldData = payload.old || {}
    
    // Supabase 내장 heartbeat으로 인한 단순 updated_at 변경 감지
    const isHeartbeatUpdate = (
      // updated_at만 변경되고 다른 중요 필드는 동일
      newData.updated_at !== oldData.updated_at &&
      newData.last_seen_at === oldData.last_seen_at &&
      newData.last_login_at === oldData.last_login_at &&
      newData.activity_score === oldData.activity_score &&
      newData.name === oldData.name &&
      newData.role === oldData.role &&
      newData.department === oldData.department
    )
    
    // 메시지 읽음 처리와 관련된 자동 업데이트 감지  
    const isMessageReadUpdate = payload.new?.last_seen_at !== undefined
    const isActivityScoreUpdate = payload.new?.activity_score !== undefined
    const isOnlyUpdatedAt = payload.new && Object.keys(payload.new).length <= 2 && payload.new.updated_at !== undefined
    
    // 🔥 핵심 수정: Heartbeat 업데이트는 완전히 무시
    if (isHeartbeatUpdate) {
      console.log('[GlobalRealtime] 🚫 Ignoring Supabase heartbeat update for user:', payload.new?.id)
      return // 즉시 리턴하여 아무 처리도 하지 않음
    }
    
    // 메시지 관련 자동 업데이트는 더 강한 debounce 적용 (1초)
    if (isMessageReadUpdate || isActivityScoreUpdate || isOnlyUpdatedAt) {
      console.log('[GlobalRealtime] Auto-update detected, debouncing user queries')
      
      if (this.userUpdateTimeout) {
        clearTimeout(this.userUpdateTimeout)
      }
      
      // 메시지 읽음 관련 업데이트는 1초 debounce (더 보수적)
      this.userUpdateTimeout = setTimeout(() => {
        console.log('[GlobalRealtime] Executing debounced user queries invalidation')
        this.invalidateUserQueries()
      }, 1000)
    } else {
      // 실제 프로필 변경 등은 즉시 처리
      console.log('[GlobalRealtime] Profile change detected, immediate invalidation')
      this.invalidateUserQueries()
    }
  }
  
  /**
   * 사용자 관련 쿼리 무효화 (공통 로직)
   */
  private invalidateUserQueries() {
    if (!this.queryClient) return
    
    // 사용자 관련 쿼리 무효화
    this.queryClient.invalidateQueries({
      queryKey: ['users-v2'],
      exact: false
    })
    
    // 회원 목록 업데이트
    this.queryClient.invalidateQueries({
      queryKey: ['members'],
      exact: false
    })
  }
  
  /**
   * 댓글 변경 처리
   */
  private handleCommentsChange(payload: any) {
    console.log('[GlobalRealtime] Comment changed:', payload.eventType, payload.new?.id)
    
    if (!this.queryClient) return
    
    // 댓글 관련 쿼리 무효화
    this.queryClient.invalidateQueries({
      queryKey: ['comments-v2'],
      exact: false
    })
    
    // 콘텐츠 목록도 업데이트 (댓글 수 표시를 위해)
    if (payload.new?.content_id) {
      this.queryClient.invalidateQueries({
        queryKey: ['content-v2', payload.new.content_id],
        exact: true
      })
      
      this.queryClient.invalidateQueries({
        queryKey: ['contents-v2'],
        exact: false
      })
    }
  }
  
  /**
   * activity_participants_v2 테이블 구독
   */
  private async subscribeToActivityParticipantsTable() {
    const client = connectionCore.getClient()
    const channel = client
      .channel('activity_participants_v2_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_participants_v2'
        },
        (payload) => {
          console.log('[GlobalRealtime] 🎯 Activity participant event received:', payload.eventType)
          this.handleActivityParticipantsChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[GlobalRealtime] ✅ Successfully subscribed to activity_participants_v2')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[GlobalRealtime] ❌ Failed to subscribe to activity_participants_v2')
        }
      })
    
    this.channels.set('activity_participants_v2', channel)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  /**
   * 활동 참가자 변경 처리
   */
  private handleActivityParticipantsChange(payload: any) {
    console.log('[GlobalRealtime] Activity participant changed:', payload.eventType, payload.new)
    
    if (!this.queryClient) return
    
    // 활동 관련 쿼리 무효화
    if (payload.new?.activity_id || payload.old?.activity_id) {
      const activityId = payload.new?.activity_id || payload.old?.activity_id
      
      // 특정 활동 정보 업데이트
      this.queryClient.invalidateQueries({
        queryKey: ['activity-v2', activityId],
        exact: true
      })
      
      // 활동 참가자 목록 업데이트
      this.queryClient.invalidateQueries({
        queryKey: ['activity-participants-v2', activityId],
        exact: false
      })
      
      // 활동 통계 업데이트
      this.queryClient.invalidateQueries({
        queryKey: ['activity-stats-v2', activityId],
        exact: false
      })
      
      // 사용자의 참가 상태 업데이트
      if (payload.new?.user_id || payload.old?.user_id) {
        const userId = payload.new?.user_id || payload.old?.user_id
        this.queryClient.invalidateQueries({
          queryKey: ['my-participation-v2', userId, activityId],
          exact: true
        })
        
        // 사용자의 활동 이력 업데이트
        this.queryClient.invalidateQueries({
          queryKey: ['my-activity-history-v2', userId],
          exact: false
        })
      }
    }
    
    // 활동 목록 업데이트 (참가자 수 때문에)
    this.queryClient.invalidateQueries({
      queryKey: ['activities-v2'],
      exact: false
    })
    
    this.queryClient.invalidateQueries({
      queryKey: ['upcoming-activities-v2'],
      exact: false
    })
  }
  
  /**
   * 정리
   */
  cleanup() {
    const client = connectionCore.getClient()
    
    // debounce 타이머 정리
    if (this.userUpdateTimeout) {
      clearTimeout(this.userUpdateTimeout)
      this.userUpdateTimeout = null
    }
    
    this.channels.forEach((channel, name) => {
      console.log(`[GlobalRealtime] Unsubscribing from ${name}`)
      client.removeChannel(channel)
    })
    
    this.channels.clear()
    this.isInitialized = false
    console.log('[GlobalRealtime] Cleanup complete')
  }
}

// 싱글톤 인스턴스 export
export const globalRealtimeManager = GlobalRealtimeManager.getInstance()