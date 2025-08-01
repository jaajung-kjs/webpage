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

interface ChannelConfig {
  name: string
  table?: string
  filter?: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  callback: (payload: any) => void
}

interface RealtimeState {
  isConnected: boolean
  connectionStartTime: number | null
  lastHeartbeat: number | null
  activeChannels: Map<string, RealtimeChannel>
}

export class RealtimeManager {
  private static instance: RealtimeManager
  private state: RealtimeState = {
    isConnected: false,
    connectionStartTime: null,
    lastHeartbeat: null,
    activeChannels: new Map()
  }
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private mainChannel: RealtimeChannel | null = null
  
  // Heartbeat 설정
  private readonly HEARTBEAT_INTERVAL = 30000 // 30초
  private readonly RECONNECT_DELAY = 5000 // 5초
  
  private constructor() {
    console.log('🔌 RealtimeManager: Initializing')
    this.initialize()
  }
  
  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager()
    }
    return RealtimeManager.instance
  }
  
  /**
   * 초기화 및 메인 채널 설정
   */
  private async initialize() {
    try {
      // 세션 확인
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('🔌 RealtimeManager: No session, skipping initialization')
        return
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
      this.mainChannel
        .on('system', { event: '*' }, (payload) => {
          console.log('🔌 RealtimeManager: System event', payload)
        })
        .subscribe((status) => {
          console.log('🔌 RealtimeManager: Main channel status', status)
          
          if (status === 'SUBSCRIBED') {
            this.onConnected()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.onDisconnected()
          }
        })
      
      // Auth 상태 변경 감지
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          this.cleanup()
        } else if (event === 'SIGNED_IN' && session) {
          this.initialize()
        }
      })
      
    } catch (error) {
      console.error('🔌 RealtimeManager: Initialization error', error)
      this.scheduleReconnect()
    }
  }
  
  /**
   * 연결 성공 시
   */
  private onConnected() {
    console.log('✅ RealtimeManager: Connected')
    this.state.isConnected = true
    this.state.connectionStartTime = Date.now()
    
    // Heartbeat 시작
    this.startHeartbeat()
    
    // 재연결 타이머 정리
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
  
  /**
   * 연결 끊김 시
   */
  private onDisconnected() {
    console.log('❌ RealtimeManager: Disconnected')
    this.state.isConnected = false
    this.state.connectionStartTime = null
    
    // Heartbeat 중지
    this.stopHeartbeat()
    
    // 재연결 예약
    this.scheduleReconnect()
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
      
      this.state.lastHeartbeat = Date.now()
      console.log('💓 RealtimeManager: Heartbeat sent')
    } catch (error) {
      console.error('💔 RealtimeManager: Heartbeat failed', error)
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
   * 재연결 예약
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) return
    
    console.log(`🔄 RealtimeManager: Scheduling reconnect in ${this.RECONNECT_DELAY}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnect()
    }, this.RECONNECT_DELAY)
  }
  
  /**
   * 재연결 시도
   */
  private async reconnect() {
    console.log('🔄 RealtimeManager: Attempting reconnect')
    
    // 모든 채널 정리
    this.cleanup()
    
    // 다시 초기화
    await this.initialize()
  }
  
  /**
   * 채널 구독
   */
  subscribe(config: ChannelConfig): () => void {
    const channelKey = `${config.name}-${config.table || 'custom'}`
    
    // 이미 구독 중인 경우
    if (this.state.activeChannels.has(channelKey)) {
      console.log(`📡 RealtimeManager: Already subscribed to ${channelKey}`)
      return () => this.unsubscribe(channelKey)
    }
    
    console.log(`📡 RealtimeManager: Subscribing to ${channelKey}`)
    
    const channel = supabase.channel(channelKey)
    
    if (config.table) {
      // 테이블 변경 구독
      channel.on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          ...(config.filter && { filter: config.filter })
        },
        config.callback
      )
    } else {
      // 커스텀 이벤트 구독
      channel.on('broadcast' as any, { event: config.name }, config.callback)
    }
    
    channel.subscribe((status) => {
      console.log(`📡 RealtimeManager: Channel ${channelKey} status:`, status)
    })
    
    this.state.activeChannels.set(channelKey, channel)
    
    // 구독 해제 함수 반환
    return () => this.unsubscribe(channelKey)
  }
  
  /**
   * 채널 구독 해제
   */
  private unsubscribe(channelKey: string) {
    const channel = this.state.activeChannels.get(channelKey)
    if (channel) {
      console.log(`📡 RealtimeManager: Unsubscribing from ${channelKey}`)
      supabase.removeChannel(channel)
      this.state.activeChannels.delete(channelKey)
    }
  }
  
  /**
   * 모든 정리
   */
  private cleanup() {
    console.log('🧹 RealtimeManager: Cleaning up')
    
    // Heartbeat 중지
    this.stopHeartbeat()
    
    // 재연결 타이머 정리
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    // 모든 채널 정리
    this.state.activeChannels.forEach((channel, key) => {
      console.log(`🧹 RealtimeManager: Removing channel ${key}`)
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
    this.state.lastHeartbeat = null
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
   * 마지막 heartbeat 이후 시간 (ms)
   */
  getTimeSinceLastHeartbeat(): number {
    if (!this.state.lastHeartbeat) return Infinity
    return Date.now() - this.state.lastHeartbeat
  }
  
  /**
   * 수동 재연결
   */
  forceReconnect() {
    console.log('🔄 RealtimeManager: Force reconnect requested')
    this.cleanup()
    this.initialize()
  }
}

// 싱글톤 인스턴스 export
export const realtimeManager = RealtimeManager.getInstance()