/**
 * useActivities - 활동일정 관련 Hook들
 * 
 * 새로운 아키텍처를 활용한 활동일정 기능 구현
 */

'use client'

import { useCallback } from 'react'
import { useAuth } from '@/providers'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

// 활동 타입 (활동 + 콘텐츠 정보)
export interface ActivityWithContent extends Tables<'activities'> {
  content: Tables<'content_with_author'> | null
}

/**
 * 활동 목록 조회 Hook
 */
export function useActivities() {
  return useQuery<ActivityWithContent[]>({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('activities')
        .select(`
          *,
          content:content_with_author!activities_content_id_fkey(*)
        `)
        .order('scheduled_at', { ascending: true })
      
      if (error) throw error
      return data as ActivityWithContent[] || []
    },
    staleTime: 5 * 60 * 1000 // 5분
  })
}

/**
 * 단일 활동 조회 Hook
 */
export function useActivity(id: string | undefined) {
  return useQuery<Tables<'activities'>>({
    queryKey: ['activities', id],
    queryFn: async () => {
      if (!id) throw new Error('Activity ID is required')
      
      const { data, error } = await supabaseClient
        .from('activities')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000 // 10분
  })
}

/**
 * 활동 생성 Hook
 */
export function useCreateActivity() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<Tables<'activities'>, Error, TablesInsert<'activities'>>(
    {
      mutationFn: async (newActivity) => {
        const { data, error } = await supabaseClient
          .from('activities')
          .insert({
            ...newActivity,
            created_by: user!.id
          })
          .select()
          .single()
        
        if (error) throw error
        return data
      },
      
      onSuccess: () => {
        // 관련 쿼리 무효화
        queryClient.invalidateQueries({ 
          queryKey: ['activities'] 
        })
      }
    }
  )
}

/**
 * 활동 수정 Hook
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient()
  
  return useMutation<Tables<'activities'>, Error, { id: string; updates: TablesUpdate<'activities'> }>(
    {
      mutationFn: async ({ id, updates }) => {
        const { data, error } = await supabaseClient
          .from('activities')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()
        
        if (error) throw error
        return data
      },
      onMutate: async ({ id, updates }) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['activities', id] })
        
        // Snapshot the previous value
        const previousActivity = queryClient.getQueryData<Tables<'activities'>>(['activities', id])
        
        // Optimistically update
        if (previousActivity) {
          queryClient.setQueryData(['activities', id], {
            ...previousActivity,
            ...updates,
            updated_at: new Date().toISOString()
          })
        }
        
        return { previousActivity }
      },
      onError: (err, variables, context: any) => {
        // Rollback on error
        if (context?.previousActivity) {
          queryClient.setQueryData(['activities', variables.id], context.previousActivity)
        }
      },
      onSettled: (data, error, variables) => {
        // Always refetch after error or success
        queryClient.invalidateQueries({ queryKey: ['activities'] })
        queryClient.invalidateQueries({ queryKey: ['activities', variables.id] })
      }
    }
  )
}

/**
 * 활동 삭제 Hook
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, string>(
    {
      mutationFn: async (id) => {
        const { error } = await supabaseClient
          .from('activities')
          .delete()
          .eq('id', id)
        
        if (error) throw error
      },
      
      onSuccess: (_, id) => {
        // 관련 쿼리 무효화
        queryClient.invalidateQueries({ 
          queryKey: ['activities'] 
        })
        queryClient.invalidateQueries({ 
          queryKey: ['activities', id] 
        })
      }
    }
  )
}

/**
 * 활동 참가 신청 Hook
 */
export function useJoinActivity() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, string>(
    {
      mutationFn: async (activityId) => {
        const { error } = await supabaseClient
          .from('activity_participants')
          .insert({
            activity_id: activityId,
            user_id: user!.id
          })
        
        if (error) throw error
      },
      
      onSuccess: (_, activityId) => {
        // 관련 쿼리 무효화
        queryClient.invalidateQueries({ 
          queryKey: ['activities', activityId] 
        })
        queryClient.invalidateQueries({ 
          queryKey: ['activity-participants', activityId] 
        })
      }
    }
  )
}

/**
 * 활동 참가 취소 Hook
 */
export function useLeaveActivity() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, string>(
    {
      mutationFn: async (activityId) => {
        const { error } = await supabaseClient
          .from('activity_participants')
          .delete()
          .eq('activity_id', activityId)
          .eq('user_id', user!.id)
        
        if (error) throw error
      },
      
      onSuccess: (_, activityId) => {
        // 관련 쿼리 무효화
        queryClient.invalidateQueries({ 
          queryKey: ['activities', activityId] 
        })
        queryClient.invalidateQueries({ 
          queryKey: ['activity-participants', activityId] 
        })
      }
    }
  )
}

/**
 * 활동 참가자 목록 조회 Hook
 */
export function useActivityParticipants(activityId: string) {
  const { user } = useAuth()
  
  return useQuery<{ users: Tables<'users'>[], isParticipating: boolean }>({
    queryKey: ['activity-participants', activityId],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('activity_participants')
        .select(`
          user_id,
          users (
            id,
            name,
            avatar_url,
            department
          )
        `)
        .eq('activity_id', activityId)
      
      if (error) throw error
      
      const participants = data?.map(p => p.users).filter(Boolean) as Tables<'users'>[] || []
      const isParticipating = user ? participants.some(p => p.id === user.id) : false
      
      return {
        users: participants,
        isParticipating
      }
    },
    enabled: !!activityId,
    staleTime: 5 * 60 * 1000 // 5분
  })
}

/**
 * 다가오는 활동 조회 Hook
 */
export function useUpcomingActivities(limit = 5) {
  return useQuery<Tables<'activities'>[]>({
    queryKey: ['activities', 'upcoming', limit],
    queryFn: async () => {
      const now = new Date().toISOString()
      
      const { data, error } = await supabaseClient
        .from('activities')
        .select('*')
        .gte('date', now.split('T')[0]) // 오늘 이후
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(limit)
      
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000 // 5분
  })
}

/**
 * 내가 참가한 활동 조회 Hook
 */
export function useMyActivities() {
  const { user } = useAuth()
  
  return useQuery<Tables<'activities'>[]>({
    queryKey: ['activities', 'my', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabaseClient
        .from('activity_participants')
        .select(`
          activities (*)
        `)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      return data?.map(d => d.activities).filter(Boolean) as Tables<'activities'>[] || []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000 // 5분
  })
}