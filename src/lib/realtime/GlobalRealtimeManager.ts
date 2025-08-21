/**
 * GlobalRealtimeManager - 최적화된 실시간 동기화 관리자
 * 
 * Supabase의 channel API를 직접 사용하여 실시간 동기화
 */

import { QueryClient } from '@tanstack/react-query'
import { supabaseClient, connectionCore } from '@/lib/core/connection-core'
import type { RealtimeChannel } from '@supabase/supabase-js'

class GlobalRealtimeManager {
  private static instance: GlobalRealtimeManager
  private getQueryClient: (() => QueryClient | null) | null = null
  private isInitialized = false
  private channel: RealtimeChannel | null = null
  private retryCount = 0
  private maxRetries = 5
  private retryTimeoutId: NodeJS.Timeout | null = null
  private unsubscribeConnectionChange: (() => void) | null = null

  private constructor() {}

  static getInstance(): GlobalRealtimeManager {
    if (!GlobalRealtimeManager.instance) {
      GlobalRealtimeManager.instance = new GlobalRealtimeManager()
    }
    return GlobalRealtimeManager.instance
  }

  // QueryClient를 저장하지 않고 getter 함수만 저장
  setQueryClientGetter(getter: () => QueryClient | null): void {
    console.log('[GlobalRealtime] Setting QueryClient getter')
    this.getQueryClient = getter
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[GlobalRealtime] Already initialized')
      return
    }

    if (!this.getQueryClient) {
      throw new Error('[GlobalRealtime] QueryClient getter not set')
    }

    console.log('[GlobalRealtime] Initializing global subscriptions...')
    
    try {
      // 단일 채널로 모든 글로벌 구독 통합
      this.setupGlobalChannel()
      
      // TOKEN_REFRESHED 이벤트 리스닝 (재연결 시 채널 재구독)
      this.unsubscribeConnectionChange = connectionCore.onClientChange(() => {
        console.log('[GlobalRealtime] Connection refreshed, resubscribing channel...')
        this.retryCount = 0 // 재연결 시 재시도 카운터 리셋
        this.setupGlobalChannel()
      })
      
      this.isInitialized = true
      console.log('[GlobalRealtime] Initialization complete')
    } catch (error) {
      console.error('[GlobalRealtime] Initialization failed:', error)
      throw error
    }
  }

  private setupGlobalChannel(): void {
    // 기존 채널이 있으면 정리
    if (this.channel) {
      console.log('[GlobalRealtime] Cleaning up existing channel')
      supabaseClient().removeChannel(this.channel)
      this.channel = null
    }

    // Supabase channel API 직접 사용
    this.channel = supabaseClient()
      .channel('global-realtime')
      // content_v2 구독
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_v2'
      }, (payload: any) => {
        console.log('[GlobalRealtime] Content changed:', payload.eventType)
        const queryClient = this.getQueryClient?.()
        queryClient?.invalidateQueries({ queryKey: ['contents-v2'], exact: false })
        queryClient?.invalidateQueries({ queryKey: ['content-v2', payload.new?.id || payload.old?.id] })
      })
      // users_v2 구독
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users_v2'
      }, (payload: any) => {
        const userId = payload.new?.id || payload.old?.id
        if (userId) {
          this.getQueryClient?.()?.invalidateQueries({ queryKey: ['user', userId] })
          this.getQueryClient?.()?.invalidateQueries({ queryKey: ['profile', userId] })
        }
      })
      // comments_v2 구독
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments_v2'
      }, (payload: any) => {
        const contentId = payload.new?.content_id || payload.old?.content_id
        if (contentId) {
          this.getQueryClient?.()?.invalidateQueries({ queryKey: ['comments-v2', contentId] })
        }
      })
      // activity_participants_v2 구독
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activity_participants_v2'
      }, (payload: any) => {
        const activityId = payload.new?.activity_id || payload.old?.activity_id
        if (activityId) {
          this.getQueryClient?.()?.invalidateQueries({ queryKey: ['participants', activityId] })
        }
      })
      // interactions_v2 구독
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interactions_v2'
      }, (payload: any) => {
        const targetId = payload.new?.target_id || payload.old?.target_id
        if (targetId) {
          this.getQueryClient?.()?.invalidateQueries({ queryKey: ['interactions-v2', targetId] })
          this.getQueryClient?.()?.invalidateQueries({ queryKey: ['content-v2', targetId] })
        }
      })
      .subscribe((status) => {
        console.log('[GlobalRealtime] Channel status:', status)
        
        // CHANNEL_ERROR 시 자동 재구독 (지수 백오프)
        if (status === 'CHANNEL_ERROR') {
          // 이전 재시도 타이머 취소
          if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId)
            this.retryTimeoutId = null
          }
          
          if (this.retryCount < this.maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000) // 최대 30초
            this.retryCount++
            console.log(`[GlobalRealtime] Channel error detected, retry ${this.retryCount}/${this.maxRetries} in ${delay}ms...`)
            
            this.retryTimeoutId = setTimeout(() => {
              this.setupGlobalChannel() // 기존 채널 제거하고 다시 구독
              this.retryTimeoutId = null
            }, delay)
          } else {
            console.error('[GlobalRealtime] Max retries reached, waiting for token refresh...')
          }
        } else if (status === 'SUBSCRIBED') {
          // 성공적으로 구독되면 재시도 카운터 리셋
          console.log('[GlobalRealtime] Successfully subscribed')
          this.retryCount = 0
        }
      })
  }

  cleanup(): void {
    console.log('[GlobalRealtime] Cleaning up subscriptions...')
    
    // 재시도 타이머 정리
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
      this.retryTimeoutId = null
    }
    
    // 채널 구독 해제
    if (this.channel) {
      supabaseClient().removeChannel(this.channel)
      this.channel = null
    }
    
    // ConnectionCore 리스너 해제
    if (this.unsubscribeConnectionChange) {
      this.unsubscribeConnectionChange()
      this.unsubscribeConnectionChange = null
    }
    
    this.retryCount = 0
    this.isInitialized = false
    console.log('[GlobalRealtime] Cleanup complete')
  }
}

export const globalRealtimeManager = GlobalRealtimeManager.getInstance()