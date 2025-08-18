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

  private constructor() {
    this.client = connectionCore.getClient()
    this.channels = new Map()
    this.subscriptions = new Map()
    this.initialize()
  }

  static getInstance(): RealtimeCore {
    if (!RealtimeCore.instance) {
      RealtimeCore.instance = new RealtimeCore()
    }
    return RealtimeCore.instance
  }

  private initialize(): void {
    // 클라이언트가 재생성되면 자동으로 재구독
    connectionCore.onClientChange((newClient) => {
      console.log('[RealtimeCore] Client changed, resubscribing all...')
      this.handleClientChange(newClient)
    })

    // 초기 ready 상태 설정
    this.isReady = true
    console.log('[RealtimeCore] Initialized and ready')
  }

  private async handleClientChange(newClient: SupabaseClient<Database>): Promise<void> {
    // 기존 채널 완전 정리
    this.cleanupAllChannels()
    
    // 잠시 대기하여 정리 완료 보장
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 새 클라이언트로 교체
    this.client = newClient
    
    // WebSocket 연결 대기
    await this.waitForConnection()
    
    // React Query 캐시 정리 (선택적)
    // 너무 자주 발생하면 사용자 경험이 나빠질 수 있으므로 제한적으로 사용
    if (this.subscriptions.size > 0) {
      console.log('[RealtimeCore] Keeping cache, will refresh on resubscribe')
    }
    
    // 모든 구독 재생성
    await this.resubscribeAll()
  }
  
  private async waitForConnection(): Promise<void> {
    console.log('[RealtimeCore] Waiting for WebSocket connection...')
    
    // Realtime 인스턴스가 준비될 때까지 대기
    let attempts = 0
    const maxAttempts = 30 // 최대 15초 대기 (500ms * 30)
    
    while (attempts < maxAttempts) {
      if (this.client.realtime) {
        // WebSocket 상태 확인
        const state = this.client.realtime.isConnected()
        
        if (state) {
          console.log('[RealtimeCore] WebSocket connected')
          return
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
    }
    
    console.warn('[RealtimeCore] WebSocket connection timeout, proceeding anyway')
  }

  private cleanupAllChannels(): void {
    console.log(`[RealtimeCore] Cleaning up ${this.channels.size} channels`)
    
    this.channels.forEach((channel, key) => {
      try {
        // 명시적으로 구독 해제 및 채널 제거
        channel.unsubscribe()
        // Supabase 클라이언트에서도 채널 제거 (메모리 누수 방지)
        if (this.client && this.client.removeChannel) {
          this.client.removeChannel(channel)
        }
      } catch (error) {
        console.warn(`[RealtimeCore] Error unsubscribing ${key}:`, error)
      }
    })
    
    this.channels.clear()
  }

  private async resubscribeAll(): Promise<void> {
    console.log(`[RealtimeCore] Resubscribing ${this.subscriptions.size} subscriptions`)
    
    const subscriptions = Array.from(this.subscriptions.entries())
    
    // 병렬로 모든 구독 시도
    const promises = subscriptions.map(async ([key, info]) => {
      try {
        await this.createSubscription(key, info)
      } catch (error) {
        console.warn(`[RealtimeCore] Failed to resubscribe ${key}, will retry later:`, error)
      }
    })
    
    // 모든 구독 시도 완료 대기
    await Promise.allSettled(promises)
    
    // 구독 상태 확인
    const successCount = Array.from(this.channels.keys()).length
    console.log(`[RealtimeCore] Resubscription complete: ${successCount}/${this.subscriptions.size} channels active`)
  }

  private async createSubscription(key: string, info: SubscriptionInfo): Promise<void> {
    return new Promise((resolve) => {
      const channel = this.client
        .channel(key)
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
          console.log(`[RealtimeCore] Channel ${key} status: ${status}`)
          
          if (status === 'SUBSCRIBED') {
            console.log(`[RealtimeCore] Successfully subscribed to ${key}`)
            this.channels.set(key, channel)
            resolve()
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[RealtimeCore] Failed to subscribe to ${key}`)
            // 실패해도 채널은 저장 (나중에 재시도 가능)
            this.channels.set(key, channel)
            resolve() // 다른 구독 진행을 위해 resolve
          } else if (status === 'TIMED_OUT') {
            console.warn(`[RealtimeCore] Subscription timeout for ${key}`)
            this.channels.set(key, channel)
            resolve()
          } else if (status === 'CLOSED') {
            console.warn(`[RealtimeCore] Channel ${key} closed`)
            // 채널이 닫혔으면 재구독 필요
            resolve()
          }
        })
      
      // 5초 타임아웃
      setTimeout(() => {
        if (!this.channels.has(key)) {
          console.warn(`[RealtimeCore] Subscription timeout for ${key}, saving channel anyway`)
          this.channels.set(key, channel)
          resolve()
        }
      }, 5000)
    })
  }

  /**
   * 채널 상태 확인 및 재구독
   * 백그라운드에서 복귀 시 채널이 손상되었는지 확인하고 필요시 재구독
   */
  async checkAndResubscribe(): Promise<void> {
    console.log('[RealtimeCore] Checking channel health...')
    
    // 활성 채널 수와 구독 수 비교
    const activeChannels = Array.from(this.channels.entries()).filter(([key, channel]) => {
      const state = (channel as any).state
      return state === 'joined' || state === 'joining'
    }).length
    
    const totalSubscriptions = this.subscriptions.size
    
    console.log(`[RealtimeCore] Active channels: ${activeChannels}/${totalSubscriptions}`)
    
    // 채널이 손상되었거나 누락된 경우 재구독
    if (activeChannels < totalSubscriptions) {
      console.log('[RealtimeCore] Some channels are broken, resubscribing all...')
      
      // 기존 채널 정리
      this.cleanupAllChannels()
      
      // 모든 구독 재생성
      await this.resubscribeAll()
    } else {
      console.log('[RealtimeCore] All channels healthy')
    }
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

    // 즉시 구독 생성 (에러는 무시)
    if (this.isReady) {
      try {
        await this.createSubscription(key, info)
      } catch (error) {
        console.warn(`[RealtimeCore] Initial subscription failed for ${key}, will retry on reconnect:`, error)
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
    console.log('[RealtimeCore] All subscriptions cleaned up')
  }

  getStatus(): { isReady: boolean; subscriptionCount: number } {
    return {
      isReady: this.isReady,
      subscriptionCount: this.subscriptions.size
    }
  }
}

export const realtimeCore = RealtimeCore.getInstance()