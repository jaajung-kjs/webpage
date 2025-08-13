/**
 * ConnectionCore - 통합 연결 관리 시스템
 * 
 * 단일 책임: Supabase 연결 상태 관리
 * - 단일 클라이언트 인스턴스
 * - 명확한 연결 상태 머신
 * - 통합된 visibility 처리
 */

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import { getEnvConfig } from '../config/environment'
import { PromiseManager } from '../utils/promise-manager'
import { CircuitBreaker, CircuitBreakerPresets } from '../utils/circuit-breaker'

// 연결 상태 타입
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'suspended'

// 연결 이벤트 타입
export type ConnectionEvent = 
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'ERROR'; error: Error }
  | { type: 'RECONNECT' }
  | { type: 'VISIBILITY_CHANGE'; visible: boolean }

// 연결 상태 정보
export interface ConnectionStatus {
  state: ConnectionState
  lastConnectedAt: number | null
  lastError: Error | null
  reconnectAttempts: number
  isVisible: boolean
  circuitBreakerState?: string
  circuitBreakerMetrics?: {
    failureRate: number
    consecutiveFailures: number
    totalRequests: number
  }
}

// 설정 옵션
export interface ConnectionConfig {
  maxReconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
  enableAutoReconnect?: boolean
  enableCircuitBreaker?: boolean
  circuitBreakerConfig?: {
    failureThreshold?: number
    resetTimeout?: number
    monitoringWindow?: number
  }
}

/**
 * ConnectionCore 클래스
 * 모든 Supabase 연결을 중앙에서 관리
 */
export class ConnectionCore {
  private static instance: ConnectionCore
  private client: SupabaseClient<Database>
  private status: ConnectionStatus
  private listeners: Set<(status: ConnectionStatus) => void>
  private config: Required<ConnectionConfig> & { 
    circuitBreakerConfig: Required<NonNullable<ConnectionConfig['circuitBreakerConfig']>> 
  }
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private visibilityHandler: (() => void) | null = null
  private focusHandler: (() => void) | null = null
  private blurHandler: (() => void) | null = null
  private pageshowHandler: ((event: PageTransitionEvent) => void) | null = null
  private pagehideHandler: (() => void) | null = null
  private onlineHandler: (() => void) | null = null
  private offlineHandler: (() => void) | null = null
  private heartbeatFailures: number = 0
  private readonly MAX_HEARTBEAT_FAILURES = 3
  private heartbeatCircuitBreaker: CircuitBreaker | null = null
  private connectionCircuitBreaker: CircuitBreaker | null = null
  
  // DB 테스트 관련 플래그와 타임스탬프
  private lastDbTestTime: number = 0
  private readonly DB_TEST_COOLDOWN = 30000 // 30초 쿨다운
  private isDbTesting: boolean = false
  private visibilityDebounceTimer: NodeJS.Timeout | null = null

