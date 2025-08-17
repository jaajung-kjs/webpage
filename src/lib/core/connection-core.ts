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
  
  // DB 테스트 제거됨 - Supabase 자체 연결 관리 활용
  private visibilityDebounceTimer: NodeJS.Timeout | null = null
  private isReinitializing: boolean = false // 재초기화 진행 중 플래그

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

    // 기본 설정 (백그라운드 복귀 최적화)
    this.config = {
      maxReconnectAttempts: 8, // 재시도 횟수 증가
      reconnectInterval: 2000, // 빠른 초기 재시도
      heartbeatInterval: 30000,
      enableAutoReconnect: true,
      enableCircuitBreaker: true,
      circuitBreakerConfig: {
        failureThreshold: 5, // 백그라운드 복귀 시 관대하게
        resetTimeout: 60000, // 1분으로 증가
        monitoringWindow: 120000 // 2분으로 증가
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

    // Heartbeat용 Circuit Breaker (백그라운드 복귀 최적화)
    this.heartbeatCircuitBreaker = new CircuitBreaker({
      ...CircuitBreakerPresets.network,
      failureThreshold: 3, // 백그라운드 복귀 시 관대하게
      resetTimeout: 30000, // 30초로 증가
      monitoringWindow: 60000 // 1분으로 증가
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
   * Supabase 클라이언트 재초기화 (중복 생성 방지)
   * DB 연결이 끊어진 경우 새로운 클라이언트 생성
   */
  private async reinitializeClient(): Promise<void> {
    // 이미 재초기화 중이면 스킵 (중복 방지)
    if (this.isReinitializing) {
      console.log('[ConnectionCore] Client reinitialization already in progress, skipping')
      return
    }
    
    this.isReinitializing = true
    
    try {
      console.log('[ConnectionCore] Reinitializing Supabase client...')
      
      // 🔥 기존 WebSocket 완전 정리 (장시간 백그라운드 후 핵심)
      if (this.client?.realtime) {
        console.log('[ConnectionCore] Cleaning up old WebSocket connection...')
        const oldRealtime = this.client.realtime
        
        try {
          // 1. 모든 채널 제거
          const channels = oldRealtime.getChannels()
          console.log(`[ConnectionCore] Removing ${channels.length} channels`)
          for (const channel of channels) {
            try {
              await oldRealtime.removeChannel(channel)
            } catch (e) {
              // 에러 무시
            }
          }
          
          // 2. WebSocket 강제 종료
          console.log('[ConnectionCore] Force closing WebSocket...')
          oldRealtime.disconnect(1000, 'Client reinitializing')
          
          // WebSocket 인스턴스 직접 종료
          if (oldRealtime.conn) {
            try {
              oldRealtime.conn.close()
            } catch (e) {
              // 에러 무시
            }
          }
        } catch (error) {
          console.warn('[ConnectionCore] Error cleaning up realtime:', error)
        }
      }
      
      // 기존 클라이언트 정리 (GoTrueClient 인스턴스 정리 포함)
      try {
        // 기존 auth listener 정리
        await this.client.auth.signOut({ scope: 'local' }) // 로컬만 정리
      } catch (error) {
        console.warn('[ConnectionCore] Error during client cleanup:', error)
      }
      
      // 기존 이벤트 리스너 정리
      this.cleanup()
      
      // 잠시 대기 (WebSocket과 GoTrueClient 정리 완료 대기)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
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
        
        console.log('[ConnectionCore] Auth state changed after reinit:', event)
        
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
      
      console.log('[ConnectionCore] Supabase client reinitialized successfully')
    } catch (error) {
      console.error('[ConnectionCore] Failed to reinitialize client:', error)
      throw error
    } finally {
      this.isReinitializing = false
    }
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
      // Circuit Breaker를 통한 세션 확인 (백그라운드 복귀 최적화)
      const sessionRequest = async () => {
        // 백그라운드 복귀 감지
        const isBackgroundReturn = this.isBackgroundReturn()
        const timeout = isBackgroundReturn ? 15000 : 8000 // 백그라운드 복귀 시 더 긴 타임아웃
        
        return await PromiseManager.withTimeout(
          (async () => {
            return await this.client.auth.getSession()
          })(),
          {
            timeout,
            key: 'connection-core-get-session',
            errorMessage: `Session retrieval timeout after ${timeout/1000} seconds`
          }
        )
      }

      const result = this.connectionCircuitBreaker 
        ? await this.connectionCircuitBreaker.execute(sessionRequest)
        : await sessionRequest()
      
      const { data: { session }, error } = result
      
      if (error) throw error
      
      // DB 테스트 제거 - Supabase 자체 연결 관리에 의존
      
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
   * 재연결 스케줄링 (백그라운드 복귀 최적화된 exponential backoff)
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

    // 백그라운드 복귀인지 확인
    const isBackgroundReturn = this.isBackgroundReturn()
    
    // 백그라운드 복귀 시 더 빠른 재연결, 일반적인 경우 exponential backoff
    const delay = isBackgroundReturn 
      ? Math.min(1000 * (this.status.reconnectAttempts + 1), 5000) // 백그라운드 복귀: 1초, 2초, 3초... 최대 5초
      : Math.min(
          this.config.reconnectInterval * Math.pow(2, this.status.reconnectAttempts),
          30000 // 일반적인 경우: 최대 30초
        )

    console.log(`[ConnectionCore] Scheduling reconnect in ${delay}ms (attempt ${this.status.reconnectAttempts + 1}/${this.config.maxReconnectAttempts}, background return: ${isBackgroundReturn})`)

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
      // Circuit Breaker를 통한 heartbeat 수행 (백그라운드 복귀 최적화)
      const heartbeatRequest = async () => {
        const isBackgroundReturn = this.isBackgroundReturn()
        const timeout = isBackgroundReturn ? 8000 : 5000 // 백그라운드 복귀 시 더 긴 타임아웃
        
        return await PromiseManager.withTimeout(
          (async () => {
            return await this.client.auth.getSession()
          })(),
          {
            timeout,
            key: 'connection-core-heartbeat',
            errorMessage: `Heartbeat timeout after ${timeout/1000} seconds`
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
    console.log(`[ConnectionCore] Suspending connection (current state: ${this.status.state})`)
    
    // suspended 상태가 아닌 경우에만 처리
    if (this.status.state === 'suspended') {
      console.log('[ConnectionCore] Already suspended, skipping')
      return
    }
    
    // 이전 상태 저장 (복귀 시 참조용)
    const previousState = this.status.state
    
    // connected, connecting, error 등 모든 상태에서 suspended로 전환 가능
    this.updateStatus({ 
      state: 'suspended'
    })
    
    console.log(`[ConnectionCore] State changed to suspended (was: ${previousState})`)
    
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
      
      // 백그라운드 복귀 시 복구 처리
      const now = Date.now()
      const hiddenDuration = now - (this.lastVisibilityChange || now)
      
      // 🔥 STEP 1: 인증 토큰 갱신 (401 에러 해결의 핵심)
      // 백그라운드에서 오래 있으면 JWT 토큰이 만료되므로 가장 먼저 갱신
      let tokenRefreshed = false
      try {
        console.log('[ConnectionCore] Step 1: Refreshing auth token first to prevent 401 errors...')
        const { data, error } = await this.client.auth.refreshSession()
        
        if (error) {
          console.error('[ConnectionCore] Failed to refresh auth token:', error)
          // 토큰 갱신 실패해도 계속 진행 (사용자가 로그아웃 상태일 수 있음)
        } else if (data.session) {
          console.log('[ConnectionCore] ✅ Auth token refreshed successfully')
          tokenRefreshed = true
          
          // Realtime 클라이언트에도 새 토큰 설정하고 완료 대기
          console.log('[ConnectionCore] Setting new token on Realtime client...')
          await this.client.realtime.setAuth(data.session.access_token)
          
          // setAuth 완료 후 약간의 지연을 주어 토큰이 적용되도록 함
          await new Promise(resolve => setTimeout(resolve, 100))
          console.log('[ConnectionCore] ✅ New token applied to Realtime client')
        } else {
          console.log('[ConnectionCore] No active session found (user might be logged out)')
        }
      } catch (error) {
        console.error('[ConnectionCore] Exception during token refresh:', error)
        // 에러가 나도 계속 진행
      }
      
      // 🔥 STEP 2: Circuit Breaker 리셋 (네트워크 요청이 정상 작동하도록)
      // 401 에러로 Open 상태가 되었을 수 있으므로 반드시 리셋
      console.log('[ConnectionCore] Step 2: Force resetting Circuit Breakers to clear 401-induced blocks')
      this.resetCircuitBreakers()
      this.heartbeatFailures = 0
      
      // Circuit Breaker가 Open 상태였다면 강제로 Half-Open으로 전환
      if (this.connectionCircuitBreaker?.getState() === 'open') {
        console.log('[ConnectionCore] Force transitioning Circuit Breaker from Open to Half-Open')
        ;(this.connectionCircuitBreaker as any).state = 'half-open'
        ;(this.connectionCircuitBreaker as any).metrics.consecutiveFailures = 0
      }
      
      // 🔥 STEP 3: WebSocket 상태 확인 및 재연결 (실시간 기능 복구)
      console.log('[ConnectionCore] Step 3: Checking WebSocket health and reconnecting if needed')
      const isRealtimeHealthy = this.isRealtimeHealthy()
      console.log(`[ConnectionCore] WebSocket health check: ${isRealtimeHealthy ? 'healthy' : 'unhealthy'}`)
      
      // WebSocket이 stale하거나 장시간 백그라운드였으면 처리
      // 단, 토큰이 성공적으로 갱신되었으면 굳이 전체 재초기화는 하지 않음
      if (!isRealtimeHealthy) {
        console.log('[ConnectionCore] WebSocket is unhealthy, need to refresh')
        
        // 토큰이 갱신되었고 5분 미만이면 Realtime만 재생성
        if (tokenRefreshed && hiddenDuration < 300000) {
          console.log('[ConnectionCore] Token refreshed and < 5min, refreshing Realtime only')
          
          try {
            // Realtime 재생성 (토큰은 이미 갱신됨)
            await this.refreshRealtimeConnection()
            
            // RealtimeCore에 재구독 요청
            const realtimeCore = await import('../core/realtime-core').then(m => m.realtimeCore)
            await realtimeCore.handleReconnection()
          } catch (error) {
            console.error('[ConnectionCore] Failed to refresh realtime:', error)
          }
        } 
        // 토큰 갱신 실패했거나 5분 이상이면 전체 재초기화
        else if (!tokenRefreshed || hiddenDuration > 300000) {
          console.log('[ConnectionCore] Token not refreshed or >5min, full client reinitialization')
          
          const realtimeCore = await import('../core/realtime-core').then(m => m.realtimeCore)
          await realtimeCore.prepareForClientReinit()
          
          try {
            await this.reinitializeClient()
            await realtimeCore.handleClientReady()
          } catch (error) {
            console.error('[ConnectionCore] Failed to reinitialize client:', error)
          }
        }
      } else if (hiddenDuration > 60000) {
        // 1분 이상이지만 WebSocket은 정상이고 토큰도 갱신됨
        console.log('[ConnectionCore] Medium background (1+ min) but WebSocket healthy and token refreshed')
        
        // RealtimeCore 재구독만 시도 (WebSocket은 정상이지만 구독이 만료되었을 수 있음)
        if (tokenRefreshed) {
          const realtimeCore = await import('../core/realtime-core').then(m => m.realtimeCore)
          await realtimeCore.handleReconnection()
        }
      }
      
      // 연결 복구
      if (hiddenDuration <= 300000 && isRealtimeHealthy) {
        // WebSocket 정상이고 5분 미만이면 일반 재연결
        this.handleEvent({ type: 'RECONNECT' })
      } else {
        // WebSocket 재생성 후 연결
        this.handleEvent({ type: 'CONNECT' })
      }
      
      // ConnectionRecovery에 복구 전략 전달
      import('../core/connection-recovery').then(({ connectionRecovery, RecoveryStrategy }) => {
        // 토큰이 갱신되지 않았거나 WebSocket이 재초기화되었으면 FULL
        if (!tokenRefreshed || !isRealtimeHealthy || hiddenDuration > 300000) {
          console.log('[ConnectionCore] Triggering FULL recovery (token or WebSocket issues)')
          connectionRecovery.triggerProgressiveRecovery('visibility', RecoveryStrategy.FULL)
        } else if (hiddenDuration > 60000) {
          console.log('[ConnectionCore] Triggering PARTIAL recovery (medium background)')
          connectionRecovery.triggerProgressiveRecovery('visibility', RecoveryStrategy.PARTIAL)
        } else if (hiddenDuration > 30000) {
          console.log('[ConnectionCore] Triggering LIGHT recovery (short background)')
          connectionRecovery.triggerProgressiveRecovery('visibility', RecoveryStrategy.LIGHT)
        } else {
          console.log('[ConnectionCore] No recovery needed (very short background)')
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
    
    // 네트워크 복구 시 Circuit Breaker 리셋 (새로운 시작)
    console.log('[ConnectionCore] Resetting Circuit Breakers after network recovery')
    this.resetCircuitBreakers()
    this.heartbeatFailures = 0 // heartbeat 실패 카운터도 리셋
    
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

  /**
   * 백그라운드 복귀 여부 감지
   */
  private isBackgroundReturn(): boolean {
    if (!this.lastVisibilityChange) return false
    
    const now = Date.now()
    const hiddenDuration = now - this.lastVisibilityChange
    
    // 1분 이상 백그라운드에 있었으면 백그라운드 복귀로 간주
    return hiddenDuration > 60000
  }

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
   * 강제 리셋 - Supabase 클라이언트 완전 재생성
   * CircuitBreaker가 영구 오프라인 모드에 빠졌을 때 사용
   */
  async forceReset(): Promise<void> {
    console.log('[ConnectionCore] Force reset initiated - recreating Supabase client')
    
    try {
      // 1. 모든 활동 중지
      this.cleanup()
      
      // 2. Circuit Breaker 리셋
      this.resetCircuitBreakers()
      
      // 3. 상태 초기화
      this.status = {
        state: 'disconnected',
        lastConnectedAt: null,
        lastError: null,
        reconnectAttempts: 0,
        isVisible: true
      }
      
      // 4. Supabase 클라이언트 재생성
      await this.reinitializeClient()
      
      // 5. 연결 재시도
      await this.connect()
      
      console.log('[ConnectionCore] Force reset completed successfully')
    } catch (error) {
      console.error('[ConnectionCore] Force reset failed:', error)
      throw error
    }
  }

  /**
   * CircuitBreaker가 Open 상태인지 확인
   */
  isCircuitBreakerOpen(): boolean {
    if (!this.connectionCircuitBreaker) return false
    return this.connectionCircuitBreaker.getState() === 'open'
  }

  /**
   * Realtime WebSocket 상태 확인 (Deterministic)
   * @returns WebSocket이 정상 연결 상태인지 여부
   */
  isRealtimeHealthy(): boolean {
    try {
      // Supabase Realtime 인스턴스 확인
      const realtime = this.client?.realtime
      if (!realtime) {
        console.log('[ConnectionCore] No realtime instance')
        return false
      }

      // WebSocket 연결 상태 직접 확인
      const ws = realtime.conn
      if (!ws) {
        console.log('[ConnectionCore] No WebSocket connection')
        return false
      }

      // WebSocket readyState 확인
      // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
      const isOpen = ws.readyState === WebSocket.OPEN
      
      if (!isOpen) {
        console.log(`[ConnectionCore] WebSocket not open. State: ${ws.readyState} (0:CONNECTING, 1:OPEN, 2:CLOSING, 3:CLOSED)`)
      }

      return isOpen
    } catch (error) {
      console.error('[ConnectionCore] Error checking realtime health:', error)
      return false
    }
  }

  /**
   * Realtime 연결만 재생성 (클라이언트는 유지)
   * Stale WebSocket 문제를 근본적으로 해결
   */
  async refreshRealtimeConnection(): Promise<void> {
    console.log('[ConnectionCore] Refreshing Realtime connection')
    
    try {
      // Circuit Breaker가 열려있으면 스킵
      if (this.isCircuitBreakerOpen()) {
        console.warn('[ConnectionCore] Circuit Breaker is open, skipping realtime refresh')
        return
      }

      // 기존 Realtime 인스턴스 확인
      if (this.client?.realtime) {
        const oldRealtime = this.client.realtime
        
        // 1. 모든 채널 제거 (disconnect 호출 전에)
        console.log('[ConnectionCore] Removing all channels before refresh')
        const channels = oldRealtime.getChannels()
        
        for (const channel of channels) {
          try {
            await oldRealtime.removeChannel(channel)
          } catch (error) {
            console.warn('[ConnectionCore] Error removing channel:', error)
          }
        }
        
        // 2. 채널 정리 대기
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 3. WebSocket 연결 종료
        console.log('[ConnectionCore] Disconnecting old realtime connection')
        oldRealtime.disconnect(1000, 'Refreshing connection')
        
        // 4. 연결 종료 대기
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // 5. 새로운 연결 시작
        console.log('[ConnectionCore] Starting new realtime connection')
        oldRealtime.connect()
        
        // 6. 연결 안정화 대기
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // WebSocket 상태 확인
        const isHealthy = this.isRealtimeHealthy()
        console.log(`[ConnectionCore] Realtime refresh complete. WebSocket healthy: ${isHealthy}`)
      } else {
        console.warn('[ConnectionCore] No realtime instance to refresh')
      }
    } catch (error) {
      console.error('[ConnectionCore] Failed to refresh realtime connection:', error)
      throw error
    }
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