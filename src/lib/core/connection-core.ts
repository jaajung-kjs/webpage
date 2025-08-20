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
  private readonly MIN_RECREATE_INTERVAL = 5 * 1000 // 최소 5초 간격
  
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
    // Supabase가 자동으로 재연결 처리하므로 수동 재생성 불필요
    this.status = { state: 'online', needsReconnect: false }
  }

  private handleOffline(): void {
    console.log('[ConnectionCore] Network offline')
    this.status = { state: 'offline', needsReconnect: false }
    // 오프라인 시에는 아무것도 안함 - WebSocket이 알아서 끊김
  }
  
  private async handleVisibilityChange(): Promise<void> {
    if (document.hidden) {
      console.log('[ConnectionCore] Going to background')
    } else {
      console.log('[ConnectionCore] Returning to foreground')
      // Supabase가 자동으로 재연결 처리
      // QueryClient 참조 갱신을 위해 리스너에게만 알림
      if (navigator.onLine) {
        this.listeners.forEach(listener => listener(this.client))
      }
    }
  }


  // 극히 드문 경우에만 호출 (대부분 Supabase가 자동 처리)
  async recreateClient(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRecreate = now - this.lastRecreateTime
    
    if (timeSinceLastRecreate < this.MIN_RECREATE_INTERVAL) {
      console.warn(`[ConnectionCore] Recreate attempted too soon, skipping`)
      return
    }
    
    console.log('[ConnectionCore] Recreating client (rare case)')
    this.lastRecreateTime = now
    this.recreateCount++
    
    // 간단한 정리
    try {
      if (this.client.realtime) {
        this.client.realtime.disconnect()
      }
    } catch (error) {
      console.warn('[ConnectionCore] Cleanup error:', error)
    }
    
    // 새 클라이언트 생성
    this.client = this.createNewClient()
    
    // 리스너에게 알림
    this.listeners.forEach(listener => listener(this.client))
    
    this.status = { state: 'online', needsReconnect: false }
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

  // 앱 종료 시 정리
  async destroy(): Promise<void> {
    console.log('[ConnectionCore] Destroying...')
    
    // 이벤트 리스너 제거
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this))
      window.removeEventListener('offline', this.handleOffline.bind(this))
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
    
    // 간단한 정리
    try {
      if (this.client.realtime) {
        this.client.realtime.disconnect()
      }
    } catch (error) {
      console.warn('[ConnectionCore] Destroy error:', error)
    }
    
    this.listeners.clear()
  }
}

// Export
export const connectionCore = ConnectionCore.getInstance()
export const supabaseClient = () => connectionCore.getClient()