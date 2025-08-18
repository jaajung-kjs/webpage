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
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 새 클라이언트로 교체
    this.client = newClient
    
    // React Query 캐시 정리 (선택적)
    // 너무 자주 발생하면 사용자 경험이 나빠질 수 있으므로 제한적으로 사용
    if (this.subscriptions.size > 0) {
      console.log('[RealtimeCore] Keeping cache, will refresh on resubscribe')
    }
    
    // 모든 구독 재생성
    await this.resubscribeAll()
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
    
    for (const [key, info] of subscriptions) {
      try {
        await this.createSubscription(key, info)
      } catch (error) {
        console.error(`[RealtimeCore] Failed to resubscribe ${key}:`, error)
      }
    }
  }

  private async createSubscription(key: string, info: SubscriptionInfo): Promise<void> {
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
        if (status === 'SUBSCRIBED') {
          console.log(`[RealtimeCore] Successfully subscribed to ${key}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[RealtimeCore] Failed to subscribe to ${key}`)
        }
      })

    this.channels.set(key, channel)
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
      await this.createSubscription(key, info)
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