/**
 * useGamificationV2 - 게임화 시스템 V2 통합 관리 Hook
 * 
 * 주요 기능:
 * - 사용자 활동 점수 및 레벨 관리
 * - 실시간 통계 추적
 * - 활동 기록 및 자동 점수 계산
 * - Optimistic Updates 지원
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { useCallback, useEffect } from 'react'
import type { Tables, Json } from '@/lib/database.types'

// 활동 로그 타입
export interface ActivityLogData {
  action_type: 'content_created' | 'comment_created' | 'like_given' | 'like_received' | 'activity_joined' | 'activity_attended'
  target_type?: 'content' | 'comment' | 'activity' | 'user'
  target_id?: string
  points?: number
  metadata?: Json
}

// 게임화 설정 타입
export interface GamificationSettings {
  notifications_enabled: boolean
  show_progress_badges: boolean
  show_in_leaderboard: boolean
}

/**
 * 게임화 시스템 V2 Hook
 */
export function useGamificationV2(userId?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const targetUserId = userId || user?.id
  const isOwnProfile = !userId || userId === user?.id

  // 사용자 통계 조회
  const { data: userStats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['user-stats-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID required')
      
      const { data, error } = await supabaseClient.rpc('get_user_stats_v2', {
        p_user_id: targetUserId
      })
      
      if (error) {
        console.error('Error fetching user stats v2:', error)
        throw error
      }
      
      return data
    },
    enabled: !!targetUserId,
    staleTime: 3 * 60 * 1000, // 3분
    gcTime: 8 * 60 * 1000, // 8분
    refetchOnWindowFocus: false
  })

  // 사용자 기본 게임화 정보 (users_v2 테이블에서)
  const { data: userGameData, isLoading: isGameDataLoading } = useQuery({
    queryKey: ['user-game-data-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID required')
      
      const { data, error } = await supabaseClient
        .from('users_v2')
        .select('activity_score, skill_level, activity_level')
        .eq('id', targetUserId)
        .is('deleted_at', null)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!targetUserId,
    staleTime: 1 * 60 * 1000, // 1분
    gcTime: 5 * 60 * 1000, // 5분
  })

  // 최근 활동 로그 조회
  const { data: recentActivities, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['recent-activities-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID required')
      
      const { data, error } = await supabaseClient
        .from('user_activity_logs_v2')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      return data as Tables<'user_activity_logs_v2'>[]
    },
    enabled: !!targetUserId,
    staleTime: 30 * 1000, // 30초
    gcTime: 2 * 60 * 1000, // 2분
  })

  // 활동 기록 (본인만 가능)
  const recordActivity = useMutation({
    mutationFn: async (activityData: ActivityLogData) => {
      if (!user?.id) throw new Error('Authentication required')
      if (!isOwnProfile) throw new Error('Can only record own activities')
      
      const { error } = await supabaseClient.rpc('log_user_activity', {
        p_user_id: user.id,
        p_action_type: activityData.action_type,
        p_target_type: activityData.target_type || undefined,
        p_target_id: activityData.target_id || undefined,
        p_points: activityData.points || 0,
        p_metadata: activityData.metadata || undefined
      })
      
      if (error) throw error
      
      return { activityLogged: true }
    },
    onSuccess: () => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: ['user-stats-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-game-data-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard-v2'] })
      
      // 레벨 업데이트 트리거
      updateUserLevels.mutate()
    }
  })

  // 레벨 업데이트
  const updateUserLevels = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Authentication required')
      
      const { error } = await supabaseClient.rpc('update_user_levels', {
        p_user_id: user.id
      })
      
      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stats-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-game-data-v2', user?.id] })
    }
  })

  // 활동 점수 수동 재계산 (관리자 기능)
  const recalculateScore = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabaseClient.rpc('calculate_activity_score', {
        p_user_id: userId
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stats-v2'] })
      queryClient.invalidateQueries({ queryKey: ['user-game-data-v2'] })
    }
  })

  // 편의 함수들
  const recordContentCreated = useCallback((contentType: string, contentId: string, points: number = 10) => {
    return recordActivity.mutate({
      action_type: 'content_created',
      target_type: 'content',
      target_id: contentId,
      points,
      metadata: { content_type: contentType }
    })
  }, [recordActivity])

  const recordCommentCreated = useCallback((contentId: string, commentId: string) => {
    return recordActivity.mutate({
      action_type: 'comment_created',
      target_type: 'comment',
      target_id: commentId,
      points: 3,
      metadata: { content_id: contentId }
    })
  }, [recordActivity])

  const recordLikeGiven = useCallback((targetType: 'content' | 'comment', targetId: string) => {
    return recordActivity.mutate({
      action_type: 'like_given',
      target_type: targetType,
      target_id: targetId,
      points: 1
    })
  }, [recordActivity])

  const recordLikeReceived = useCallback((targetType: 'content' | 'comment', targetId: string) => {
    return recordActivity.mutate({
      action_type: 'like_received',
      target_type: targetType,
      target_id: targetId,
      points: 2
    })
  }, [recordActivity])

  const recordActivityJoined = useCallback((activityId: string) => {
    return recordActivity.mutate({
      action_type: 'activity_joined',
      target_type: 'activity',
      target_id: activityId,
      points: 5
    })
  }, [recordActivity])

  const recordActivityAttended = useCallback ((activityId: string) => {
    return recordActivity.mutate({
      action_type: 'activity_attended',
      target_type: 'activity',
      target_id: activityId,
      points: 10
    })
  }, [recordActivity])

  // GlobalRealtimeManager가 users_v2 실시간 업데이트를 처리함
  // 개별 Hook에서 직접 구독하지 않음 (중복 방지)
  // GlobalRealtimeManager의 handleUsersChange가 관련 쿼리를 자동 무효화함

  // 레벨 진행률 계산 (activity_level 기준)
  const getLevelProgress = useCallback((currentScore: number, activityLevel: string) => {
    const levelThresholds = {
      beginner: { min: 0, max: 99 },
      active: { min: 100, max: 299 },
      enthusiast: { min: 300, max: 499 },
      leader: { min: 500, max: Infinity }
    }
    
    const currentLevel = levelThresholds[activityLevel as keyof typeof levelThresholds]
    if (!currentLevel) return { progress: 100, nextLevelPoints: 0 }
    
    if (currentLevel.max === Infinity) {
      return { progress: 100, nextLevelPoints: 0 }
    }
    
    const progressInLevel = currentScore - currentLevel.min
    const levelRange = currentLevel.max - currentLevel.min + 1
    const progress = Math.min((progressInLevel / levelRange) * 100, 100)
    const nextLevelPoints = currentLevel.max + 1 - currentScore
    
    return { progress, nextLevelPoints }
  }, [])

  return {
    // 데이터
    userStats,
    userGameData,
    recentActivities,
    
    // 로딩 상태
    isLoading: isStatsLoading || isGameDataLoading || isActivitiesLoading,
    isStatsLoading,
    isGameDataLoading,
    isActivitiesLoading,
    
    // 에러 상태
    error: null, // stats error는 useAchievements에서 관리됨
    
    // 권한
    isOwnProfile,
    canRecord: isOwnProfile && !!user,
    
    // 액션
    recordActivity: recordActivity.mutate,
    recordContentCreated,
    recordCommentCreated,
    recordLikeGiven,
    recordLikeReceived,
    recordActivityJoined,
    recordActivityAttended,
    
    // 관리 액션
    updateUserLevels: updateUserLevels.mutate,
    recalculateScore: recalculateScore.mutate,
    refreshStats: refetchStats,
    
    // 상태
    isRecording: recordActivity.isPending,
    isUpdatingLevels: updateUserLevels.isPending,
    isRecalculating: recalculateScore.isPending,
    
    // 헬퍼 함수
    getLevelProgress,
    
    // 계산된 값들
    currentLevel: userGameData?.skill_level || 'beginner',
    currentActivityLevel: userGameData?.activity_level || 'beginner',
    currentScore: userGameData?.activity_score || 0,
    levelProgress: userGameData ? getLevelProgress(userGameData.activity_score, userGameData.activity_level) : null,
    
    // 통계 요약
    totalAchievements: 0,
    totalAchievementPoints: 0,
    
    // 사용자 활동 통계 (안전한 접근)
    postsCount: (userStats && typeof userStats === 'object' && 'posts_count' in userStats ? userStats.posts_count as number : 0) || 0,
    commentsCount: (userStats && typeof userStats === 'object' && 'comments_count' in userStats ? userStats.comments_count as number : 0) || 0,
    totalLikesReceived: (userStats && typeof userStats === 'object' && 'total_likes_received' in userStats ? userStats.total_likes_received as number : 0) || 0,
    activitiesJoined: (userStats && typeof userStats === 'object' && 'activities_joined' in userStats ? userStats.activities_joined as number : 0) || 0,
    activitiesAttended: (userStats && typeof userStats === 'object' && 'activities_attended' in userStats ? userStats.activities_attended as number : 0) || 0,
  }
}