  private constructor() {
    // 환경 설정 가져오기
    const envConfig = getEnvConfig()
    
    console.log(`[ConnectionCore] Initializing in ${envConfig.environment} mode`)

    // Supabase 클라이언트 생성 (단일 인스턴스)
    this.client = createClient<Database>(envConfig.supabaseUrl, envConfig.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',  // PKCE 플로우 활성화
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'kepco-ai-auth'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        },
        timeout: 20000
      },
      global: {
        headers: {
          'x-application-name': 'kepco-ai-community'
        }
      }
    })

    // 초기 상태
    this.status = {
      state: 'disconnected',
      lastConnectedAt: null,
      lastError: null,
      reconnectAttempts: 0,
      isVisible: true
    }

    // 기본 설정
    this.config = {
      maxReconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      enableAutoReconnect: true,
      enableCircuitBreaker: true,
      circuitBreakerConfig: {
        failureThreshold: 3,
        resetTimeout: 30000, // 30초
        monitoringWindow: 60000 // 1분
      }
    }

    this.listeners = new Set()
    
    // Circuit Breaker 초기화
    this.initializeCircuitBreakers()
    
    // 초기화
    this.initialize()
  }

  /**
   * Circuit Breaker 초기화
   */
  private initializeCircuitBreakers(): void {
    if (!this.config.enableCircuitBreaker) {
      console.log('[ConnectionCore] Circuit Breaker disabled')
      return
    }

    // Heartbeat용 Circuit Breaker (더 민감하게)
    this.heartbeatCircuitBreaker = new CircuitBreaker({
      ...CircuitBreakerPresets.network,
      failureThreshold: 2, // heartbeat는 더 민감하게
      resetTimeout: 15000, // 15초
      monitoringWindow: 30000
    }).fallback((error) => {
      console.warn('[ConnectionCore] Heartbeat circuit breaker triggered, using cached status')
      // Heartbeat 실패 시 캐시된 상태 사용
      return { data: null, error: null }
    })

    // 연결용 Circuit Breaker
    this.connectionCircuitBreaker = new CircuitBreaker({
      ...this.config.circuitBreakerConfig,
      enableMetrics: true
    }).fallback((error) => {
      console.warn('[ConnectionCore] Connection circuit breaker triggered, using offline mode')
      // 연결 실패 시 오프라인 모드로 전환
      return { data: { session: null }, error: null }
    })

    console.log('[ConnectionCore] Circuit Breakers initialized')
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): ConnectionCore {
    if (!ConnectionCore.instance) {
      ConnectionCore.instance = new ConnectionCore()
    }
    return ConnectionCore.instance
  }

  /**
   * Supabase 클라이언트 재초기화
   * DB 연결이 끊어진 경우 새로운 클라이언트 생성
   */
  private async reinitializeClient(): Promise<void> {
    console.log('[ConnectionCore] Reinitializing Supabase client...')
    
    // 기존 이벤트 리스너 정리
    this.cleanup()
    
    // 환경 설정 가져오기
    const envConfig = getEnvConfig()
    
    // 새로운 클라이언트 생성
    this.client = createClient<Database>(envConfig.supabaseUrl, envConfig.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'kepco-ai-auth'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        },
        timeout: 20000
      },
      global: {
        headers: {
          'x-application-name': 'kepco-ai-community'
        }
      }
    })
    
    // Auth 상태 변경 구독 재설정 (INITIAL_SESSION 제외)
    this.client.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION은 무시 (무한 루프 방지)
      if (event === 'INITIAL_SESSION') {
        return
      }
      
      console.log('[ConnectionCore] Auth state changed:', event)
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          if (session) {
            this.handleEvent({ type: 'CONNECT' })
          }
          break
        case 'SIGNED_OUT':
          this.handleEvent({ type: 'DISCONNECT' })
          break
      }
    })
    
    console.log('[ConnectionCore] Supabase client reinitialized')
  }

  /**
   * 초기화
   */
  private initialize(): void {
    // Auth 상태 변경 구독
    this.client.auth.onAuthStateChange((event, session) => {
      console.log('[ConnectionCore] Auth state changed:', event)
      
      // INITIAL_SESSION은 초기 연결 시에만 처리
      if (event === 'INITIAL_SESSION') {
        // 초기화 시에만 한 번 연결 시도
        if (this.status.state === 'disconnected') {
          this.handleEvent({ type: 'CONNECT' })
        }
        return
      }
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          if (session) {
            this.handleEvent({ type: 'CONNECT' })
          }
          break
        case 'SIGNED_OUT':
          this.handleEvent({ type: 'DISCONNECT' })
          break
      }
    })

    // Visibility 처리 설정
    this.setupVisibilityHandling()
    
    // 초기 연결은 onAuthStateChange의 INITIAL_SESSION에서 처리됨
  }

  /**
   * Visibility 변경 감지 설정
   */
  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    // Named functions으로 정의 (메모리 누수 방지를 위한 적절한 cleanup을 위해)
    this.visibilityHandler = () => {
      const visible = document.visibilityState === 'visible'
      this.lastVisibilityChange = Date.now()
      // Debounce: 100ms 내의 중복 이벤트 무시
      if (this.visibilityDebounceTimer) {
        clearTimeout(this.visibilityDebounceTimer)
      }
      this.visibilityDebounceTimer = setTimeout(() => {
        this.handleEvent({ type: 'VISIBILITY_CHANGE', visible })
      }, 100)
    }

    // Focus/Blur 이벤트는 비활성화 (visibilitychange로 충분)
    // this.focusHandler = () => {
    //   this.handleEvent({ type: 'VISIBILITY_CHANGE', visible: true })
    // }

    // this.blurHandler = () => {
    //   this.handleEvent({ type: 'VISIBILITY_CHANGE', visible: false })
    // }

    this.pageshowHandler = (event: PageTransitionEvent) => {
      // 캐시에서 복원된 경우에만 처리 (중요한 경우)
      if (event.persisted) {
        this.lastVisibilityChange = Date.now()
        this.handleEvent({ type: 'VISIBILITY_CHANGE', visible: true })
      }
    }

    // 네트워크 이벤트 핸들러 (ConnectionCore가 마스터로 처리)
    this.onlineHandler = () => {
      console.log('[ConnectionCore] Network online - triggering network recovery')
      this.handleNetworkRecovery()
    }

    this.offlineHandler = () => {
      console.log('[ConnectionCore] Network offline')
      this.updateStatus({ state: 'disconnected' })
    }

    // pagehide는 필요없음 (visibilitychange가 처리)
    // this.pagehideHandler = () => {
    //   this.handleEvent({ type: 'VISIBILITY_CHANGE', visible: false })
    // }

    // 이벤트 리스너 등록 (최소한만)
    document.addEventListener('visibilitychange', this.visibilityHandler)
    // window.addEventListener('focus', this.focusHandler) // 비활성화
    // window.addEventListener('blur', this.blurHandler) // 비활성화
    window.addEventListener('pageshow', this.pageshowHandler)
    window.addEventListener('online', this.onlineHandler)
    window.addEventListener('offline', this.offlineHandler)
    // window.addEventListener('pagehide', this.pagehideHandler) // 비활성화
  }

  /**
   * 이벤트 처리 (상태 머신)
   */
  private handleEvent(event: ConnectionEvent): void {
    console.log('[ConnectionCore] Handling event:', event.type)
    
    const prevState = this.status.state

    switch (event.type) {
      case 'CONNECT':
        if (this.status.state !== 'connected') {
          this.updateStatus({
            state: 'connecting',
            reconnectAttempts: 0
          })
          this.establishConnection()
        }
        break

      case 'DISCONNECT':
        this.updateStatus({
          state: 'disconnected',
          lastError: null
        })
        this.cleanup()
        break

      case 'ERROR':
        this.updateStatus({
          state: 'error',
          lastError: event.error
        })
        if (this.config.enableAutoReconnect && this.status.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
        break

      case 'RECONNECT':
        if (this.status.state !== 'connected') {
          this.updateStatus({
            state: 'connecting',
            reconnectAttempts: this.status.reconnectAttempts + 1
          })
          this.establishConnection()
        }
        break

      case 'VISIBILITY_CHANGE':
        this.updateStatus({ isVisible: event.visible })
        if (event.visible) {
          // 포그라운드 복귀 시 점진적 복구
          this.resumeConnection()
        } else {
          // 백그라운드 전환 시 suspended 상태로 변경
          this.suspendConnection()
        }
        break
    }

    // 상태 변경 로그
    if (prevState !== this.status.state) {
      console.log(`[ConnectionCore] State transition: ${prevState} -> ${this.status.state}`)
    }
  }

  /**
   * 연결 수립
   */
  private async establishConnection(): Promise<void> {
    // 이미 connected 상태면 스킵 (무한 루프 방지)
    if (this.status.state === 'connected') {
      console.log('[ConnectionCore] Already connected, skipping establishment')
      return
    }
    
    try {
      // Circuit Breaker를 통한 세션 확인
      const sessionRequest = async () => {
        return await PromiseManager.withTimeout(
          (async () => {
            return await this.client.auth.getSession()
          })(),
          {
            timeout: 5000,
            key: 'connection-core-get-session',
            errorMessage: 'Session retrieval timeout after 5 seconds'
          }
        )
      }

      const result = this.connectionCircuitBreaker 
        ? await this.connectionCircuitBreaker.execute(sessionRequest)
        : await sessionRequest()
      
      const { data: { session }, error } = result
      
      if (error) throw error
      
      // 실제 DB 연결 테스트 (중요!)
      const dbTestRequest = async () => {
        console.log('[ConnectionCore] Testing DB connection...')
        return await PromiseManager.withTimeout(
          (async () => {
            // 간단한 쿼리로 DB 연결 확인
            const { data, error } = await this.client
              .from('users_v2')
              .select('id')
              .limit(1)
              .single()
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found (정상)
              throw error
            }
            return { success: true }
          })(),
          {
            timeout: 3000,
            key: 'connection-core-db-test',
            errorMessage: 'DB connection test timeout after 3 seconds'
          }
        )
      }

      // DB 연결 테스트 실행
      try {
        await dbTestRequest()
        console.log('[ConnectionCore] DB connection test successful')
      } catch (dbError) {
        console.error('[ConnectionCore] DB connection test failed:', dbError)
        
        // DB 연결 실패 시 클라이언트 재초기화 시도
        console.log('[ConnectionCore] Attempting to reinitialize Supabase client...')
        await this.reinitializeClient()
        
        // 재시도
        try {
          await dbTestRequest()
          console.log('[ConnectionCore] DB connection restored after client reinitialization')
        } catch (retryError) {
          console.error('[ConnectionCore] DB connection still failing after reinitialization:', retryError)
          throw retryError
        }
      }
      
      if (!session) {
        console.log('[ConnectionCore] No session available, but allowing anonymous access')
        // 세션이 없어도 익명 접근은 허용 (public 데이터 조회 가능)
        this.updateStatus({
          state: 'connected',
          lastConnectedAt: Date.now(),
          lastError: null,
          reconnectAttempts: 0
        })
        // Heartbeat는 세션이 있을 때만 시작
        return
      }

      // 연결 성공
      this.updateStatus({
        state: 'connected',
        lastConnectedAt: Date.now(),
        lastError: null,
        reconnectAttempts: 0
      })

      // Heartbeat 시작
      this.startHeartbeat()

    } catch (error) {
      console.error('[ConnectionCore] Connection failed:', error)
      this.handleEvent({ 
        type: 'ERROR', 
        error: error instanceof Error ? error : new Error('Unknown error')
      })
    }
  }

  /**
   * 재연결 스케줄링 (exponential backoff with max retry limit)
   * 무한 루프 방지: 최대 재시도 횟수 제한 및 점진적 백오프
   */
  private scheduleReconnect(): void {
    // 최대 재시도 횟수 확인
    if (this.status.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log(`[ConnectionCore] Max reconnection attempts (${this.config.maxReconnectAttempts}) reached. Stopping auto-reconnect.`)
      this.updateStatus({ state: 'error', lastError: new Error('Max reconnection attempts exceeded') })
      return
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.status.reconnectAttempts),
      30000 // 최대 30초
    )

    console.log(`[ConnectionCore] Scheduling reconnect in ${delay}ms (attempt ${this.status.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.handleEvent({ type: 'RECONNECT' })
    }, delay)
  }

  /**
   * Heartbeat 시작
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatFailures = 0

    this.heartbeatTimer = setInterval(async () => {
      await this.performHeartbeat()
    }, this.config.heartbeatInterval)
  }

  /**
   * Heartbeat 수행
   */
  private async performHeartbeat(): Promise<void> {
    // suspended 상태에서는 heartbeat 수행하지 않음
    if (this.status.state === 'suspended') {
      return
    }

    try {
      // Circuit Breaker를 통한 heartbeat 수행
      const heartbeatRequest = async () => {
        return await PromiseManager.withTimeout(
          (async () => {
            return await this.client.auth.getSession()
          })(),
          {
            timeout: 3000,
            key: 'connection-core-heartbeat',
            errorMessage: 'Heartbeat timeout after 3 seconds'
          }
        )
      }

      const result = this.heartbeatCircuitBreaker 
        ? await this.heartbeatCircuitBreaker.execute(heartbeatRequest)
        : await heartbeatRequest()
      
      const { error } = result
      if (error) throw error
      
      // 성공 시 실패 카운터 리셋
      this.heartbeatFailures = 0
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ConnectionCore] Heartbeat successful')
      }
    } catch (error) {
      this.heartbeatFailures++
      
      // 무한 루프 방지: heartbeat 실패는 조용히 처리
      if (error instanceof Error) {
        const isTimeoutError = error.name === 'TimeoutError' || error.message.includes('timeout')
        const isAbortError = error.name === 'AbortError' || error.message.includes('abort')
        
        if (isTimeoutError || isAbortError) {
          // 타임아웃/취소 에러는 디버그 로그만
          if (process.env.NODE_ENV === 'development') {
            console.debug('[ConnectionCore] Heartbeat timeout/abort (ignored):', error.message)
          }
          return // ERROR 이벤트 발생시키지 않음
        }
      }
      
      // 연속 실패 횟수가 임계값에 도달하면 자동 재연결
      if (this.heartbeatFailures >= this.MAX_HEARTBEAT_FAILURES) {
        console.warn(`[ConnectionCore] Heartbeat failed ${this.heartbeatFailures} times, triggering reconnection`)
        this.heartbeatFailures = 0
        this.handleEvent({ type: 'RECONNECT' })
        return
      }
      
      // 기타 진짜 에러만 ERROR 이벤트 발생
      console.warn(`[ConnectionCore] Heartbeat failed (${this.heartbeatFailures}/${this.MAX_HEARTBEAT_FAILURES}):`, error)
      this.handleEvent({ 
        type: 'ERROR', 
        error: error instanceof Error ? error : new Error('Heartbeat failed')
      })
    }
  }

  /**
   * Heartbeat 중지
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 상태 업데이트
   */
  private updateStatus(updates: Partial<ConnectionStatus>): void {
    // Circuit Breaker 상태 정보 추가
    const circuitBreakerInfo: Partial<ConnectionStatus> = {}
    
    if (this.config.enableCircuitBreaker && this.connectionCircuitBreaker) {
      const metrics = this.connectionCircuitBreaker.getMetrics()
      circuitBreakerInfo.circuitBreakerState = this.connectionCircuitBreaker.getState()
      circuitBreakerInfo.circuitBreakerMetrics = {
        failureRate: metrics.failureRate,
        consecutiveFailures: metrics.consecutiveFailures,
        totalRequests: metrics.totalRequests
      }
    }
    
    this.status = { ...this.status, ...updates, ...circuitBreakerInfo }
    this.notifyListeners()
  }

  /**
   * 리스너 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.status)
      } catch (error) {
        console.error('[ConnectionCore] Listener error:', error)
      }
    })
  }

  /**
   * 정리
   */
  private cleanup(): void {
    this.stopHeartbeat()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.visibilityDebounceTimer) {
      clearTimeout(this.visibilityDebounceTimer)
      this.visibilityDebounceTimer = null
    }
  }

  /**
   * 백그라운드 전환 시 연결 일시정지
   */
  private suspendConnection(): void {
    // 복구 중이면 suspend 하지 않음 (복구 중단 방지)
    if (this.status.state === 'connecting') {
      console.log('[ConnectionCore] Skip suspending - recovery in progress')
      return
    }
    
    console.log('[ConnectionCore] Suspending connection (background transition)')
    
    // 현재 connected 상태일 때만 suspended로 변경
    if (this.status.state === 'connected') {
      this.updateStatus({ state: 'suspended' })
      
      // heartbeat 중지 (백그라운드에서 불필요한 작업 중단)
      this.stopHeartbeat()
      
      // 진행 중인 visibility_change 관련 Promise들 취소
      // 단, 복구 관련 Promise는 보호
      PromiseManager.cancelAll('visibility_change', [
        'recovery-',           // Connection Recovery 관련
        'batch-invalidation-', // Batch invalidation 관련
        'recovery_',           // Recovery 관련 일반
        'connection-core-'     // ConnectionCore 자체 Promise
      ])
      
      // 백그라운드에서는 재연결 타이머도 중지
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
    }
  }

  /**
   * 포그라운드 복귀 시 연결 점진적 복구
   */
  private async resumeConnection(): Promise<void> {
    console.log('[ConnectionCore] Resuming connection (foreground return)')
    
    // suspended 상태에서만 복구 진행
    if (this.status.state === 'suspended') {
      // 먼저 connecting 상태로 변경
      this.updateStatus({ state: 'connecting' })
      
      // 누적된 Promise들 정리 (새로운 시작을 위해) - 복구 관련은 보호
      PromiseManager.cancelAll('visibility_change', [
        'recovery-',
        'batch-invalidation-',
        'recovery_',
        'connection-core-'
      ])
      
      // DB 테스트는 필요한 경우에만 수행
      const now = Date.now()
      const hiddenDuration = now - (this.lastVisibilityChange || now)
      const timeSinceLastDbTest = now - this.lastDbTestTime
      
      // DB 테스트 조건:
      // 1. 현재 DB 테스트 중이 아님
      // 2. 마지막 테스트로부터 쿨다운 시간이 지남
      // 3. 오래 숨겨져 있었거나 (1분 이상) 처음 테스트
      const shouldTestDb = !this.isDbTesting && 
                          (timeSinceLastDbTest > this.DB_TEST_COOLDOWN || this.lastDbTestTime === 0) &&
                          (hiddenDuration > 60000 || this.lastDbTestTime === 0)
      
      if (shouldTestDb) {
        this.isDbTesting = true
        try {
          console.log('[ConnectionCore] Testing DB connection after long absence...')
          // 간단한 DB 쿼리로 연결 확인
          const { error } = await this.client
            .from('users_v2')
            .select('id')
            .limit(1)
            .single()
          
          if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found (정상)
            console.error('[ConnectionCore] DB connection test failed on resume:', error)
            // DB 연결 실패 시 클라이언트 재초기화
            await this.reinitializeClient()
          } else {
            console.log('[ConnectionCore] DB connection verified successfully')
          }
          this.lastDbTestTime = now
        } catch (dbError) {
          console.error('[ConnectionCore] DB test error on resume:', dbError)
          // 에러 발생 시에도 클라이언트 재초기화 시도
          await this.reinitializeClient()
          this.lastDbTestTime = now
        } finally {
          this.isDbTesting = false
        }
      } else {
        console.log('[ConnectionCore] Skipping DB test (cooldown or already testing)')
      }
      
      // 점진적 연결 복구 시작
      this.handleEvent({ type: 'RECONNECT' })
      
      // ConnectionRecovery에도 복구 트리거 (통합 관리)
      // visibility 복구는 'visibility' source로 전달
      import('../core/connection-recovery').then(({ connectionRecovery, RecoveryStrategy }) => {
        if (hiddenDuration > 300000) { // 5분 이상
          connectionRecovery.triggerProgressiveRecovery('visibility', RecoveryStrategy.FULL)
        } else if (hiddenDuration > 60000) { // 1분 이상
          connectionRecovery.triggerProgressiveRecovery('visibility', RecoveryStrategy.PARTIAL)
        } else if (hiddenDuration > 30000) { // 30초 이상
          connectionRecovery.triggerProgressiveRecovery('visibility', RecoveryStrategy.LIGHT)
        }
      })
    } else if (this.status.state === 'disconnected' || this.status.state === 'error') {
      // 연결이 끊어진 상태에서도 포그라운드 복귀 시 재연결 시도
      this.handleEvent({ type: 'RECONNECT' })
    }
  }

  /**
   * 네트워크 복구 처리 (ConnectionCore가 마스터로 처리)
   */
  private async handleNetworkRecovery(): Promise<void> {
    console.log('[ConnectionCore] Handling network recovery as master')
    
    // 1. 먼저 자체 연결 복구
    if (this.status.state !== 'connected') {
      console.log('[ConnectionCore] Reconnecting after network recovery')
      this.handleEvent({ type: 'RECONNECT' })
    }
    
    // 2. ConnectionRecovery에게 network source로 전체 복구 지시
    import('../core/connection-recovery').then(({ connectionRecovery, RecoveryStrategy }) => {
      console.log('[ConnectionCore] Triggering network recovery in ConnectionRecovery')
      connectionRecovery.triggerProgressiveRecovery('network', RecoveryStrategy.FULL)
    })
  }

  /**
   * 네트워크 복구 테스트 함수 (브라우저 콘솔에서 사용)
   */
  testNetworkRecovery(): void {
    console.log('[ConnectionCore] Testing network recovery manually')
    this.handleNetworkRecovery()
  }

  private lastVisibilityChange: number | null = null

  // Public API

  /**
   * 수동 연결
   */
  async connect(): Promise<void> {
    try {
      await PromiseManager.withTimeout(
        Promise.resolve(this.handleEvent({ type: 'CONNECT' })),
        {
          timeout: 5000,
          key: 'connection-core-connect',
          errorMessage: 'Connection timeout after 5 seconds'
        }
      )
    } catch (error) {
      console.error('[ConnectionCore] Connect failed:', error)
      this.handleEvent({ 
        type: 'ERROR', 
        error: error instanceof Error ? error : new Error('Connect failed')
      })
    }
  }

  /**
   * 수동 연결 해제
   */
  async disconnect(): Promise<void> {
    try {
      await PromiseManager.withTimeout(
        Promise.resolve(this.handleEvent({ type: 'DISCONNECT' })),
        {
          timeout: 3000,
          key: 'connection-core-disconnect',
          errorMessage: 'Disconnect timeout after 3 seconds'
        }
      )
    } catch (error) {
      console.error('[ConnectionCore] Disconnect failed:', error)
      // 연결 해제는 에러가 발생해도 강제로 진행
      this.handleEvent({ type: 'DISCONNECT' })
    }
  }

  /**
   * 강제 재연결
   */
  async reconnect(): Promise<void> {
    this.updateStatus({ reconnectAttempts: 0 })
    this.handleEvent({ type: 'RECONNECT' })
  }

  /**
   * Supabase 클라이언트 가져오기
   */
  getClient(): SupabaseClient<Database> {
    return this.client
  }

  /**
   * 현재 상태 가져오기
   */
  getStatus(): ConnectionStatus {
    return { ...this.status }
  }

  /**
   * 연결 상태 구독
   */
  subscribe(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(listener)
    
    // 즉시 현재 상태 전달
    listener(this.getStatus())
    
    // 구독 해제 함수 반환
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<ConnectionConfig>): void {
    this.config = { 
      ...this.config, 
      ...config,
      circuitBreakerConfig: {
        ...this.config.circuitBreakerConfig,
        ...(config.circuitBreakerConfig || {})
      }
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.status.state === 'connected' || this.status.state === 'suspended'
  }

  /**
   * Circuit Breaker 상태 조회
   */
  getCircuitBreakerStatus(): {
    connection: { state: string; metrics: any } | null
    heartbeat: { state: string; metrics: any } | null
  } {
    return {
      connection: this.connectionCircuitBreaker ? {
        state: this.connectionCircuitBreaker.getState(),
        metrics: this.connectionCircuitBreaker.getMetrics()
      } : null,
      heartbeat: this.heartbeatCircuitBreaker ? {
        state: this.heartbeatCircuitBreaker.getState(),
        metrics: this.heartbeatCircuitBreaker.getMetrics()
      } : null
    }
  }

  /**
   * Circuit Breaker 수동 리셋
   */
  resetCircuitBreakers(): void {
    if (this.connectionCircuitBreaker) {
      this.connectionCircuitBreaker.reset()
      console.log('[ConnectionCore] Connection circuit breaker reset')
    }
    
    if (this.heartbeatCircuitBreaker) {
      this.heartbeatCircuitBreaker.reset()
      console.log('[ConnectionCore] Heartbeat circuit breaker reset')
    }
    
    // 상태 업데이트
    this.updateStatus({})
  }

  /**
   * 종료 (cleanup)
   */
  destroy(): void {
    this.cleanup()
    
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      // 활성화된 이벤트 리스너만 정리
      if (this.visibilityHandler) {
        document.removeEventListener('visibilitychange', this.visibilityHandler)
        this.visibilityHandler = null
      }
      
      // Focus/Blur는 비활성화되어 있음
      // if (this.focusHandler) {
      //   window.removeEventListener('focus', this.focusHandler)
      //   this.focusHandler = null
      // }
      
      // if (this.blurHandler) {
      //   window.removeEventListener('blur', this.blurHandler)
      //   this.blurHandler = null
      // }
      
      if (this.pageshowHandler) {
        window.removeEventListener('pageshow', this.pageshowHandler)
        this.pageshowHandler = null
      }
      
      if (this.onlineHandler) {
        window.removeEventListener('online', this.onlineHandler)
        this.onlineHandler = null
      }
      
      if (this.offlineHandler) {
        window.removeEventListener('offline', this.offlineHandler)
        this.offlineHandler = null
      }
      
      // Pagehide는 비활성화되어 있음
      // if (this.pagehideHandler) {
      //   window.removeEventListener('pagehide', this.pagehideHandler)
      //   this.pagehideHandler = null
      // }
    }
    
    this.listeners.clear()
    
    // Circuit Breaker 정리
    if (this.heartbeatCircuitBreaker) {
      this.heartbeatCircuitBreaker.destroy()
      this.heartbeatCircuitBreaker = null
    }
    
    if (this.connectionCircuitBreaker) {
      this.connectionCircuitBreaker.destroy()
      this.connectionCircuitBreaker = null
    }
  }
}

// 싱글톤 인스턴스 export
export const connectionCore = ConnectionCore.getInstance()

// 편의 함수
export const supabaseClient = connectionCore.getClient()

// 개발 환경에서 테스트를 위해 글로벌 노출
if (typeof window !== 'undefined') {
  ;(window as any).testNetworkRecovery = () => connectionCore.testNetworkRecovery()
}