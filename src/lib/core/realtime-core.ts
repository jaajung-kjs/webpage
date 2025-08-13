/**
 * RealtimeCore - 경량 실시간 구독 관리
 * 
 * 단일 책임: 실시간 채널 구독 관리
 * - 단순한 구독/구독해제 인터페이스
 * - 상위 레이어에서 재연결 제어
 * - 명확한 에러 전파
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { connectionCore } from './connection-core'

// 구독 설정
export interface SubscriptionConfig {
  id: string // 고유 식별자
  table: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  filter?: string
  schema?: string
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
  onError?: (error: Error) => void
}

// 구독 상태
export interface SubscriptionStatus {
  id: string
  isSubscribed: boolean
  error: Error | null
  subscribedAt: number | null
}

/**
 * RealtimeCore 클래스
 * 실시간 구독을 단순하게 관리
 */
export class RealtimeCore {
  private static instance: RealtimeCore
  private subscriptions: Map<string, {
    channel: RealtimeChannel
    config: SubscriptionConfig
    status: SubscriptionStatus
  }>
  private listeners: Set<(subscriptions: SubscriptionStatus[]) => void>
  private previousConnectionState: 'disconnected' | 'connecting' | 'connected' | 'error' | 'suspended' = 'disconnected'
  private hasInitialSubscription = false

  private constructor() {
    this.subscriptions = new Map()
    this.listeners = new Set()
    
    // ConnectionCore 상태 구독
    this.setupConnectionListener()
  }

  /**
   * 싱글톤 인스턴스
   */
  static getInstance(): RealtimeCore {
    if (!RealtimeCore.instance) {
      RealtimeCore.instance = new RealtimeCore()
    }
    return RealtimeCore.instance
  }

  /**
   * 연결 상태 리스너 설정
   */
  private setupConnectionListener(): void {
    let isResubscribing = false
    
    connectionCore.subscribe(async (status) => {
      const currentState = status.state
      const previousState = this.previousConnectionState
      
      // 상태 변경 로그
      if (currentState !== previousState) {
        console.log(`[RealtimeCore] Connection state changed: ${previousState} -> ${currentState}`)
      }
      
      // 실제로 연결이 복구된 경우에만 재구독 (이전 상태가 disconnected/error였던 경우)
      if (currentState === 'connected' && status.isVisible) {
        // 최초 연결이거나 실제 재연결인 경우만 처리
        // connecting 상태는 무시 (단순 페이지 이동 시 connecting -> connected가 발생)
        if (!this.hasInitialSubscription && previousState === 'disconnected') {
          // 이미 재구독 중이면 스킵
          if (isResubscribing) {
            console.log('[RealtimeCore] Already resubscribing, skipping')
            this.previousConnectionState = currentState
            return
          }
          
          console.log('[RealtimeCore] Initial connection established, will subscribe when Realtime is ready')
          isResubscribing = true
          this.hasInitialSubscription = true
          
          try {
            await this.resubscribeAll()
          } catch (error) {
            console.error('[RealtimeCore] Failed to resubscribe:', error)
          } finally {
            isResubscribing = false
          }
        } else if (previousState === 'disconnected' || previousState === 'error') {
          // 실제 재연결 (네트워크 복구, 백그라운드 복귀 등)
          if (isResubscribing) {
            console.log('[RealtimeCore] Already resubscribing, skipping')
            this.previousConnectionState = currentState
            return
          }
          
          console.log('[RealtimeCore] Connection restored from disconnected/error state, will resubscribe')
          isResubscribing = true
          
          try {
            await this.resubscribeAll()
          } catch (error) {
            console.error('[RealtimeCore] Failed to resubscribe:', error)
          } finally {
            isResubscribing = false
          }
        } else {
          // 단순 페이지 이동 등으로 connected 상태가 유지된 경우 (connecting -> connected)
          console.log('[RealtimeCore] Connection already established, skipping resubscribe (likely page navigation)')
        }
      }
      // 연결이 끊어지면 모든 구독 정리
      else if (currentState === 'disconnected' || currentState === 'error') {
        console.log('[RealtimeCore] Connection lost, cleaning up subscriptions')
        isResubscribing = false
        this.cleanupAll()
      }
      
      // 이전 상태 업데이트
      this.previousConnectionState = currentState
    })
  }

