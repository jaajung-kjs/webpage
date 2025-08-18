/**
 * RealtimeSync - 실시간 캐시 동기화
 * 
 * TanStack Query와 Realtime 이벤트 연동
 */

import { QueryClient } from '@tanstack/react-query'
import { realtimeCore } from '../core/realtime-core'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// 동기화 설정
export interface SyncConfig {
  table: string
  queryKeys: (payload: RealtimePostgresChangesPayload<any>) => unknown[][]
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  filter?: string
  updateStrategy?: 'invalidate' | 'update' | 'remove'
}

// 활성 동기화
interface ActiveSync {
  config: SyncConfig
  unsubscribe: () => void
}

/**
 * RealtimeSync 클래스
 * 실시간 이벤트와 TanStack Query 캐시를 동기화
 */
export class RealtimeSync {
  private static instance: RealtimeSync
  private syncs: Map<string, ActiveSync>
  private queryClient: QueryClient | null = null
  
  private constructor() {
    this.syncs = new Map()
  }
  
  /**
   * 싱글톤 인스턴스
   */
  static getInstance(): RealtimeSync {
    if (!RealtimeSync.instance) {
      RealtimeSync.instance = new RealtimeSync()
    }
    return RealtimeSync.instance
  }
  
  /**
   * QueryClient 설정
   */
  setQueryClient(queryClient: QueryClient): void {
    this.queryClient = queryClient
  }
  
  /**
   * 실시간 동기화 설정
   */
  async setupSync(id: string, config: SyncConfig): Promise<() => void> {
    if (!this.queryClient) {
      console.error('[RealtimeSync] QueryClient not set. Call setQueryClient first.')
      return () => {}
    }
    
    // 이미 동기화 중인 경우
    if (this.syncs.has(id)) {
      console.warn(`[RealtimeSync] Already syncing ${id}`)
      return () => this.removeSync(id)
    }
    
    console.log(`[RealtimeSync] Setting up sync for ${id}`, {
      table: config.table,
      event: config.event,
      strategy: config.updateStrategy
    })
    
    // Realtime 구독
    const unsubscribe = await realtimeCore.subscribe(
      config.table,
      config.event,
      (payload) => {
        this.handleRealtimeEvent(config, payload)
      },
      config.filter
    )
    
    // 동기화 정보 저장
    this.syncs.set(id, {
      config,
      unsubscribe
    })
    
    // 동기화 해제 함수 반환
    return () => this.removeSync(id)
  }
  
  /**
   * 실시간 이벤트 처리
   */
  private handleRealtimeEvent(
    config: SyncConfig,
    payload: RealtimePostgresChangesPayload<any>
  ): void {
    if (!this.queryClient) return
    
    console.log(`[RealtimeSync] Handling ${payload.eventType} event for ${config.table}`)
    
    // 영향받는 쿼리 키 계산
    const queryKeys = config.queryKeys(payload)
    
    // 업데이트 전략에 따라 처리
    const strategy = config.updateStrategy || 'invalidate'
    
    switch (strategy) {
      case 'invalidate':
        // 캐시 무효화 (가장 일반적)
        queryKeys.forEach(queryKey => {
          this.queryClient!.invalidateQueries({ queryKey })
        })
        break
      
      case 'update':
        // 캐시 직접 업데이트 (낙관적 업데이트)
        if (payload.new) {
          queryKeys.forEach(queryKey => {
            const oldData = this.queryClient!.getQueryData(queryKey)
            
            if (Array.isArray(oldData)) {
              // 리스트 업데이트
              let newData: any[]
              
              if (payload.eventType === 'INSERT') {
                newData = [...oldData, payload.new]
              } else if (payload.eventType === 'UPDATE') {
                newData = oldData.map(item => 
                  item.id === payload.new.id ? payload.new : item
                )
              } else if (payload.eventType === 'DELETE') {
                newData = oldData.filter(item => item.id !== payload.old?.id)
              } else {
                newData = oldData
              }
              
              this.queryClient!.setQueryData(queryKey, newData)
            } else if (oldData && typeof oldData === 'object') {
              // 단일 객체 업데이트
              this.queryClient!.setQueryData(queryKey, payload.new)
            }
          })
        }
        break
      
      case 'remove':
        // 캐시에서 제거
        if (payload.eventType === 'DELETE') {
          queryKeys.forEach(queryKey => {
            const oldData = this.queryClient!.getQueryData(queryKey)
            
            if (Array.isArray(oldData)) {
              const newData = oldData.filter(item => item.id !== payload.old?.id)
              this.queryClient!.setQueryData(queryKey, newData)
            }
          })
        }
        break
    }
  }
  
