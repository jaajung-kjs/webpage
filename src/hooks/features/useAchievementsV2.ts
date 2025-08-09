/**
 * useAchievementsV2 - 업적 시스템 V2 전용 Hook
 * 
 * 주요 기능:
 * - 사용자 업적 조회 및 관리
 * - 업적 진행률 추적
 * - 업적 부여 (관리자)
 * - 실시간 업적 업데이트
 * - 업적 추천 시스템
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuthV2 } from './useAuthV2'
import { useCallback, useEffect } from 'react'
import type { Tables, Json } from '@/lib/database.types'
import { 
  ACHIEVEMENTS, 
  Achievement, 
  getUserAchievements, 
  getTotalAchievementPoints,
  getAchievementsByTier,
  getUpcomingAchievements
} from '@/lib/achievements'

// 사용자 업적 타입 (확장)
export interface UserAchievementV2 extends Tables<'user_achievements_v2'> {
  achievement_data?: Achievement
}

// 업적 진행률 타입
export interface AchievementProgress {
  achievement_id: string
  achievement: Achievement
  current_progress: number
  max_progress: number
  progress_percentage: number
  is_completed: boolean
  estimated_completion?: string
}

// 업적 통계 타입
export interface AchievementStats {
  total_earned: number
  total_points: number
  completion_rate: number
  by_tier: {
    bronze: number
    silver: number
    gold: number
    platinum: number
  }
  recent_achievements: UserAchievementV2[]
  upcoming_achievements: AchievementProgress[]
}

/**
 * 업적 시스템 V2 Hook
 */