  /**
   * 채널 구독
   */
  subscribe(config: SubscriptionConfig): () => void {
    // 이미 구독 중인 경우
    if (this.subscriptions.has(config.id)) {
      console.warn(`[RealtimeCore] Already subscribed to ${config.id}`)
      return () => this.unsubscribe(config.id)
    }

    console.log(`[RealtimeCore] Subscribing to ${config.id}`, {
      table: config.table,
      event: config.event,
      filter: config.filter
    })

    const client = connectionCore.getClient()
    const channel = client.channel(`realtime:${config.id}`)
    
    // 구독 상태 초기화
    const status: SubscriptionStatus = {
      id: config.id,
      isSubscribed: false,
      error: null,
      subscribedAt: null
    }

    // Postgres 변경 사항 구독
    const postgresConfig = {
      event: config.event || '*',
      schema: config.schema || 'public',
      table: config.table,
      ...(config.filter && { filter: config.filter })
    }

    channel.on(
      'postgres_changes' as any,
      postgresConfig,
      (payload) => {
        console.log(`[RealtimeCore] Event received on ${config.id}:`, payload.eventType)
        try {
          config.callback(payload as any)
        } catch (error) {
          console.error(`[RealtimeCore] Callback error for ${config.id}:`, error)
          if (config.onError) {
            config.onError(error instanceof Error ? error : new Error('Callback error'))
          }
        }
      }
    )

    // 구독 시작 (타임아웃 추가)
    const subscribeTimeout = setTimeout(() => {
      if (!status.isSubscribed) {
        console.warn(`[RealtimeCore] Subscription timeout for ${config.id}, will retry on next reconnection`)
        // 타임아웃시 에러로 처리하지 않고, 다음 재연결 시 재시도
        status.error = new Error('Subscription timeout')
        this.notifyListeners()
      }
    }, 10000) // 10초 타임아웃
    
    channel.subscribe((subscriptionStatus) => {
      clearTimeout(subscribeTimeout)
      console.log(`[RealtimeCore] Channel ${config.id} status:`, subscriptionStatus)
      
      if (subscriptionStatus === 'SUBSCRIBED') {
        status.isSubscribed = true
        status.subscribedAt = Date.now()
        status.error = null
        this.notifyListeners()
        
        console.log(`[RealtimeCore] Successfully subscribed to ${config.id}`)
      } else if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT') {
        const error = new Error(`Subscription failed: ${subscriptionStatus}`)
        status.isSubscribed = false
        status.error = error
        this.notifyListeners()
        
        console.warn(`[RealtimeCore] Failed to subscribe to ${config.id}: ${subscriptionStatus}, will retry on next reconnection`)
        // onError 콜백은 호출하지 않음 (자동 재시도 예정이므로)
      } else if (subscriptionStatus === 'CLOSED') {
        status.isSubscribed = false
        status.subscribedAt = null
        this.notifyListeners()
        
        console.log(`[RealtimeCore] Channel ${config.id} closed`)
      }
    })

    // 구독 정보 저장
    this.subscriptions.set(config.id, {
      channel,
      config,
      status
    })

    this.notifyListeners()

