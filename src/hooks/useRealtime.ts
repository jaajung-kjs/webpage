'use client'

import { useEffect, useState } from 'react'
import { subscriptions } from '@/lib/api'

// Hook for real-time likes
export function useRealtimeLikes(
  contentType: 'case' | 'community_post' | 'comment',
  contentId: string,
  initialCount: number = 0
) {
  const [likesCount, setLikesCount] = useState(initialCount)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (!contentId || isSubscribed) return

    const subscription = subscriptions.subscribeToLikes(
      contentType,
      contentId,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setLikesCount(prev => prev + 1)
        } else if (payload.eventType === 'DELETE') {
          setLikesCount(prev => Math.max(0, prev - 1))
        }
      }
    )

    setIsSubscribed(true)

    return () => {
      subscription.unsubscribe()
      setIsSubscribed(false)
    }
  }, [contentType, contentId, isSubscribed])

  // Update likes count when initial count changes
  useEffect(() => {
    setLikesCount(initialCount)
  }, [initialCount])

  return likesCount
}

// Hook for real-time comments
export function useRealtimeComments(
  contentType: 'case' | 'announcement' | 'community_post',
  contentId: string,
  initialCount: number = 0
) {
  const [commentsCount, setCommentsCount] = useState(initialCount)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (!contentId || isSubscribed) return

    const subscription = subscriptions.subscribeToComments(
      contentType,
      contentId,
      (payload) => {
        // Only count top-level comments (parent_id is null)
        if (payload.new?.parent_id === null || payload.old?.parent_id === null) {
          if (payload.eventType === 'INSERT') {
            setCommentsCount(prev => prev + 1)
          } else if (payload.eventType === 'DELETE') {
            setCommentsCount(prev => Math.max(0, prev - 1))
          }
        }
      }
    )

    setIsSubscribed(true)

    return () => {
      subscription.unsubscribe()
      setIsSubscribed(false)
    }
  }, [contentType, contentId, isSubscribed])

  // Update comments count when initial count changes
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
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (!activityId || isSubscribed) return

    const subscription = subscriptions.subscribeToActivityParticipants(
      activityId,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setParticipantsCount(prev => prev + 1)
        } else if (payload.eventType === 'DELETE') {
          setParticipantsCount(prev => Math.max(0, prev - 1))
        }
      }
    )

    setIsSubscribed(true)

    return () => {
      subscription.unsubscribe()
      setIsSubscribed(false)
    }
  }, [activityId, isSubscribed])

  // Update participants count when initial count changes
  useEffect(() => {
    setParticipantsCount(initialCount)
  }, [initialCount])

  return participantsCount
}

