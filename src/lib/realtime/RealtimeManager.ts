/**
 * Realtime Manager
 * 
 * 중앙 집중식 WebSocket 연결 관리 시스템
 * - 단일 연결로 모든 실시간 이벤트 처리
 * - 자동 재연결 및 heartbeat
 * - 연결 상태 모니터링
 */

import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// 개발 환경 체크
const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}
const logError = console.error // 에러는 항상 출력
const logWarn = isDev ? console.warn : () => {} // 경고는 개발 환경에서만

interface ChannelConfig {
  name: string
  table?: string
  filter?: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  callback: (payload: any) => void
}

// 연결 상태 타입
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface RealtimeState {
  isConnected: boolean
  connectionState: ConnectionState
  connectionStartTime: number | null
  activeChannels: Map<string, RealtimeChannel>
  connectionAttempts: number
}

export class RealtimeManager {
  private static instance: RealtimeManager
  private state: RealtimeState = {
    isConnected: false,
    connectionState: 'disconnected',
    connectionStartTime: null,
    activeChannels: new Map(),
    connectionAttempts: 0
  }
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private mainChannel: RealtimeChannel | null = null
  
  // 추가: 구독 대기열 및 초기화 상태
  private pendingSubscriptions: Map<string, ChannelConfig> = new Map()
  private activeSubscriptions: Map<string, ChannelConfig> = new Map() // 재연결 시 복구용
  private isInitializing = false
  private initializationPromise: Promise<void> | null = null
  
  // Heartbeat 설정
  private readonly HEARTBEAT_INTERVAL = 10000 // 10초로 단축
  private readonly RECONNECT_DELAY = 5000 // 5초
  private readonly MAX_RECONNECT_ATTEMPTS = 10 // 최대 재연결 시도 증가
  private readonly RECONNECT_BACKOFF_MULTIPLIER = 1.5 // 지수 백오프
  private readonly SESSION_TIMEOUT_CHECK_INTERVAL = 60000 // 1분마다 세션 체크
  private sessionTimeoutTimer: NodeJS.Timeout | null = null
  
