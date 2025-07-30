/**
 * Messages API Service
 * 
 * Handles all messaging operations with caching and real-time updates
 * Uses database functions and optimistic updates for better UX
 */

import { supabase, handleSupabaseError, Tables, TablesInsert } from '@/lib/supabase/client'
import { MessageCache, HybridCache, optimisticUpdate, createCacheKey } from '@/lib/utils/cache'
import { measurePerformance } from '@/lib/utils/performance-monitor'
import { toast } from 'sonner'

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
  last_message_content: string
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
   * 사용자의 받은 메시지함 조회 (캐싱 적용)
   */
  static async getInbox(userId: string): Promise<ApiResult<InboxMessage[]>> {
    const stopMeasure = measurePerformance('messages.getInbox')
    
    try {
      // 캐시 확인
      const cachedInbox = MessageCache.getInbox(userId)
      if (cachedInbox) {
        stopMeasure()
        return { success: true, data: cachedInbox }
      }

      // DB에서 조회
      const { data, error } = await supabase.rpc('get_message_inbox', {})

      if (error) {
        throw error
      }

      const inbox = data || []
      
      // 캐시에 저장
      MessageCache.setInbox(userId, inbox)
      
      stopMeasure()
      return { success: true, data: inbox }
    } catch (error) {
      console.error('Error fetching inbox:', error)
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch inbox' 
      }
    }
  }

  /**
   * 대화방 메시지 조회 (캐싱 적용)
   */
  static async getConversation(conversationId: string): Promise<ApiResult<MessageWithSender[]>> {
    const stopMeasure = measurePerformance('messages.getConversation')
    
    try {
      // 캐시 확인
      const cachedMessages = MessageCache.getConversation(conversationId)
      if (cachedMessages) {
        stopMeasure()
        return { success: true, data: cachedMessages }
      }

      // DB에서 조회
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

      if (error) {
        throw error
      }

      const messages = data || []
      
      // 캐시에 저장
      MessageCache.setConversation(conversationId, messages)
      
      stopMeasure()
      return { success: true, data: messages }
    } catch (error) {
      console.error('Error fetching conversation:', error)
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
        MessageCache.addMessageToConversation(conversationId, optimisticMessage)
      }

      // DB에 실제 메시지 전송
      const { data, error } = await supabase.rpc('send_message', {
        p_recipient_id: recipientId,
        p_content: content
      })

      if (error) {
        // 실패 시 캐시에서 제거
        if (conversationId) {
          MessageCache.invalidateConversation(conversationId)
        }
        throw error
      }

      // 성공 시 메시지 ID 반환됨
      const messageId = data as string
      
      // 관련 캐시 무효화
      if (conversationId) {
        MessageCache.onNewMessage(senderId, recipientId, conversationId)
      } else {
        // 새로운 대화방의 경우 기본적인 캐시 무효화만 수행
        MessageCache.invalidateInbox(recipientId)
        MessageCache.invalidateUnreadCount(recipientId)
        MessageCache.invalidateUserConversations(senderId)
        MessageCache.invalidateUserConversations(recipientId)
      }
      
      stopMeasure()
      
      // 실제 메시지 객체를 다시 조회해서 반환
      const { data: actualMessage } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey (
            id, name, avatar_url
          )
        `)
        .eq('id', messageId)
        .single()
      
      return { success: true, data: actualMessage || optimisticMessage }
    } catch (error) {
      console.error('Error sending message:', error)
      stopMeasure()
      
      const errorMessage = handleSupabaseError(error)
      toast.error(errorMessage)
      
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
        p_conversation_id: conversationId
      })

      if (error) {
        throw error
      }

      // 관련 캐시 무효화
      MessageCache.onMessagesRead(userId, conversationId)
      
      stopMeasure()
      return { success: true }
    } catch (error) {
      console.error('Error marking messages as read:', error)
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to mark messages as read' 
      }
    }
  }

  /**
   * 안읽은 메시지 개수 조회 (캐싱 적용)
   */
  static async getUnreadCount(userId: string): Promise<ApiResult<number>> {
    const stopMeasure = measurePerformance('messages.getUnreadCount')
    
    try {
      // 캐시 확인
      const cachedCount = MessageCache.getUnreadCount(userId)
      if (cachedCount !== null) {
        stopMeasure()
        return { success: true, data: cachedCount }
      }

      // DB에서 조회
      const { data, error } = await supabase
        .from('user_message_stats')
        .select('unread_count')
        .eq('user_id', userId)
        .single()

      if (error) {
        // 레코드가 없으면 0개
        if (error.code === 'PGRST116') {
          MessageCache.setUnreadCount(userId, 0)
          stopMeasure()
          return { success: true, data: 0 }
        }
        throw error
      }

      const count = data.unread_count
      
      // 캐시에 저장
      MessageCache.setUnreadCount(userId, count)
      
      stopMeasure()
      return { success: true, data: count }
    } catch (error) {
      console.error('Error fetching unread count:', error)
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
      
      // 캐시 확인
      const cachedConversationId = HybridCache.get<string>(cacheKey)
      if (cachedConversationId) {
        stopMeasure()
        return { success: true, data: cachedConversationId }
      }

      // 기존 대화방 찾기
      const { data: existingConversation, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user1Id},participant2_id.eq.${user2Id}),and(participant1_id.eq.${user2Id},participant2_id.eq.${user1Id})`)
        .single()

      if (findError && findError.code !== 'PGRST116') {
        throw findError
      }

      let conversationId: string

      if (existingConversation) {
        // 기존 대화방 사용
        conversationId = existingConversation.id
      } else {
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

        conversationId = newConversation.id
      }

      // 캐시에 저장 (30분)
      HybridCache.set(cacheKey, conversationId, 1800000)
      
      stopMeasure()
      return { success: true, data: conversationId }
    } catch (error) {
      console.error('Error finding/creating conversation:', error)
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
    MessageCache.invalidateUserCache(userId)
  }

  /**
   * 전체 메시지 캐시 무효화
   */
  static invalidateAllCache(): void {
    HybridCache.invalidate('messages:')
  }
}

