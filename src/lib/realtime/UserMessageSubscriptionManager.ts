/**
 * UserMessageSubscriptionManager - 최적화된 사용자별 메시지 구독 관리
 * 
 * Supabase channel API를 직접 사용하여 메시지 실시간 구독
 */

import { QueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { toast } from 'sonner'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface MessageCallbacks {
  onNewMessage?: (payload: any) => void
  onStatusUpdate?: (payload: any) => void
  onNotification?: (payload: any) => void
  onMessagesChange?: (payload: any) => void
  onReadStatusChange?: (payload: any) => void
}

export class UserMessageSubscriptionManager {
  private userId: string | null = null
  private getQueryClient: (() => QueryClient | null) | null = null
  private isInitialized = false
  private channel: RealtimeChannel | null = null
  private callbacks: Map<string, MessageCallbacks> = new Map()

  async initialize(userId: string, queryClientGetter: () => QueryClient | null): Promise<void> {
    // 같은 사용자로 이미 초기화된 경우 스킵
    if (this.isInitialized && this.userId === userId) {
      console.log('[UserMessageSubscriptionManager] Already initialized for same user, skipping')
      return
    }

    // 기존 구독 정리 (다른 사용자로 초기화되거나 처음 초기화하는 경우)
    if (this.isInitialized) {
      console.log('[UserMessageSubscriptionManager] Cleaning up previous subscriptions')
      this.cleanup()
    }

    this.userId = userId
    this.getQueryClient = queryClientGetter
    
    try {
      // 사용자별 메시지 구독 설정
      await this.setupMessageSubscriptions()
      
      this.isInitialized = true
      console.log('[UserMessageSubscriptionManager] Initialized for user:', userId)
    } catch (error) {
      console.error('[UserMessageSubscriptionManager] Initialization failed:', error)
    }
  }

  private async setupMessageSubscriptions(): Promise<void> {
    if (!this.userId) return

    // 기존 채널 정리
    if (this.channel) {
      console.log('[UserMessageSubscription] Cleaning up existing channel')
      supabaseClient().removeChannel(this.channel)
      this.channel = null
    }

    // 단일 채널로 모든 메시지 관련 구독 통합
    this.channel = supabaseClient()
      .channel(`user-messages-${this.userId}`)
      // messages_v2 구독
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages_v2'
      }, (payload: any) => {
        const conversationId = payload.new?.conversation_id || payload.old?.conversation_id
        const senderId = payload.new?.sender_id
        
        if (!conversationId) return
        
        // 콜백 실행
        this.callbacks.forEach((callback) => {
          callback.onNewMessage?.(payload)
          callback.onMessagesChange?.(payload)
        })
        
        // 내가 보낸 메시지는 캐시 무효화 하지 않음
        if (senderId === this.userId) return

        // 새 메시지 알림
        toast.message('💬 새 메시지', { description: '새 메시지가 도착했습니다', duration: 3000 })

        // 캐시 무효화 - 정확히 해당하는 쿼리만 무효화
        this.getQueryClient?.()?.invalidateQueries({ 
          queryKey: ['conversations-v2', this.userId]
        })
        this.getQueryClient?.()?.invalidateQueries({ 
          queryKey: ['unread-count-v2', this.userId]
        })
        // 해당 대화방의 메시지만 무효화 (모든 옵션 변형 포함)
        this.getQueryClient?.()?.invalidateQueries({ 
          queryKey: ['conversation-messages-v2', conversationId],
          exact: false
        })
      })
      // message_read_status_v2 구독
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_read_status_v2'
      }, (payload: any) => {
        // 콜백 실행
        this.callbacks.forEach((callback) => {
          callback.onStatusUpdate?.(payload)
          callback.onReadStatusChange?.(payload)
        })

        // 캐시 무효화 - 정확한 쿼리만 타겟팅
        if (payload.new?.user_id === this.userId) {
          this.getQueryClient?.()?.invalidateQueries({ 
            queryKey: ['unread-count-v2', this.userId]
          })
        }
        
        // 해당 메시지의 대화방만 무효화
        const messageId = payload.new?.message_id || payload.old?.message_id
        if (messageId) {
          // 메시지 ID로 대화방 ID를 찾아야 하는 경우 보류
          // 현재는 모든 대화 메시지를 갱신
          this.getQueryClient?.()?.invalidateQueries({ 
            queryKey: ['conversation-messages-v2'],
            exact: false
          })
        }
        
        // 대화 목록은 정확히 해당 사용자만
        this.getQueryClient?.()?.invalidateQueries({ 
          queryKey: ['conversations-v2', this.userId]
        })
      })
      // conversations_v2 구독
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations_v2'
      }, (payload: any) => {
        if (payload.new?.user1_id === this.userId || 
            payload.new?.user2_id === this.userId ||
            payload.old?.user1_id === this.userId ||
            payload.old?.user2_id === this.userId) {
          
          this.getQueryClient?.()?.invalidateQueries({ 
            queryKey: ['conversations-v2', this.userId] 
          })
        }
      })
      .subscribe((status) => {
        console.log('[UserMessageSubscription] Channel status:', status)
        // Supabase가 자동으로 재연결 처리
      })
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
    
    // 콜백 저장 - onMessagesChange와 onNewMessage 둘 다 설정
    const callbacks: MessageCallbacks = { 
      onNewMessage: (payload) => {
        // 해당 대화방의 메시지만 처리
        const msgConversationId = payload?.new?.conversation_id || payload?.old?.conversation_id
        if (msgConversationId === conversationId) {
          callback()
        }
      },
      onMessagesChange: (payload) => {
        // 해당 대화방의 메시지만 처리
        const msgConversationId = payload?.new?.conversation_id || payload?.old?.conversation_id
        if (msgConversationId === conversationId) {
          callback()
        }
      }
    }
    this.callbacks.set(key, callbacks)
    
    return () => {
      // 콜백만 제거 (실제 구독은 유지)
      this.callbacks.delete(key)
    }
  }

  cleanup(): void {
    // 채널 구독 해제
    if (this.channel) {
      supabaseClient().removeChannel(this.channel)
      this.channel = null
    }
    
    this.callbacks.clear()
    this.userId = null
    this.getQueryClient = null
    this.isInitialized = false
  }

  isActive(): boolean {
    return this.isInitialized
  }

  getStatus() {
    return {
      isActive: this.isInitialized,
      userId: this.userId,
      hasChannel: this.channel !== null
    }
  }
}

export const userMessageSubscriptionManager = new UserMessageSubscriptionManager()