  private constructor() {
    log('🔌 RealtimeManager: Constructor called')
    
    // Auth 상태 변경 감지를 constructor에서 설정 (항상 동작하도록)
    supabase.auth.onAuthStateChange((event, session) => {
      log('🔌 RealtimeManager: Auth state changed:', event)
      
      if (event === 'SIGNED_OUT') {
        this.cleanup()
      } else if (event === 'SIGNED_IN' && session) {
        // 로그인 시 초기화
        this.initialize()
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // 토큰 갱신 시 연결 상태 확인
        if (!this.state.isConnected) {
          this.initialize()
        }
      } else if (event === 'INITIAL_SESSION' && session) {
        // 페이지 로드 시 세션이 있으면 초기화
        this.initialize()
      } else if (event === 'USER_UPDATED' && session) {
        // 사용자 정보 업데이트 시 재연결
        log('🔌 RealtimeManager: User updated, reconnecting')
        this.forceReconnect()
      }
    })
    
    // Page Visibility API로 백그라운드 복귀 감지
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          log('🔌 RealtimeManager: Page became visible, checking connection')
          this.handleVisibilityChange()
        }
      })
      
      // 포커스 이벤트도 추가 (일부 브라우저 호환성)
      window.addEventListener('focus', () => {
        log('🔌 RealtimeManager: Window focused, checking connection')
        this.handleVisibilityChange()
      })
    }
    
    // 초기 세션 체크 및 초기화
    this.checkSessionAndInitialize()
  }
  
  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager()
    }
    return RealtimeManager.instance
  }
  
  /**
   * 초기 세션 체크 및 초기화
   */
  private async checkSessionAndInitialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        log('🔌 RealtimeManager: Initial session found, initializing')
        await this.initialize()
      } else {
        log('🔌 RealtimeManager: No initial session, waiting for login')
      }
    } catch (error) {
      logError('🔌 RealtimeManager: Error checking initial session:', error)
    }
  }
  
  
  /**
   * 초기화 및 메인 채널 설정
   */
  private async initialize(): Promise<void> {
    // 이미 연결되어 있으면 스킵
    if (this.state.isConnected) {
      log('🔌 RealtimeManager: Already connected, skipping initialization')
      return
    }
    
    // 이미 초기화 중이면 기존 Promise 반환
    if (this.isInitializing && this.initializationPromise) {
      log('🔌 RealtimeManager: Already initializing, waiting...')
      return this.initializationPromise
    }
    
    // 초기화 시작
    this.isInitializing = true
    this.initializationPromise = this._doInitialize()
    
    try {
      await this.initializationPromise
    } finally {
      this.isInitializing = false
      this.initializationPromise = null
    }
  }
  
  /**
   * 실제 초기화 로직
   */
  private async _doInitialize(): Promise<void> {
    try {
      // 연결 시작 알림
      this.state.connectionState = 'connecting'
      this.notifyStateChange()
      
      // 세션 확인
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        log('🔌 RealtimeManager: No session during initialization')
        this.state.connectionState = 'disconnected'
        this.notifyStateChange()
        return
      }
      
      log('🔌 RealtimeManager: Initializing with session:', session.user.id)
      
      // 기존 채널 정리
      if (this.mainChannel) {
        supabase.removeChannel(this.mainChannel)
        this.mainChannel = null
      }
      
      // 메인 채널 생성 (heartbeat용)
      this.mainChannel = supabase.channel('realtime-manager-main', {
        config: {
          presence: {
            key: session.user.id
          }
        }
      })
      
      // 연결 상태 모니터링
      const subscribePromise = new Promise<void>((resolve) => {
        this.mainChannel!
          .on('system', { event: '*' }, (payload) => {
            log('🔌 RealtimeManager: System event', payload)
          })
          .subscribe(async (status) => {
            log('🔌 RealtimeManager: Main channel status:', status)
            
            if (status === 'SUBSCRIBED') {
              await this.onConnected()
              resolve()
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              this.state.connectionState = 'error'
              this.notifyStateChange()
              this.onDisconnected()
              resolve()
            } else if (status === 'CLOSED') {
              log('🔌 RealtimeManager: Channel closed')
              this.onDisconnected()
              resolve()
            }
          })
      })
      
      // 구독 완료 대기
      await subscribePromise
      
    } catch (error) {
      logError('🔌 RealtimeManager: Initialization error:', error)
      this.scheduleReconnect()
    }
  }
  
  /**
   * 연결 성공 시
   */
  private async onConnected() {
    log('✅ RealtimeManager: Connected')
    this.state.isConnected = true
    this.state.connectionStartTime = Date.now()
    this.state.connectionAttempts = 0 // 성공 시 재연결 시도 횟수 초기화
    this.state.connectionState = 'connected'
    this.notifyStateChange()
    
    // Heartbeat 시작
    this.startHeartbeat()
    
    // 세션 타임아웃 체크 시작
    this.startSessionTimeoutCheck()
    
    // 재연결 타이머 정리
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    // 채널 활성화를 위한 초기 쿼리 실행
    await this.activateChannels()
    
    // 대기 중인 구독 처리
    this.processPendingSubscriptions()
  }
  
  /**
   * 채널 활성화를 위한 초기 쿼리 실행
   */
  private async activateChannels() {
    try {
      log('🚀 RealtimeManager: Activating channels with initial queries')
      
      // 현재 사용자 ID 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return
      
      // 채널 활성화를 위한 더미 쿼리들
      const activationQueries = [
        // 메시지 관련 쿼리
        supabase
          .from('messages')
          .select('id')
          .eq('recipient_id', session.user.id)
          .limit(1),
        
        // 사용자 통계 쿼리
        supabase
          .from('user_message_stats')
          .select('unread_count')
          .eq('user_id', session.user.id)
          .single()
      ]
      
      // 병렬로 실행
      await Promise.allSettled(activationQueries)
      
      log('✅ RealtimeManager: Channels activated with initial queries')
    } catch (error) {
      logError('⚠️ RealtimeManager: Error activating channels:', error)
      // 에러가 나도 계속 진행
    }
  }
  
  /**
   * 특정 테이블 채널 활성화
   */
  private async activateTableChannel(table: string, filter?: string) {
    try {
      log(`🔄 RealtimeManager: Activating table channel for ${table}`)
      
      // 테이블별 활성화 쿼리 - 타입 안전성을 위해 테이블별로 분기
      switch (table) {
        case 'messages':
          let messagesQuery = supabase.from('messages').select('id').limit(1)
          if (filter) {
            const [column, , value] = filter.split(/[=.]/)
            if (column === 'recipient_id' && value) {
              messagesQuery = messagesQuery.eq('recipient_id', value)
            } else if (column === 'conversation_id' && value) {
              messagesQuery = messagesQuery.eq('conversation_id', value)
            }
          }
          await messagesQuery
          break
          
        case 'user_message_stats':
          let statsQuery = supabase.from('user_message_stats').select('unread_count').limit(1)
          if (filter) {
            const [column, , value] = filter.split(/[=.]/)
            if (column === 'user_id' && value) {
              statsQuery = statsQuery.eq('user_id', value)
            }
          }
          await statsQuery
          break
          
        default:
          logWarn(`⚠️ RealtimeManager: Unknown table ${table}, skipping activation`)
          return
      }
      
      log(`✅ RealtimeManager: Table channel ${table} activated`)
    } catch (error) {
      logError(`⚠️ RealtimeManager: Error activating table channel ${table}:`, error)
      // 에러가 나도 계속 진행
    }
  }
  
  /**
   * 대기 중인 구독 처리
   */
  private processPendingSubscriptions() {
    if (this.pendingSubscriptions.size === 0) return
    
    log(`📡 RealtimeManager: Processing ${this.pendingSubscriptions.size} pending subscriptions`)
    
    // 대기 중인 구독을 복사하고 클리어
    const pending = new Map(this.pendingSubscriptions)
    this.pendingSubscriptions.clear()
    
    // 각 구독 처리
    pending.forEach((config, channelKey) => {
      log(`📡 RealtimeManager: Processing pending subscription: ${channelKey}`)
      // subscribe를 다시 호출하지만, 이번엔 연결된 상태이므로 즉시 처리됨
      this.subscribe(config)
    })
  }
  
  /**
   * 연결 끊김 시
   */
  private onDisconnected() {
    log('❌ RealtimeManager: Disconnected')
    this.state.isConnected = false
    this.state.connectionStartTime = null
    this.state.connectionState = 'disconnected'
    this.notifyStateChange()
    
    // Heartbeat 중지
    this.stopHeartbeat()
    
    // 재연결 예약 (최대 시도 횟수 확인)
    if (this.state.connectionAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.scheduleReconnect()
    } else {
      logError('🚀 RealtimeManager: Max reconnection attempts reached')
      this.state.connectionState = 'error'
      this.notifyStateChange()
    }
  }
  
  /**
   * Heartbeat 시작
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    
    // 즉시 한 번 실행
    this.sendHeartbeat()
    
    // 주기적으로 실행
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, this.HEARTBEAT_INTERVAL)
  }
  
  /**
   * Heartbeat 전송
   */
  private async sendHeartbeat() {
    if (!this.mainChannel || !this.state.isConnected) return
    
    try {
      // Presence 업데이트로 heartbeat
      await this.mainChannel.track({
        online_at: new Date().toISOString(),
        heartbeat_at: Date.now()
      })
      
      log('💓 RealtimeManager: Heartbeat sent')
    } catch (error) {
      logError('💔 RealtimeManager: Heartbeat failed', error)
      this.onDisconnected()
    }
  }
  
  /**
   * Heartbeat 중지
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  
  /**
   * 세션 타임아웃 체크 시작
   */
  private startSessionTimeoutCheck() {
    this.stopSessionTimeoutCheck()
    
    // 주기적으로 세션 상태 확인
    this.sessionTimeoutTimer = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          logError('🔌 RealtimeManager: Session check failed:', error)
          this.onDisconnected()
          return
        }
        
        // 토큰 만료 시간 체크 (만료 5분 전에 갱신)
        const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null
        if (expiresAt) {
          const now = new Date()
          const timeUntilExpiry = expiresAt.getTime() - now.getTime()
          
          if (timeUntilExpiry < 5 * 60 * 1000) { // 5분 미만 남음
            log('🔌 RealtimeManager: Token expiring soon, refreshing...')
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
              logError('🔌 RealtimeManager: Failed to refresh token:', refreshError)
              this.onDisconnected()
            }
          }
        }
        
        // 연결 상태가 끊어졌지만 세션은 유효한 경우 재연결 시도
        if (!this.state.isConnected && session) {
          log('🔌 RealtimeManager: Session valid but disconnected, attempting reconnect')
          this.state.connectionAttempts = 0 // 재연결 시도 횟수 초기화
          await this.initialize()
        }
      } catch (error) {
        logError('🔌 RealtimeManager: Session timeout check error:', error)
      }
    }, this.SESSION_TIMEOUT_CHECK_INTERVAL)
  }
  
  /**
   * 세션 타임아웃 체크 중지
   */
  private stopSessionTimeoutCheck() {
    if (this.sessionTimeoutTimer) {
      clearInterval(this.sessionTimeoutTimer)
      this.sessionTimeoutTimer = null
    }
  }
  
  /**
   * 재연결 예약 (지수 백오프 적용)
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) return
    
    this.state.connectionAttempts++
    const delay = Math.min(
      this.RECONNECT_DELAY * Math.pow(this.RECONNECT_BACKOFF_MULTIPLIER, this.state.connectionAttempts - 1),
      30000 // 최대 30초
    )
    
    log(`🔄 RealtimeManager: Scheduling reconnect attempt ${this.state.connectionAttempts}/${this.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnect()
    }, delay)
  }
  
  /**
   * 재연결 시도
   */
  private async reconnect() {
    log('🔄 RealtimeManager: Attempting reconnect')
    
    // 세션 체크
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      log('🔄 RealtimeManager: No session for reconnect, waiting for auth')
      return
    }
    
    // 기존 구독 정보 백업 (activeSubscriptions에서 가져오기)
    const subscriptionsBackup = new Map(this.activeSubscriptions)
    
    // 모든 채널 정리
    this.cleanup()
    
    // 백업된 구독을 대기열에 추가
    subscriptionsBackup.forEach((config, key) => {
      this.pendingSubscriptions.set(key, config)
    })
    
    // 다시 초기화
    await this.initialize()
  }
  
  /**
   * 채널 구독
   */
  subscribe(config: ChannelConfig): () => void {
    const channelKey = `${config.name}-${config.table || 'custom'}`
    
    // 연결 상태 확인
    if (!this.state.isConnected) {
      logWarn(`⚠️ RealtimeManager: Not connected, queueing subscription for ${channelKey}`)
      
      // 대기열에 추가
      this.pendingSubscriptions.set(channelKey, config)
      
      // 초기화 시도
      this.initialize().catch(error => {
        logError('🔌 RealtimeManager: Failed to initialize during subscribe:', error)
      })
      
      // 구독 해제 함수 반환 (대기열에서 제거)
      return () => {
        this.pendingSubscriptions.delete(channelKey)
        this.unsubscribe(channelKey)
      }
    }
    
    // 이미 구독 중인 경우
    if (this.state.activeChannels.has(channelKey)) {
      log(`📡 RealtimeManager: Already subscribed to ${channelKey}`)
      return () => this.unsubscribe(channelKey)
    }
    
    log(`📡 RealtimeManager: Subscribing to ${channelKey}`, {
      table: config.table,
      event: config.event,
      filter: config.filter
    })
    
    const channel = supabase.channel(channelKey)
    
    if (config.table) {
      // 테이블 변경 구독
      const postgresConfig = {
        event: config.event || '*',
        schema: 'public',
        table: config.table,
        ...(config.filter && { filter: config.filter })
      }
      
      log(`📡 RealtimeManager: Postgres changes config:`, postgresConfig)
      
      channel.on(
        'postgres_changes' as any,
        postgresConfig,
        (payload) => {
          log(`📡 RealtimeManager: Event received on ${channelKey}:`, payload)
          // 직접 콜백 호출
          try {
            config.callback(payload)
          } catch (error) {
            logError(`📡 RealtimeManager: Error in callback for ${channelKey}:`, error)
          }
        }
      )
    } else {
      // 커스텀 이벤트 구독
      channel.on('broadcast' as any, { event: config.name }, config.callback)
    }
    
    channel.subscribe(async (status) => {
      log(`📡 RealtimeManager: Channel ${channelKey} subscription status:`, status)
      
      if (status === 'SUBSCRIBED') {
        log(`✅ RealtimeManager: Successfully subscribed to ${channelKey}`)
        
        // 채널 활성화를 위한 초기 쿼리 실행
        if (config.table) {
          await this.activateTableChannel(config.table, config.filter)
        }
      } else if (status === 'CHANNEL_ERROR') {
        logError(`❌ RealtimeManager: Error subscribing to ${channelKey}`)
        // 채널 에러 시 재연결 시도
        if (this.state.connectionAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          log(`🔄 RealtimeManager: Channel error, scheduling reconnect for ${channelKey}`)
          setTimeout(() => {
            if (!this.state.isConnected) {
              this.scheduleReconnect()
            }
          }, 1000)
        }
      }
    })
    
    this.state.activeChannels.set(channelKey, channel)
    
    // 구독 정보 저장 (재연결 시 복구용)
    this.activeSubscriptions.set(channelKey, config)
    
    // 구독 해제 함수 반환
    return () => this.unsubscribe(channelKey)
  }
  
  /**
   * 채널 구독 해제
   */
  private unsubscribe(channelKey: string) {
    const channel = this.state.activeChannels.get(channelKey)
    if (channel) {
      log(`📡 RealtimeManager: Unsubscribing from ${channelKey}`)
      supabase.removeChannel(channel)
      this.state.activeChannels.delete(channelKey)
      this.activeSubscriptions.delete(channelKey)
    }
  }
  
  /**
   * 모든 정리
   */
  private cleanup() {
    log('🧹 RealtimeManager: Cleaning up')
    
    // Heartbeat 중지
    this.stopHeartbeat()
    
    // 세션 타임아웃 체크 중지
    this.stopSessionTimeoutCheck()
    
    // 재연결 타이머 정리
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    // 모든 채널 정리
    this.state.activeChannels.forEach((channel, key) => {
      log(`🧹 RealtimeManager: Removing channel ${key}`)
      supabase.removeChannel(channel)
    })
    this.state.activeChannels.clear()
    
    // 메인 채널 정리
    if (this.mainChannel) {
      supabase.removeChannel(this.mainChannel)
      this.mainChannel = null
    }
    
    // 상태 초기화
    this.state.isConnected = false
    this.state.connectionStartTime = null
    this.state.connectionAttempts = 0
    this.state.connectionState = 'disconnected'
    this.notifyStateChange()
  }
  
  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.state.isConnected
  }
  
  /**
   * 연결 지속 시간 (ms)
   */
  getConnectionDuration(): number {
    if (!this.state.connectionStartTime) return 0
    return Date.now() - this.state.connectionStartTime
  }
  
  /**
   * 수동 재연결
   */
  forceReconnect() {
    log('🔄 RealtimeManager: Force reconnect requested')
    this.state.connectionAttempts = 0 // 수동 재연결 시 시도 횟수 초기화
    this.cleanup()
    this.initialize()
  }
  
  /**
   * 현재 연결 상태 반환
   */
  getConnectionState(): ConnectionState {
    return this.state.connectionState
  }
  
  /**
   * 연결 상태 구독 (외부에서 상태 변화 감지용)
   */
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    // 간단한 이벤트 리스너 패턴
    const listeners = (this as any)._stateListeners || ((this as any)._stateListeners = new Set())
    listeners.add(callback)
    
    // 즉시 현재 상태 전달
    callback(this.state.connectionState)
    
    // 구독 해제 함수 반환
    return () => {
      listeners.delete(callback)
    }
  }
  
  /**
   * 연결 상태 변경 시 리스너들에게 알림
   */
  private notifyStateChange() {
    const listeners = (this as any)._stateListeners
    if (listeners) {
      listeners.forEach((callback: (state: ConnectionState) => void) => {
        try {
          callback(this.state.connectionState)
        } catch (error) {
          logError('Error in connection state listener:', error)
        }
      })
    }
  }
  
  /**
   * 페이지가 다시 보이거나 포커스될 때 처리
   */
  private async handleVisibilityChange() {
    // 로그인 상태 확인
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      log('🔌 RealtimeManager: No session on visibility change')
      return
    }
    
    // 연결 상태 확인
    if (!this.state.isConnected) {
      log('🔌 RealtimeManager: Connection lost during background, reconnecting...')
      this.state.connectionAttempts = 0 // 재연결 시도 횟수 초기화
      await this.initialize()
    } else {
      // 연결은 되어 있지만 실제로 동작하는지 확인
      log('🔌 RealtimeManager: Connection seems alive, sending heartbeat to verify')
      
      // 즉시 heartbeat 전송하여 연결 확인
      try {
        await this.sendHeartbeat()
      } catch (error) {
        log('🔌 RealtimeManager: Heartbeat failed, connection is dead, reconnecting...')
        this.state.connectionAttempts = 0
        await this.initialize()
      }
    }
    
    // 캐시 재검증 트리거 (CacheManager에 신호 전송)
    if (typeof window !== 'undefined' && (window as any).cacheRevalidationCallback) {
      (window as any).cacheRevalidationCallback()
    }
  }
}

// 싱글톤 인스턴스 export
export const realtimeManager = RealtimeManager.getInstance()