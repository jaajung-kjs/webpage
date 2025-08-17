/**
 * Connection Recovery System
 * 
 * 네트워크 연결 및 페이지 visibility 복구를 처리하는 시스템
 * - Document Visibility API를 통한 탭 전환 감지
 * - Online/Offline 이벤트를 통한 네트워크 상태 감지
 * - Focus 이벤트를 통한 윈도우 포커스 감지
 * - 자동 재연결 및 데이터 갱신
 */

import { QueryClient } from '@tanstack/react-query'
import { connectionCore } from './connection-core'
import { realtimeCore } from './realtime-core'
import { authManager } from './auth-manager'
import { PromiseManager } from '../utils/promise-manager'
import { CircuitBreaker, CircuitBreakerPresets } from '../utils/circuit-breaker'

// 쿼리 우선순위 타입
enum QueryPriority {
  CRITICAL = 1,    // 사용자 인증, 현재 콘텐츠
  HIGH = 2,        // 활동 중인 데이터
  NORMAL = 3,      // 캐시된 데이터
  LOW = 4          // 메타데이터, 통계
}

// 배치 처리 결과 타입
interface BatchResult {
  priority: QueryPriority
  successCount: number
  errorCount: number
  errors: Error[]
  duration: number
}

// 복구 전략 타입
enum RecoveryStrategy {
  LIGHT = 'light',      // Priority 1만
  PARTIAL = 'partial',  // Priority 1-2
  FULL = 'full'         // 모든 Priority
}

export class ConnectionRecoveryManager {
  private static instance: ConnectionRecoveryManager
  private queryClient: QueryClient | null = null
  private isRecovering = false
  private lastVisibilityChange = Date.now()
  private lastOnlineTime = Date.now()
  private recoveryHandlers: Set<() => void> = new Set()
  private recoveryCircuitBreaker: CircuitBreaker | null = null
  
  // 복구 설정
  private readonly RECOVERY_DELAY = 50 // 복구 시작 전 대기 시간 (ms) - 단축
  private readonly BACKGROUND_THRESHOLD = 300000 // 5분 이상 백그라운드에 있었으면 전체 갱신
  
  // 배치 처리 설정
  private readonly BATCH_SIZE = 5 // 기본 배치 크기 - 감소하여 타임아웃 방지
  private readonly MAX_CONCURRENT_BATCHES = 3 // 최대 동시 실행 배치 수 - 감소하여 서버 부하 완화
  private readonly BATCH_DELAY = 50 // 배치 간 대기 시간 (ms) - 증가하여 안정성 향상
  private readonly MAX_RETRIES = 3 // 최대 재시도 횟수 - 증가하여 네트워크 불안정 대응
  
  // 모니터링 데이터
  private batchMetrics = {
    totalBatches: 0,
    successfulBatches: 0,
    failedBatches: 0,
    averageRecoveryTime: 0,
    lastRecoveryTime: 0,
    failedQueries: new Set<string>()
  }
  
  private constructor() {
    this.initializeCircuitBreaker()
    this.setupEventListeners()
  }
  
  /**
   * 쿼리 키를 우선순위로 분류
   */
  private classifyQueryByPriority(queryKey: string[]): QueryPriority {
    if (!queryKey || queryKey.length === 0) return QueryPriority.LOW

    const key = queryKey.join('_').toLowerCase()

    // Priority 1: 사용자 인증, 현재 콘텐츠
    if (key.includes('auth') || 
        key.includes('user') || 
        key.includes('profile') || 
        key.includes('current') ||
        key.includes('me')) {
      return QueryPriority.CRITICAL
    }

    // Priority 2: 활동 중인 데이터
    if (key.includes('comments') || 
        key.includes('likes') || 
        key.includes('bookmarks') ||
        key.includes('activities') ||
        key.includes('notifications') ||
        key.includes('messages')) {
      return QueryPriority.HIGH
    }

    // Priority 3: 캐시된 데이터
    if (key.includes('contents') || 
        key.includes('posts') || 
        key.includes('list') ||
        key.includes('feed') ||
        key.includes('search')) {
      return QueryPriority.NORMAL
    }

    // Priority 4: 메타데이터, 통계
    return QueryPriority.LOW
  }