export function useAchievementsV2(userId?: string) {
  const { user } = useAuthV2()
  const queryClient = useQueryClient()
  const targetUserId = userId || (user as any)?.id
  const isOwnProfile = !userId || userId === (user as any)?.id

  // 사용자 업적 목록 조회
  const { data: userAchievements, isLoading: isAchievementsLoading, error: achievementsError } = useQuery({
    queryKey: ['user-achievements-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID required')
      
      const { data, error } = await supabaseClient
        .from('user_achievements_v2')
        .select('*')
        .eq('user_id', targetUserId)
        .order('earned_at', { ascending: false })
      
      if (error) throw error
      
      // 업적 데이터와 매핑
      return data.map(achievement => ({
        ...achievement,
        achievement_data: ACHIEVEMENTS[achievement.achievement_id]
      })) as UserAchievementV2[]
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })

  // 사용자 메타데이터에서 통계 정보 조회 (진행률 계산용)
  const { data: userMetadata, isLoading: isMetadataLoading } = useQuery({
    queryKey: ['user-metadata-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID required')
      
      const { data, error } = await supabaseClient
        .from('user_metadata_v2')
        .select('*')
        .eq('user_id', targetUserId)
      
      if (error) throw error
      
      // key-value를 객체로 변환
      const metadata: Record<string, any> = {}
      data.forEach(item => {
        metadata[item.key] = item.value
      })
      
      return metadata
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })

  // 업적 부여 (관리자만)
  const grantAchievement = useMutation({
    mutationFn: async ({ userId, achievementId, points, metadata }: {
      userId: string
      achievementId: string
      points?: number
      metadata?: Json
    }) => {
      if (!(user as any)) throw new Error('Authentication required')
      
      // 관리자 권한 체크는 RPC에서 수행
      const { data, error } = await supabaseClient.rpc('grant_achievement', {
        p_user_id: userId,
        p_achievement_id: achievementId,
        p_points: points || ACHIEVEMENTS[achievementId]?.points || 0,
        p_metadata: metadata || null
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (_, { userId }) => {
      // 업적 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['user-achievements-v2', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-stats-v2', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-game-data-v2', userId] })
    }
  })

  // 업적 자동 체크 및 부여
  const checkAndGrantAchievements = useMutation({
    mutationFn: async (userId?: string) => {
      const checkUserId = userId || (user as any)?.id
      if (!checkUserId) throw new Error('User ID required')
      
      const { data, error } = await supabaseClient.rpc('check_and_grant_achievements', {
        p_user_id: checkUserId
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (_, userId) => {
      const checkUserId = userId || (user as any)?.id
      queryClient.invalidateQueries({ queryKey: ['user-achievements-v2', checkUserId] })
      queryClient.invalidateQueries({ queryKey: ['user-stats-v2', checkUserId] })
    }
  })

  // 업적 진행률 계산
  const calculateProgress = useCallback((achievementId: string): AchievementProgress | null => {
    const achievement = ACHIEVEMENTS[achievementId]
    if (!achievement || !userMetadata) return null

    const isCompleted = userAchievements?.some(ua => ua.achievement_id === achievementId) || false
    if (isCompleted) {
      return {
        achievement_id: achievementId,
        achievement,
        current_progress: 100,
        max_progress: 100,
        progress_percentage: 100,
        is_completed: true
      }
    }

    let currentProgress = 0
    let maxProgress = 100

    // 업적별 진행률 계산 로직
    switch (achievementId) {
      case 'first_post':
        currentProgress = userMetadata.posts_count || 0
        maxProgress = 1
        break
      case 'post_10':
        currentProgress = userMetadata.posts_count || 0
        maxProgress = 10
        break
      case 'post_50':
        currentProgress = userMetadata.posts_count || 0
        maxProgress = 50
        break
      case 'post_100':
        currentProgress = userMetadata.posts_count || 0
        maxProgress = 100
        break
      case 'commenter_20':
        currentProgress = userMetadata.comments_count || 0
        maxProgress = 20
        break
      case 'commenter_100':
        currentProgress = userMetadata.comments_count || 0
        maxProgress = 100
        break
      case 'popular_10':
        currentProgress = userMetadata.total_likes_received || 0
        maxProgress = 10
        break
      case 'popular_50':
        currentProgress = userMetadata.total_likes_received || 0
        maxProgress = 50
        break
      case 'popular_200':
        currentProgress = userMetadata.total_likes_received || 0
        maxProgress = 200
        break
      case 'activity_starter':
        currentProgress = userMetadata.activities_joined || 0
        maxProgress = 5
        break
      case 'activity_master':
        currentProgress = userMetadata.activities_joined || 0
        maxProgress = 20
        break
      case 'activity_legend':
        currentProgress = userMetadata.activities_joined || 0
        maxProgress = 50
        break
      default:
        // 기타 업적들은 메타데이터 기반으로 처리
        return null
    }

    const progress_percentage = Math.min((currentProgress / maxProgress) * 100, 100)

    return {
      achievement_id: achievementId,
      achievement,
      current_progress: currentProgress,
      max_progress: maxProgress,
      progress_percentage,
      is_completed: false
    }
  }, [userMetadata, userAchievements])

  // 모든 업적의 진행률 계산
  const allProgress = Object.keys(ACHIEVEMENTS).map(achievementId => 
    calculateProgress(achievementId)
  ).filter(Boolean) as AchievementProgress[]

  // 업적 통계 계산
  const achievementStats: AchievementStats | null = userAchievements && userMetadata ? {
    total_earned: userAchievements.length,
    total_points: getTotalAchievementPoints(userAchievements.map(ua => ua.achievement_id)),
    completion_rate: (userAchievements.length / Object.keys(ACHIEVEMENTS).length) * 100,
    by_tier: getAchievementsByTier(userAchievements.map(ua => ua.achievement_id)),
    recent_achievements: userAchievements.slice(0, 5),
    upcoming_achievements: allProgress
      .filter(p => !p.is_completed && p.progress_percentage >= 50)
      .sort((a, b) => b.progress_percentage - a.progress_percentage)
      .slice(0, 5)
  } : null

  // 추천 업적 (곧 달성 가능한 것들)
  const upcomingAchievements = userMetadata && userAchievements ? 
    getUpcomingAchievements(
      userMetadata,
      userAchievements.map(ua => ua.achievement_id)
    ) : []

  // 실시간 구독 (본인 업적만)
  useEffect(() => {
    if (!isOwnProfile || !(user as any)?.id) return

    const channel = supabaseClient
      .channel(`achievements:${(user as any).id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_achievements_v2',
        filter: `user_id=eq.${(user as any).id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-achievements-v2', (user as any).id] })
      })
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [(user as any)?.id, isOwnProfile, queryClient])

  // 업적 관련 헬퍼 함수들
  const getAchievementById = useCallback((achievementId: string) => {
    return userAchievements?.find(ua => ua.achievement_id === achievementId)
  }, [userAchievements])

  const hasAchievement = useCallback((achievementId: string) => {
    return userAchievements?.some(ua => ua.achievement_id === achievementId) || false
  }, [userAchievements])

  const getAchievementProgress = useCallback((achievementId: string) => {
    return calculateProgress(achievementId)
  }, [calculateProgress])

  return {
    // 데이터
    userAchievements: userAchievements || [],
    achievementStats,
    allProgress,
    upcomingAchievements,
    userMetadata,
    
    // 로딩 상태
    isLoading: isAchievementsLoading || isMetadataLoading,
    isAchievementsLoading,
    isMetadataLoading,
    
    // 에러 상태
    error: achievementsError,
    
    // 권한
    isOwnProfile,
    canManage: (user as any)?.role === 'admin' || (user as any)?.role === 'leader',
    
    // 액션
    grantAchievement: grantAchievement.mutate,
    checkAndGrantAchievements: checkAndGrantAchievements.mutate,
    
    // 상태
    isGranting: grantAchievement.isPending,
    isChecking: checkAndGrantAchievements.isPending,
    
    // 헬퍼 함수
    getAchievementById,
    hasAchievement,
    getAchievementProgress,
    calculateProgress,
    
    // 업적 데이터
    availableAchievements: ACHIEVEMENTS,
    earnedAchievements: getUserAchievements(userAchievements?.map(ua => ua.achievement_id) || []),
    
    // 통계
    totalEarned: userAchievements?.length || 0,
    totalPoints: getTotalAchievementPoints(userAchievements?.map(ua => ua.achievement_id) || []),
    completionRate: achievementStats?.completion_rate || 0,
    tierCounts: achievementStats?.by_tier || { bronze: 0, silver: 0, gold: 0, platinum: 0 },
    
    // 최근 및 추천
    recentAchievements: achievementStats?.recent_achievements || [],
    recommendedAchievements: upcomingAchievements.slice(0, 3)
  }
}

/**
 * 업적 뱃지 표시용 간단 Hook
 */
export function useAchievementBadges(userId?: string, limit?: number) {
  const { earnedAchievements, isLoading, totalEarned } = useAchievementsV2(userId)
  
  const displayAchievements = limit ? earnedAchievements.slice(0, limit) : earnedAchievements
  
  return {
    achievements: displayAchievements,
    totalCount: totalEarned,
    isLoading,
    hasMore: limit ? totalEarned > limit : false
  }
}

/**
 * 업적 진행률 추적용 Hook
 */
export function useAchievementProgress(achievementIds: string[], userId?: string) {
  const { getAchievementProgress, isLoading } = useAchievementsV2(userId)
  
  const progressList = achievementIds.map(id => getAchievementProgress(id)).filter(Boolean) as AchievementProgress[]
  
  return {
    progressList,
    isLoading,
    totalProgress: progressList.length > 0 ? 
      progressList.reduce((sum, p) => sum + p.progress_percentage, 0) / progressList.length : 0
  }
}