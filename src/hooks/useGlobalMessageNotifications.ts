/**
 * Global Message Notifications Hook
 * 
 * Listens for new messages globally and shows toast notifications
 * Works on all pages, not just in conversation views
 */

'use client'

import { useEffect, useRef } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { supabase } from '@/lib/supabase/client'
import { MessageNotifications } from '@/lib/api/messages'
import { REALTIME_LISTEN_TYPES, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from '@supabase/supabase-js'
import type { RealtimeChannel, RealtimePostgresChangesPayload, RealtimePostgresChangesFilter } from '@supabase/supabase-js'

export function useGlobalMessageNotifications() {
  const { user, isMember } = useOptimizedAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    // Only listen if user is authenticated and is a member
    if (!user || !isMember) return

    console.log('🔔 Setting up global message notifications for user:', user.id)

    // Subscribe to all messages where current user is the recipient
    channelRef.current = supabase
      .channel(`global-messages:${user.id}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT,
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        } as RealtimePostgresChangesFilter<`${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT}`>,
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('🔔 New message received globally:', payload.new)
          
          if (payload.new) {
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
      )
      .subscribe((status) => {
        console.log('🔔 Global message subscription status:', status)
      })

    // Cleanup on unmount
    return () => {
      console.log('🔔 Cleaning up global message notifications')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [user, isMember])
}