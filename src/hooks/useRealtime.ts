/**
 * Supabase Realtime Hooks
 * 
 * Provides real-time data synchronization using Supabase Realtime
 * All hooks automatically subscribe/unsubscribe on mount/unmount
 */

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { realtimeManager } from '@/lib/realtime/RealtimeManager'
import { toast } from 'sonner'

// 개발 환경 체크
const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}
const logError = console.error // 에러는 항상 출력

// Types
type PostgresChangePayload<T extends { [key: string]: any }> = RealtimePostgresChangesPayload<T>

// Hook for real-time messages inbox using RealtimeManager
export function useRealtimeMessageInbox(userId: string) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const fetchedRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeStateRef = useRef<(() => void) | null>(null)

  // Fetch initial inbox
  useEffect(() => {
    if (!userId || fetchedRef.current) return

    const fetchInbox = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_message_inbox', { p_user_id: userId })

        if (error) throw error
        
        setMessages(data || [])
        fetchedRef.current = true
        
        // 초기 데이터 로드 후 구독 활성화를 위해 짧은 지연 추가
        setTimeout(() => {
          log('📬 Initial inbox data loaded, ensuring subscription activation')
        }, 100)
      } catch (err) {
        logError('Error fetching inbox:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch inbox')
      } finally {
        setLoading(false)
      }
    }

    fetchInbox()
  }, [userId])

  // Subscribe to real-time changes using RealtimeManager
  useEffect(() => {
    if (!userId) return

    log('📬 Setting up inbox subscription for user:', userId)
    
    // Subscribe to message changes where user is recipient
    unsubscribeRef.current = realtimeManager.subscribe({
      name: `inbox-messages-${userId}`,
      table: 'messages',
      filter: `recipient_id=eq.${userId}`,
      event: '*', // Listen to both INSERT and UPDATE
      callback: async (payload: PostgresChangePayload<any>) => {
        log('📬 Inbox update:', payload.eventType)
        
        // Refetch inbox to get updated data with sender info
        try {
          const { data, error } = await supabase.rpc('get_message_inbox', { p_user_id: userId })

          if (error) throw error
          setMessages(data || [])
        } catch (err) {
          logError('Error refetching inbox:', err)
        }
      }
    })

    // 연결 상태 모니터링 및 폴링 설정
    unsubscribeStateRef.current = realtimeManager.onConnectionStateChange((state) => {
      log('📬 Inbox connection state changed:', state)
      
      if (state === 'disconnected' || state === 'error') {
        // 연결 끊김 시 폴링 시작 (30초 간격)
        if (!pollingIntervalRef.current) {
          log('📬 Starting polling for inbox due to disconnection')
          
          const pollInbox = async () => {
            try {
              const { data, error } = await supabase.rpc('get_message_inbox', { p_user_id: userId })
              if (!error && data) {
                setMessages(data)
              }
            } catch (err) {
              logError('Error polling inbox:', err)
            }
          }
          
          // 즉시 한 번 실행 후 30초마다 반복
          pollInbox()
          pollingIntervalRef.current = setInterval(pollInbox, 30000)
        }
      } else if (state === 'connected') {
        // 연결 복구 시 폴링 중지
        if (pollingIntervalRef.current) {
          log('📬 Stopping polling for inbox - connection restored')
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
          
          // 연결 복구 시 최신 데이터 한 번 가져오기
          fetchedRef.current = false
        }
      }
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      if (unsubscribeStateRef.current) {
        unsubscribeStateRef.current()
        unsubscribeStateRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [userId])

  return { messages, loading, error, refetch: () => fetchedRef.current = false }
}

// Hook for real-time conversation messages
export function useRealtimeConversation(conversationId: string, currentUserId?: string | null) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeInsertRef = useRef<(() => void) | null>(null)
  const unsubscribeUpdateRef = useRef<(() => void) | null>(null)
  const messagesRef = useRef<any[]>([])
  
  // Keep messagesRef in sync with messages state
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // 낙관적 메시지 추가 함수
  const addOptimisticMessage = useCallback((message: any) => {
    setMessages(prev => [...prev, message])
  }, [])

  // 낙관적 메시지 교체 함수
  const replaceOptimisticMessage = useCallback((tempId: string, actualMessage: any | null) => {
    setMessages(prev => {
      if (actualMessage) {
        // 실제 메시지로 교체
        return prev.map(msg => msg.id === tempId ? actualMessage : msg)
      } else {
        // 실패 시 제거
        return prev.filter(msg => msg.id !== tempId)
      }
    })
  }, [])

  // 메시지 상태만 업데이트하는 함수 (재렌더링 최소화)
  const updateMessageStatus = useCallback((messageId: string, updates: Partial<any>) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        // 객체 참조를 유지하면서 필요한 필드만 업데이트
        return { ...msg, ...updates }
      }
      return msg
    }))
  }, [])

  // Fetch initial conversation messages
  useEffect(() => {
    if (!conversationId) return

    const fetchMessages = async () => {
      try {
        setLoading(true)
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
        setMessages(data || [])
      } catch (err) {
        logError('Error fetching conversation:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch conversation')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversationId])

  // Subscribe to new messages in conversation using RealtimeManager
  useEffect(() => {
    if (!conversationId) return

    log('📨 Setting up realtime subscription for conversation:', conversationId)
    
    // Subscribe to INSERT events
    unsubscribeInsertRef.current = realtimeManager.subscribe({
      name: `conversation-insert-${conversationId}`,
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
      event: 'INSERT',
      callback: async (payload: PostgresChangePayload<any>) => {
        log('📨 New message received:', payload.new)
        if (payload.new) {
          // 이미 로컬에 있는 메시지인지 확인 (serverMessageId로 체크)
          const existingMessage = messagesRef.current.find(msg => 
            msg.serverMessageId === payload.new.id || 
            (msg.id.startsWith('temp-') && 
             msg.content === payload.new.content &&
             msg.sender_id === payload.new.sender_id)
          )

          if (existingMessage) {
            // 이미 로컬에 있는 메시지는 무시
            log('📨 Ignoring duplicate message (already in local state)')
            return
          }

          // 메시지 추가 및 알림 처리
          let messageWithSender = payload.new
          
          // sender 정보가 payload에 없으면 조회
          if (!payload.new.sender) {
            const { data: senderData } = await supabase
              .from('users')
              .select('id, name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single()
            
            if (senderData) {
              messageWithSender = { ...payload.new, sender: senderData }
            }
          }

          // 다른 사람이 보낸 메시지만 추가 (자신의 메시지는 낙관적 업데이트로 이미 처리)
          if (payload.new.sender_id !== currentUserId) {
            setMessages(prev => {
              log('📨 Adding new message from other user')
              return [...prev, messageWithSender]
            })
          }
        }
      }
    })
    
    // Subscribe to UPDATE events
    unsubscribeUpdateRef.current = realtimeManager.subscribe({
      name: `conversation-update-${conversationId}`,
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
      event: 'UPDATE',
      callback: (payload: PostgresChangePayload<any>) => {
        log('📨 Message updated:', payload.new)
        if (payload.new) {
          setMessages(prev => {
            const updated = prev.map(msg => {
              // 임시 ID를 가진 메시지도 serverMessageId로 매칭
              if (msg.id === payload.new.id || msg.serverMessageId === payload.new.id) {
                log('📨 Updating message read status:', {
                  messageId: msg.id,
                  serverMessageId: msg.serverMessageId,
                  oldReadStatus: msg.is_read,
                  newReadStatus: payload.new.is_read,
                  readAt: payload.new.read_at
                })
                // 읽음 상태와 시간만 업데이트
                return { 
                  ...msg, 
                  is_read: payload.new.is_read,
                  read_at: payload.new.read_at
                }
              }
              return msg
            })
            return updated
          })
        }
      }
    })

    return () => {
      log('📨 Cleaning up subscription for conversation:', conversationId)
      if (unsubscribeInsertRef.current) {
        unsubscribeInsertRef.current()
        unsubscribeInsertRef.current = null
      }
      if (unsubscribeUpdateRef.current) {
        unsubscribeUpdateRef.current()
        unsubscribeUpdateRef.current = null
      }
    }
  }, [conversationId, currentUserId])

  return { messages, loading, error, addOptimisticMessage, replaceOptimisticMessage, updateMessageStatus }
}

// Hook for real-time unread message count using RealtimeManager
export function useRealtimeUnreadCount(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const previousCountRef = useRef(0)
  const isInitialLoadRef = useRef(true)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeStateRef = useRef<(() => void) | null>(null)

  // Fetch initial unread count
  useEffect(() => {
    if (!userId) return

    const fetchUnreadCount = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('user_message_stats')
          .select('unread_count')
          .eq('user_id', userId)
          .single()

        if (error) {
          // If no record exists, count is 0
          if (error.code === 'PGRST116') {
            setUnreadCount(0)
          } else {
            throw error
          }
        } else {
          setUnreadCount(data.unread_count)
          previousCountRef.current = data.unread_count // 초기값 설정
        }
      } catch (err) {
        logError('Error fetching unread count:', err)
        setUnreadCount(0)
        previousCountRef.current = 0
      } finally {
        setLoading(false)
        // 초기 로드가 완료되면 이후 모든 변경사항에 대해 toast 표시
        setTimeout(() => {
          isInitialLoadRef.current = false
        }, 1000) // 1초 후 초기 로드 상태 해제
      }
    }

    fetchUnreadCount()
  }, [userId])

  // Subscribe to unread count changes using RealtimeManager
  useEffect(() => {
    if (!userId) return

    log('📊 Setting up unread count subscription for user:', userId)
    
    unsubscribeRef.current = realtimeManager.subscribe({
      name: `user-stats-${userId}`,
      table: 'user_message_stats',
      filter: `user_id=eq.${userId}`,
      event: '*',
      callback: async (payload: PostgresChangePayload<any>) => {
        log('📊 Unread count update:', payload)
        if (payload.new && 'unread_count' in payload.new) {
          const newCount = payload.new.unread_count
          const prevCount = previousCountRef.current
          
          // unread count가 증가했을 때만 toast 표시
          if (newCount > prevCount && !isInitialLoadRef.current) { // 초기 로드 시에는 toast 표시 안 함
            log('🎉 New message received! Count increased from', prevCount, 'to', newCount)
            
            // 메시지 정보 가져오기 (가능한 경우)
            try {
              const { data: latestMessage } = await supabase
                .from('messages')
                .select(`
                  content,
                  sender:users!messages_sender_id_fkey(name)
                `)
                .eq('recipient_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
                
              if (latestMessage && latestMessage.sender) {
                toast.success(
                  `${latestMessage.sender.name}님의 새 메시지: ${
                    latestMessage.content.length > 50 
                      ? latestMessage.content.substring(0, 50) + '...' 
                      : latestMessage.content
                  }`,
                  { duration: 4000 }
                )
              } else {
                toast.success('새 메시지가 도착했습니다!', { duration: 4000 })
              }
            } catch (error) {
              logError('Failed to fetch message details:', error)
              toast.success('새 메시지가 도착했습니다!', { duration: 4000 })
            }
          }
          
          previousCountRef.current = newCount
          setUnreadCount(newCount)
        } else if (payload.eventType === 'DELETE') {
          previousCountRef.current = 0
          setUnreadCount(0)
        }
      }
    })
    
    // 연결 상태 모니터링 및 폴링 설정
    unsubscribeStateRef.current = realtimeManager.onConnectionStateChange((state) => {
      log('📊 Unread count connection state changed:', state)
      
      if (state === 'disconnected' || state === 'error') {
        // 연결 끊김 시 폴링 시작 (30초 간격)
        if (!pollingIntervalRef.current) {
          log('📊 Starting polling for unread count due to disconnection')
          
          const pollUnreadCount = async () => {
            try {
              const { data, error } = await supabase
                .from('user_message_stats')
                .select('unread_count')
                .eq('user_id', userId)
                .single()
              
              if (!error && data) {
                const newCount = data.unread_count
                if (newCount !== previousCountRef.current) {
                  previousCountRef.current = newCount
                  setUnreadCount(newCount)
                  log('📊 Polling updated unread count:', newCount)
                }
              }
            } catch (err) {
              logError('Error polling unread count:', err)
            }
          }
          
          // 즉시 한 번 실행 후 30초마다 반복
          pollUnreadCount()
          pollingIntervalRef.current = setInterval(pollUnreadCount, 30000)
        }
      } else if (state === 'connected') {
        // 연결 복구 시 폴링 중지
        if (pollingIntervalRef.current) {
          log('📊 Stopping polling for unread count - connection restored')
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      if (unsubscribeStateRef.current) {
        unsubscribeStateRef.current()
        unsubscribeStateRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [userId])

  return { unreadCount, loading }
}

// Hook for real-time conversation messages with pagination
export function useRealtimeConversationPaginated(conversationId: string, currentUserId?: string | null) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const unsubscribeInsertRef = useRef<(() => void) | null>(null)
  const unsubscribeUpdateRef = useRef<(() => void) | null>(null)
  const messagesRef = useRef<any[]>([])
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeStateRef = useRef<(() => void) | null>(null)
  
  // Keep messagesRef in sync with messages state
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // 낙관적 메시지 추가 함수
  const addOptimisticMessage = useCallback((message: any) => {
    setMessages(prev => [...prev, message])
  }, [])

  // 낙관적 메시지 교체 함수
  const replaceOptimisticMessage = useCallback((tempId: string, actualMessage: any | null) => {
    setMessages(prev => {
      if (actualMessage) {
        // 실제 메시지로 교체
        return prev.map(msg => msg.id === tempId ? actualMessage : msg)
      } else {
        // 실패 시 제거
        return prev.filter(msg => msg.id !== tempId)
      }
    })
  }, [])

  // 메시지 상태만 업데이트하는 함수 (재렌더링 최소화)
  const updateMessageStatus = useCallback((messageId: string, updates: Partial<any>) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        // 객체 참조를 유지하면서 필요한 필드만 업데이트
        return { ...msg, ...updates }
      }
      return msg
    }))
  }, [])

  // Fetch initial conversation messages
  useEffect(() => {
    if (!conversationId) return

    const fetchMessages = async () => {
      try {
        setLoading(true)
        const MessagesAPI = (await import('@/lib/api/messages')).MessagesAPI
        const result = await MessagesAPI.getConversationWithPagination(conversationId, {
          limit: 50
        })

        if (result.success && result.data) {
          setMessages(result.data.messages)
          setHasMore(result.data.hasMore)
        } else if (result.error) {
          throw new Error(result.error)
        }
      } catch (err) {
        logError('Error fetching conversation:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch conversation')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversationId])

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return

    try {
      setLoadingMore(true)
      const MessagesAPI = (await import('@/lib/api/messages')).MessagesAPI
      const result = await MessagesAPI.getConversationWithPagination(conversationId, {
        limit: 50,
        before: messages[0].id // 첫 번째 메시지 이전 메시지 로드
      })

      if (result.success && result.data) {
        setMessages(prev => [...result.data!.messages, ...prev])
        setHasMore(result.data.hasMore)
      }
    } catch (err) {
      logError('Error loading more messages:', err)
      toast.error('이전 메시지를 불러오는데 실패했습니다.')
    } finally {
      setLoadingMore(false)
    }
  }, [conversationId, messages, loadingMore, hasMore])

  // Subscribe to new messages in conversation using RealtimeManager
  useEffect(() => {
    if (!conversationId) return

    log('📨 Setting up realtime subscription for conversation:', conversationId)
    
    // Subscribe to INSERT events
    unsubscribeInsertRef.current = realtimeManager.subscribe({
      name: `conversation-insert-${conversationId}`,
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
      event: 'INSERT',
      callback: async (payload: PostgresChangePayload<any>) => {
        log('📨 New message received:', payload.new)
        if (payload.new) {
          // 이미 로컬에 있는 메시지인지 확인 (serverMessageId로 체크)
          const existingMessage = messagesRef.current.find(msg => 
            msg.serverMessageId === payload.new.id || 
            (msg.id.startsWith('temp-') && 
             msg.content === payload.new.content &&
             msg.sender_id === payload.new.sender_id)
          )

          if (existingMessage) {
            // 이미 로컬에 있는 메시지는 무시
            log('📨 Ignoring duplicate message (already in local state)')
            return
          }

          // 메시지 추가 및 알림 처리
          let messageWithSender = payload.new
          
          // sender 정보가 payload에 없으면 조회
          if (!payload.new.sender) {
            const { data: senderData } = await supabase
              .from('users')
              .select('id, name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single()
            
            if (senderData) {
              messageWithSender = { ...payload.new, sender: senderData }
            }
          }

          // 다른 사람이 보낸 메시지만 추가 (자신의 메시지는 낙관적 업데이트로 이미 처리)
          if (payload.new.sender_id !== currentUserId) {
            setMessages(prev => {
              log('📨 Adding new message from other user')
              return [...prev, messageWithSender]
            })
          }
        }
      }
    })
    
    // Subscribe to UPDATE events
    unsubscribeUpdateRef.current = realtimeManager.subscribe({
      name: `conversation-update-${conversationId}`,
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
      event: 'UPDATE',
      callback: (payload: PostgresChangePayload<any>) => {
        log('📨 Message updated:', payload.new)
        if (payload.new) {
          setMessages(prev => {
            const updated = prev.map(msg => {
              // 임시 ID를 가진 메시지도 serverMessageId로 매칭
              if (msg.id === payload.new.id || msg.serverMessageId === payload.new.id) {
                log('📨 Updating message read status:', {
                  messageId: msg.id,
                  serverMessageId: msg.serverMessageId,
                  oldReadStatus: msg.is_read,
                  newReadStatus: payload.new.is_read,
                  readAt: payload.new.read_at
                })
                // 읽음 상태와 시간만 업데이트
                return { 
                  ...msg, 
                  is_read: payload.new.is_read,
                  read_at: payload.new.read_at
                }
              }
              return msg
            })
            return updated
          })
        }
      }
    })
    
    // 연결 상태 모니터링 및 폴링 설정
    unsubscribeStateRef.current = realtimeManager.onConnectionStateChange((state) => {
      log('📨 Conversation connection state changed:', state)
      
      if (state === 'disconnected' || state === 'error') {
        // 연결 끊김 시 폴링 시작 (30초 간격)
        if (!pollingIntervalRef.current && conversationId) {
          log('📨 Starting polling for conversation due to disconnection')
          
          const pollConversation = async () => {
            try {
              const MessagesAPI = (await import('@/lib/api/messages')).MessagesAPI
              const result = await MessagesAPI.getConversationWithPagination(conversationId, {
                limit: 50
              })
              
              if (result.success && result.data) {
                // 새 메시지만 추가 (중복 방지)
                const currentIds = new Set(messagesRef.current.map(m => m.id))
                const newMessages = result.data.messages.filter(m => !currentIds.has(m.id))
                
                if (newMessages.length > 0) {
                  setMessages(prev => [...prev, ...newMessages])
                  log(`📨 Polling found ${newMessages.length} new messages`)
                }
              }
            } catch (err) {
              logError('Error polling conversation:', err)
            }
          }
          
          // 즉시 한 번 실행 후 30초마다 반복
          pollConversation()
          pollingIntervalRef.current = setInterval(pollConversation, 30000)
        }
      } else if (state === 'connected') {
        // 연결 복구 시 폴링 중지
        if (pollingIntervalRef.current) {
          log('📨 Stopping polling for conversation - connection restored')
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    })

    return () => {
      log('📨 Cleaning up subscription for conversation:', conversationId)
      if (unsubscribeInsertRef.current) {
        unsubscribeInsertRef.current()
        unsubscribeInsertRef.current = null
      }
      if (unsubscribeUpdateRef.current) {
        unsubscribeUpdateRef.current()
        unsubscribeUpdateRef.current = null
      }
      if (unsubscribeStateRef.current) {
        unsubscribeStateRef.current()
        unsubscribeStateRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [conversationId, currentUserId])

  return { 
    messages, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMoreMessages,
    addOptimisticMessage, 
    replaceOptimisticMessage, 
    updateMessageStatus 
  }
}