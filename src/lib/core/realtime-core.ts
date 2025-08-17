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

  // 준비 상태 관리
  private isReady = false
  private readyListeners: Set<(ready: boolean) => void> = new Set()
  private pendingSubscriptions: SubscriptionConfig[] = []

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
   * 준비 상태 대기
   */
  async waitForReady(timeout = 10000): Promise<boolean> {
    if (this.isReady) {
      console.log('[RealtimeCore] Already ready')
      return true
    }
    
    console.log(`[RealtimeCore] Waiting for ready state (timeout: ${timeout}ms)`)
    
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('[RealtimeCore] Ready state timeout')
        this.readyListeners.delete(listener)
        resolve(false)
      }, timeout)
      
      const listener = (ready: boolean) => {
        if (ready) {
          console.log('[RealtimeCore] Ready state achieved')
          clearTimeout(timer)
          this.readyListeners.delete(listener)
          resolve(true)
        }
      }
      
      this.readyListeners.add(listener)
    })
  }

  /**
   * 준비 상태 리스너 등록
   */
  onReady(listener: () => void): () => void {
    if (this.isReady) {
      console.log('[RealtimeCore] Already ready, calling listener immediately')
      listener()
      return () => {}
    }
    
    const wrappedListener = (ready: boolean) => {
      if (ready) {
        console.log('[RealtimeCore] Calling ready listener')
        listener()
      }
    }
    
    this.readyListeners.add(wrappedListener)
    return () => this.readyListeners.delete(wrappedListener)
  }

  /**
   * 준비 상태 확인
   */
  isRealtimeReady(): boolean {
    return this.isReady
  }

  /**
   * 준비 상태 설정 (private)
   */
  private setReady(ready: boolean) {
    if (this.isReady !== ready) {
      console.log(`[RealtimeCore] 🎯 Ready state changed: ${this.isReady} -> ${ready}`)
      this.isReady = ready
      
      if (ready) {
        // 대기 중인 구독들 처리
        const pending = [...this.pendingSubscriptions]
        this.pendingSubscriptions = []
        
        if (pending.length > 0) {
          console.log(`[RealtimeCore] Processing ${pending.length} pending subscriptions`)
          pending.forEach(config => {
            console.log(`[RealtimeCore] Processing pending subscription: ${config.id}`)
            this.actualSubscribe(config)
          })
        }
      }
      
      // 리스너들에게 알림
      this.readyListeners.forEach(listener => {
        try {
          listener(ready)
        } catch (error) {
          console.error('[RealtimeCore] Ready listener error:', error)
        }
      })
    }
  }

  /**
   * 실제 Realtime 연결 테스트 (안전한 채널 정리)
   */
  private async testRealtimeConnection(): Promise<boolean> {
    try {
      console.log('[RealtimeCore] Testing Realtime connection')
      const client = connectionCore.getClient()
      const testChannelName = `ready-test-${Date.now()}`
      const testChannel = client.channel(testChannelName)
      
      return new Promise((resolve) => {
        let isResolved = false
        
        const cleanup = () => {
          if (!isResolved) {
            isResolved = true
            // 안전한 채널 정리 - 비동기로 처리하여 재귀 방지
            setTimeout(() => {
              try {
                client.removeChannel(testChannel)
              } catch (error) {
                console.warn('[RealtimeCore] Test channel cleanup error:', error)
              }
            }, 100)
          }
        }
        
        const timeout = setTimeout(() => {
          console.log('[RealtimeCore] Realtime connection test timeout')
          cleanup()
          resolve(false)
        }, 3000)
        
        testChannel.subscribe((status) => {
          if (!isResolved) {
            clearTimeout(timeout)
            const success = status === 'SUBSCRIBED'
            console.log(`[RealtimeCore] Realtime connection test result: ${success} (status: ${status})`)
            cleanup()
            resolve(success)
          }
        })
      })
    } catch (error) {
      console.error('[RealtimeCore] Realtime connection test error:', error)
      return false
    }
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
      
      // 연결된 상태에서 준비 상태 확인 및 설정
      if (currentState === 'connected' && status.isVisible) {
        // 준비 상태가 아니면 항상 준비 상태 설정 시도
        if (!this.isReady) {
          // 이미 재구독 중이면 스킵
          if (isResubscribing) {
            console.log('[RealtimeCore] Already processing ready state, skipping')
            this.previousConnectionState = currentState
            return
          }
          
          console.log('[RealtimeCore] Connection established, setting up ready state')
          isResubscribing = true
          
          try {
            // Realtime WebSocket 실제 테스트 (관대한 처리)
            const isRealtimeWorking = await this.testRealtimeConnection()
            
            if (isRealtimeWorking) {
              console.log('[RealtimeCore] Realtime test successful, setting ready state')
            } else {
              console.warn('[RealtimeCore] Realtime test failed, but allowing connection (degraded mode)')
            }
            
            // 테스트 결과와 관계없이 연결된 상태이면 준비 상태로 설정
            this.setReady(true)
            
            // 최초 연결이거나 실제 재연결인 경우만 resubscribeAll 호출
            if (!this.hasInitialSubscription || previousState === 'disconnected' || previousState === 'error') {
              this.hasInitialSubscription = true
              await this.resubscribeAll()
            }
            
          } catch (error) {
            console.error('[RealtimeCore] Failed to test realtime:', error)
            // 에러 발생해도 연결 상태이면 준비 상태로 설정 (관대한 처리)
            console.warn('[RealtimeCore] Test failed with error, but allowing connection (degraded mode)')
            this.setReady(true)
          } finally {
            isResubscribing = false
          }
        } else {
          // 이미 준비 상태인 경우
          console.log('[RealtimeCore] Already ready, checking for reconnection needs')
          
          // 실패한 구독이 있는지 확인
          const failedSubscriptions = Array.from(this.subscriptions.values()).filter(sub => 
            !sub.status.isSubscribed || sub.status.error
          )
          
          // 실제 재연결이 필요한 경우 또는 실패한 구독이 있는 경우
          if (previousState === 'disconnected' || previousState === 'error' || failedSubscriptions.length > 0) {
            if (!isResubscribing) {
              if (failedSubscriptions.length > 0) {
                console.log(`[RealtimeCore] Found ${failedSubscriptions.length} failed subscriptions, resubscribing all`)
              } else {
                console.log('[RealtimeCore] Reconnection detected, resubscribing all')
              }
              
              isResubscribing = true
              try {
                await this.resubscribeAll()
              } catch (error) {
                console.error('[RealtimeCore] Failed to resubscribe on reconnection:', error)
              } finally {
                isResubscribing = false
              }
            }
          }
        }
      }
      // 연결이 끊어지면 모든 구독 정리
      else if (currentState === 'disconnected' || currentState === 'error') {
        console.log('[RealtimeCore] Connection lost, cleaning up subscriptions and setting ready to false')
        isResubscribing = false
        this.setReady(false)
        this.cleanupAll()
      }
      
      // 이전 상태 업데이트
      this.previousConnectionState = currentState
    })
  }

  /**
   * 개선된 구독 메서드 (준비 상태 확인)
   */
  subscribe(config: SubscriptionConfig): () => void {
    // 이미 구독 중인 경우
    if (this.subscriptions.has(config.id)) {
      console.warn(`[RealtimeCore] Already subscribed to ${config.id}`)
      return () => this.unsubscribe(config.id)
    }

    if (!this.isReady) {
      console.log(`[RealtimeCore] Not ready, queueing subscription: ${config.id}`)
      this.pendingSubscriptions.push(config)
      
      // 준비되면 자동 구독
      const unsubscribeReady = this.onReady(() => {
        unsubscribeReady()
        console.log(`[RealtimeCore] Ready state achieved, processing queued subscription: ${config.id}`)
        this.actualSubscribe(config)
      })
      
      return () => {
        // 대기 중인 구독 제거
        const index = this.pendingSubscriptions.findIndex(p => p.id === config.id)
        if (index !== -1) {
          console.log(`[RealtimeCore] Removing pending subscription: ${config.id}`)
          this.pendingSubscriptions.splice(index, 1)
        }
        // 이미 구독된 경우 해제
        if (this.subscriptions.has(config.id)) {
          this.unsubscribe(config.id)
        }
      }
    }
    
    return this.actualSubscribe(config)
  }

  /**
   * 실제 구독 처리 (준비 상태일 때만 호출)
   */
  private actualSubscribe(config: SubscriptionConfig): () => void {
    console.log(`[RealtimeCore] Actually subscribing to ${config.id}`, {
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
    // Circuit Breaker 상태 확인 (백그라운드 복귀 버그 수정)
    if (connectionCore.isCircuitBreakerOpen()) {
      console.warn('[RealtimeCore] Circuit Breaker is open, cannot resubscribe')
      return
    }
    
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
    
    // 서버 측 채널 정리 완료 대기 (CHANNEL_ERROR 방지)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
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
        // 각 구독 사이에 충분한 대기 (서버 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 200))
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
   * 모든 구독 정리 (채널은 유지) - 안전한 채널 정리
   */
  private cleanupAll(): void {
    const client = connectionCore.getClient()
    
    this.subscriptions.forEach((subscription) => {
      console.log(`[RealtimeCore] Cleaning up ${subscription.config.id}`)
      
      // 안전한 채널 정리 - try-catch로 보호
      try {
        client.removeChannel(subscription.channel)
      } catch (error) {
        console.warn(`[RealtimeCore] Failed to remove channel ${subscription.config.id}:`, error)
      }
      
      // 상태만 업데이트
      subscription.status.isSubscribed = false
      subscription.status.subscribedAt = null
    })
    
    // Map은 유지 (나중에 재구독용)
    this.notifyListeners()
  }

  /**
   * 모든 구독 완전 제거 - 안전한 채널 정리
   */
  unsubscribeAll(): void {
    const client = connectionCore.getClient()
    
    this.subscriptions.forEach((subscription, id) => {
      console.log(`[RealtimeCore] Removing ${id}`)
      
      // 안전한 채널 정리 - try-catch로 보호
      try {
        client.removeChannel(subscription.channel)
      } catch (error) {
        console.warn(`[RealtimeCore] Failed to remove channel ${id}:`, error)
      }
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
   * 클라이언트 재초기화 준비
   * ConnectionCore가 클라이언트를 재생성하기 전에 호출
   */
  async prepareForClientReinit(): Promise<void> {
    console.log('[RealtimeCore] Preparing for client reinitialization')
    
    // 모든 기존 구독 정리
    this.cleanupAll()
    
    // 준비 상태 해제
    this.setReady(false)
    
    // 구독 상태 초기화 (설정은 유지)
    this.subscriptions.forEach((sub) => {
      sub.status.isSubscribed = false
      sub.status.error = null
      sub.status.subscribedAt = null
    })
    
    console.log('[RealtimeCore] Ready for client reinitialization')
  }
  
  /**
   * 새 클라이언트 준비 완료 처리
   * ConnectionCore가 새 클라이언트 생성 후 호출
   */
  async handleClientReady(): Promise<void> {
    console.log('[RealtimeCore] Handling new client ready state')
    
    // Circuit Breaker가 열려있으면 대기
    if (connectionCore.isCircuitBreakerOpen()) {
      console.warn('[RealtimeCore] Circuit Breaker is open, waiting for reset')
      return
    }
    
    // 세션 확인
    const { data: { session }, error } = await connectionCore.getClient().auth.getSession()
    
    if (error) {
      console.error('[RealtimeCore] Failed to get session after client reinit:', error)
      return
    }
    
    // 세션이 없어도 public 데이터는 구독 가능
    console.log('[RealtimeCore] Client ready with session:', !!session)
    
    // 준비 상태 설정
    this.setReady(true)
    
    // 재구독 시작
    await this.resubscribeAll()
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

// 개발 환경에서 디버깅을 위해 글로벌 노출
if (typeof window !== 'undefined') {
  ;(window as any).debugRealtimeCore = () => {
    console.log('[RealtimeCore Debug] Current state:')
    console.log('- Is Ready:', realtimeCore.isRealtimeReady())
    console.log('- Active subscriptions:', realtimeCore.getActiveCount())
    console.log('- All subscriptions:', realtimeCore.getAllSubscriptions())
    console.log('- Connection status:', connectionCore.getStatus())
    return {
      isReady: realtimeCore.isRealtimeReady(),
      activeSubscriptions: realtimeCore.getActiveCount(),
      allSubscriptions: realtimeCore.getAllSubscriptions(),
      connectionStatus: connectionCore.getStatus()
    }
  }
}

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