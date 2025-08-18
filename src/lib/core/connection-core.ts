/**
 * ConnectionCore - 심플한 연결 관리
 * 
 * 포그라운드 복귀/온라인 복귀 시 WebSocket 체크 후 필요시 재생성
 * 백그라운드 진입 시 메모리 최소화
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import { getEnvConfig } from '../config/environment'

export type ConnectionState = 'online' | 'offline' | 'reconnecting'

export interface ConnectionStatus {
  state: ConnectionState
  needsReconnect: boolean
}

/**
 * 단순화된 ConnectionCore (100줄 이하)
 */
export class ConnectionCore {
  private static instance: ConnectionCore
  private client: SupabaseClient<Database>
  private status: ConnectionStatus
  private listeners: Set<(client: SupabaseClient<Database>) => void>
  private lastRecreateTime: number = 0
  private recreateCount: number = 0
  private backgroundTimer: NodeJS.Timeout | null = null
  private readonly MIN_RECREATE_INTERVAL = 5 * 1000 // 최소 5초 간격
  private readonly BACKGROUND_DISCONNECT_DELAY = 5 * 60 * 1000 // 백그라운드 5분 후 끊기
  
  private constructor() {
    this.status = {
      state: navigator.onLine ? 'online' : 'offline',
      needsReconnect: false
    }
    this.listeners = new Set()
    this.client = this.createNewClient()
    this.initialize()
  }

  static getInstance(): ConnectionCore {
    if (!ConnectionCore.instance) {
      ConnectionCore.instance = new ConnectionCore()
    }
    return ConnectionCore.instance
  }