  /**
   * 동기화 제거
   */
  removeSync(id: string): void {
    const sync = this.syncs.get(id)
    if (!sync) return
    
    console.log(`[RealtimeSync] Removing sync ${id}`)
    
    sync.unsubscribe()
    this.syncs.delete(id)
  }
  
  /**
   * 모든 동기화 제거
   */
  removeAllSyncs(): void {
    console.log('[RealtimeSync] Removing all syncs')
    
    this.syncs.forEach((sync, id) => {
      sync.unsubscribe()
    })
    
    this.syncs.clear()
  }
  
  /**
   * 특정 테이블의 동기화 제거
   */
  removeSyncsByTable(table: string): void {
    const toRemove: string[] = []
    
    this.syncs.forEach((sync, id) => {
      if (sync.config.table === table) {
        toRemove.push(id)
      }
    })
    
    toRemove.forEach(id => this.removeSync(id))
  }
  
  /**
   * 활성 동기화 목록
   */
  getActiveSyncs(): string[] {
    return Array.from(this.syncs.keys())
  }
  
  /**
   * 디버그 정보
   */
  debug(): void {
    console.log('[RealtimeSync] Debug Info:')
    console.log('- Active syncs:', this.syncs.size)
    console.log('- QueryClient set:', !!this.queryClient)
    
    this.syncs.forEach((sync, id) => {
      console.log(`  ${id}:`, {
        table: sync.config.table,
        event: sync.config.event,
        strategy: sync.config.updateStrategy
      })
    })
  }
}

// 싱글톤 인스턴스 export
export const realtimeSync = RealtimeSync.getInstance()

// 일반적인 동기화 패턴들

/**
 * 콘텐츠 목록 동기화
 */
export async function syncContentList(): Promise<() => void> {
  return await realtimeSync.setupSync('content-list', {
    table: 'content',
    queryKeys: (payload) => {
      // 모든 콘텐츠 목록 쿼리 무효화
      const keys: unknown[][] = [
        ['content'],
        ['content', 'list']
      ]
      
      // 특정 타입의 콘텐츠 목록도 무효화
      if ((payload.new as any)?.type || (payload.old as any)?.type) {
        const type = (payload.new as any)?.type || (payload.old as any)?.type
        keys.push(['content', type])
      }
      
      return keys
    },
    updateStrategy: 'invalidate'
  })
}

/**
 * 콘텐츠 상세 동기화
 */
export async function syncContentDetail(contentId: string): Promise<() => void> {
  return await realtimeSync.setupSync(`content-${contentId}`, {
    table: 'content',
    filter: `id=eq.${contentId}`,
    queryKeys: () => [
      ['content', contentId]
    ],
    updateStrategy: 'update'
  })
}

/**
 * 댓글 동기화
 */
export async function syncComments(contentId: string): Promise<() => void> {
  return await realtimeSync.setupSync(`comments-${contentId}`, {
    table: 'comments',
    filter: `content_id=eq.${contentId}`,
    queryKeys: () => [
      ['comments', contentId],
      ['comments', 'list', contentId]
    ],
    updateStrategy: 'invalidate'
  })
}

/**
 * 메시지 인박스 동기화
 */
export async function syncMessageInbox(userId: string): Promise<() => void> {
  return await realtimeSync.setupSync(`inbox-${userId}`, {
    table: 'messages',
    filter: `recipient_id=eq.${userId}`,
    queryKeys: () => [
      ['messages', 'inbox', userId],
      ['messages', 'unread', userId]
    ],
    updateStrategy: 'invalidate'
  })
}

/**
 * 대화 메시지 동기화
 */
export async function syncConversation(conversationId: string): Promise<() => void> {
  return await realtimeSync.setupSync(`conversation-${conversationId}`, {
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`,
    queryKeys: () => [
      ['messages', 'conversation', conversationId]
    ],
    updateStrategy: 'update' // 새 메시지는 즉시 추가
  })
}

/**
 * 사용자 프로필 동기화
 */
export async function syncUserProfile(userId: string): Promise<() => void> {
  return await realtimeSync.setupSync(`user-${userId}`, {
    table: 'users',
    filter: `id=eq.${userId}`,
    queryKeys: () => [
      ['user', userId],
      ['user', 'profile', userId]
    ],
    updateStrategy: 'update'
  })
}

/**
 * 알림 카운트 동기화
 */
export async function syncNotificationCount(userId: string): Promise<() => void> {
  return await realtimeSync.setupSync(`notifications-${userId}`, {
    table: 'user_message_stats',
    filter: `user_id=eq.${userId}`,
    queryKeys: () => [
      ['notifications', 'count', userId],
      ['messages', 'unread', userId]
    ],
    updateStrategy: 'update'
  })
}