/**
 * 메시지 알림 관리
 */
export class MessageNotifications {
  private static notificationQueue: Array<{
    senderName: string
    messageContent: string
    timestamp: number
    onClick?: () => void
  }> = []
  
  private static isProcessingQueue = false
  private static lastNotificationTime = 0
  private static readonly NOTIFICATION_THROTTLE = 2000 // 2초
  
  private static isNotificationPermissionGranted(): boolean {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           Notification.permission === 'granted'
  }

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
   * 새 메시지 알림 표시 (스로틀링 적용)
   */
  static showNewMessageNotification(
    senderName: string, 
    messageContent: string,
    onClick?: () => void
  ): void {
    const now = Date.now()
    
    // 알림을 큐에 추가
    this.notificationQueue.push({
      senderName,
      messageContent,
      timestamp: now,
      onClick
    })
    
    // 스로틀링 적용
    if (now - this.lastNotificationTime < this.NOTIFICATION_THROTTLE) {
      if (!this.isProcessingQueue) {
        this.isProcessingQueue = true
        setTimeout(() => {
          this.processNotificationQueue()
        }, this.NOTIFICATION_THROTTLE)
      }
      return
    }
    
    this.processNotificationQueue()
  }
  
  /**
   * 알림 큐 처리
   */
  private static processNotificationQueue(): void {
    if (this.notificationQueue.length === 0) {
      this.isProcessingQueue = false
      return
    }
    
    const now = Date.now()
    this.lastNotificationTime = now
    
    // 가장 최근 알림만 처리 (같은 발신자의 경우 통합)
    const groupedNotifications = this.groupNotificationsBySender()
    
    for (const [senderName, notifications] of Object.entries(groupedNotifications)) {
      this.showActualNotification(senderName, notifications)
    }
    
    // 큐 비우기
    this.notificationQueue = []
    this.isProcessingQueue = false
  }
  
  /**
   * 발신자별로 알림 그룹화
   */
  private static groupNotificationsBySender(): Record<string, typeof this.notificationQueue> {
    const grouped: Record<string, typeof this.notificationQueue> = {}
    
    this.notificationQueue.forEach(notification => {
      if (!grouped[notification.senderName]) {
        grouped[notification.senderName] = []
      }
      grouped[notification.senderName].push(notification)
    })
    
    return grouped
  }
  
  /**
   * 실제 알림 표시
   */
  private static showActualNotification(
    senderName: string,
    notifications: typeof this.notificationQueue
  ): void {
    const count = notifications.length
    const latestNotification = notifications[notifications.length - 1]
    
    let title: string
    let body: string
    
    if (count === 1) {
      title = `${senderName}님의 새 메시지`
      body = latestNotification.messageContent.length > 50 
        ? latestNotification.messageContent.substring(0, 50) + '...' 
        : latestNotification.messageContent
    } else {
      title = `${senderName}님의 새 메시지 ${count}개`
      body = '새로운 메시지가 도착했습니다.'
    }
    
    // 브라우저 알림
    if (this.isNotificationPermissionGranted()) {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `message-${senderName}`,
        requireInteraction: false,
        silent: false
      })

      if (latestNotification.onClick) {
        notification.onclick = () => {
          latestNotification.onClick?.()
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

    // Toast 알림
    toast.success(`${title}: ${body}`, {
      duration: 3000,
      action: latestNotification.onClick ? {
        label: '확인',
        onClick: latestNotification.onClick
      } : undefined
    })
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