/**
 * 간단한 사용자 레벨 정보만 조회하는 Hook
 */
export function useUserLevel(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  // 사용자 프로필에서 스킬 레벨, 활동 레벨, 활동 점수를 직접 조회
  const { data: userProfile } = useQuery({
    queryKey: ['user-level-info', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID required')
      
      const { data, error } = await supabaseClient
        .from('users_v2')
        .select('skill_level, activity_level, activity_score')
        .eq('id', targetUserId)
        .is('deleted_at', null)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })

  const activityScore = userProfile?.activity_score || 0
  const skillLevel = userProfile?.skill_level || 'beginner'
  const activityLevel = userProfile?.activity_level || 'beginner' // DB에서 직접 가져옴

  return {
    skillLevel, // 사용자가 직접 설정한 값
    activityLevel, // DB에 저장된 값 (activity_score 변경시 자동 업데이트)
    score: activityScore,
    progress: null
  }
}

/**
 * 활동 기록용 Hook (편의 Hook)
 */
export function useActivityRecorder() {
  const {
    recordContentCreated,
    recordCommentCreated,
    recordLikeGiven,
    recordLikeReceived,
    recordActivityJoined,
    recordActivityAttended,
    isRecording,
    canRecord
  } = useGamificationV2()
  
  return {
    recordContentCreated,
    recordCommentCreated,
    recordLikeGiven,
    recordLikeReceived,
    recordActivityJoined,
    recordActivityAttended,
    isRecording,
    canRecord
  }
}