/**
 * UserMessageSubscriptionManager - 사용자별 메시지 구독 관리
 * 
 * 개별 사용자의 메시지, 알림 등을 실시간으로 구독 관리
 * 단순화된 버전 - 새로운 subscribe API 사용
 */

import { QueryClient } from '@tanstack/react-query'
import { realtimeCore } from '@/lib/core/realtime-core'

interface MessageCallbacks {
  onNewMessage?: (payload: any) => void
  onStatusUpdate?: (payload: any) => void
  onNotification?: (payload: any) => void
  onMessagesChange?: (payload: any) => void
  onReadStatusChange?: (payload: any) => void
}

export class UserMessageSubscriptionManager {
  private userId: string | null = null
  private queryClient: QueryClient | null = null
  private isInitialized = false
  private unsubscribers: Map<string, () => void> = new Map()
  private callbacks: Map<string, MessageCallbacks> = new Map()
  private userConversations: Set<string> = new Set() // 사용자가 속한 대화방 ID들

  async initialize(userId: string, queryClient: QueryClient): Promise<void> {
    if (this.isInitialized && this.userId === userId) {
      return // 이미 같은 사용자로 초기화됨
    }

    // 기존 구독 정리
    if (this.isInitialized) {
      this.cleanup()
    }

    this.userId = userId
    this.queryClient = queryClient
    
    try {
      // 사용자별 메시지 구독 설정
      await this.setupMessageSubscriptions()
      this.isInitialized = true
    } catch (error) {
      console.error('[UserMessageSubscriptionManager] Initialization failed:', error)
    }
  }

  private async setupMessageSubscriptions(): Promise<void> {
    if (!this.userId) return

    // 사용자 메시지 구독
    const unsubMessages = await realtimeCore.subscribe(
      'messages_v2',
      '*',
      (payload) => {
        const conversationId = payload.new?.conversation_id || payload.old?.conversation_id
        
        // 대화방 ID가 없으면 무시
        if (!conversationId) return
        
        console.log(`[UserMessageSubscriptionManager] Message event in conversation ${conversationId}`)
        
        // 모든 콜백 실행 (전역 콜백 + 대화방별 콜백)
        this.callbacks.forEach((callback) => {
          callback.onNewMessage?.(payload)
          callback.onMessagesChange?.(payload) // 대화방별 콜백도 실행
        })

        // 캐시 무효화 - useMessagesV2와 일치하는 키 사용
        this.queryClient?.invalidateQueries({ 
          queryKey: ['conversations-v2', this.userId],
          exact: false
        })
        this.queryClient?.invalidateQueries({ 
          queryKey: ['unread-count-v2', this.userId],
          exact: false
        })
        
        // 특정 대화방의 메시지도 무효화 - exact: false로 모든 관련 쿼리 무효화
        this.queryClient?.invalidateQueries({ 
          queryKey: ['conversation-messages-v2', conversationId],
          exact: false
        })
      }
    )

    // 읽음 상태 구독 - 모든 읽음 상태 변경 감지
    const unsubReadStatus = await realtimeCore.subscribe(
      'message_read_status_v2',
      '*',
      (payload) => {
        // 모든 읽음 상태 변경을 처리 (나 또는 상대방이 읽었을 때)
        console.log('[UserMessageSubscriptionManager] Read status change:', payload.new)
        
        // 콜백 실행
        this.callbacks.forEach((callback) => {
          callback.onStatusUpdate?.(payload)
          callback.onReadStatusChange?.(payload)
        })

        // 캐시 무효화 - 나의 읽지 않은 메시지 수
        if (payload.new?.user_id === this.userId) {
          this.queryClient?.invalidateQueries({ 
            queryKey: ['unread-count-v2', this.userId],
            exact: false
          })
        }
        
        // 메시지가 속한 대화방의 메시지 목록 갱신 (읽음 표시 업데이트)
        // 여기서는 conversation_id를 알 수 없으므로 모든 대화방 메시지를 갱신
        // 비효율적이지만 읽음 표시를 위해 필요
        this.queryClient?.invalidateQueries({ 
          queryKey: ['conversation-messages-v2'],
          exact: false
        })
        
        // 대화 목록도 갱신
        this.queryClient?.invalidateQueries({ 
          queryKey: ['conversations-v2'],
          exact: false
        })
      }
    )

    // 대화방 변경 구독 (새 메시지로 인한 last_message_at 업데이트 등)
    const unsubConversations = await realtimeCore.subscribe(
      'conversations_v2',
      '*',
      (payload) => {
        // 이 사용자가 속한 대화방인지 확인
        if (payload.new?.user1_id === this.userId || 
            payload.new?.user2_id === this.userId ||
            payload.old?.user1_id === this.userId ||
            payload.old?.user2_id === this.userId) {
          
          console.log('[UserMessageSubscriptionManager] Conversation updated for user')
          
          // 대화 목록 캐시 무효화
          this.queryClient?.invalidateQueries({ 
            queryKey: ['conversations-v2', this.userId] 
          })
        }
      }
    )

    this.unsubscribers.set('messages', unsubMessages)
    this.unsubscribers.set('read-status', unsubReadStatus)
    this.unsubscribers.set('conversations', unsubConversations)
  }

  registerCallbacks(componentId: string, callbacks: MessageCallbacks): void {
    this.callbacks.set(componentId, callbacks)
  }

  unregisterCallbacks(componentId: string): void {
    this.callbacks.delete(componentId)
  }

  subscribeToConversation(conversationId: string, callback: () => void): () => void {
    // 대화방별 콜백 관리 (실제 구독은 이미 전역에서 하고 있음)
    const key = `conversation-${conversationId}`
    
    console.log(`[UserMessageSubscriptionManager] Registering callback for conversation ${conversationId}`)
    
    // 콜백 저장 - onMessagesChange와 onNewMessage 둘 다 설정
    const callbacks: MessageCallbacks = { 
      onNewMessage: (payload) => {
        // 해당 대화방의 메시지만 처리
        const msgConversationId = payload?.new?.conversation_id || payload?.old?.conversation_id
        if (msgConversationId === conversationId) {
          console.log(`[UserMessageSubscriptionManager] New message in conversation ${conversationId}`)
          callback()
        }
      },
      onMessagesChange: (payload) => {
        // 해당 대화방의 메시지만 처리
        const msgConversationId = payload?.new?.conversation_id || payload?.old?.conversation_id
        if (msgConversationId === conversationId) {
          console.log(`[UserMessageSubscriptionManager] Message change in conversation ${conversationId}`)
          callback()
        }
      }
    }
    this.callbacks.set(key, callbacks)
    
    return () => {
      // 콜백만 제거 (실제 구독은 유지)
      console.log(`[UserMessageSubscriptionManager] Unregistering callback for conversation ${conversationId}`)
      this.callbacks.delete(key)
    }
  }

  cleanup(): void {
    // 모든 구독 해제
    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.unsubscribers.clear()
    this.callbacks.clear()
    
    this.userId = null
    this.queryClient = null
    this.isInitialized = false
  }

  isActive(): boolean {
    return this.isInitialized
  }

  getStatus() {
    return {
      isActive: this.isInitialized,
      userId: this.userId,
      subscriptionCount: this.unsubscribers.size
    }
  }
}

export const userMessageSubscriptionManager = new UserMessageSubscriptionManager()