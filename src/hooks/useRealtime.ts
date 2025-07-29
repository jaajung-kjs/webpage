/**
 * Supabase Realtime Hooks
 * 
 * Provides real-time data synchronization using Supabase Realtime
 * All hooks automatically subscribe/unsubscribe on mount/unmount
 */

'use client'

import { useEffect, useState, useRef } from 'react'
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