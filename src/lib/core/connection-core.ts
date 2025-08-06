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

// 연결 상태 타입
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

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
}

// 설정 옵션
export interface ConnectionConfig {
  maxReconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
  enableAutoReconnect?: boolean
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
  private config: Required<ConnectionConfig>
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private visibilityHandler: (() => void) | null = null

  private constructor() {
    // 환경 변수 검증
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Supabase 클라이언트 생성 (단일 인스턴스)
    this.client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'kepco-ai-auth',
        flowType: 'pkce'
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
      enableAutoReconnect: true
    }

    this.listeners = new Set()
    
    // 초기화
    this.initialize()
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
   * 초기화
   */
  private initialize(): void {
    // Auth 상태 변경 구독
    this.client.auth.onAuthStateChange((event, session) => {
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

    // Visibility 처리 설정
    this.setupVisibilityHandling()

    // 초기 연결 시도
    this.connect()
  }

  /**
   * Visibility 변경 감지 설정
   */
  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return

    this.visibilityHandler = () => {
      const visible = document.visibilityState === 'visible'
      this.handleEvent({ type: 'VISIBILITY_CHANGE', visible })
    }

    document.addEventListener('visibilitychange', this.visibilityHandler)
    
    // 추가로 focus 이벤트도 감지
    window.addEventListener('focus', () => {
      this.handleEvent({ type: 'VISIBILITY_CHANGE', visible: true })
    })
    
    window.addEventListener('blur', () => {
      this.handleEvent({ type: 'VISIBILITY_CHANGE', visible: false })
    })
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
        if (event.visible && this.status.state !== 'connected') {
          // 페이지가 다시 보이면 재연결 시도
          this.handleEvent({ type: 'RECONNECT' })
        } else if (!event.visible && this.status.state === 'connected') {
          // 페이지가 숨겨지면 heartbeat 중지
          this.stopHeartbeat()
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
    try {
      // 세션 확인
      const { data: { session }, error } = await this.client.auth.getSession()
      
      if (error) throw error
      
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
   * 재연결 스케줄링 (exponential backoff)
   */
  private scheduleReconnect(): void {
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

    this.heartbeatTimer = setInterval(async () => {
      try {
        // 간단한 세션 체크로 heartbeat
        const { error } = await this.client.auth.getSession()
        if (error) throw error
        
        console.log('[ConnectionCore] Heartbeat successful')
      } catch (error) {
        console.error('[ConnectionCore] Heartbeat failed:', error)
        this.handleEvent({ 
          type: 'ERROR', 
          error: error instanceof Error ? error : new Error('Heartbeat failed')
        })
      }
    }, this.config.heartbeatInterval)
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
    this.status = { ...this.status, ...updates }
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
  }

  // Public API

  /**
   * 수동 연결
   */
  async connect(): Promise<void> {
    this.handleEvent({ type: 'CONNECT' })
  }

  /**
   * 수동 연결 해제
   */
  async disconnect(): Promise<void> {
    this.handleEvent({ type: 'DISCONNECT' })
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
    this.config = { ...this.config, ...config }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.status.state === 'connected'
  }

  /**
   * 종료 (cleanup)
   */
  destroy(): void {
    this.cleanup()
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }
    
    this.listeners.clear()
  }
}

// 싱글톤 인스턴스 export
export const connectionCore = ConnectionCore.getInstance()

// 편의 함수
export const supabaseClient = connectionCore.getClient()