  /**
   * 복구 전략에 따른 우선순위 필터
   */
  private getTargetPriorities(strategy: RecoveryStrategy): QueryPriority[] {
    switch (strategy) {
      case RecoveryStrategy.LIGHT:
        return [QueryPriority.CRITICAL]
      case RecoveryStrategy.PARTIAL:
        return [QueryPriority.CRITICAL, QueryPriority.HIGH]
      case RecoveryStrategy.FULL:
        return [QueryPriority.CRITICAL, QueryPriority.HIGH, QueryPriority.NORMAL, QueryPriority.LOW]
      default:
        return [QueryPriority.CRITICAL]
    }
  }

  /**
   * Circuit Breaker 초기화
   */
  private initializeCircuitBreaker(): void {
    // 복구 작업용 Circuit Breaker (관대한 설정)
    this.recoveryCircuitBreaker = new CircuitBreaker({
      ...CircuitBreakerPresets.tolerant,
      failureThreshold: 5, // 복구 작업은 더 많은 시도 허용
      resetTimeout: 60000, // 1분
      monitoringWindow: 120000 // 2분
    }).fallback((error) => {
      console.warn('[ConnectionRecovery] Recovery circuit breaker triggered, using minimal recovery')
      // Circuit이 Open되면 최소한의 복구만 수행
      return this.performMinimalRecovery()
    })

    console.log('[ConnectionRecovery] Recovery circuit breaker initialized')
  }
  
  static getInstance(): ConnectionRecoveryManager {
    if (!ConnectionRecoveryManager.instance) {
      ConnectionRecoveryManager.instance = new ConnectionRecoveryManager()
    }
    return ConnectionRecoveryManager.instance
  }
  
  /**
   * QueryClient 설정
   */
  setQueryClient(client: QueryClient) {
    this.queryClient = client
    console.log('[ConnectionRecovery] QueryClient set')
  }
  
