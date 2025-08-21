/**
 * ConnectionCore - 최소화된 Supabase 클라이언트 관리
 * 
 * Supabase의 자동 재연결 기능에 완전 의존
 * 수동 재연결 관리 제거
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import { getEnvConfig } from '../config/environment'

export type ConnectionState = 'online' | 'offline'

export interface ConnectionStatus {
  state: ConnectionState
}

/**
 * 최적화된 ConnectionCore (50줄 이하)
 */
export class ConnectionCore {
  private static instance: ConnectionCore
  private client: SupabaseClient<Database>
  private listeners: Set<(client: SupabaseClient<Database>) => void>
  
  private constructor() {
    this.listeners = new Set()
    this.client = this.createNewClient()
    
    // WebSocket 재연결 처리 설정
    this.setupReconnectionHandlers()
  }

  static getInstance(): ConnectionCore {
    if (!ConnectionCore.instance) {
      ConnectionCore.instance = new ConnectionCore()
    }
    return ConnectionCore.instance
  }

  private createNewClient(): SupabaseClient<Database> {
    const envConfig = getEnvConfig()
    console.log('[ConnectionCore] Creating Supabase client')
    
    // Supabase가 모든 재연결과 heartbeat를 자동 처리
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
        timeout: 20000,
        heartbeatIntervalMs: 30000, // Supabase 자동 heartbeat
        reconnectAfterMs: (attempts: number) => {
          // 빠른 재연결: 0.5s, 1s, 2s, 5s, 5s...
          return attempts === 0 ? 500 : Math.min(1000 * attempts, 5000)
        }
      }
    })
  }

  getClient(): SupabaseClient<Database> {
    return this.client
  }

  getStatus(): ConnectionStatus {
    // Supabase realtime 연결 상태 확인
    const isConnected = this.client.realtime?.isConnected() ?? false
    return {
      state: isConnected ? 'online' : 'offline'
    }
  }

  // 클라이언트 변경 구독 (재연결 시 알림용)
  onClientChange(listener: (client: SupabaseClient<Database>) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // WebSocket 재연결 핸들러 통합 - 모든 재연결 시나리오 처리
  private setupReconnectionHandlers(): void {
    // 1. Visibility 변경 감지 (백그라운드 복귀)
    if (typeof document !== 'undefined') {
      console.log('[ConnectionCore] Setting up visibility handler')
      
      document.addEventListener('visibilitychange', async () => {
        console.log(`[ConnectionCore] Visibility changed to: ${document.visibilityState}`)
        
        if (document.visibilityState === 'visible') {
          console.log('[ConnectionCore] 🔄 Returning from background')
          await this.refreshWebSocketConnection()
        } else if (document.visibilityState === 'hidden') {
          console.log('[ConnectionCore] 💤 Going to background')
        }
      })
    }
    
    // 2. 토큰 자동 갱신 감지 (장시간 idle 후 자동 갱신)
    this.client.auth.onAuthStateChange((event, session) => {
      console.log(`[ConnectionCore] Auth event: ${event}`)
      
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        console.log('[ConnectionCore] 🔐 Token refreshed, updating WebSocket')
        this.client.realtime.setAuth(session.access_token)
      }
    })
    
    console.log('[ConnectionCore] ✅ Reconnection handlers initialized')
  }
  
  // WebSocket 연결 갱신 헬퍼
  private async refreshWebSocketConnection(): Promise<void> {
    const { data: { session } } = await this.client.auth.getSession()
    
    if (session?.access_token) {
      console.log('[ConnectionCore] Refreshing WebSocket with new token')
      this.client.realtime.setAuth(session.access_token)
      console.log('[ConnectionCore] ✅ WebSocket refreshed')
    } else {
      console.log('[ConnectionCore] ⚠️ No session found')
    }
  }
}

// Export
export const connectionCore = ConnectionCore.getInstance()
export const supabaseClient = () => connectionCore.getClient()