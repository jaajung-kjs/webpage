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
import { PromiseManager } from '@/lib/utils/promise-manager'

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

// 구독 상태 및 메트릭
interface SubscriptionState {
  status: 'disconnected' | 'connecting' | 'subscribed' | 'error'
  retryCount: number
  lastError?: string
  subscribedAt?: Date
  errorCount: number
}

// 성능 메트릭
interface PerformanceMetrics {
  eventCount: number
  lastEventTime?: Date
  averageProcessingTime: number
  errorRate: number
}

// Circuit Breaker 상태
interface CircuitBreakerState {
  isOpen: boolean
  failureCount: number
  lastFailureTime?: Date
  nextRetryTime?: Date
}

export class GlobalRealtimeManager {
  private static instance: GlobalRealtimeManager
  private queryClient: QueryClient | null = null
  private channels: Map<string, RealtimeChannel> = new Map() // 메모리 추적용
  private channelRefs: Map<string, RealtimeChannel> = new Map()
  private subscriptionStates: Map<string, SubscriptionState> = new Map()
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map()
  private circuitBreaker: Map<string, CircuitBreakerState> = new Map()
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null
  
  // Debounce/Throttle 관리
  private eventProcessors: Map<string, NodeJS.Timeout> = new Map()
  private batchUpdates: Map<string, any[]> = new Map()
  private readonly BATCH_DELAY = 100 // 100ms 배치 처리
  
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
   * 전역 구독 초기화 - 개선된 병렬 처리 및 재시도 메커니즘
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[GlobalRealtime] Already initialized')
      return
    }
    
    if (this.initializationPromise) {
      console.log('[GlobalRealtime] Initialization in progress, waiting...')
      return this.initializationPromise
    }
    
    if (!this.queryClient) {
      throw new Error('[GlobalRealtime] QueryClient not set')
    }
    
    this.initializationPromise = this.performInitialization()
    return this.initializationPromise
  }
  
  /**
   * 실제 초기화 로직
   */
  private async performInitialization(): Promise<void> {
    console.log('[GlobalRealtime] Initializing global subscriptions...')
    
    const subscriptionTasks = [
      { name: 'content_v2', task: () => this.subscribeToContentTable() },
      { name: 'users_v2', task: () => this.subscribeToUsersTable() },
      { name: 'comments_v2', task: () => this.subscribeToCommentsTable() },
      { name: 'activity_participants_v2', task: () => this.subscribeToActivityParticipantsTable() }
    ]
    
    // Promise.allSettled로 부분 성공 허용
    const results = await Promise.allSettled(
      subscriptionTasks.map(async ({ name, task }) => {
        try {
          await this.subscribeWithRetry(name, task, 3)
        } catch (error) {
          console.error(`[GlobalRealtime] Failed to subscribe to ${name}:`, error)
          throw error
        }
      })
    )
    
    // 결과 분석
    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length
    
    if (successful === 0) {
      this.isInitialized = false
      throw new Error('[GlobalRealtime] All subscriptions failed')
    }
    
    if (failed > 0) {
      console.warn(`[GlobalRealtime] ⚠️ Partial initialization: ${successful} succeeded, ${failed} failed`)
    }
    
    this.isInitialized = true
    console.log(`[GlobalRealtime] ✅ Initialization complete: ${successful}/${subscriptionTasks.length} subscriptions active`)
  }
  
  /**
   * 채널이 구독 상태가 될 때까지 대기
   */
  private async waitForChannelReady(channelName: string, maxWaitTime = 3000): Promise<void> {
    const startTime = Date.now()
    let checkInterval = 50 // 초기 체크 간격 50ms
    const maxInterval = 500 // 최대 체크 간격 500ms
    
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed > maxWaitTime) {
          reject(new Error(`[GlobalRealtime] Channel ${channelName} ready timeout after ${maxWaitTime}ms`))
          return
        }
        
        const state = this.subscriptionStates.get(channelName)
        if (state?.status === 'subscribed') {
          console.log(`[GlobalRealtime] ✅ Channel ${channelName} ready in ${elapsed}ms`)
          resolve()
          return
        }
        
        if (state?.status === 'error') {
          reject(new Error(`[GlobalRealtime] Channel ${channelName} subscription failed: ${state.lastError}`))
          return
        }
        
        // Exponential backoff로 체크 간격 증가
        checkInterval = Math.min(checkInterval * 1.2, maxInterval)
        setTimeout(checkStatus, checkInterval)
      }
      
      checkStatus()
    })
  }
  
  /**
   * 재시도 메커니즘이 포함된 구독 함수
   */
  private async subscribeWithRetry(
    tableName: string, 
    subscribeFunction: () => Promise<void>, 
    maxRetries = 3
  ): Promise<void> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Circuit Breaker 체크
        if (this.isCircuitBreakerOpen(tableName)) {
          throw new Error(`Circuit breaker open for ${tableName}`)
        }
        
        console.log(`[GlobalRealtime] Subscribing to ${tableName} (attempt ${attempt}/${maxRetries})`)
        
        // 구독 상태 초기화
        this.updateSubscriptionState(tableName, {
          status: 'connecting',
          retryCount: attempt - 1,
          errorCount: this.subscriptionStates.get(tableName)?.errorCount || 0
        })
        
        await subscribeFunction()
        await this.waitForChannelReady(tableName)
        
        // 성공 시 Circuit Breaker 리셋
        this.resetCircuitBreaker(tableName)
        
        console.log(`[GlobalRealtime] ✅ Successfully subscribed to ${tableName}`)
        return
      } catch (error) {
        lastError = error as Error
        console.error(`[GlobalRealtime] ❌ Attempt ${attempt} failed for ${tableName}:`, error)
        
        // 구독 상태 업데이트
        this.updateSubscriptionState(tableName, {
          status: 'error',
          retryCount: attempt,
          lastError: lastError.message,
          errorCount: (this.subscriptionStates.get(tableName)?.errorCount || 0) + 1
        })
        
        // Circuit Breaker 업데이트
        this.updateCircuitBreaker(tableName, lastError)
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff, 최대 5초
          console.log(`[GlobalRealtime] Retrying ${tableName} in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error(`[GlobalRealtime] Failed to subscribe to ${tableName} after ${maxRetries} attempts: ${lastError?.message}`)
  }
  
  /**
   * content_v2 테이블 구독 - 개선된 버전
   */
  private async subscribeToContentTable(): Promise<void> {
    const client = connectionCore.getClient()
    const channelName = 'content_v2'
    
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
          this.processEventWithMetrics(channelName, 'INSERT', () => {
            this.handleContentInsert(payload)
          })
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
          this.processEventWithMetrics(channelName, 'UPDATE', () => {
            this.handleContentUpdate(payload)
          })
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
          this.processEventWithMetrics(channelName, 'DELETE', () => {
            this.handleContentDelete(payload)
          })
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus(channelName, status)
      })
    
    this.channelRefs.set(channelName, channel)
    this.initializeMetrics(channelName)
  }
  
  /**
   * users_v2 테이블 구독 - 개선된 버전
   */
  private async subscribeToUsersTable(): Promise<void> {
    const client = connectionCore.getClient()
    const channelName = 'users_v2'
    
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
          this.processEventWithMetrics(channelName, payload.eventType, () => {
            this.handleUsersChange(payload)
          })
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus(channelName, status)
      })
    
    this.channelRefs.set(channelName, channel)
    this.initializeMetrics(channelName)
  }
  
  /**
   * comments_v2 테이블 구독 - 개선된 버전
   */
  private async subscribeToCommentsTable(): Promise<void> {
    const client = connectionCore.getClient()
    const channelName = 'comments_v2'
    
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
          this.processEventWithMetrics(channelName, payload.eventType, () => {
            this.handleCommentsChange(payload)
          })
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus(channelName, status)
      })
    
    this.channelRefs.set(channelName, channel)
    this.initializeMetrics(channelName)
  }
  
  /**
   * 구독 상태 업데이트
   */
  private updateSubscriptionState(tableName: string, state: Partial<SubscriptionState>) {
    const currentState = this.subscriptionStates.get(tableName) || {
      status: 'disconnected',
      retryCount: 0,
      errorCount: 0
    }
    
    this.subscriptionStates.set(tableName, { ...currentState, ...state })
  }
  
  /**
   * 구독 상태 처리
   */
  private handleSubscriptionStatus(channelName: string, status: string) {
    console.log(`[GlobalRealtime] ${channelName} subscription status:`, status)
    
    switch (status) {
      case 'SUBSCRIBED':
        this.updateSubscriptionState(channelName, {
          status: 'subscribed',
          subscribedAt: new Date(),
          lastError: undefined
        })
        console.log(`[GlobalRealtime] ✅ Successfully subscribed to ${channelName}`)
        break
        
      case 'CHANNEL_ERROR':
        this.updateSubscriptionState(channelName, {
          status: 'error',
          lastError: 'Channel error',
          errorCount: (this.subscriptionStates.get(channelName)?.errorCount || 0) + 1
        })
        console.error(`[GlobalRealtime] ❌ Failed to subscribe to ${channelName}`)
        break
        
      case 'TIMED_OUT':
        this.updateSubscriptionState(channelName, {
          status: 'error',
          lastError: 'Subscription timeout',
          errorCount: (this.subscriptionStates.get(channelName)?.errorCount || 0) + 1
        })
        console.error(`[GlobalRealtime] ⏱️ Subscription to ${channelName} timed out`)
        break
        
      default:
        console.log(`[GlobalRealtime] ${channelName} status: ${status}`)
    }
  }
  
  /**
   * 메트릭 초기화
   */
  private initializeMetrics(tableName: string) {
    this.performanceMetrics.set(tableName, {
      eventCount: 0,
      averageProcessingTime: 0,
      errorRate: 0
    })
  }
  
  /**
   * 이벤트 처리와 함께 성능 메트릭 수집
   */
  private processEventWithMetrics(
    channelName: string, 
    eventType: string, 
    processor: () => void
  ) {
    const startTime = Date.now()
    
    try {
      console.log(`[GlobalRealtime] ${channelName} ${eventType} event received`)
      
      // Throttling 적용 - 같은 채널의 연속 이벤트 제한
      const throttleKey = `${channelName}-${eventType}`
      if (this.eventProcessors.has(throttleKey)) {
        console.log(`[GlobalRealtime] Throttling ${throttleKey} event`)
        return
      }
      
      // 배치 처리를 위한 이벤트 수집
      this.addToBatch(channelName, { eventType, timestamp: startTime })
      
      // 실제 처리
      processor()
      
      // 성공 메트릭 업데이트
      this.updateEventMetrics(channelName, Date.now() - startTime, false)
      
      // Throttle 타이머 설정
      this.eventProcessors.set(throttleKey, setTimeout(() => {
        this.eventProcessors.delete(throttleKey)
      }, 50)) // 50ms throttle
      
    } catch (error) {
      console.error(`[GlobalRealtime] Error processing ${channelName} ${eventType}:`, error)
      this.updateEventMetrics(channelName, Date.now() - startTime, true)
    }
  }
  
  /**
   * 배치 업데이트 처리
   */
  private addToBatch(channelName: string, event: any) {
    if (!this.batchUpdates.has(channelName)) {
      this.batchUpdates.set(channelName, [])
    }
    
    const batch = this.batchUpdates.get(channelName)!
    batch.push(event)
    
    // 배치가 가득 찼거나 일정 시간이 지나면 처리
    if (batch.length >= 5) {
      this.processBatch(channelName)
    } else {
      // 타이머 재설정
      setTimeout(() => {
        if (this.batchUpdates.get(channelName)?.length) {
          this.processBatch(channelName)
        }
      }, this.BATCH_DELAY)
    }
  }
  
  /**
   * 배치 처리 실행
   */
  private processBatch(channelName: string) {
    const batch = this.batchUpdates.get(channelName)
    if (!batch || batch.length === 0) return
    
    console.log(`[GlobalRealtime] Processing batch for ${channelName}: ${batch.length} events`)
    
    // 배치 클리어
    this.batchUpdates.set(channelName, [])
    
    // 중복 쿼리 무효화 방지를 위한 디바운스된 처리
    this.debouncedQueryInvalidation(channelName)
  }
  
  /**
   * 디바운스된 쿼리 무효화
   */
  private debouncedQueryInvalidation(channelName: string) {
    const debounceKey = `query-invalidation-${channelName}`
    
    if (this.eventProcessors.has(debounceKey)) {
      clearTimeout(this.eventProcessors.get(debounceKey)!)
    }
    
    this.eventProcessors.set(debounceKey, setTimeout(() => {
      console.log(`[GlobalRealtime] Executing debounced query invalidation for ${channelName}`)
      
      if (this.queryClient) {
        // 채널별 특화 무효화 로직
        this.performChannelSpecificInvalidation(channelName)
      }
      
      this.eventProcessors.delete(debounceKey)
    }, 200)) // 200ms 디바운스
  }
  
  /**
   * 채널별 특화 무효화
   */
  private performChannelSpecificInvalidation(channelName: string) {
    if (!this.queryClient) return
    
    switch (channelName) {
      case 'content_v2':
        this.queryClient.invalidateQueries({
          queryKey: ['contents-v2'],
          exact: false
        })
        this.queryClient.invalidateQueries({
          queryKey: ['trending-contents-v2'],
          exact: false
        })
        this.queryClient.invalidateQueries({
          queryKey: ['infinite-contents-v2'],
          exact: false
        })
        break
        
      case 'users_v2':
        this.queryClient.invalidateQueries({
          queryKey: ['users-v2'],
          exact: false
        })
        this.queryClient.invalidateQueries({
          queryKey: ['members'],
          exact: false
        })
        break
        
      case 'comments_v2':
        this.queryClient.invalidateQueries({
          queryKey: ['comments-v2'],
          exact: false
        })
        break
        
      case 'activity_participants_v2':
        this.queryClient.invalidateQueries({
          queryKey: ['activities-v2'],
          exact: false
        })
        this.queryClient.invalidateQueries({
          queryKey: ['upcoming-activities-v2'],
          exact: false
        })
        break
    }
  }
  
  /**
   * 이벤트 메트릭 업데이트
   */
  private updateEventMetrics(channelName: string, processingTime: number, isError: boolean) {
    const metrics = this.performanceMetrics.get(channelName)
    if (!metrics) return
    
    metrics.eventCount++
    metrics.lastEventTime = new Date()
    
    // 평균 처리 시간 계산 (이동 평균)
    if (metrics.averageProcessingTime === 0) {
      metrics.averageProcessingTime = processingTime
    } else {
      metrics.averageProcessingTime = (metrics.averageProcessingTime * 0.9) + (processingTime * 0.1)
    }
    
    // 에러율 계산 (이동 평균)
    const errorValue = isError ? 1 : 0
    metrics.errorRate = (metrics.errorRate * 0.95) + (errorValue * 0.05)
    
    // 성능 이슈 감지
    if (metrics.averageProcessingTime > 1000) {
      console.warn(`[GlobalRealtime] ⚠️ High processing time for ${channelName}: ${metrics.averageProcessingTime.toFixed(2)}ms`)
    }
    
    if (metrics.errorRate > 0.1) {
      console.warn(`[GlobalRealtime] ⚠️ High error rate for ${channelName}: ${(metrics.errorRate * 100).toFixed(2)}%`)
    }
  }
  
  /**
   * Circuit Breaker 관리
   */
  private isCircuitBreakerOpen(tableName: string): boolean {
    const state = this.circuitBreaker.get(tableName)
    if (!state || !state.isOpen) return false
    
    if (state.nextRetryTime && Date.now() > state.nextRetryTime.getTime()) {
      console.log(`[GlobalRealtime] Circuit breaker half-open for ${tableName}`)
      state.isOpen = false
      return false
    }
    
    return true
  }
  
  private updateCircuitBreaker(tableName: string, error: Error) {
    let state = this.circuitBreaker.get(tableName)
    if (!state) {
      state = { isOpen: false, failureCount: 0 }
      this.circuitBreaker.set(tableName, state)
    }
    
    state.failureCount++
    state.lastFailureTime = new Date()
    
    // 3회 연속 실패 시 Circuit Breaker 활성화
    if (state.failureCount >= 3) {
      state.isOpen = true
      state.nextRetryTime = new Date(Date.now() + 30000) // 30초 후 재시도
      console.warn(`[GlobalRealtime] 🚫 Circuit breaker opened for ${tableName}`)
    }
  }
  
  private resetCircuitBreaker(tableName: string) {
    const state = this.circuitBreaker.get(tableName)
    if (state) {
      state.isOpen = false
      state.failureCount = 0
      state.lastFailureTime = undefined
      state.nextRetryTime = undefined
    }
  }

  /**
   * 콘텐츠 INSERT 처리 - 개선된 버전 (배치 처리로 위임)
   */
  private handleContentInsert(payload: any) {
    console.log('[GlobalRealtime] ✨ Processing content INSERT:', {
      id: payload.new?.id,
      type: payload.new?.content_type,
      title: payload.new?.title?.substring(0, 50),
      author: payload.new?.author_id
    })
    
    // 배치 처리 시스템이 쿼리 무효화를 처리함
    // 개별 이벤트에서는 특별한 처리가 필요한 경우에만 추가 로직 실행
  }
  
  /**
   * 콘텐츠 UPDATE 처리 - 개선된 버전
   */
  private handleContentUpdate(payload: any) {
    console.log('[GlobalRealtime] Content updated:', payload.new?.id)
    
    // 특정 콘텐츠 즉시 무효화 (배치 처리와 별개)
    if (this.queryClient && payload.new?.id) {
      this.queryClient.invalidateQueries({
        queryKey: ['content-v2', payload.new.id],
        exact: true
      })
    }
    
    // 목록 업데이트는 배치 처리로 위임
  }
  
  /**
   * 콘텐츠 DELETE 처리 - 개선된 버전
   */
  private handleContentDelete(payload: any) {
    console.log('[GlobalRealtime] Content deleted:', payload.old?.id)
    
    // 삭제된 콘텐츠 즉시 캐시 제거
    if (this.queryClient && payload.old?.id) {
      this.queryClient.removeQueries({
        queryKey: ['content-v2', payload.old.id],
        exact: true
      })
    }
    
    // 목록 업데이트는 배치 처리로 위임
  }
  
  /**
   * 사용자 변경 처리 - 개선된 버전 (배치 처리 적용)
   */
  private handleUsersChange(payload: any) {
    console.log('[GlobalRealtime] User changed:', payload.eventType, payload.new?.id)
    
    const newData = payload.new || {}
    const oldData = payload.old || {}
    
    // Heartbeat 감지 (중요한 필드가 변경되지 않은 경우)
    const significantFields = ['name', 'role', 'department', 'activity_score', 'last_login_at']
    const hasSignificantChange = significantFields.some(field => 
      newData[field] !== oldData[field]
    )
    
    if (!hasSignificantChange) {
      console.log('[GlobalRealtime] 🚫 Ignoring non-significant user update')
      return
    }
    
    // 중요한 변경은 배치 처리로 위임
    console.log('[GlobalRealtime] Significant user change detected')
  }
  
  
  /**
   * 댓글 변경 처리 - 개선된 버전
   */
  private handleCommentsChange(payload: any) {
    console.log('[GlobalRealtime] Comment changed:', payload.eventType, payload.new?.id)
    
    // 특정 콘텐츠의 댓글 수 즉시 업데이트
    if (this.queryClient && payload.new?.content_id) {
      this.queryClient.invalidateQueries({
        queryKey: ['content-v2', payload.new.content_id],
        exact: true
      })
    }
    
    // 댓글 목록 업데이트는 배치 처리로 위임
  }
  
  /**
   * activity_participants_v2 테이블 구독 - 개선된 버전
   */
  private async subscribeToActivityParticipantsTable(): Promise<void> {
    const client = connectionCore.getClient()
    const channelName = 'activity_participants_v2'
    
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
          this.processEventWithMetrics(channelName, payload.eventType, () => {
            this.handleActivityParticipantsChange(payload)
          })
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus(channelName, status)
      })
    
    this.channelRefs.set(channelName, channel)
    this.initializeMetrics(channelName)
  }
  
  /**
   * 활동 참가자 변경 처리 - 개선된 버전
   */
  private handleActivityParticipantsChange(payload: any) {
    console.log('[GlobalRealtime] Activity participant changed:', payload.eventType, payload.new?.activity_id)
    
    // 특정 활동 정보 즉시 업데이트
    if (this.queryClient && (payload.new?.activity_id || payload.old?.activity_id)) {
      const activityId = payload.new?.activity_id || payload.old?.activity_id
      
      // 특정 활동 및 참가자 정보 즉시 업데이트
      this.queryClient.invalidateQueries({
        queryKey: ['activity-v2', activityId],
        exact: true
      })
      
      this.queryClient.invalidateQueries({
        queryKey: ['activity-participants-v2', activityId],
        exact: false
      })
      
      // 사용자 참가 상태 즉시 업데이트
      if (payload.new?.user_id || payload.old?.user_id) {
        const userId = payload.new?.user_id || payload.old?.user_id
        this.queryClient.invalidateQueries({
          queryKey: ['my-participation-v2', userId, activityId],
          exact: true
        })
      }
    }
    
    // 활동 목록 업데이트는 배치 처리로 위임
  }
  
  /**
   * 추가된 유틸리티 메서드들
   */
  
  /**
   * 구독 상태 조회
   */
  getSubscriptionStates(): Map<string, SubscriptionState> {
    return new Map(this.subscriptionStates)
  }
  
  /**
   * 성능 메트릭 조회
   */
  getPerformanceMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.performanceMetrics)
  }
  
  /**
   * 전체 시스템 상태 조회
   */
  getSystemStatus(): {
    isInitialized: boolean;
    activeChannels: number;
    totalEvents: number;
    averageProcessingTime: number;
    errorRate: number;
  } {
    let totalEvents = 0
    let totalProcessingTime = 0
    let totalErrorRate = 0
    
    this.performanceMetrics.forEach(metrics => {
      totalEvents += metrics.eventCount
      totalProcessingTime += metrics.averageProcessingTime
      totalErrorRate += metrics.errorRate
    })
    
    const channelCount = this.performanceMetrics.size
    
    return {
      isInitialized: this.isInitialized,
      activeChannels: this.channelRefs.size,
      totalEvents,
      averageProcessingTime: channelCount > 0 ? totalProcessingTime / channelCount : 0,
      errorRate: channelCount > 0 ? totalErrorRate / channelCount : 0
    }
  }
  
  /**
   * 강제 재시도 (개발/디버깅용)
   */
  async forceReconnect(tableName?: string): Promise<void> {
    if (tableName) {
      console.log(`[GlobalRealtime] Force reconnecting to ${tableName}`)
      // 특정 테이블 재구독
      const channel = this.channelRefs.get(tableName)
      if (channel) {
        const client = connectionCore.getClient()
        client.removeChannel(channel)
        this.channelRefs.delete(tableName)
        
        // Circuit Breaker 리셋
        this.resetCircuitBreaker(tableName)
        
        // 재구독 시도
        const subscriptionTasks: { [key: string]: () => Promise<void> } = {
          'content_v2': () => this.subscribeToContentTable(),
          'users_v2': () => this.subscribeToUsersTable(),
          'comments_v2': () => this.subscribeToCommentsTable(),
          'activity_participants_v2': () => this.subscribeToActivityParticipantsTable()
        }
        
        const task = subscriptionTasks[tableName]
        if (task) {
          await this.subscribeWithRetry(tableName, task, 3)
        }
      }
    } else {
      console.log('[GlobalRealtime] Force reconnecting all channels')
      // 전체 재초기화
      this.cleanup()
      await this.initialize()
    }
  }
  
  /**
   * 강화된 정리 메서드
   */
  cleanup(): void {
    console.log('[GlobalRealtime] Starting cleanup...')
    
    const client = connectionCore.getClient()
    
    // 모든 이벤트 프로세서 정리
    this.eventProcessors.forEach((timer, key) => {
      clearTimeout(timer)
      console.log(`[GlobalRealtime] Cleared timer: ${key}`)
    })
    this.eventProcessors.clear()
    
    // 배치 업데이트 정리
    this.batchUpdates.clear()
    
    // 채널 구독 해제
    this.channelRefs.forEach((channel, name) => {
      try {
        console.log(`[GlobalRealtime] Unsubscribing from ${name}`)
        client.removeChannel(channel)
      } catch (error) {
        console.error(`[GlobalRealtime] Error unsubscribing from ${name}:`, error)
      }
    })
    
    // 모든 상태 초기화
    this.channelRefs.clear()
    this.subscriptionStates.clear()
    this.performanceMetrics.clear()
    this.circuitBreaker.clear()
    
    // WeakMap은 자동으로 가비지 콜렉션됨
    
    this.isInitialized = false
    this.initializationPromise = null
    
    console.log('[GlobalRealtime] ✅ Cleanup complete')
  }
}

// 싱글톤 인스턴스 export
export const globalRealtimeManager = GlobalRealtimeManager.getInstance()

// 타입 export
export type { SubscriptionState, PerformanceMetrics, CircuitBreakerState }