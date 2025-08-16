/**
 * UserMessageSubscriptionManager - 사용자별 메시지 구독 관리
 * 
 * 목적:
 * - 페이지 이동 시 재구독 방지
 * - 사용자별 메시지 구독을 중앙에서 관리
 * - 프라이버시 보장 (사용자별 필터링)
 * - 메모리 효율성 (중복 구독 방지)
 * 
 * 특징:
 * - 싱글톤 패턴으로 인스턴스 관리
 * - 로그인 시 구독 시작, 로그아웃 시 해제
 * - 페이지 이동과 무관하게 구독 유지
 * - QueryClient 통합으로 자동 캐시 무효화
 */

import { QueryClient } from '@tanstack/react-query'
import { realtimeCore } from '@/lib/core/realtime-core'

type SubscriptionCallback = () => void
type SubscriptionCallbacks = {
  onMessagesChange?: SubscriptionCallback
  onReadStatusChange?: SubscriptionCallback
  onNewMessage?: (payload: any) => void
}

export class UserMessageSubscriptionManager {
  private static instance: UserMessageSubscriptionManager | null = null
  private userId: string | null = null
  private queryClient: QueryClient | null = null
  private subscriptions: Map<string, () => void> = new Map()
  private callbacks: Map<string, SubscriptionCallbacks> = new Map()
  private isInitialized = false

  private constructor() {
    // console.log('[UserMessageSubscriptionManager] Instance created')
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): UserMessageSubscriptionManager {
    if (!UserMessageSubscriptionManager.instance) {
      UserMessageSubscriptionManager.instance = new UserMessageSubscriptionManager()
    }
    return UserMessageSubscriptionManager.instance
  }

  /**
   * 매니저 초기화 (로그인 시 호출) - 비동기로 변경
   */
  async initialize(userId: string, queryClient: QueryClient) {
    // 이미 같은 사용자로 초기화되어 있으면 스킵
    if (this.isInitialized && this.userId === userId) {
      // console.log('[UserMessageSubscriptionManager] Already initialized for user:', userId)
      return
    }

    // 기존 구독 정리
    if (this.isInitialized) {
      this.cleanup()
    }

    // console.log('[UserMessageSubscriptionManager] Initializing for user:', userId)
    this.userId = userId
    this.queryClient = queryClient

    // RealtimeCore 준비 대기 (계층 구조 준수)
    const isReady = await realtimeCore.waitForReady(10000)
    
    if (!isReady) {
      console.warn('[UserMessageSubscriptionManager] RealtimeCore not ready, setting up retry')
      this.setupRetryMechanism()
      return
    }

    // 메시지 구독 설정
    this.setupSubscriptions()
    this.isInitialized = true
  }

  /**
   * 재시도 메커니즘 설정
   */
  private setupRetryMechanism() {
    // RealtimeCore가 준비되면 자동 재시도
    const unsubscribe = realtimeCore.onReady(() => {
      unsubscribe()
      if (this.userId && this.queryClient && !this.isInitialized) {
        console.log('[UserMessageSubscriptionManager] RealtimeCore ready, retrying initialization')
        this.setupSubscriptions()
        this.isInitialized = true
      }
    })
  }

  /**
   * 실제 구독 설정
   */
  private setupSubscriptions() {
    if (!this.userId || !this.queryClient) return

    // console.log('[UserMessageSubscriptionManager] Setting up subscriptions')

    // 1. 대화 목록용 메시지 변경 감지
    const unsubConversationsMessages = realtimeCore.subscribe({
      id: `user-msg-manager-conversations-messages`, // 정적 ID
      table: 'messages_v2',
      event: '*',
      callback: () => {
        // console.log('[UserMessageSubscriptionManager] Messages changed, invalidating conversations')
        this.queryClient?.invalidateQueries({ queryKey: ['conversations-v2', this.userId] })
        this.queryClient?.invalidateQueries({ queryKey: ['unread-count-v2', this.userId] })
        
        // 등록된 콜백 실행
        this.callbacks.forEach(cb => cb.onMessagesChange?.())
      },
      onError: (error) => {
        console.error('[UserMessageSubscriptionManager] Messages subscription error:', error)
        // RealtimeCore가 재연결을 처리하므로 추가 처리 불필요
      }
    })

    // 2. 대화 목록용 읽음 상태 변경 감지
    const unsubConversationsReadStatus = realtimeCore.subscribe({
      id: `user-msg-manager-conversations-read-status`, // 정적 ID
      table: 'message_read_status_v2',
      event: '*',
      callback: () => {
        // console.log('[UserMessageSubscriptionManager] Read status changed, invalidating conversations')
        this.queryClient?.invalidateQueries({ queryKey: ['conversations-v2', this.userId] })
        this.queryClient?.invalidateQueries({ queryKey: ['unread-count-v2', this.userId] })
        
        // 등록된 콜백 실행
        this.callbacks.forEach(cb => cb.onReadStatusChange?.())
      },
      onError: (error) => {
        console.error('[UserMessageSubscriptionManager] Read status subscription error:', error)
        // RealtimeCore가 재연결을 처리하므로 추가 처리 불필요
      }
    })

    // 3. 알림용 새 메시지 감지 (INSERT만)
    const unsubNotifications = realtimeCore.subscribe({
      id: `user-msg-manager-notifications`, // 정적 ID
      table: 'messages_v2',
      event: 'INSERT',
      callback: (payload) => {
        // 등록된 새 메시지 콜백 실행
        this.callbacks.forEach(cb => cb.onNewMessage?.(payload))
      },
      onError: (error) => {
        console.error('[UserMessageSubscriptionManager] Notifications subscription error:', error)
        // RealtimeCore가 재연결을 처리하므로 추가 처리 불필요
      }
    })

    // 구독 해제 함수 저장
    this.subscriptions.set('conversations-messages', unsubConversationsMessages)
    this.subscriptions.set('conversations-read-status', unsubConversationsReadStatus)
    this.subscriptions.set('notifications', unsubNotifications)

    // console.log('[UserMessageSubscriptionManager] Subscriptions setup complete')
  }

