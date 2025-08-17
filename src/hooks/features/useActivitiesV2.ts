/**
 * useActivitiesV2 - V2 스키마 기반 활동일정/이벤트 관리 Hook
 * 
 * 주요 기능:
 * - activities_v2 테이블 사용 (이벤트 정보)
 * - activity_participants_v2 테이블 사용 (참가자 관리)
 * - 참가 신청/취소 워크플로우
 * - 실시간 참가자 수 업데이트
 * - 출석 확인 및 피드백
 * - 대기자 자동 승격
 * - Optimistic Updates
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers'
import { supabaseClient } from '@/lib/core/connection-core'
import { useCallback, useEffect } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { 
  ActivityV2,
  ActivityV2Insert,
  ActivityV2Update,
  ActivityParticipantV2,
  ActivityParticipantV2Insert,
  ActivityParticipantV2Update,
  ContentV2,
  UserV2,
  ActivityEventType,
  ParticipantStatus
} from '@/hooks/types/v2-types'

// Re-export for convenience
export type EventType = ActivityEventType

// 확장된 활동 타입 (관계 포함)
export interface ActivityWithRelations extends ActivityV2 {
  content: Pick<ContentV2, 'id' | 'title' | 'summary' | 'content' | 'author_id' | 'status'>
  author?: Pick<UserV2, 'id' | 'name' | 'avatar_url'>
  available_spots?: number
}

// 확장된 참가자 타입 (관계 포함)
export interface ParticipantWithUser extends ActivityParticipantV2 {
  user: Pick<UserV2, 'id' | 'name' | 'email' | 'department' | 'avatar_url'>
}

// 활동 필터
export interface ActivityFilter {
  eventType?: EventType
  isOnline?: boolean
  dateFrom?: string
  dateTo?: string
  hasAvailableSpots?: boolean
}

// 활동 통계
export interface ActivityStats {
  activity_id: string
  title: string
  event_type: string
  event_date: string
  max_participants?: number | null
  registered_count: number
  confirmed_count: number
  waitlisted_count: number
  cancelled_count: number
  attended_count: number
  average_rating?: number | null
  available_spots?: number | null
}

// 활동 생성/수정 데이터
export interface ActivityFormData {
  title: string
  content: string
  summary?: string
  event_type: EventType
  event_date: string
  event_time?: string
  end_date?: string
  end_time?: string
  location?: string
  location_detail?: string
  is_online: boolean
  online_url?: string
  max_participants?: number
  registration_deadline?: string
  requirements?: string
}

export function useActivitiesV2() {
  const supabase = supabaseClient()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // GlobalRealtimeManager가 activity_participants_v2 실시간 업데이트를 처리함
  // 개별 Hook에서 직접 구독하지 않음 (중복 방지)
  // GlobalRealtimeManager의 handleActivityParticipantsChange가 아래 쿼리들을 자동 무효화:
  // - ['activity-v2', activityId]
  // - ['activity-participants-v2', activityId]
  // - ['my-participation-v2', userId, activityId]

  // 활동 상세 조회
  const useActivity = (activityId: string) => {
    return useQuery({
      queryKey: ['activity-v2', activityId],
      queryFn: async () => {
        const { data: activityData, error: activityError } = await supabase
          .from('activities_v2')
          .select(`
            *,
            content:content_v2!content_id(
              id,
              title,
              summary,
              content,
              author_id,
              status,
              view_count,
              like_count,
              comment_count,
              created_at,
              author:users_v2!author_id(id, name, avatar_url)
            )
          `)
          .eq('id', activityId)
          .single()

        if (activityError) throw activityError

        // 현재 참가자 수 계산
        const { count: participantCount } = await supabase
          .from('activity_participants_v2')
          .select('*', { count: 'exact', head: true })
          .eq('activity_id', activityId)
          .in('status', ['confirmed'])

        const activity = activityData
        const current_participants = participantCount || 0
        const available_spots = activity.max_participants 
          ? Math.max(0, activity.max_participants - current_participants)
          : null

        return {
          ...activity,
          current_participants,
          available_spots
        } as ActivityWithRelations
      },
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 활동 목록 조회 (무한 스크롤)
  const useActivities = (filter: ActivityFilter = {}, pageSize = 20) => {
    return useInfiniteQuery({
      queryKey: ['activities-v2', filter],
      queryFn: async ({ pageParam = 0 }) => {
        let query = supabase
          .from('activities_v2')
          .select(`
            *,
            content:content_v2!content_id(
              id,
              title,
              summary,
              content,
              author_id,
              status,
              created_at,
              author:users_v2!author_id(id, name, avatar_url)
            )
          `, { count: 'exact' })
          .range(pageParam, pageParam + pageSize - 1)
          .order('event_date', { ascending: true })

        // 필터 적용
        if (filter.eventType) query = query.eq('event_type', filter.eventType)
        if (filter.isOnline !== undefined) query = query.eq('is_online', filter.isOnline)
        if (filter.dateFrom) query = query.gte('event_date', filter.dateFrom)
        if (filter.dateTo) query = query.lte('event_date', filter.dateTo)

        const { data, error, count } = await query

        if (error) throw error

        // 각 활동의 참가자 수 계산
        const activitiesWithStats = await Promise.all(
          (data || []).map(async (activity) => {
            const { count: participantCount } = await supabase
              .from('activity_participants_v2')
              .select('*', { count: 'exact', head: true })
              .eq('activity_id', activity.id)
              .in('status', ['confirmed'])

            const current_participants = participantCount || 0
            const available_spots = activity.max_participants 
              ? Math.max(0, activity.max_participants - current_participants)
              : null

            return {
              ...activity,
              current_participants,
              available_spots
            }
          })
        )

        // 자리 여부 필터 (클라이언트 사이드)
        let filteredActivities = activitiesWithStats
        if (filter.hasAvailableSpots) {
          filteredActivities = activitiesWithStats.filter(
            a => a.available_spots === null || a.available_spots > 0
          )
        }

        return {
          activities: filteredActivities as any,
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      initialPageParam: 0,
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 다가오는 활동 조회 (RPC 함수 사용)
  const useUpcomingActivities = (limit = 10) => {
    return useQuery({
      queryKey: ['upcoming-activities-v2', limit],
      queryFn: async () => {
        const { data, error } = await supabase
          .rpc('get_upcoming_activities_v2', {
            p_limit: limit,
            p_offset: 0
          })

        if (error) throw error
        return data
      },
      staleTime: 1 * 60 * 1000, // 1분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 활동 참가자 목록 조회
  const useActivityParticipants = (activityId: string, status?: ParticipantStatus) => {
    return useQuery({
      queryKey: ['activity-participants-v2', activityId, status],
      queryFn: async () => {
        let query = supabase
          .from('activity_participants_v2')
          .select(`
            *,
            user:users_v2!user_id(id, name, email, department, avatar_url)
          `)
          .eq('activity_id', activityId)
          .order('created_at', { ascending: true })

        if (status) query = query.eq('status', status)

        const { data, error } = await query

        if (error) throw error
        return data as ParticipantWithUser[]
      },
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 사용자의 활동 참가 상태 조회
  const useMyParticipation = (activityId: string) => {
    return useQuery({
      queryKey: ['my-participation-v2', user?.id, activityId],
      queryFn: async () => {
        if (!user?.id) return null

        const { data, error } = await supabase
          .from('activity_participants_v2')
          .select('*')
          .eq('activity_id', activityId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error
        return data
      },
      enabled: !!user?.id,
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 사용자의 활동 참가 이력 (RPC 함수 사용)
  const useMyActivityHistory = (includePast = true) => {
    return useQuery({
      queryKey: ['my-activity-history-v2', user?.id, includePast],
      queryFn: async () => {
        if (!user?.id) return []

        const { data, error } = await supabase
          .rpc('get_user_activity_history_v2', {
            p_user_id: user.id,
            p_include_past: includePast
          })

        if (error) throw error
        return data
      },
      enabled: !!user?.id,
      staleTime: 1 * 60 * 1000, // 1분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 활동 통계 조회 (RPC 함수 사용)
  const useActivityStats = (activityId: string) => {
    return useQuery({
      queryKey: ['activity-stats-v2', activityId],
      queryFn: async () => {
        const { data, error } = await supabase
          .rpc('get_activity_stats_v2', {
            p_activity_id: activityId
          })

        if (error) throw error
        return data as any
      },
      staleTime: 30 * 1000, // 30초
      gcTime: 2 * 60 * 1000, // 2분
    })
  }

  // 활동 생성 (콘텐츠와 함께)
  const createActivity = useMutation({
    mutationFn: async (formData: ActivityFormData) => {
      if (!user?.id) throw new Error('User not authenticated')

      // 1. 콘텐츠 생성
      const { data: contentData, error: contentError } = await supabase
        .from('content_v2')
        .insert({
          content_type: 'activity',
          title: formData.title,
          content: formData.content,
          summary: formData.summary,
          author_id: user.id,
          status: 'published'
        })
        .select()
        .single()

      if (contentError) throw contentError

      // 2. 활동 정보 생성
      const { data: activityData, error: activityError } = await supabase
        .from('activities_v2')
        .insert({
          content_id: contentData.id,
          event_type: formData.event_type,
          event_date: formData.event_date,
          event_time: formData.event_time,
          end_date: formData.end_date,
          end_time: formData.end_time,
          location: formData.location,
          location_detail: formData.location_detail,
          is_online: formData.is_online,
          online_url: formData.online_url,
          max_participants: formData.max_participants,
          registration_deadline: formData.registration_deadline,
          requirements: formData.requirements
        })
        .select()
        .single()

      if (activityError) {
        // 활동 생성 실패 시 콘텐츠 삭제
        await supabase
          .from('content_v2')
          .delete()
          .eq('id', contentData.id)
        throw activityError
      }

      return { content: contentData, activity: activityData }
    },
    onSuccess: (data) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['activities-v2'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-activities-v2'] })
      queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
    }
  })

  // 활동 참가 신청 (RPC 함수 사용)
  const registerForActivity = useMutation({
    mutationFn: async ({
      activityId,
      note
    }: {
      activityId: string
      note?: string
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      console.log('[useActivitiesV2] Calling register_for_activity_v2:', {
        activityId,
        userId: user.id,
        note
      })

      // RPC 호출 시 undefined 대신 파라미터를 생략하거나 null 전달
      const params: any = {
        p_activity_id: activityId,
        p_user_id: user.id
      }
      
      // note가 있을 때만 파라미터에 추가
      if (note) {
        params.p_note = note
      }
      
      const { data, error } = await supabase
        .rpc('register_for_activity_v2', params)

      console.log('[useActivitiesV2] Register for activity response:', { data, error })

      if (error) throw error
      
      // RPC 함수가 { success: boolean, participant?: {...} } 형태로 반환
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        throw new Error((data as any).error || '참가 신청에 실패했습니다.')
      }
      
      return data
    },
    onMutate: async ({ activityId }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['activity-v2', activityId] })
      await queryClient.cancelQueries({ queryKey: ['my-participation-v2', user?.id, activityId] })

      const previousActivity = queryClient.getQueryData<ActivityWithRelations>(['activity-v2', activityId])
      
      if (previousActivity) {
        queryClient.setQueryData(['activity-v2', activityId], {
          ...previousActivity,
          current_participants: (previousActivity.current_participants || 0) + 1,
          available_spots: previousActivity.available_spots 
            ? Math.max(0, previousActivity.available_spots - 1)
            : null
        })
      }

      // 임시 참가 상태 설정 (confirmed로 설정)
      queryClient.setQueryData(['my-participation-v2', user?.id, activityId], {
        id: 'temp',
        activity_id: activityId,
        user_id: user?.id,
        status: 'confirmed',  // 바로 confirmed로 설정
        attended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      return { previousActivity }
    },
    onError: (err, variables, context) => {
      // 롤백
      if (context?.previousActivity) {
        queryClient.setQueryData(['activity-v2', variables.activityId], context.previousActivity)
      }
      queryClient.invalidateQueries({ queryKey: ['my-participation-v2', user?.id, variables.activityId] })
    },
    onSuccess: (data, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['activity-v2', variables.activityId] })
      queryClient.invalidateQueries({ queryKey: ['activity-stats-v2', variables.activityId] })
      queryClient.invalidateQueries({ queryKey: ['activity-participants-v2', variables.activityId] })
      queryClient.invalidateQueries({ queryKey: ['my-participation-v2', user?.id, variables.activityId] })
      queryClient.invalidateQueries({ queryKey: ['my-activity-history-v2', user?.id] })
    }
  })

  // 활동 참가 취소 (RPC 함수 사용)
  const cancelRegistration = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      console.log('[useActivitiesV2] Calling cancel_activity_registration_v2:', {
        activityId,
        userId: user.id
      })

      const { data, error } = await supabase
        .rpc('cancel_activity_registration_v2', {
          p_activity_id: activityId,
          p_user_id: user.id
        })

      console.log('[useActivitiesV2] Cancel registration response:', { data, error })

      if (error) throw error
      
      // RPC 함수가 { success: boolean } 형태로 반환
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        throw new Error((data as any).error || '참가 취소에 실패했습니다.')
      }
      
      return data
    },
    onMutate: async (activityId) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['activity-v2', activityId] })
      await queryClient.cancelQueries({ queryKey: ['my-participation-v2', user?.id, activityId] })

      const previousActivity = queryClient.getQueryData<ActivityWithRelations>(['activity-v2', activityId])
      
      if (previousActivity) {
        queryClient.setQueryData(['activity-v2', activityId], {
          ...previousActivity,
          current_participants: Math.max(0, (previousActivity.current_participants || 0) - 1),
          available_spots: previousActivity.max_participants 
            ? (previousActivity.available_spots || 0) + 1
            : null
        })
      }

      // 참가 상태 제거
      queryClient.setQueryData(['my-participation-v2', user?.id, activityId], null)

      return { previousActivity }
    },
    onError: (err, activityId, context) => {
      // 롤백
      if (context?.previousActivity) {
        queryClient.setQueryData(['activity-v2', activityId], context.previousActivity)
      }
      queryClient.invalidateQueries({ queryKey: ['my-participation-v2', user?.id, activityId] })
    },
    onSuccess: (data, activityId) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['activity-v2', activityId] })
      queryClient.invalidateQueries({ queryKey: ['activity-stats-v2', activityId] })
      queryClient.invalidateQueries({ queryKey: ['activity-participants-v2', activityId] })
      queryClient.invalidateQueries({ queryKey: ['my-participation-v2', user?.id, activityId] })
      queryClient.invalidateQueries({ queryKey: ['my-activity-history-v2', user?.id] })
    }
  })

  // 출석 확인 (관리자용, RPC 함수 사용)
  const confirmAttendance = useMutation({
    mutationFn: async ({
      activityId,
      userId,
      attended = true
    }: {
      activityId: string
      userId: string
      attended?: boolean
    }) => {
      const { data, error } = await supabase
        .rpc('confirm_activity_attendance_v2', {
          p_activity_id: activityId,
          p_user_id: userId,
          p_attended: attended
        })

      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['activity-participants-v2', variables.activityId] })
      queryClient.invalidateQueries({ queryKey: ['activity-stats-v2', variables.activityId] })
    }
  })

  // 피드백 제출
  const submitFeedback = useMutation({
    mutationFn: async ({
      activityId,
      feedback,
      rating
    }: {
      activityId: string
      feedback?: string
      rating?: number
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('activity_participants_v2')
        .update({
          feedback,
          rating,
          updated_at: new Date().toISOString()
        })
        .eq('activity_id', activityId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['activity-participants-v2', variables.activityId] })
      queryClient.invalidateQueries({ queryKey: ['activity-stats-v2', variables.activityId] })
      queryClient.invalidateQueries({ queryKey: ['my-participation-v2', user?.id, variables.activityId] })
      queryClient.invalidateQueries({ queryKey: ['my-activity-history-v2', user?.id] })
    }
  })

  // 활동 수정 (업데이트)
  const updateActivity = useMutation({
    mutationFn: async ({ 
      activityId, 
      updates 
    }: { 
      activityId: string
      updates: Partial<ActivityFormData> 
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      // First update the activity
      const { data: activityData, error: activityError } = await supabase
        .from('activities_v2')
        .update({
          event_type: updates.event_type,
          event_date: updates.event_date,
          event_time: updates.event_time,
          end_date: updates.end_date,
          end_time: updates.end_time,
          location: updates.location,
          location_detail: updates.location_detail,
          is_online: updates.is_online,
          online_url: updates.online_url,
          max_participants: updates.max_participants,
          registration_deadline: updates.registration_deadline,
          requirements: updates.requirements
        })
        .eq('id', activityId)
        .select()
        .single()

      if (activityError) throw activityError

      // Then update the associated content if provided
      if (updates.title || updates.content || updates.summary) {
        const { data: contentData, error: contentError } = await supabase
          .from('content_v2')
          .update({
            title: updates.title,
            content: updates.content,
            summary: updates.summary,
            updated_at: new Date().toISOString()
          })
          .eq('id', activityData.content_id)
          .select()
          .single()

        if (contentError) throw contentError
        return { content: contentData, activity: activityData }
      }

      return { content: null, activity: activityData }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities-v2'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-activities-v2'] })
      queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
      queryClient.invalidateQueries({ queryKey: ['infinite-contents-v2'] })
    }
  })

  // 활동 삭제 (소프트 삭제)
  const deleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      // Get activity to find content_id
      const { data: activity, error: activityError } = await supabase
        .from('activities_v2')
        .select('content_id')
        .eq('id', activityId)
        .single()

      if (activityError) throw activityError

      // Soft delete the content (which will cascade to activity via RLS)
      const { data: contentData, error: contentError } = await supabase
        .from('content_v2')
        .update({ 
          status: 'deleted',
          deleted_at: new Date().toISOString()
        })
        .eq('id', activity.content_id)
        .select()
        .single()

      if (contentError) throw contentError
      return contentData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities-v2'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-activities-v2'] })
      queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
      queryClient.invalidateQueries({ queryKey: ['infinite-contents-v2'] })
    }
  })

  return {
    // Query Hooks
    useActivity,
    useActivities,
    useUpcomingActivities,
    useActivityParticipants,
    useMyParticipation,
    useMyActivityHistory,
    useActivityStats,

    // Mutations
    createActivity: createActivity.mutate,
    createActivityAsync: createActivity.mutateAsync,
    updateActivity: updateActivity.mutate,
    updateActivityAsync: updateActivity.mutateAsync,
    deleteActivity: deleteActivity.mutate,
    deleteActivityAsync: deleteActivity.mutateAsync,
    registerForActivity: registerForActivity.mutate,
    registerForActivityAsync: registerForActivity.mutateAsync,
    cancelRegistration: cancelRegistration.mutate,
    cancelRegistrationAsync: cancelRegistration.mutateAsync,
    confirmAttendance: confirmAttendance.mutate,
    confirmAttendanceAsync: confirmAttendance.mutateAsync,
    submitFeedback: submitFeedback.mutate,
    submitFeedbackAsync: submitFeedback.mutateAsync,

    // 상태
    isCreating: createActivity.isPending,
    isUpdating: updateActivity.isPending,
    isDeleting: deleteActivity.isPending,
    isRegistering: registerForActivity.isPending,
    isCancelling: cancelRegistration.isPending,
    isConfirmingAttendance: confirmAttendance.isPending,
    isSubmittingFeedback: submitFeedback.isPending,
  }
}

// 이벤트 타입별 설정 (실제 사용 중인 카테고리)
export const EVENT_TYPE_CONFIG = {
  regular: {
    label: '정기모임',
    icon: '📅',
    color: 'text-kepco-blue-600',
    bgColor: 'bg-kepco-blue-100'
  },
  study: {
    label: '스터디',
    icon: '🎓',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  dinner: {
    label: '회식',
    icon: '🍴',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  lecture: {
    label: '강연',
    icon: '🎤',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  }
} as const

// 참가 상태별 설정
export const PARTICIPANT_STATUS_CONFIG = {
  confirmed: {
    label: '참가중',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: '✅'
  },
  waitlisted: {
    label: '대기 중',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: '⏳'
  },
  cancelled: {
    label: '취소됨',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: '❌'
  }
} as const