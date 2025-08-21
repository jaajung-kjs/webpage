/**
 * GlobalRealtimeManager - 최적화된 실시간 동기화 관리자
 * 
 * Supabase의 channel API를 직접 사용하여 실시간 동기화
 */

import { QueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import type { RealtimeChannel } from '@supabase/supabase-js'

class GlobalRealtimeManager {
  private static instance: GlobalRealtimeManager
  private getQueryClient: (() => QueryClient | null) | null = null
  private isInitialized = false
  private channel: RealtimeChannel | null = null

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
        
        // CHANNEL_ERROR 시 자동 재구독 (자가 치유)
        if (status === 'CHANNEL_ERROR') {
          console.log('[GlobalRealtime] Channel error detected, resubscribing in 1s...')
          setTimeout(() => {
            this.setupGlobalChannel() // 기존 채널 제거하고 다시 구독
          }, 1000) // 1초 후 재시도 (무한 루프 방지)
        }
      })
  }

  cleanup(): void {
    console.log('[GlobalRealtime] Cleaning up subscriptions...')
    
    // 채널 구독 해제
    if (this.channel) {
      supabaseClient().removeChannel(this.channel)
      this.channel = null
    }
    
    this.isInitialized = false
    console.log('[GlobalRealtime] Cleanup complete')
  }
}

export const globalRealtimeManager = GlobalRealtimeManager.getInstance()