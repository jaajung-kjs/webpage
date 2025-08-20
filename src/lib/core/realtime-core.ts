/**
 * RealtimeCore - 단순화된 실시간 구독 관리
 */

import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { connectionCore } from './connection-core'
import type { Database } from '../database.types'

interface SubscriptionInfo {
  table: string
  event: string
  filter?: string
  handler: (payload: any) => void
}

/**
 * 단순화된 RealtimeCore (150줄 이하)
 */
export class RealtimeCore {
  private static instance: RealtimeCore
  private client: SupabaseClient<Database>
  private channels: Map<string, RealtimeChannel>
  private subscriptions: Map<string, SubscriptionInfo>
  private isReady: boolean = false
  private isInitialized: boolean = false
  private unsubscribeFromConnectionCore: (() => void) | null = null

  private constructor() {
    this.client = connectionCore.getClient()
    this.channels = new Map()
    this.subscriptions = new Map()
    // initialize는 getInstance에서 한 번만 호출됨
  }

  static getInstance(): RealtimeCore {
    if (!RealtimeCore.instance) {
      RealtimeCore.instance = new RealtimeCore()
      RealtimeCore.instance.initialize() // 생성 후 한 번만 초기화
    }
    return RealtimeCore.instance
  }

  private initialize(): void {
    if (this.isInitialized) {
      console.log('[RealtimeCore] Already initialized, skipping')
      return
    }

    // 이전 리스너 정리 (혹시나)
    if (this.unsubscribeFromConnectionCore) {
      this.unsubscribeFromConnectionCore()
    }

    // 클라이언트가 재생성되면 자동으로 재구독
    this.unsubscribeFromConnectionCore = connectionCore.onClientChange((newClient) => {
      console.log('[RealtimeCore] Client changed, resubscribing all...')
      this.handleClientChange(newClient)
    })

    // 초기 ready 상태 설정
    this.isReady = true
    this.isInitialized = true
    console.log('[RealtimeCore] Initialized and ready')
  }

  private async handleClientChange(newClient: SupabaseClient<Database>): Promise<void> {
    // 클라이언트가 실제로 변경되었는지 확인
    if (this.client === newClient) {
      console.log('[RealtimeCore] Same client instance, skipping')
      return
    }
    
    console.log('[RealtimeCore] Client changed, updating reference')
    
    // 새 클라이언트로 교체만 하고 Supabase가 자동으로 재연결 처리
    this.client = newClient
    
    // Supabase Realtime이 자동으로 채널을 복구하므로 수동 재구독 불필요
  }

  private cleanupAllChannels(): void {
    console.log(`[RealtimeCore] Cleaning up ${this.channels.size} channels`)
    
    this.channels.forEach((channel, key) => {
      try {
        channel.unsubscribe()
        if (this.client && this.client.removeChannel) {
          this.client.removeChannel(channel)
        }
      } catch (error) {
        console.warn(`[RealtimeCore] Error unsubscribing ${key}:`, error)
      }
    })
    
    this.channels.clear()
  }

  private async createSubscription(key: string, info: SubscriptionInfo): Promise<boolean> {
    return new Promise((resolve) => {
      let subscribed = false
      
      // 고정 채널명 사용 - Supabase가 자동으로 재사용/관리
      const channelName = key
      
      const channel = this.client
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          {
            event: info.event,
            schema: 'public',
            table: info.table,
            filter: info.filter
          },
          info.handler
        )
        .subscribe((status) => {
          if (subscribed) return // 이미 처리됨
          
          console.log(`[RealtimeCore] Channel ${key} status: ${status}`)
          
          if (status === 'SUBSCRIBED') {
            console.log(`[RealtimeCore] Successfully subscribed to ${key}`)
            this.channels.set(key, channel) // 원래 key로 저장
            subscribed = true
            resolve(true)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[RealtimeCore] Failed to subscribe to ${key}: ${status}`)
            // 실패한 채널은 저장하지 않음
            channel.unsubscribe()
            subscribed = true
            resolve(false)
          }
        })
      
      // 5초 타임아웃
      setTimeout(() => {
        if (!subscribed) {
          console.warn(`[RealtimeCore] Subscription timeout for ${key}`)
          channel.unsubscribe()
          subscribed = true
          resolve(false)
        }
      }, 5000)
    })
  }


  /**
   * 구독 추가
   */
  async subscribe(
    table: string,
    event: string = '*',
    handler: (payload: any) => void,
    filter?: string
  ): Promise<() => void> {
    const key = `${table}-${event}-${filter || 'all'}`
    
    // 이미 구독 중이면 스킵
    if (this.subscriptions.has(key)) {
      console.log(`[RealtimeCore] Already subscribed to ${key}`)
      return () => this.unsubscribe(key)
    }

    const info: SubscriptionInfo = { table, event, filter, handler }
    this.subscriptions.set(key, info)

    // 즉시 구독 생성
    if (this.isReady) {
      const success = await this.createSubscription(key, info)
      if (!success) {
        console.warn(`[RealtimeCore] Initial subscription failed for ${key}`)
      }
    }

    // 구독 해제 함수 반환
    return () => this.unsubscribe(key)
  }

  /**
   * 구독 해제
   */
  private unsubscribe(key: string): void {
    const channel = this.channels.get(key)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(key)
    }
    this.subscriptions.delete(key)
    console.log(`[RealtimeCore] Unsubscribed from ${key}`)
  }

  /**
   * 모든 구독 해제
   */
  cleanup(): void {
    this.cleanupAllChannels()
    this.subscriptions.clear()
    
    // ConnectionCore 리스너 정리
    if (this.unsubscribeFromConnectionCore) {
      this.unsubscribeFromConnectionCore()
      this.unsubscribeFromConnectionCore = null
    }
    
    this.isInitialized = false
    this.isReady = false
    console.log('[RealtimeCore] All subscriptions and listeners cleaned up')
  }


  getStatus(): { isReady: boolean; subscriptionCount: number } {
    return {
      isReady: this.isReady,
      subscriptionCount: this.subscriptions.size
    }
  }
}

export const realtimeCore = RealtimeCore.getInstance()