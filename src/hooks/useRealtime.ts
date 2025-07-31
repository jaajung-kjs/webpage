/**
 * Supabase Realtime Hooks
 * 
 * Provides real-time data synchronization using Supabase Realtime
 * All hooks automatically subscribe/unsubscribe on mount/unmount
 */

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, Tables } from '@/lib/supabase/client'
import { REALTIME_LISTEN_TYPES, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT, REALTIME_PRESENCE_LISTEN_EVENTS } from '@supabase/supabase-js'
import type { RealtimeChannel, RealtimePostgresChangesPayload, RealtimePostgresChangesFilter } from '@supabase/supabase-js'

// Types
type PostgresChangePayload<T extends { [key: string]: any }> = RealtimePostgresChangesPayload<T>

// Hook for real-time content stats (likes, comments, views)
export function useRealtimeContentStats(contentId: string, initialStats?: {
  likeCount?: number
  commentCount?: number
  viewCount?: number
}) {
  const [stats, setStats] = useState({
    likeCount: initialStats?.likeCount || 0,
    commentCount: initialStats?.commentCount || 0,
    viewCount: initialStats?.viewCount || 0
  })
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!contentId) return

    // Subscribe to content updates
    channelRef.current = supabase
      .channel(`content-stats:${contentId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'content',
          filter: `id=eq.${contentId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL}`>,
        (payload: PostgresChangePayload<Tables<'content'>>) => {
          if (payload.new && 'like_count' in payload.new) {
            setStats({
              likeCount: payload.new.like_count,
              commentCount: payload.new.comment_count,
              viewCount: payload.new.view_count
            })
          }
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [contentId])

  return stats
}

// Hook for real-time likes
export function useRealtimeLikes(
  contentId: string,
  initialCount: number = 0
) {
  const [likesCount, setLikesCount] = useState(initialCount)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!contentId) return

    // Get current count
    const fetchCurrentCount = async () => {
      const { data } = await supabase
        .from('content')
        .select('like_count')
        .eq('id', contentId)
        .single()
      
      if (data) {
        setLikesCount(data.like_count)
      }
    }

    fetchCurrentCount()

    // Subscribe to interactions changes
    channelRef.current = supabase
      .channel(`likes:${contentId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'interactions',
          filter: `content_id=eq.${contentId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL}`>,
        async () => {
          // Re-fetch the count when interactions change
          await fetchCurrentCount()
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [contentId])

  return likesCount
}

// Hook for real-time comments
export function useRealtimeComments(
  contentId: string,
  initialCount: number = 0
) {
  const [commentsCount, setCommentsCount] = useState(initialCount)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!contentId) return

    // Subscribe to comments changes
    channelRef.current = supabase
      .channel(`comments:${contentId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT,
          schema: 'public',
          table: 'comments',
          filter: `content_id=eq.${contentId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT}`>,
        () => {
          setCommentsCount(prev => prev + 1)
        }
      )
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE,
          schema: 'public',
          table: 'comments',
          filter: `content_id=eq.${contentId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE}`>,
        () => {
          setCommentsCount(prev => Math.max(0, prev - 1))
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [contentId])

  // Update count when initial count changes
  useEffect(() => {
    setCommentsCount(initialCount)
  }, [initialCount])

  return commentsCount
}

// Hook for real-time activity participants
export function useRealtimeActivityParticipants(
  activityId: string,
  initialCount: number = 0
) {
  const [participantsCount, setParticipantsCount] = useState(initialCount)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!activityId) return

    // Subscribe to activity participants changes
    channelRef.current = supabase
      .channel(`activity-participants:${activityId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT,
          schema: 'public',
          table: 'activity_participants',
          filter: `activity_id=eq.${activityId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT}`>,
        () => {
          setParticipantsCount(prev => prev + 1)
        }
      )
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE,
          schema: 'public',
          table: 'activity_participants',
          filter: `activity_id=eq.${activityId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE}`>,
        () => {
          setParticipantsCount(prev => Math.max(0, prev - 1))
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [activityId])

  // Update count when initial count changes
  useEffect(() => {
    setParticipantsCount(initialCount)
  }, [initialCount])

  return participantsCount
}

// Hook for real-time presence (who's online)
export function useRealtimePresence(channelName: string) {
  const [presenceState, setPresenceState] = useState<Record<string, any>>({})
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    channelRef.current = supabase.channel(channelName)
    
    channelRef.current
      .on(REALTIME_LISTEN_TYPES.PRESENCE as `${REALTIME_LISTEN_TYPES.PRESENCE}`, { event: REALTIME_PRESENCE_LISTEN_EVENTS.SYNC }, () => {
        const state = channelRef.current!.presenceState()
        setPresenceState(state)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && channelRef.current) {
          await channelRef.current.track({
            online_at: new Date().toISOString()
          })
        }
      })

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [channelName])

  return presenceState
}