  /**
   * 특정 대화방 메시지 구독 (개별 대화방 화면용)
   */
  subscribeToConversation(conversationId: string, callback: () => void): () => void {
    if (!this.userId || !this.queryClient) {
      console.warn('[UserMessageSubscriptionManager] Not initialized for conversation subscription')
      return () => {}
    }

    const messageSubId = `user-msg-manager-conv-messages-${conversationId}`
    const readStatusSubId = `user-msg-manager-conv-read-status-${conversationId}`

    console.log(`[UserMessageSubscriptionManager] 🔄 Subscribing to conversation: ${conversationId}`)
    console.log(`[UserMessageSubscriptionManager] Manager initialized: ${this.isInitialized}`)
    console.log(`[UserMessageSubscriptionManager] RealtimeCore ready: ${realtimeCore.isRealtimeReady()}`)

    // 이미 구독 중이면 기존 구독 반환
    if (this.subscriptions.has(messageSubId)) {
      console.log('[UserMessageSubscriptionManager] Already subscribed to conversation:', conversationId)
      return () => this.unsubscribeFromConversation(conversationId)
    }

    // 메시지 변경 구독
    const unsubMessages = realtimeCore.subscribe({
      id: messageSubId,
      table: 'messages_v2',
      event: '*',
      filter: `conversation_id=eq.${conversationId}`,
      callback: () => {
        console.log('[UserMessageSubscriptionManager] Conversation messages changed:', conversationId)
        callback()
      },
      onError: (error) => {
        console.error('[UserMessageSubscriptionManager] Conversation messages error:', error)
      }
    })

    // 읽음 상태 변경 구독
    const unsubReadStatus = realtimeCore.subscribe({
      id: readStatusSubId,
      table: 'message_read_status_v2',
      event: '*',
      callback: () => {
        console.log('[UserMessageSubscriptionManager] Conversation read status changed:', conversationId)
        callback()
      },
      onError: (error) => {
        console.error('[UserMessageSubscriptionManager] Conversation read status error:', error)
      }
    })

    this.subscriptions.set(messageSubId, unsubMessages)
    this.subscriptions.set(readStatusSubId, unsubReadStatus)

    // 구독 해제 함수 반환
    return () => this.unsubscribeFromConversation(conversationId)
  }

  /**
   * 특정 대화방 구독 해제
   */
  private unsubscribeFromConversation(conversationId: string) {
    const messageSubId = `user-msg-manager-conv-messages-${conversationId}`
    const readStatusSubId = `user-msg-manager-conv-read-status-${conversationId}`

    const unsubMessages = this.subscriptions.get(messageSubId)
    const unsubReadStatus = this.subscriptions.get(readStatusSubId)

    if (unsubMessages) {
      unsubMessages()
      this.subscriptions.delete(messageSubId)
    }

    if (unsubReadStatus) {
      unsubReadStatus()
      this.subscriptions.delete(readStatusSubId)
    }

    // console.log('[UserMessageSubscriptionManager] Unsubscribed from conversation:', conversationId)
  }

  /**
   * 콜백 등록 (컴포넌트에서 사용)
   */
  registerCallbacks(componentId: string, callbacks: SubscriptionCallbacks) {
    this.callbacks.set(componentId, callbacks)
    // 디버깅 완료 - 로그 제거
    // console.log('[UserMessageSubscriptionManager] Callbacks registered for:', componentId)
  }

  /**
   * 콜백 해제
   */
  unregisterCallbacks(componentId: string) {
    this.callbacks.delete(componentId)
    // 디버깅 완료 - 로그 제거
    // console.log('[UserMessageSubscriptionManager] Callbacks unregistered for:', componentId)
  }

  /**
   * 구독 상태 확인
   */
  isSubscribed(): boolean {
    return this.isInitialized && this.subscriptions.size > 0
  }

  /**
   * 현재 사용자 ID 가져오기
   */
  getCurrentUserId(): string | null {
    return this.userId
  }


  /**
   * 전체 정리 (로그아웃 시 호출)
   */
  cleanup() {
    // console.log('[UserMessageSubscriptionManager] Cleaning up all subscriptions')

    // 모든 구독 해제
    this.subscriptions.forEach((unsubscribe, key) => {
      // console.log('[UserMessageSubscriptionManager] Unsubscribing:', key)
      unsubscribe()
    })

    this.subscriptions.clear()
    this.callbacks.clear()
    this.userId = null
    this.queryClient = null
    this.isInitialized = false

    // console.log('[UserMessageSubscriptionManager] Cleanup complete')
  }

  /**
   * 디버그 정보
   */
  debug() {
    console.log('[UserMessageSubscriptionManager] Debug info:')
    console.log('- User ID:', this.userId)
    console.log('- Initialized:', this.isInitialized)
    console.log('- Active subscriptions:', Array.from(this.subscriptions.keys()))
    console.log('- Registered callbacks:', Array.from(this.callbacks.keys()))
  }
}

// 싱글톤 인스턴스 export
export const userMessageSubscriptionManager = UserMessageSubscriptionManager.getInstance()