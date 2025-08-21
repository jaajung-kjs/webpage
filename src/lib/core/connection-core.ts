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
    
    // 토큰 갱신 핸들러 설정
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
        // Supabase의 기본 설정을 사용하여 안정성 향상
        // timeout, heartbeat, reconnect는 Supabase가 자동 관리
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

  // 토큰 갱신 핸들러만 설정 - Supabase가 나머지 처리
  private setupReconnectionHandlers(): void {
    this.client.auth.onAuthStateChange((event, session) => {
      console.log(`[ConnectionCore] Auth event: ${event}`)
      
      // TOKEN_REFRESHED 시 setAuth 호출하면 Supabase가 자동 재연결
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        console.log('[ConnectionCore] 🔐 Token refreshed, updating WebSocket')
        this.client.realtime.setAuth(session.access_token)
        
        // 리스너들에게 재연결 알림 (채널 재구독용)
        console.log('[ConnectionCore] Notifying listeners about reconnection')
        this.listeners.forEach(listener => listener(this.client))
      }
    })
    
    console.log('[ConnectionCore] ✅ Token refresh handler initialized')
  }
}

// Export
export const connectionCore = ConnectionCore.getInstance()
export const supabaseClient = () => connectionCore.getClient()