// Hook for general real-time subscriptions
export function useRealtimeSubscription<T extends { [key: string]: any } = any>(
  table: string,
  filter?: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const [data, setData] = useState<T[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const channelName = `${table}:${filter || 'all'}`
    
    const channel = supabase.channel(channelName)
    
    if (event === '*' || event === 'INSERT') {
      channel.on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT,
          schema: 'public',
          table,
          ...(filter && { filter })
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT}`>,
        (payload: PostgresChangePayload<T>) => {
          if (payload.new) {
            setData(prev => [...prev, payload.new as T])
          }
        }
      )
    }
    
    if (event === '*' || event === 'UPDATE') {
      channel.on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE,
          schema: 'public',
          table,
          ...(filter && { filter })
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE}`>,
        (payload: PostgresChangePayload<T>) => {
          if (payload.new) {
            setData(prev => 
              prev.map(item => {
                if ('id' in item && 'id' in payload.new && item.id === payload.new.id) {
                  return payload.new as T
                }
                return item
              })
            )
          }
        }
      )
    }
    
    if (event === '*' || event === 'DELETE') {
      channel.on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE,
          schema: 'public',
          table,
          ...(filter && { filter })
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE}`>,
        (payload: PostgresChangePayload<T>) => {
          if (payload.old) {
            setData(prev => 
              prev.filter(item => {
                if ('id' in item && 'id' in payload.old) {
                  return item.id !== payload.old.id
                }
                return true
              })
            )
          }
        }
      )
    }
    
    channelRef.current = channel
    channel.subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [table, filter, event])

  return data
}

// Hook for real-time messages inbox
export function useRealtimeMessageInbox(userId: string) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const fetchedRef = useRef(false)

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
      } catch (err) {
        console.error('Error fetching inbox:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch inbox')
      } finally {
        setLoading(false)
      }
    }

    fetchInbox()
  }, [userId])

  // Subscribe to real-time changes
  useEffect(() => {
    if (!userId) return

    // Subscribe to new messages where user is recipient
    channelRef.current = supabase
      .channel(`inbox:${userId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT,
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT}`>,
        async () => {
          // Refetch inbox to get updated data with sender info
          try {
            const { data, error } = await supabase.rpc('get_message_inbox', { p_user_id: userId })

            if (error) throw error
            setMessages(data || [])
          } catch (err) {
            console.error('Error refetching inbox:', err)
          }
        }
      )
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE,
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE}`>,
        async () => {
          // Refetch inbox for read status updates
          try {
            const { data, error } = await supabase.rpc('get_message_inbox', { p_user_id: userId })

            if (error) throw error
            setMessages(data || [])
          } catch (err) {
            console.error('Error refetching inbox:', err)
          }
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId])

  return { messages, loading, error, refetch: () => fetchedRef.current = false }
}

// Hook for real-time conversation messages
export function useRealtimeConversation(conversationId: string, currentUserId?: string | null, isConversationOpen: boolean = false) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
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
        console.error('Error fetching conversation:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch conversation')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversationId])

  // Subscribe to new messages in conversation
  useEffect(() => {
    if (!conversationId) return

    console.log('📨 Setting up realtime subscription for conversation:', conversationId)
    channelRef.current = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT,
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT}`>,
        async (payload: PostgresChangePayload<any>) => {
          console.log('📨 New message received:', payload.new)
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
              console.log('📨 Ignoring duplicate message (already in local state)')
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
                console.log('📨 Adding new message from other user')
                return [...prev, messageWithSender]
              })
            }
          }
        }
      )
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE,
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE}`>,
        (payload: PostgresChangePayload<any>) => {
          console.log('📨 Message updated:', payload.new)
          if (payload.new) {
            setMessages(prev => {
              const updated = prev.map(msg => {
                // 임시 ID를 가진 메시지도 serverMessageId로 매칭
                if (msg.id === payload.new.id || msg.serverMessageId === payload.new.id) {
                  console.log('📨 Updating message read status:', {
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
      )
      .subscribe((status) => {
        console.log('📨 Subscription status:', status)
      })

    return () => {
      console.log('📨 Cleaning up subscription for conversation:', conversationId)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [conversationId, currentUserId, isConversationOpen])

  return { messages, loading, error, addOptimisticMessage, replaceOptimisticMessage, updateMessageStatus }
}

// Hook for real-time unread message count
export function useRealtimeUnreadCount(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

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
        }
      } catch (err) {
        console.error('Error fetching unread count:', err)
        setUnreadCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchUnreadCount()
  }, [userId])

  // Subscribe to unread count changes
  useEffect(() => {
    if (!userId) return

    channelRef.current = supabase
      .channel(`unread-count:${userId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: 'user_message_stats',
          filter: `user_id=eq.${userId}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL}`>,
        (payload: PostgresChangePayload<any>) => {
          if (payload.new && 'unread_count' in payload.new) {
            setUnreadCount(payload.new.unread_count)
          } else if (payload.eventType === 'DELETE') {
            setUnreadCount(0)
          }
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId])

  return { unreadCount, loading }
}