  /**
   * 배치로 쿼리 무효화 수행
   */
  private async invalidateQueriesInBatches(
    strategy: RecoveryStrategy = RecoveryStrategy.FULL,
    refetchType: 'active' | 'inactive' | 'all' | 'none' = 'none'
  ): Promise<BatchResult[]> {
    if (!this.queryClient) {
      throw new Error('QueryClient not set')
    }

    const startTime = Date.now()
    console.log(`[ConnectionRecovery] Starting batch invalidation with ${strategy} strategy`)

    // 1. 모든 쿼리를 우선순위별로 분류
    const queriesByPriority = new Map<QueryPriority, any[]>()
    const targetPriorities = this.getTargetPriorities(strategy)

    this.queryClient.getQueryCache().getAll().forEach(query => {
      if (!query.queryKey) return
      
      const priority = this.classifyQueryByPriority(query.queryKey as string[])
      if (!targetPriorities.includes(priority)) return

      if (!queriesByPriority.has(priority)) {
        queriesByPriority.set(priority, [])
      }
      queriesByPriority.get(priority)!.push(query)
    })

    console.log(`[ConnectionRecovery] Classified queries:`, 
      Array.from(queriesByPriority.entries()).map(([priority, queries]) => 
        `Priority ${priority}: ${queries.length} queries`
      ).join(', ')
    )

    // 2. 우선순위 순으로 배치 처리
    const results: BatchResult[] = []
    
    for (const priority of [QueryPriority.CRITICAL, QueryPriority.HIGH, QueryPriority.NORMAL, QueryPriority.LOW]) {
      if (!queriesByPriority.has(priority)) continue
      
      const queries = queriesByPriority.get(priority)!
      const batchResult = await this.processPriorityBatch(priority, queries, refetchType)
      results.push(batchResult)

      // 배치 간 짧은 대기 시간
      if (priority !== QueryPriority.LOW) {
        await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY))
      }
    }

    // 3. 메트릭 업데이트
    const totalTime = Date.now() - startTime
    this.updateBatchMetrics(results, totalTime)

    console.log(`[ConnectionRecovery] Batch invalidation completed in ${totalTime}ms`)
    return results
  }

  /**
   * 우선순위별 배치 처리
   */
  private async processPriorityBatch(
    priority: QueryPriority,
    queries: any[],
    refetchType: 'active' | 'inactive' | 'all' | 'none'
  ): Promise<BatchResult> {
    const batchStartTime = Date.now()
    const batches = this.createBatches(queries, this.BATCH_SIZE)
    const errors: Error[] = []
    let successCount = 0
    let errorCount = 0

    console.log(`[ConnectionRecovery] Processing Priority ${priority}: ${queries.length} queries in ${batches.length} batches`)

    // Promise.allSettled로 일부 실패 허용하면서 병렬 처리
    const batchPromises = batches.map(async (batch, index) => {
      try {
        await this.processSingleBatch(batch, refetchType, priority, index)
        successCount += batch.length
        this.batchMetrics.successfulBatches++
      } catch (error) {
        console.error(`[ConnectionRecovery] Batch ${index} failed for Priority ${priority}:`, error)
        errorCount += batch.length
        errors.push(error as Error)
        this.batchMetrics.failedBatches++
        
        // 실패한 쿼리들 추적
        batch.forEach(query => {
          if (query.queryKey) {
            this.batchMetrics.failedQueries.add(query.queryKey.join('_'))
          }
        })
      }
      
      this.batchMetrics.totalBatches++
    })

    // 최대 동시 실행 수 제한
    const concurrencyLimit = Math.min(this.MAX_CONCURRENT_BATCHES, batchPromises.length)
    
    for (let i = 0; i < batchPromises.length; i += concurrencyLimit) {
      const batch = batchPromises.slice(i, i + concurrencyLimit)
      await Promise.allSettled(batch)
    }

    const duration = Date.now() - batchStartTime
    
    return {
      priority,
      successCount,
      errorCount,
      errors,
      duration
    }
  }

  /**
   * 단일 배치 처리 (재시도 포함)
   */
  private async processSingleBatch(
    batch: any[],
    refetchType: 'active' | 'inactive' | 'all' | 'none',
    priority: QueryPriority,
    batchIndex: number
  ): Promise<void> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const queryKeys = batch
          .map(query => query.queryKey)
          .filter(key => key && key.length > 0)

        if (queryKeys.length === 0) return

        // 개별 쿼리 무효화로 변경 (더 효율적)
        const invalidatePromises = queryKeys.map(key => 
          this.queryClient!.invalidateQueries({
            queryKey: key,
            refetchType: refetchType === 'none' ? 'inactive' : refetchType as any
          })
        )
        
        // Promise.allSettled로 일부 실패 허용
        await PromiseManager.withTimeout(
          Promise.allSettled(invalidatePromises),
          {
            timeout: 2000, // 타임아웃 감소
            key: `batch-invalidation-${priority}-${batchIndex}-${attempt}`,
            errorMessage: `Batch invalidation timeout for Priority ${priority}`
          }
        )

        // 성공하면 리턴
        return
        
      } catch (error) {
        lastError = error as Error
        console.warn(`[ConnectionRecovery] Batch ${batchIndex} attempt ${attempt + 1} failed:`, error)
        
        if (attempt < this.MAX_RETRIES) {
          // 재시도 전 지수 백오프 대기 (100ms, 200ms, 400ms, 800ms)
          const backoffDelay = 100 * Math.pow(2, attempt)
          console.log(`[ConnectionRecovery] Retrying batch ${batchIndex} after ${backoffDelay}ms delay (attempt ${attempt + 1}/${this.MAX_RETRIES})`)
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
        }
      }
    }

    // 모든 재시도 실패
    throw lastError || new Error('Unknown batch processing error')
  }

  /**
   * 배치 생성 유틸리티
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    
    return batches
  }

  /**
   * 배치 메트릭 업데이트
   */
  private updateBatchMetrics(results: BatchResult[], totalTime: number): void {
    this.batchMetrics.lastRecoveryTime = totalTime
    
    // 평균 복구 시간 계산 (이동 평균)
    if (this.batchMetrics.averageRecoveryTime === 0) {
      this.batchMetrics.averageRecoveryTime = totalTime
    } else {
      this.batchMetrics.averageRecoveryTime = 
        (this.batchMetrics.averageRecoveryTime * 0.7) + (totalTime * 0.3)
    }

    console.log('[ConnectionRecovery] Batch metrics updated:', {
      totalBatches: this.batchMetrics.totalBatches,
      successfulBatches: this.batchMetrics.successfulBatches,
      failedBatches: this.batchMetrics.failedBatches,
      successRate: `${((this.batchMetrics.successfulBatches / this.batchMetrics.totalBatches) * 100).toFixed(1)}%`,
      averageRecoveryTime: `${this.batchMetrics.averageRecoveryTime.toFixed(0)}ms`,
      failedQueriesCount: this.batchMetrics.failedQueries.size
    })
  }

  /**
   * 복구 핸들러 등록
   */
  onRecovery(handler: () => void) {
    this.recoveryHandlers.add(handler)
    return () => this.recoveryHandlers.delete(handler)
  }
  
  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners() {
    if (typeof window === 'undefined') return
    
    // 1. Document Visibility Change (탭 전환) - ConnectionCore와 중복 방지를 위해 비활성화
    // ConnectionCore가 visibility 이벤트를 처리하고 ConnectionRecovery를 호출함
    // document.addEventListener('visibilitychange', this.handleVisibilityChange)
    
    // 2. Online/Offline (네트워크 상태) - ConnectionCore가 마스터로 처리하므로 비활성화
    // window.addEventListener('online', this.handleOnline)
    // window.addEventListener('offline', this.handleOffline)
    
    // 3. Window Focus (윈도우 포커스) - 배치 누적 방지를 위해 비활성화
    // window.addEventListener('focus', this.handleFocus)
    // window.addEventListener('blur', this.handleBlur)
    
    // 4. Page Show (브라우저 뒤로가기/앞으로가기)
    window.addEventListener('pageshow', this.handlePageShow)
    
    console.log('[ConnectionRecovery] Event listeners registered (visibility/focus/blur/online/offline disabled to prevent conflicts with ConnectionCore master)')
  }
  
  /**
   * Visibility 변경 처리 - 프로그레시브 복구
   */
  private handleVisibilityChange = () => {
    const isHidden = document.hidden
    const now = Date.now()
    
    console.log(`[ConnectionRecovery] Visibility changed: ${isHidden ? 'hidden' : 'visible'}`)
    
    if (!isHidden) {
      // 페이지가 다시 보이게 됨
      const hiddenDuration = now - this.lastVisibilityChange
      
      if (hiddenDuration > this.BACKGROUND_THRESHOLD) {
        console.log(`[ConnectionRecovery] Page was hidden for ${hiddenDuration}ms, triggering full recovery`)
        this.handleVisibilityRestore(RecoveryStrategy.FULL)
      } else if (hiddenDuration > 60000) { // 1분 이상
        console.log(`[ConnectionRecovery] Page was hidden for ${hiddenDuration}ms, triggering partial recovery`)
        this.handleVisibilityRestore(RecoveryStrategy.PARTIAL)
      } else if (hiddenDuration > 30000) { // 30초 이상
        console.log(`[ConnectionRecovery] Page was hidden for ${hiddenDuration}ms, triggering light recovery`)
        this.handleVisibilityRestore(RecoveryStrategy.LIGHT)
      }
      // 30초 미만은 복구 불필요
    } else {
      // 페이지가 숨겨짐 - 복구 중이면 중단 방지
      if (this.isRecovering) {
        console.log('[ConnectionRecovery] Page hidden but recovery in progress, not interrupting')
        return
      }
    }
    
    this.lastVisibilityChange = now
  }

  /**
   * 프로그레시브 Visibility 복구
   */
  private async handleVisibilityRestore(strategy: RecoveryStrategy): Promise<void> {
    if (this.isRecovering) {
      console.log('[ConnectionRecovery] Recovery already in progress, skipping visibility restore')
      return
    }

    const recoveryRequest = async () => {
      return this.performProgressiveRecovery('visibility', strategy)
    }

    try {
      if (this.recoveryCircuitBreaker) {
        await this.recoveryCircuitBreaker.execute(recoveryRequest)
      } else {
        await recoveryRequest()
      }
    } catch (error) {
      console.error('[ConnectionRecovery] Visibility restore failed:', error)
    }
  }
  
  /**
   * Online 이벤트 처리 - 우선순위 기반 복구
   */
  private handleOnline = () => {
    console.log('[ConnectionRecovery] Network online')
    this.lastOnlineTime = Date.now()
    this.handleNetworkRestore()
  }

  /**
   * 네트워크 복구 처리
   */
  private async handleNetworkRestore(): Promise<void> {
    if (this.isRecovering) {
      console.log('[ConnectionRecovery] Recovery already in progress, skipping network restore')
      return
    }

    // 네트워크 복구는 항상 전체 복구로 시작
    const recoveryRequest = async () => {
      return this.performProgressiveRecovery('network', RecoveryStrategy.FULL)
    }

    try {
      if (this.recoveryCircuitBreaker) {
        await this.recoveryCircuitBreaker.execute(recoveryRequest)
      } else {
        await recoveryRequest()
      }
    } catch (error) {
      console.error('[ConnectionRecovery] Network restore failed:', error)
    }
  }
  
  /**
   * Offline 이벤트 처리
   */
  private handleOffline = () => {
    console.log('[ConnectionRecovery] Network offline')
    // 오프라인 상태 처리 (선택사항)
  }
  
  /**
   * Focus 이벤트 처리 - 배치 누적 방지를 위해 비활성화
   */
  private handleFocus = async () => {
    console.log('[ConnectionRecovery] Focus event ignored - disabled to prevent batch accumulation')
    // 아무것도 하지 않음 - 배치 누적 방지를 위해 비활성화
  }
  
  /**
   * Blur 이벤트 처리
   */
  private handleBlur = () => {
    console.log('[ConnectionRecovery] Window blurred')
    // blur 이벤트 시에는 특별한 처리 없음
    // PromiseManager가 recovery 관련 Promise를 제외하고 취소함
  }
  
  /**
   * Page Show 이벤트 처리 (뒤로가기/앞으로가기)
   */
  private handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      console.log('[ConnectionRecovery] Page restored from cache')
      this.triggerRecovery('pageshow', true)
    }
  }
  
  /**
   * 복구 트리거 (기존 호환성을 위해 유지)
   */
  private async triggerRecovery(source: string, fullRecovery: boolean) {
    const strategy = fullRecovery ? RecoveryStrategy.FULL : RecoveryStrategy.PARTIAL
    await this.triggerProgressiveRecovery(source, strategy)
  }

  /**
   * 프로그레시브 복구 트리거 (public 메서드로 변경 - ConnectionCore에서 호출)
   */
  async triggerProgressiveRecovery(source: string, strategy: RecoveryStrategy) {
    if (this.isRecovering) {
      console.log('[ConnectionRecovery] Recovery already in progress, skipping')
      return
    }
    
    // Circuit Breaker를 통한 복구 수행
    const recoveryRequest = async () => {
      return this.performProgressiveRecovery(source, strategy)
    }

    try {
      if (this.recoveryCircuitBreaker) {
        await this.recoveryCircuitBreaker.execute(recoveryRequest)
      } else {
        await recoveryRequest()
      }
    } catch (error) {
      console.error('[ConnectionRecovery] Progressive recovery failed:', error)
    }
  }

  /**
   * 프로그레시브 복구 수행 (새로운 배치 기반)
   */
  private async performProgressiveRecovery(source: string, strategy: RecoveryStrategy) {
    this.isRecovering = true
    console.log(`[ConnectionRecovery] Starting progressive recovery from ${source} (strategy: ${strategy})`)
    
    try {
      // 짧은 지연 후 복구 시작 (빠른 전환 시 불필요한 복구 방지)
      await PromiseManager.withTimeout(
        new Promise(resolve => setTimeout(resolve, this.RECOVERY_DELAY)),
        {
          timeout: 1000,
          key: `recovery-delay-${source}`,
          errorMessage: 'Recovery delay timeout'
        }
      )
      
      // 0. WebSocket 상태 확인 및 필요시 재생성 (Deterministic)
      const isRealtimeHealthy = connectionCore.isRealtimeHealthy()
      console.log(`[ConnectionRecovery] WebSocket health check: ${isRealtimeHealthy ? 'healthy' : 'unhealthy'}`)
      
      // WebSocket이 stale하면 즉시 재생성 (휴리스틱 제거)
      if (!isRealtimeHealthy) {
        console.log('[ConnectionRecovery] Stale WebSocket detected, requesting refresh')
        
        try {
          // ConnectionCore에 Realtime 재생성 요청
          await connectionCore.refreshRealtimeConnection()
          console.log('[ConnectionRecovery] WebSocket refreshed successfully')
        } catch (error) {
          console.error('[ConnectionRecovery] Failed to refresh WebSocket:', error)
        }
      }
      
      // FULL 복구 시 추가 처리
      if (strategy === RecoveryStrategy.FULL) {
        // Circuit Breaker 상태 확인 및 리셋
        if (connectionCore.isCircuitBreakerOpen()) {
          console.log('[ConnectionRecovery] Circuit Breaker is open, resetting for FULL recovery')
          connectionCore.resetCircuitBreakers()
        }
        
        // 백그라운드/네트워크 복귀 시 세션 갱신
        if (source === 'visibility' || source === 'network') {
          console.log('[ConnectionRecovery] Refreshing session after background/network recovery')
          try {
            const { error } = await authManager.refreshSessionAfterBackground()
            if (error) {
              console.warn('[ConnectionRecovery] Session refresh failed, continuing with recovery:', error)
            } else {
              console.log('[ConnectionRecovery] Session refreshed successfully')
            }
          } catch (sessionError) {
            console.warn('[ConnectionRecovery] Session refresh exception, continuing:', sessionError)
          }
        }
      }
      
      // 1. Supabase 연결 복구 (모든 전략에서 수행)
      const connectionStatus = connectionCore.getStatus()
      if (connectionStatus.state !== 'connected') {
        console.log('[ConnectionRecovery] Reconnecting to Supabase...')
        await PromiseManager.withTimeout(
          connectionCore.connect(),
          {
            timeout: 10000,
            key: `recovery-connect-${source}`,
            errorMessage: 'Connection recovery timeout after 10 seconds'
          }
        )
      }
      
      // 2. Realtime 구독 복구 (HIGH 이상에서 수행)
      if (strategy !== RecoveryStrategy.LIGHT) {
        console.log('[ConnectionRecovery] Restoring realtime subscriptions...')
        realtimeCore.handleReconnection()
      }
      
      // 3. React Query 캐시 배치 갱신
      if (this.queryClient) {
        console.log(`[ConnectionRecovery] Starting batch cache invalidation with ${strategy} strategy`)
        // 네트워크 복구 시에는 실제 데이터 fetch 필요
        const refetchType = source === 'network' ? 'active' : 'none'
        console.log(`[ConnectionRecovery] Using refetchType: ${refetchType} for source: ${source}`)
        const batchResults = await this.invalidateQueriesInBatches(
          strategy, 
          refetchType
        )
        
        // 배치 결과 로깅
        const totalQueries = batchResults.reduce((sum, result) => sum + result.successCount + result.errorCount, 0)
        const successQueries = batchResults.reduce((sum, result) => sum + result.successCount, 0)
        const errorQueries = batchResults.reduce((sum, result) => sum + result.errorCount, 0)
        
        console.log(`[ConnectionRecovery] Batch invalidation completed: ${successQueries}/${totalQueries} successful`)
        
        // 오래된 데이터 제거 (FULL 전략에서만)
        if (strategy === RecoveryStrategy.FULL) {
          const removeCount = this.queryClient.getQueryCache().getAll().length
          this.queryClient.removeQueries({
            predicate: (query) => {
              const lastFetch = query.state.dataUpdatedAt
              const age = Date.now() - lastFetch
              return age > 5 * 60 * 1000 // 5분 이상 오래된 데이터
            }
          })
          const remainingCount = this.queryClient.getQueryCache().getAll().length
          console.log(`[ConnectionRecovery] Removed ${removeCount - remainingCount} stale queries`)
        }
      }
      
      // 4. 커스텀 복구 핸들러 실행 (PARTIAL 이상에서만)
      if (strategy !== RecoveryStrategy.LIGHT) {
        this.recoveryHandlers.forEach(handler => {
          try {
            handler()
          } catch (error) {
            console.error('[ConnectionRecovery] Recovery handler error:', error)
          }
        })
      }
      
      console.log(`[ConnectionRecovery] Progressive recovery completed successfully (strategy: ${strategy})`)
    } catch (error) {
      console.error('[ConnectionRecovery] Progressive recovery failed:', error)
      throw error
    } finally {
      this.isRecovering = false
    }
  }

  /**
   * 레거시 복구 수행 (기존 호환성을 위해 유지)
   */
  private async performRecovery(source: string, fullRecovery: boolean) {
    const strategy = fullRecovery ? RecoveryStrategy.FULL : RecoveryStrategy.PARTIAL
    return this.performProgressiveRecovery(source, strategy)
  }
  
  /**
   * 최소한의 복구 수행 (Circuit Breaker fallback) - 배치 처리 적용
   */
  private async performMinimalRecovery(): Promise<void> {
    console.log('[ConnectionRecovery] Performing minimal recovery (circuit breaker fallback)')
    
    try {
      // 최소한의 연결 복구만 수행
      const connectionStatus = connectionCore.getStatus()
      if (connectionStatus.state !== 'connected') {
        console.log('[ConnectionRecovery] Attempting minimal connection recovery...')
        await connectionCore.connect()
      }
      
      // 기본적인 배치 캐시 무효화만 수행 (CRITICAL 우선순위만)
      if (this.queryClient) {
        try {
          await this.invalidateQueriesInBatches(RecoveryStrategy.LIGHT, 'none')
        } catch (batchError) {
          // 배치 처리 실패시 기본 무효화 시도
          console.warn('[ConnectionRecovery] Batch minimal recovery failed, falling back to basic invalidation')
          this.queryClient.invalidateQueries({
            refetchType: 'inactive' as any, // 네트워크 요청 없이 무효화만
            type: 'active'
          })
        }
      }
      
      console.log('[ConnectionRecovery] Minimal recovery completed')
    } catch (error) {
      console.error('[ConnectionRecovery] Minimal recovery failed:', error)
      // 최소 복구도 실패하면 로그만 남기고 계속 진행
    }
  }

  /**
   * 수동 복구 트리거 (프로그레시브)
   */
  async manualRecovery(strategy: RecoveryStrategy | string = RecoveryStrategy.FULL) {
    // string으로 전달된 경우 RecoveryStrategy enum으로 변환
    let recoveryStrategy: RecoveryStrategy
    if (typeof strategy === 'string') {
      switch (strategy.toUpperCase()) {
        case 'LIGHT':
          recoveryStrategy = RecoveryStrategy.LIGHT
          break
        case 'PARTIAL':
          recoveryStrategy = RecoveryStrategy.PARTIAL
          break
        case 'FULL':
        default:
          recoveryStrategy = RecoveryStrategy.FULL
          break
      }
    } else {
      recoveryStrategy = strategy
    }
    
    console.log(`[ConnectionRecovery] Manual recovery triggered with strategy: ${recoveryStrategy}`)
    await this.triggerProgressiveRecovery('manual', recoveryStrategy)
  }

  /**
   * 배치 메트릭 조회
   */
  getBatchMetrics() {
    return {
      ...this.batchMetrics,
      failedQueries: Array.from(this.batchMetrics.failedQueries),
      successRate: this.batchMetrics.totalBatches > 0 
        ? ((this.batchMetrics.successfulBatches / this.batchMetrics.totalBatches) * 100).toFixed(1) + '%'
        : '0%'
    }
  }

  /**
   * 실패한 쿼리 목록 조회
   */
  getFailedQueries(): string[] {
    return Array.from(this.batchMetrics.failedQueries)
  }

  /**
   * 실패한 쿼리 재시도
   */
  async retryFailedQueries(): Promise<void> {
    if (this.batchMetrics.failedQueries.size === 0) {
      console.log('[ConnectionRecovery] No failed queries to retry')
      return
    }

    if (!this.queryClient) {
      console.error('[ConnectionRecovery] QueryClient not available for retry')
      return
    }

    console.log(`[ConnectionRecovery] Retrying ${this.batchMetrics.failedQueries.size} failed queries`)
    
    const failedQueryKeys = Array.from(this.batchMetrics.failedQueries)
    
    try {
      for (const queryKeyStr of failedQueryKeys) {
        try {
          const queryKey = queryKeyStr.split('_')
          await this.queryClient.invalidateQueries({
            predicate: (query) => {
              return JSON.stringify(query.queryKey) === JSON.stringify(queryKey)
            },
            refetchType: 'active'
          })
          
          // 성공하면 실패 목록에서 제거
          this.batchMetrics.failedQueries.delete(queryKeyStr)
        } catch (error) {
          console.warn(`[ConnectionRecovery] Retry failed for query: ${queryKeyStr}`, error)
        }
      }
      
      console.log(`[ConnectionRecovery] Retry completed. Remaining failed queries: ${this.batchMetrics.failedQueries.size}`)
    } catch (error) {
      console.error('[ConnectionRecovery] Failed queries retry failed:', error)
    }
  }

  /**
   * 메트릭 리셋
   */
  resetMetrics(): void {
    this.batchMetrics = {
      totalBatches: 0,
      successfulBatches: 0,
      failedBatches: 0,
      averageRecoveryTime: 0,
      lastRecoveryTime: 0,
      failedQueries: new Set<string>()
    }
    
    console.log('[ConnectionRecovery] Batch metrics reset')
  }

  /**
   * 복구 전략 변경을 위한 수동 배치 무효화
   */
  async invalidateWithStrategy(
    strategy: RecoveryStrategy, 
    refetchType: 'active' | 'inactive' | 'all' | 'none' = 'none'
  ): Promise<BatchResult[]> {
    console.log(`[ConnectionRecovery] Manual batch invalidation with strategy: ${strategy}`)
    return this.invalidateQueriesInBatches(strategy, refetchType)
  }

  /**
   * Circuit Breaker 상태 조회
   */
  getCircuitBreakerStatus(): { state: string; metrics: any } | null {
    if (!this.recoveryCircuitBreaker) return null
    
    return {
      state: this.recoveryCircuitBreaker.getState(),
      metrics: this.recoveryCircuitBreaker.getMetrics()
    }
  }

  /**
   * Circuit Breaker 수동 리셋
   */
  resetCircuitBreaker(): void {
    if (this.recoveryCircuitBreaker) {
      this.recoveryCircuitBreaker.reset()
      console.log('[ConnectionRecovery] Recovery circuit breaker reset')
    }
  }
  
  /**
   * 정리
   */
  cleanup() {
    if (typeof window === 'undefined') return
    
    // document.removeEventListener('visibilitychange', this.handleVisibilityChange)  // 비활성화됨
    // window.removeEventListener('online', this.handleOnline)  // 비활성화됨
    // window.removeEventListener('offline', this.handleOffline)  // 비활성화됨
    // window.removeEventListener('focus', this.handleFocus)  // 비활성화됨
    // window.removeEventListener('blur', this.handleBlur)    // 비활성화됨
    window.removeEventListener('pageshow', this.handlePageShow)
    
    this.recoveryHandlers.clear()
    
    // Circuit Breaker 정리
    if (this.recoveryCircuitBreaker) {
      this.recoveryCircuitBreaker.destroy()
      this.recoveryCircuitBreaker = null
    }

    // 메트릭 정리
    this.resetMetrics()
    
    console.log('[ConnectionRecovery] Cleanup completed')
  }
}

// 타입들을 export
export { QueryPriority, RecoveryStrategy }
export type { BatchResult }

// 싱글톤 인스턴스 export
export const connectionRecovery = ConnectionRecoveryManager.getInstance()