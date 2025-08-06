/**
 * useMessages - 메시지 기능을 위한 Hook
 * 
 * 새로운 아키텍처를 활용한 메시지 기능 구현 예시
 */

'use client'

import { useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRealtimeQuery } from '@/hooks/core/useRealtimeQuery'
import { supabaseClient } from '@/lib/core/connection-core'

// 메시지 타입
interface Message {
  id: string
  conversation_id: string | null
  sender_id: string
  recipient_id: string
  content: string
  is_read: boolean
  read_at: string | null
  created_at: string
  sender?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

interface MessageInbox {
  conversation_id: string
  other_user_id: string
  other_user_name: string
  other_user_avatar: string | null
  last_message: string
  last_message_time: string
  unread_count: number
  is_last_message_read: boolean
}

/**
 * 메시지 인박스를 가져오는 Hook
 */
export function useMessageInbox() {
  const { user } = useAuth()
  
  return useRealtimeQuery<MessageInbox[]>({
    queryKey: ['messages', 'inbox', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabaseClient
        .rpc('get_message_inbox', { p_user_id: user.id })
      
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
    realtime: {
      enabled: !!user,
      table: 'messages',
      filter: `recipient_id=eq.${user?.id}`,
      updateStrategy: 'invalidate'
    }
  })
}

/**
 * 대화 메시지를 가져오는 Hook
 */
export function useConversation(conversationId: string) {
  const { user } = useAuth()
  
  return useRealtimeQuery<Message[]>({
    queryKey: ['messages', 'conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabaseClient
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
    enabled: !!conversationId && !!user,
    staleTime: 10 * 60 * 1000, // 10분
    realtime: {
      enabled: true,
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
      updateStrategy: 'update' // 새 메시지는 즉시 추가
    }
  })
}

/**
 * 읽지 않은 메시지 수를 가져오는 Hook
 */
export function useUnreadCount() {
  const { user } = useAuth()
  
  return useRealtimeQuery<number>({
    queryKey: ['messages', 'unread', user?.id],
    queryFn: async () => {
      if (!user) return 0
      
      const { data, error } = await supabaseClient
        .from('user_message_stats')
        .select('unread_count')
        .eq('user_id', user.id)
        .single()
      
      if (error) {
        // 레코드가 없으면 0 반환
        if (error.code === 'PGRST116') return 0
        throw error
      }
      
      return data?.unread_count || 0
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1분
    realtime: {
      enabled: !!user,
      table: 'user_message_stats',
      filter: `user_id=eq.${user?.id}`,
      updateStrategy: 'update'
    }
  })
}

/**
 * 메시지 전송 Hook
 */
export function useSendMessage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<Message, Error, { conversationId: string; recipientId: string; content: string }>({
    mutationFn: async ({ conversationId, recipientId, content }) => {
      const { data, error } = await supabaseClient
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user!.id,
          recipient_id: recipientId,
          content
        })
        .select(`
          *,
          sender:users!messages_sender_id_fkey (
            id, name, avatar_url
          )
        `)
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async (variables) => {
      // Cancel queries and do optimistic update
      await queryClient.cancelQueries({ queryKey: ['messages', 'conversation', variables.conversationId] })
      const previous = queryClient.getQueryData<Message[]>(['messages', 'conversation', variables.conversationId])
      
      // 낙관적으로 메시지 추가
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: variables.conversationId,
        sender_id: user!.id,
        recipient_id: variables.recipientId,
        content: variables.content,
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        sender: {
          id: user!.id,
          name: user!.user_metadata?.name || 'Unknown',
          avatar_url: user!.user_metadata?.avatar_url || null
        }
      }
      
      queryClient.setQueryData(
        ['messages', 'conversation', variables.conversationId],
        (old: Message[] = []) => [...old, optimisticMessage]
      )
      
      return { previous }
    },
    onError: (err, variables, context: any) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['messages', 'conversation', variables.conversationId], context.previous)
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversation', variables.conversationId] })
    }
  })
}

/**
 * 메시지 읽음 처리 Hook
 */
export function useMarkAsRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, string[]>({
    mutationFn: async (messageIds) => {
      const { error } = await supabaseClient
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', messageIds)
        .eq('recipient_id', user!.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      // 읽지 않은 메시지 수 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['messages', 'unread', user?.id] 
      })
    }
  })
}

/**
 * 새 대화 시작 Hook
 */
export function useStartConversation() {
  const { user } = useAuth()
  
  return useMutation<string, Error, string>({
    mutationFn: async (recipientId) => {
      // 기존 대화 확인
      const { data: existing, error: checkError } = await supabaseClient
        .from('messages')
        .select('conversation_id')
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .or(`sender_id.eq.${recipientId},recipient_id.eq.${recipientId}`)
        .limit(1)
        .single()
      
      if (existing?.conversation_id) {
        return existing.conversation_id
      }
      
      // 새 대화 ID 생성
      const conversationId = `${user!.id}-${recipientId}-${Date.now()}`
      return conversationId
    }
  })
}

/**
 * 대화 삭제 Hook
 */
export function useDeleteConversation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, string>({
    mutationFn: async (conversationId) => {
      // 사용자의 메시지만 삭제 (소프트 삭제로 구현하는 것이 좋음)
      const { error } = await supabaseClient
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('sender_id', user!.id)
      
      if (error) throw error
    },
    onSettled: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox', user?.id] })
    }
  })
}