    // 구독 해제 함수 반환
    return () => this.unsubscribe(config.id)
  }

  /**
   * 구독 해제
   */
  unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id)
    if (!subscription) {
      console.warn(`[RealtimeCore] No subscription found for ${id}`)
      return
    }

    console.log(`[RealtimeCore] Unsubscribing from ${id}`)
    
    const client = connectionCore.getClient()
    client.removeChannel(subscription.channel)
    
    this.subscriptions.delete(id)
    this.notifyListeners()
  }

  /**
   * 모든 구독 재설정 (Realtime WebSocket 연결 확인 포함)
   */
  private async resubscribeAll(): Promise<void> {
    // 연결 상태 확인
    if (!connectionCore.isConnected()) {
      console.log('[RealtimeCore] Not connected, skipping resubscribe')
      return
    }

    console.log('[RealtimeCore] Starting resubscribe process')

    // 재구독할 구성 저장 (Map clear 전에 저장)
    const subscriptionsToRestore = Array.from(this.subscriptions.values()).map(sub => ({ ...sub.config }))
    
    // 모든 기존 채널 정리 및 Map clear
    this.cleanupAll()
    
    // Map을 clear하여 "Already subscribed" 문제 해결
    this.subscriptions.clear()
    
    // 잠시 대기 (채널 정리 완료 대기)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Realtime WebSocket 연결 상태를 실제 채널 구독으로 확인
    const client = connectionCore.getClient()
    let isRealtimeReady = false
    const maxRetries = 5 // 재시도 횟수 줄임
    const baseDelay = 500 // 기본 지연 시간 늘림
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[RealtimeCore] Testing Realtime connection (attempt ${attempt + 1}/${maxRetries})`)
        
        // 테스트 채널을 만들어서 실제 연결 상태 확인
        const testChannel = client.channel(`test-connection-${Date.now()}`)
        
        // 테스트 구독으로 Realtime 상태 확인
        const subscriptionPromise = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            console.log('[RealtimeCore] Test subscription timeout')
            resolve(false)
          }, 3000) // 3초 타임아웃
          
          testChannel.subscribe((status) => {
            clearTimeout(timeout)
            console.log(`[RealtimeCore] Test subscription status: ${status}`)
            
            if (status === 'SUBSCRIBED') {
              // 성공하면 즉시 테스트 채널 정리
              client.removeChannel(testChannel)
              resolve(true)
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              client.removeChannel(testChannel)
              resolve(false)
            }
          })
        })
        
        isRealtimeReady = await subscriptionPromise
        
        if (isRealtimeReady) {
          console.log('[RealtimeCore] Realtime connection test successful')
          break
        }
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * (attempt + 1) // 선형 증가: 500ms, 1000ms, 1500ms...
          console.log(`[RealtimeCore] Test failed, retrying after ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
      } catch (error) {
        console.warn(`[RealtimeCore] Test attempt ${attempt + 1} failed:`, error)
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * (attempt + 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    if (!isRealtimeReady) {
      console.error('[RealtimeCore] Realtime connection test failed after all attempts, but proceeding with resubscription')
      // 실패해도 재구독을 시도함 (네트워크가 불안정할 수 있으므로)
    }
    
    console.log(`[RealtimeCore] Resubscribing to ${subscriptionsToRestore.length} channels`)
    
    // 모든 구독 재생성 (순차적으로 처리해서 안정성 향상)
    for (const config of subscriptionsToRestore) {
      try {
        console.log(`[RealtimeCore] Resubscribing to ${config.id}`)
        this.subscribe(config)
        // 각 구독 사이에 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[RealtimeCore] Failed to resubscribe to ${config.id}:`, error)
      }
    }
    
    console.log('[RealtimeCore] Resubscription process completed')
  }

  /**
   * 재연결 처리 (ConnectionRecovery에서 호출)
   */
  async handleReconnection(): Promise<void> {
    console.log('[RealtimeCore] Handling reconnection')
    
    // Realtime WebSocket이 준비될 때까지 대기 후 재구독
    await this.resubscribeAll()
  }

  /**
   * 모든 구독 정리 (채널은 유지)
   */
  private cleanupAll(): void {
    const client = connectionCore.getClient()
    
    this.subscriptions.forEach((subscription) => {
      console.log(`[RealtimeCore] Cleaning up ${subscription.config.id}`)
      client.removeChannel(subscription.channel)
      
      // 상태만 업데이트
      subscription.status.isSubscribed = false
      subscription.status.subscribedAt = null
    })
    
    // Map은 유지 (나중에 재구독용)
    this.notifyListeners()
  }

  /**
   * 모든 구독 완전 제거
   */
  unsubscribeAll(): void {
    const client = connectionCore.getClient()
    
    this.subscriptions.forEach((subscription, id) => {
      console.log(`[RealtimeCore] Removing ${id}`)
      client.removeChannel(subscription.channel)
    })
    
    this.subscriptions.clear()
    this.notifyListeners()
  }

  /**
   * 특정 테이블의 모든 구독 제거
   */
  unsubscribeTable(table: string): void {
    const toRemove: string[] = []
    
    this.subscriptions.forEach((subscription, id) => {
      if (subscription.config.table === table) {
        toRemove.push(id)
      }
    })
    
    toRemove.forEach(id => this.unsubscribe(id))
  }

  /**
   * 구독 상태 가져오기
   */
  getSubscription(id: string): SubscriptionStatus | null {
    const subscription = this.subscriptions.get(id)
    return subscription ? { ...subscription.status } : null
  }

  /**
   * 모든 구독 상태 가져오기
   */
  getAllSubscriptions(): SubscriptionStatus[] {
    return Array.from(this.subscriptions.values()).map(s => ({ ...s.status }))
  }

  /**
   * 구독 여부 확인
   */
  isSubscribed(id: string): boolean {
    const subscription = this.subscriptions.get(id)
    return subscription?.status.isSubscribed || false
  }

  /**
   * 활성 구독 수
   */
  getActiveCount(): number {
    let count = 0
    this.subscriptions.forEach(s => {
      if (s.status.isSubscribed) count++
    })
    return count
  }

  /**
   * 상태 변경 구독
   */
  onStatusChange(listener: (subscriptions: SubscriptionStatus[]) => void): () => void {
    this.listeners.add(listener)
    
    // 즉시 현재 상태 전달
    listener(this.getAllSubscriptions())
    
    // 구독 해제 함수 반환
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 리스너 알림
   */
  private notifyListeners(): void {
    const statuses = this.getAllSubscriptions()
    this.listeners.forEach(listener => {
      try {
        listener(statuses)
      } catch (error) {
        console.error('[RealtimeCore] Listener error:', error)
      }
    })
  }

  /**
   * 디버그 정보
   */
  debug(): void {
    console.log('[RealtimeCore] Debug Info:')
    console.log('- Total subscriptions:', this.subscriptions.size)
    console.log('- Active subscriptions:', this.getActiveCount())
    console.log('- Connection state:', connectionCore.getStatus().state)
    
    this.subscriptions.forEach((sub, id) => {
      console.log(`  ${id}:`, {
        table: sub.config.table,
        isSubscribed: sub.status.isSubscribed,
        error: sub.status.error?.message
      })
    })
  }
}

// 싱글톤 인스턴스 export
export const realtimeCore = RealtimeCore.getInstance()

// 헬퍼 함수들
export function subscribeToTable(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  options?: {
    id?: string
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
    filter?: string
    onError?: (error: Error) => void
  }
): () => void {
  const id = options?.id || `${table}-${Date.now()}`
  
  return realtimeCore.subscribe({
    id,
    table,
    event: options?.event,
    filter: options?.filter,
    callback,
    onError: options?.onError
  })
}

export function subscribeToRecord(
  table: string,
  recordId: string,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  options?: {
    column?: string
    onError?: (error: Error) => void
  }
): () => void {
  const column = options?.column || 'id'
  const id = `${table}-${column}-${recordId}`
  
  return realtimeCore.subscribe({
    id,
    table,
    filter: `${column}=eq.${recordId}`,
    callback,
    onError: options?.onError
  })
}