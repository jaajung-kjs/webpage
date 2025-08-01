/**
 * Messages API Service
 * 
 * Handles all messaging operations with caching and real-time updates
 * Uses database functions and optimistic updates for better UX
 */

import { supabase, handleSupabaseError, Tables, TablesInsert } from '@/lib/supabase/client'
import { createCacheKey } from '@/lib/utils/cache'
import { CacheManager } from '@/lib/utils/cache-manager'
import { measurePerformance } from '@/lib/utils/performance-monitor'

// 개발 환경 체크
const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}
const logError = console.error // 에러는 항상 출력

// Types from database
type Message = Tables<'messages'>
type MessageInsert = TablesInsert<'messages'>
type Conversation = Tables<'conversations'>

// Extended types for UI
export interface MessageWithSender extends Message {
  sender: {
    id: string
    name: string
    avatar_url: string | null
  }
  // 로컬 상태 관리용 (DB에는 저장되지 않음)
  status?: 'sending' | 'sent' | 'failed'
  serverMessageId?: string // 실제 서버에서 받은 ID (임시 ID와 구분)
}

export interface ConversationWithLastMessage extends Conversation {
  last_message: {
    content: string
    created_at: string
    sender_name: string
  } | null
  unread_count: number
}

export interface InboxMessage {
  conversation_id: string
  other_user_id: string
  other_user_name: string
  other_user_avatar: string
  last_message: string
  last_message_time: string
  unread_count: number
  is_sender: boolean
}

/**
 * API Result wrapper
 */
interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

export class MessagesAPI {
  /**
   * 사용자의 받은 메시지함 조회 (통합 캐싱 적용)
   */
  static async getInbox(userId: string): Promise<ApiResult<InboxMessage[]>> {
    const stopMeasure = measurePerformance('messages.getInbox')
    
    try {
      // 통합 캐시 매니저 사용
      const cacheKey = createCacheKey('message', 'inbox', userId)
      
      const inbox = await CacheManager.get<InboxMessage[]>(
        cacheKey,
        async () => {
          const { data, error } = await supabase.rpc('get_message_inbox', { p_user_id: userId })
          if (error) throw error
          
          // Map the database response to InboxMessage type
          return (data || []).map(item => ({
            conversation_id: item.conversation_id,
            other_user_id: item.other_user_id,
            other_user_name: item.other_user_name,
            other_user_avatar: item.other_user_avatar,
            last_message: item.last_message,
            last_message_time: item.last_message_time,
            unread_count: item.unread_count,
            is_sender: item.is_last_message_read !== undefined ? !item.is_last_message_read : false // Determine based on read status
          }))
        },
        { 
          ttl: 300000, // 5분
          realtime: true,
          staleWhileRevalidate: true 
        }
      )
      
      stopMeasure()
      return { success: true, data: inbox }
    } catch (error) {
      logError('Error fetching inbox:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch inbox' 
      }
    }
  }

