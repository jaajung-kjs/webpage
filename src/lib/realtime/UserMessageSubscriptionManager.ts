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
        // 이 사용자와 관련된 메시지만 처리
        if (payload.new?.recipient_id === this.userId || 
            payload.new?.sender_id === this.userId) {
          
          // 콜백 실행
          this.callbacks.forEach((callback) => {
            callback.onNewMessage?.(payload)
          })

          // 캐시 무효화 - useMessagesV2와 일치하는 키 사용
          this.queryClient?.invalidateQueries({ 
            queryKey: ['conversations-v2', this.userId] 
          })
          this.queryClient?.invalidateQueries({ 
            queryKey: ['unread-count-v2', this.userId] 
          })
          
          // 특정 대화방의 메시지도 무효화
          const conversationId = payload.new?.conversation_id
          if (conversationId) {
            this.queryClient?.invalidateQueries({ 
              queryKey: ['conversation-messages-v2', conversationId],
              exact: false
            })
          }
        }
      }
    )

    // 읽음 상태 구독
    const unsubReadStatus = await realtimeCore.subscribe(
      'message_read_status_v2',
      '*',
      (payload) => {
        if (payload.new?.user_id === this.userId) {
          // 콜백 실행
          this.callbacks.forEach((callback) => {
            callback.onStatusUpdate?.(payload)
          })

          // 캐시 무효화 - useMessagesV2와 일치하는 키 사용
          this.queryClient?.invalidateQueries({ 
            queryKey: ['unread-count-v2', this.userId] 
          })
          
          // 특정 대화방의 메시지도 무효화 (읽음 상태 업데이트)
          const messageId = payload.new?.message_id
          if (messageId) {
            // 메시지가 속한 대화방 찾기 위해 전체 대화방 목록 갱신
            this.queryClient?.invalidateQueries({ 
              queryKey: ['conversations-v2', this.userId] 
            })
          }
        }
      }
    )

    this.unsubscribers.set('messages', unsubMessages)
    this.unsubscribers.set('read-status', unsubReadStatus)
  }

  registerCallbacks(componentId: string, callbacks: MessageCallbacks): void {
    this.callbacks.set(componentId, callbacks)
  }

  unregisterCallbacks(componentId: string): void {
    this.callbacks.delete(componentId)
  }

  subscribeToConversation(conversationId: string, callback: () => void): () => void {
    // 대화방별 구독 - 실제로 특정 대화방 메시지 구독
    const key = `conversation-${conversationId}`
    
    // 이미 구독 중인지 확인
    if (this.unsubscribers.has(key)) {
      console.log(`[UserMessageSubscriptionManager] Already subscribed to conversation ${conversationId}`)
      // 콜백만 추가
      const existingCallbacks = this.callbacks.get(key) || { onMessagesChange: callback }
      this.callbacks.set(key, existingCallbacks)
      return () => {
        this.callbacks.delete(key)
      }
    }
    
    // 새로운 구독 생성
    console.log(`[UserMessageSubscriptionManager] Subscribing to conversation ${conversationId}`)
    
    // 비동기로 구독 설정
    realtimeCore.subscribe(
      'messages_v2',
      '*',
      (payload) => {
        // 해당 대화방의 메시지만 처리
        if (payload.new?.conversation_id === conversationId ||
            payload.old?.conversation_id === conversationId) {
          console.log(`[UserMessageSubscriptionManager] Message change in conversation ${conversationId}`)
          
          // 콜백 실행
          this.callbacks.forEach((cb, cbKey) => {
            if (cbKey === key || cbKey.startsWith('conversation-')) {
              cb.onMessagesChange?.(payload)
            }
          })
          
          // 캐시 무효화
          this.queryClient?.invalidateQueries({ 
            queryKey: ['conversation-messages-v2', conversationId],
            exact: false
          })
          this.queryClient?.invalidateQueries({ 
            queryKey: ['conversations-v2', this.userId] 
          })
        }
      }
    ).then(unsub => {
      this.unsubscribers.set(key, unsub)
    }).catch(error => {
      console.error(`[UserMessageSubscriptionManager] Failed to subscribe to conversation ${conversationId}:`, error)
    })
    
    // 콜백 저장
    const callbacks: MessageCallbacks = { onMessagesChange: callback }
    this.callbacks.set(key, callbacks)
    
    return () => {
      // 구독 해제
      const unsub = this.unsubscribers.get(key)
      if (unsub) {
        unsub()
        this.unsubscribers.delete(key)
      }
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