  private createNewClient(): SupabaseClient<Database> {
    const envConfig = getEnvConfig()
    console.log('[ConnectionCore] Creating new Supabase client')
    
    return createClient<Database>(envConfig.supabaseUrl, envConfig.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'kepco-ai-auth'
      },
      realtime: {
        params: { eventsPerSecond: 10 },
        timeout: 20000
      }
    })
  }

  private initialize(): void {
    if (typeof window !== 'undefined') {
      // 네트워크 상태 변경
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))
      
      // 백그라운드/포그라운드 전환
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
  }

  private async handleOnline(): Promise<void> {
    console.log('[ConnectionCore] Network online')
    
    // WebSocket 살아있는지 체크
    if (!this.client.realtime?.isConnected()) {
      console.log('[ConnectionCore] WebSocket dead, recreating client...')
      await this.recreateClient()
    } else {
      console.log('[ConnectionCore] WebSocket alive, continuing...')
      this.status = { state: 'online', needsReconnect: false }
    }
  }

  private handleOffline(): void {
    console.log('[ConnectionCore] Network offline')
    this.status = { state: 'offline', needsReconnect: false }
    // 오프라인 시에는 아무것도 안함 - WebSocket이 알아서 끊김
  }
  
  private async handleVisibilityChange(): Promise<void> {
    if (document.hidden) {
      // 백그라운드로 전환 - 5분 후에 WebSocket 끊기
      console.log('[ConnectionCore] Going to background, will disconnect WebSocket after 5 minutes...')
      
      // 기존 타이머가 있으면 취소 (이미 백그라운드였다가 다시 백그라운드)
      if (this.backgroundTimer) {
        clearTimeout(this.backgroundTimer)
      }
      
      // 5분 후 WebSocket 끊기
      this.backgroundTimer = setTimeout(() => {
        if (document.hidden && this.client.realtime) {
          console.log('[ConnectionCore] Background timeout - disconnecting WebSocket to free memory')
          // WebSocket 연결 끊기 - 메모리는 가비지 컬렉터가 자동으로 정리
          this.client.realtime.disconnect()
          // disconnect() 하면 WebSocket 객체와 관련 이벤트 리스너들이 정리되어
          // 가비지 컬렉터가 메모리를 회수할 수 있게 됨
        }
        this.backgroundTimer = null
      }, this.BACKGROUND_DISCONNECT_DELAY)
      
    } else {
      // 포그라운드로 복귀
      console.log('[ConnectionCore] Returning to foreground')
      
      // 백그라운드 타이머 취소
      if (this.backgroundTimer) {
        clearTimeout(this.backgroundTimer)
        this.backgroundTimer = null
        console.log('[ConnectionCore] Cancelled background disconnect timer')
      }
      
      // 온라인 상태이고 WebSocket이 죽었으면 재생성
      if (navigator.onLine) {
        if (!this.client.realtime?.isConnected()) {
          console.log('[ConnectionCore] WebSocket dead after background, recreating...')
          await this.recreateClient()
        } else {
          console.log('[ConnectionCore] WebSocket still alive')
        }
      } else {
        console.log('[ConnectionCore] Still offline, waiting for connection...')
      }
    }
  }

  async recreateClient(): Promise<void> {
    // 재생성 빈도 제한 체크 (5초 간격)
    const now = Date.now()
    const timeSinceLastRecreate = now - this.lastRecreateTime
    
    if (timeSinceLastRecreate < this.MIN_RECREATE_INTERVAL) {
      console.warn(`[ConnectionCore] Recreate attempted too soon (${Math.round(timeSinceLastRecreate / 1000)}s ago), skipping`)
      return
    }
    
    console.log(`[ConnectionCore] Recreating Supabase client... (attempt ${this.recreateCount + 1})`)
    this.status = { state: 'reconnecting', needsReconnect: true }
    this.lastRecreateTime = now
    this.recreateCount++
    
    // 기존 클라이언트 완전 정리
    try {
      // 1. Realtime 연결 정리
      if (this.client.realtime) {
        // 모든 채널 제거
        const channels = this.client.realtime.channels
        if (channels && channels.length > 0) {
          channels.forEach(channel => {
            channel.unsubscribe()
            this.client.removeChannel(channel)
          })
        }
        this.client.realtime.disconnect()
      }
      
      // 2. Auth 세션 정리 (로그아웃은 하지 않고 리스너만 정리)
      if (this.client.auth) {
        // @ts-ignore - 내부 리스너 정리
        const stateChangeEmitters = this.client.auth.stateChangeEmitters
        if (stateChangeEmitters) {
          stateChangeEmitters.clear()
        }
      }
      
      // 3. 잠시 대기하여 비동기 작업 완료 보장
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error('[ConnectionCore] Error cleaning up old client:', error)
    }
    
    // 새 클라이언트 생성
    this.client = this.createNewClient()
    
    // 모든 리스너에게 알림 (RealtimeCore 등이 재구독하도록)
    this.listeners.forEach(listener => listener(this.client))
    
    this.status = { state: 'online', needsReconnect: false }
    console.log('[ConnectionCore] Client recreated successfully')
  }

  getClient(): SupabaseClient<Database> {
    return this.client
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  // 클라이언트 변경 구독
  onClientChange(listener: (client: SupabaseClient<Database>) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // 메모리 사용량 디버그 (개발 환경용)
  getMemoryStats(): any {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (performance as any)) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB',
        recreateCount: this.recreateCount,
        lastRecreateTime: this.lastRecreateTime ? new Date(this.lastRecreateTime).toISOString() : 'Never',
        currentChannels: this.client.realtime?.channels?.length || 0
      }
    }
    return {
      recreateCount: this.recreateCount,
      lastRecreateTime: this.lastRecreateTime ? new Date(this.lastRecreateTime).toISOString() : 'Never'
    }
  }

  // 완전한 정리 (앱 종료 시 사용)
  async destroy(): Promise<void> {
    console.log('[ConnectionCore] Destroying connection core...')
    
    // 백그라운드 타이머 정리
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer)
      this.backgroundTimer = null
    }
    
    // 이벤트 리스너 제거
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this))
      window.removeEventListener('offline', this.handleOffline.bind(this))
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
    
    // 클라이언트 정리
    try {
      if (this.client.realtime) {
        const channels = this.client.realtime.channels
        if (channels && channels.length > 0) {
          channels.forEach(channel => {
            channel.unsubscribe()
            this.client.removeChannel(channel)
          })
        }
        this.client.realtime.disconnect()
      }
      
      if (this.client.auth) {
        // @ts-ignore
        const stateChangeEmitters = this.client.auth.stateChangeEmitters
        if (stateChangeEmitters) {
          stateChangeEmitters.clear()
        }
      }
    } catch (error) {
      console.error('[ConnectionCore] Error during destroy:', error)
    }
    
    // 리스너 정리
    this.listeners.clear()
    
    console.log('[ConnectionCore] Destroyed successfully')
  }
}

// Export
export const connectionCore = ConnectionCore.getInstance()
export const supabaseClient = () => connectionCore.getClient()