  /**
   * 대화방 메시지 조회 (통합 캐싱 적용)
   */
  static async getConversation(conversationId: string): Promise<ApiResult<MessageWithSender[]>> {
    const stopMeasure = measurePerformance('messages.getConversation')
    
    try {
      // 통합 캐시 매니저 사용
      const cacheKey = createCacheKey('message', 'conversation', conversationId)
      
      const messages = await CacheManager.get(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey (
                id, name, avatar_url
              )
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
          
          if (error) throw error
          return data || []
        },
        { 
          ttl: 600000, // 10분
          realtime: true,
          staleWhileRevalidate: true 
        }
      )
      
      stopMeasure()
      return { success: true, data: messages }
    } catch (error) {
      logError('Error fetching conversation:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch conversation' 
      }
    }
  }

  /**
   * 대화방 메시지 페이지네이션 조회
   */
  static async getConversationWithPagination(
    conversationId: string,
    options?: {
      limit?: number
      before?: string // 특정 메시지 ID 이전 메시지 조회
    }
  ): Promise<ApiResult<{ messages: MessageWithSender[], hasMore: boolean }>> {
    const stopMeasure = measurePerformance('messages.getConversationPaginated')
    
    try {
      const limit = options?.limit || 50
      
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey (
            id, name, avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit + 1) // hasMore 확인을 위해 +1
      
      // 특정 메시지 이전 메시지만 조회
      if (options?.before) {
        const { data: beforeMessage } = await supabase
          .from('messages')
          .select('created_at')
          .eq('id', options.before)
          .single()
        
        if (beforeMessage) {
          query = query.lt('created_at', beforeMessage.created_at)
        }
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      const messages = (data || []).slice(0, limit).reverse() // 시간순 정렬
      const hasMore = (data || []).length > limit
      
      stopMeasure()
      return { 
        success: true, 
        data: { messages, hasMore }
      }
    } catch (error) {
      logError('Error fetching paginated conversation:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch conversation' 
      }
    }
  }

  /**
   * 메시지 전송 (낙관적 업데이트 적용)
   */
  static async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    conversationId?: string
  ): Promise<ApiResult<MessageWithSender>> {
    const stopMeasure = measurePerformance('messages.sendMessage')
    
    try {
      // 낙관적으로 캐시에 메시지 추가
      const optimisticMessage: MessageWithSender = {
        id: `temp-${Date.now()}`, // 임시 ID
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        conversation_id: conversationId || null,
        sender: {
          id: senderId,
          name: 'You', // 임시로 'You'로 설정
          avatar_url: null
        }
      }

      // 기존 대화가 있다면 캐시에 낙관적 업데이트
      if (conversationId) {
        const cacheKey = createCacheKey('message', 'conversation', conversationId)
        const cached = await CacheManager.get<MessageWithSender[]>(cacheKey, async () => [])
        if (cached) {
          CacheManager.set(cacheKey, [...cached, optimisticMessage])
        }
      }

      // DB에 실제 메시지 전송 (이제 완전한 메시지 객체 반환)
      const { data, error } = await supabase.rpc('send_message', {
        p_sender_id: senderId,
        p_recipient_id: recipientId,
        p_message: content
      })

      if (error) {
        // 실패 시 캐시에서 제거
        if (conversationId) {
          CacheManager.invalidate(createCacheKey('message', 'conversation', conversationId))
        }
        throw error
      }

      // 성공 시 완전한 메시지 객체가 반환됨
      const messageData = data as any
      const actualMessage: MessageWithSender = {
        id: messageData.id,
        conversation_id: messageData.conversation_id,
        sender_id: messageData.sender_id,
        recipient_id: messageData.recipient_id,
        content: messageData.content,
        is_read: messageData.is_read,
        read_at: messageData.read_at,
        created_at: messageData.created_at,
        updated_at: messageData.updated_at,
        sender: messageData.sender
      }
      
      // 선택적 캐시 무효화 (꼭 필요한 것만)
      CacheManager.invalidate(createCacheKey('message', 'unread', recipientId))
      
      // 대화방 캐시는 낙관적 업데이트로 이미 처리했으므로 실제 데이터로 교체
      if (conversationId) {
        const cacheKey = createCacheKey('message', 'conversation', conversationId)
        const cached = await CacheManager.get<MessageWithSender[]>(cacheKey, async () => [])
        if (cached) {
          // 임시 메시지를 실제 메시지로 교체
          const updatedMessages = cached.map(msg => 
            msg.id === optimisticMessage.id ? actualMessage : msg
          )
          CacheManager.set(cacheKey, updatedMessages)
        }
      }
      
      stopMeasure()
      
      return { success: true, data: actualMessage }
    } catch (error) {
      logError('Error sending message:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      
      const errorMessage = handleSupabaseError(error)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    }
  }

  /**
   * 메시지 읽음 처리 (대화방 기준)
   */
  static async markMessagesAsRead(
    userId: string, 
    conversationId: string
  ): Promise<ApiResult<void>> {
    const stopMeasure = measurePerformance('messages.markAsRead')
    
    try {
      const { error } = await supabase.rpc('mark_conversation_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: userId
      })

      if (error) {
        throw error
      }

      // 관련 캐시 무효화
      CacheManager.invalidate(createCacheKey('message', 'unread', userId))
      CacheManager.invalidate(createCacheKey('message', 'inbox', userId))
      CacheManager.invalidate(createCacheKey('message', 'conversation', conversationId))
      
      stopMeasure()
      return { success: true }
    } catch (error) {
      logError('Error marking messages as read:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to mark messages as read' 
      }
    }
  }

  /**
   * 안읽은 메시지 개수 조회 (통합 캐싱 적용)
   */
  static async getUnreadCount(userId: string): Promise<ApiResult<number>> {
    const stopMeasure = measurePerformance('messages.getUnreadCount')
    
    try {
      // 통합 캐시 매니저 사용
      const cacheKey = createCacheKey('message', 'unread', userId)
      
      const count = await CacheManager.get(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('user_message_stats')
            .select('unread_count')
            .eq('user_id', userId)
            .single()
          
          if (error) {
            // 레코드가 없으면 0개
            if (error.code === 'PGRST116') {
              return 0
            }
            throw error
          }
          
          return data.unread_count
        },
        { 
          ttl: 60000, // 1분 (자주 업데이트)
          realtime: true,
          staleWhileRevalidate: true 
        }
      )
      
      stopMeasure()
      return { success: true, data: count }
    } catch (error) {
      logError('Error fetching unread count:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch unread count' 
      }
    }
  }

  /**
   * 대화방 생성 또는 기존 대화방 찾기
   */
  static async findOrCreateConversation(
    user1Id: string, 
    user2Id: string
  ): Promise<ApiResult<string>> {
    const stopMeasure = measurePerformance('messages.findOrCreateConversation')
    
    try {
      // 캐시 키 생성 (양방향으로 동일한 키 생성)
      const sortedIds = [user1Id, user2Id].sort()
      const cacheKey = createCacheKey('conversation', 'between', sortedIds[0], sortedIds[1])
      
      // 통합 캐시 매니저 사용
      const cachedConversationId = await CacheManager.get<string>(
        cacheKey,
        async () => {
          // 기존 대화방 찾기
          const { data: existingConversation, error: findError } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant1_id.eq.${user1Id},participant2_id.eq.${user2Id}),and(participant1_id.eq.${user2Id},participant2_id.eq.${user1Id})`)
            .single()

          if (findError && findError.code !== 'PGRST116') {
            throw findError
          }

          if (existingConversation) {
            return existingConversation.id
          }

          // 새 대화방 생성
          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({
              participant1_id: user1Id,
              participant2_id: user2Id
            })
            .select('id')
            .single()

          if (createError) {
            throw createError
          }

          return newConversation.id
        },
        { ttl: 1800000 } // 30분
      )
      
      stopMeasure()
      return { success: true, data: cachedConversationId }
    } catch (error) {
      logError('Error finding/creating conversation:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create conversation' 
      }
    }
  }

  /**
   * 사용자별 캐시 무효화 (로그아웃 시 등)
   */
  static invalidateUserCache(userId: string): void {
    CacheManager.invalidate(createCacheKey('message', 'inbox', userId))
    CacheManager.invalidate(createCacheKey('message', 'unread', userId))
    CacheManager.invalidate(createCacheKey('message', 'user-conversations', userId))
  }

  /**
   * 전체 메시지 캐시 무효화
   */
  static invalidateAllCache(): void {
    CacheManager.invalidate('message:')
  }
}

/**
 * 메시지 알림 관리
 */
export class MessageNotifications {
  /**
   * 알림 권한 요청
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  /**
   * 브라우저 알림 표시 (선택적)
   * React 컴포넌트에서 toast와 함께 사용할 수 있음
   */
  static showBrowserNotification(
    title: string,
    body: string,
    options?: {
      icon?: string
      badge?: string
      tag?: string
      onClick?: () => void
    }
  ): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    if (Notification.permission !== 'granted') {
      return
    }

    const notification = new Notification(title, {
      body,
      icon: options?.icon || '/favicon.ico',
      badge: options?.badge || '/favicon.ico',
      tag: options?.tag,
      requireInteraction: false,
      silent: false
    })

    if (options?.onClick) {
      notification.onclick = () => {
        options.onClick?.()
        notification.close()
      }
    }

    // 5초 후 자동 닫기
    setTimeout(() => {
      try {
        notification.close()
      } catch (e) {
        // 이미 닫힌 알림인 경우 무시
      }
    }, 5000)
  }
  
  /**
   * 알림 설정 상태 확인
   */
  static getNotificationStatus(): {
    supported: boolean
    permission: NotificationPermission | 'unsupported'
    enabled: boolean
  } {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        supported: false,
        permission: 'unsupported',
        enabled: false
      }
    }
    
    return {
      supported: true,
      permission: Notification.permission,
      enabled: Notification.permission === 'granted'
    }
  }
  
  /**
   * 사운드 재생 (선택적)
   */
  static playNotificationSound(): void {
    if (typeof window === 'undefined') return
    
    try {
      // 간단한 비프음 생성
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      // 오디오 재생 실패 시 무시
      console.warn('Failed to play notification sound:', error)
    }
  }
}

// Default export
export default MessagesAPI