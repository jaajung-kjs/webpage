/**
 * useGamificationV2 - 게임화 시스템 V2 통합 관리 Hook
 * 
 * 주요 기능:
 * - 사용자 활동 점수 및 레벨 관리
 * - 업적 시스템 통합
 * - 실시간 통계 추적
 * - 활동 기록 및 자동 점수 계산
 * - Optimistic Updates 지원
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { useCallback, useEffect } from 'react'
import type { Tables, Json } from '@/lib/database.types'

// 사용자 통계 타입 (RPC 함수 get_user_stats 반환값)
export interface UserStats {
  user_id: string
  activity_score: number
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  activity_level: 'beginner' | 'active' | 'enthusiast' | 'leader'
  stats: {
    posts_count: number
    comments_count: number
    total_likes_received: number
    activities_joined: number
    activities_attended: number
  }
  achievements: {
    total_count: number
    total_points: number
    recent_achievements: Array<{
      id: string
      achievement_id: string
      earned_at: string
      points_earned: number
    }>
  }
  progress: {
    next_level_points?: number
    progress_to_next_level?: number
  }
}

// 활동 로그 타입
export interface ActivityLogData {
  action_type: 'content_created' | 'comment_created' | 'like_given' | 'like_received' | 'activity_joined' | 'activity_attended' | 'achievement_earned'
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
  achievement_notifications: boolean
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
  const { data: userStats, isLoading: isStatsLoading, error: statsError, refetch: refreshStats } = useQuery({
    queryKey: ['user-stats-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID required')
      
      const { data, error } = await supabaseClient.rpc('get_user_stats_v2', {
        p_user_id: targetUserId
      })
      
      if (error) throw error
      return data as unknown as UserStats
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
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
      
      // 업적 체크 및 자동 부여
      const achievementResult = await supabaseClient.rpc('check_and_grant_achievements', {
        p_user_id: user.id
      })
      
      return { activityLogged: true, newAchievements: achievementResult.data || [] }
    },
    onSuccess: () => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: ['user-stats-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-game-data-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-achievements-v2', user?.id] })
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
      const { data, error } = await supabaseClient.rpc('calculate_user_activity_score', {
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

  // 실시간 구독 (본인 데이터만)
  useEffect(() => {
    if (!isOwnProfile || !user?.id) return

    const channel = supabaseClient
      .channel(`gamification:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_achievements_v2',
        filter: `user_id=eq.${user.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-stats-v2', user.id] })
        queryClient.invalidateQueries({ queryKey: ['user-achievements-v2', user.id] })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users_v2',
        filter: `id=eq.${user.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-game-data-v2', user.id] })
        queryClient.invalidateQueries({ queryKey: ['user-stats-v2', user.id] })
      })
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [user?.id, isOwnProfile, queryClient])

  // 레벨 진행률 계산
  const getLevelProgress = useCallback((currentScore: number, skillLevel: string) => {
    const levelThresholds = {
      beginner: { min: 0, max: 99 },
      intermediate: { min: 100, max: 499 },
      advanced: { min: 500, max: 999 },
      expert: { min: 1000, max: Infinity }
    }
    
    const currentLevel = levelThresholds[skillLevel as keyof typeof levelThresholds]
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
    error: statsError,
    
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
    refreshStats,
    
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
    levelProgress: userGameData ? getLevelProgress(userGameData.activity_score, userGameData.skill_level) : null,
    
    // 통계 요약
    totalAchievements: userStats?.achievements?.total_count || 0,
    totalAchievementPoints: userStats?.achievements?.total_points || 0,
    recentAchievements: userStats?.achievements?.recent_achievements || [],
    
    // 사용자 활동 통계  
    postsCount: userStats?.stats?.posts_count || 0,
    commentsCount: userStats?.stats?.comments_count || 0,
    totalLikesReceived: userStats?.stats?.total_likes_received || 0,
    activitiesJoined: userStats?.stats?.activities_joined || 0,
    activitiesAttended: userStats?.stats?.activities_attended || 0,
  }
}

/**
 * 간단한 사용자 레벨 정보만 조회하는 Hook
 */
export function useUserLevel(userId?: string) {
  const { currentLevel, currentActivityLevel, currentScore, levelProgress } = useGamificationV2(userId)
  
  return {
    skillLevel: currentLevel,
    activityLevel: currentActivityLevel,
    score: currentScore,
    progress: levelProgress
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