/**
 * Global Message Notifications Hook
 * 
 * Listens for new messages globally and shows toast notifications
 * Works on all pages, not just in conversation views
 * Now uses RealtimeManager for stable WebSocket connection
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { supabase } from '@/lib/supabase/client'
import { MessageNotifications } from '@/lib/api/messages'
import { realtimeManager } from '@/lib/realtime/RealtimeManager'

// 전역 상태로 대화창 열림 상태 관리
let activeConversationId: string | null = null

export function setActiveConversation(conversationId: string | null) {
  activeConversationId = conversationId
  console.log('💬 Active conversation set to:', conversationId)
}

export function getActiveConversation() {
  return activeConversationId
}

export function useGlobalMessageNotifications() {
  const { user, isMember } = useOptimizedAuth()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Only listen if user is authenticated and is a member
    if (!user || !isMember) return

    console.log('🔔 Setting up global message notifications for user:', user.id)

    // RealtimeManager를 통해 구독
    unsubscribeRef.current = realtimeManager.subscribe({
      name: `user-messages-${user.id}`,
      table: 'messages',
      filter: `recipient_id=eq.${user.id}`,
      event: 'INSERT',
      callback: async (payload: any) => {
        console.log('🔔 New message received globally:', payload.new)
        
        if (payload.new) {
          // 현재 열려있는 대화창의 메시지인지 확인
          const currentConversationId = getActiveConversation()
          if (currentConversationId && payload.new.conversation_id === currentConversationId) {
            console.log('💬 Message is for active conversation, skipping toast')
            return
          }
          
          // Get sender information
          let senderName = '알 수 없는 사용자'
          
          try {
            const { data: senderData } = await supabase
              .from('users')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single()
            
            if (senderData?.name) {
              senderName = senderData.name
            }
          } catch (error) {
            console.error('Failed to fetch sender info:', error)
          }

          // Show notification
          console.log('🔔 Showing global message notification')
          MessageNotifications.showNewMessageNotification(
            senderName,
            payload.new.content
          )
        }
      }
    })

    // Cleanup on unmount
    return () => {
      console.log('🔔 Cleaning up global message notifications')
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [user, isMember])
}