/**
 * useLeaderboardV2 - 리더보드 시스템 V2 전용 Hook
 * 
 * 주요 기능:
 * - 활동 점수 기반 리더보드
 * - 기간별 랭킹 (주간/월간/전체)
 * - 카테고리별 리더보드 (콘텐츠, 댓글, 활동 등)
 * - 사용자 랭킹 조회
 * - 실시간 랭킹 업데이트
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { useCallback, useEffect } from 'react'
import type { Tables } from '@/lib/database.types'

// 리더보드 기간 타입
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time'

// 리더보드 카테고리 타입
export type LeaderboardCategory = 'total_score' | 'content_created' | 'comments' | 'likes_received' | 'activities'

// 리더보드 항목 타입
export interface LeaderboardEntry {
  rank: number
  user_id: string
  user_name: string
  user_avatar?: string
  user_department?: string
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  activity_level: 'beginner' | 'active' | 'enthusiast' | 'leader'
  score: number
  total_activity_score: number
  category_stats?: {
    posts_count?: number
    comments_count?: number
    likes_received?: number
    activities_attended?: number
  }
  change_from_last_period?: number // 순위 변동
  is_current_user?: boolean
}

// 리더보드 옵션
export interface LeaderboardOptions {
  period?: LeaderboardPeriod
  category?: LeaderboardCategory
  limit?: number
  includeCurrentUser?: boolean
}

// 리더보드 통계
export interface LeaderboardStats {
  total_participants: number
  average_score: number
  median_score: number
  top_score: number
  period_start: string
  period_end: string
}

/**
 * 리더보드 시스템 V2 Hook
 */
export function useLeaderboardV2(options: LeaderboardOptions = {}) {
  const {
    period = 'monthly',
    category = 'total_score',
    limit = 50,
    includeCurrentUser = true
  } = options
  
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 기간별 날짜 계산
  const getPeriodDates = useCallback((period: LeaderboardPeriod) => {
    const now = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'weekly':
        startDate.setDate(now.getDate() - 7)
        break
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarterly':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'all_time':
        startDate.setFullYear(2020) // 서비스 시작 시점
        break
    }
    
    return {
      start: startDate.toISOString(),
      end: now.toISOString()
    }
  }, [])

  // 리더보드 조회
  const { data: leaderboard, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard-v2', period, category, limit],
    queryFn: async () => {
      const { start, end } = getPeriodDates(period)
      
      // 기본 사용자 정보와 점수 조회
      let query = supabaseClient()
        .from('users_v2')
        .select(`
          id,
          name,
          avatar_url,
          department,
          skill_level,
          activity_level,
          activity_score
        `)
        .is('deleted_at', null)
        .gte('created_at', start)
        .lte('created_at', end)
      
      if (category === 'total_score') {
        query = query.order('activity_score', { ascending: false })
      }
      
      const { data: users, error: usersError } = await query.limit(limit)
      
      if (usersError) throw usersError
      if (!users?.length) return []
      
      // 각 사용자의 기간별 통계 조회
      const userIds = users.map(u => u.id)
      
      // 사용자 메타데이터 조회 (상세 통계용)
      const { data: usersWithMetadata } = await supabaseClient()
        .from('users_v2')
        .select('id, metadata')
        .in('id', userIds)
      
      
      // 메타데이터를 사용자별로 그룹화
      const userMetadata: Record<string, Record<string, any>> = {}
      usersWithMetadata?.forEach(user => {
        if (user.metadata && typeof user.metadata === 'object' && !Array.isArray(user.metadata)) {
          userMetadata[user.id] = user.metadata as Record<string, any>
        } else {
          userMetadata[user.id] = {}
        }
      })
      
      
      // 리더보드 엔트리 생성
      const leaderboardEntries: LeaderboardEntry[] = users.map((user, index) => {
        const userMeta = userMetadata[user.id] || {}
        const score = category === 'total_score' ? user.activity_score : 
                     category === 'content_created' ? (userMeta.posts_count || 0) :
                     category === 'comments' ? (userMeta.comments_count || 0) :
                     category === 'likes_received' ? (userMeta.total_likes_received || 0) :
                     category === 'activities' ? (userMeta.activities_attended || 0) : 0
        
        return {
          rank: index + 1,
          user_id: user.id,
          user_name: user.name,
          user_avatar: user.avatar_url || undefined,
          user_department: user.department || undefined,
          skill_level: user.skill_level as any,
          activity_level: user.activity_level as any,
          score,
          total_activity_score: user.activity_score,
          category_stats: {
            posts_count: userMeta.posts_count || 0,
            comments_count: userMeta.comments_count || 0,
            likes_received: userMeta.total_likes_received || 0,
            activities_attended: userMeta.activities_attended || 0
          },
          is_current_user: user.id === user?.id
        }
      })
      
      // 점수에 따라 재정렬
      return leaderboardEntries.sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })

  // 현재 사용자 랭킹 조회
  const { data: userRank } = useQuery({
    queryKey: ['user-rank-v2', user?.id, period, category],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { start, end } = getPeriodDates(period)
      
      // 현재 사용자보다 높은 점수를 가진 사용자 수 계산
      const { data: userData } = await supabaseClient()
        .from('users_v2')
        .select('metadata')
        .eq('id', user.id)
        .single()
      
      const userMetadata = (userData?.metadata && typeof userData.metadata === 'object' && !Array.isArray(userData.metadata)) 
        ? userData.metadata as Record<string, any> 
        : {}
      
      const metadataKey = category === 'content_created' ? 'posts_count' :
                          category === 'comments' ? 'comments_count' :
                          category === 'likes_received' ? 'total_likes_received' :
                          category === 'activities' ? 'activities_attended' : ''
                          
      const userValue = metadataKey ? userMetadata[metadataKey] || 0 : 0
      
      if (category === 'total_score') {
        const { data: activityScoreData } = await supabaseClient()
        .from('users_v2')
          .select('activity_score')
          .eq('id', user.id)
          .single()
        
        if (!activityScoreData) return null
        
        const { count } = await supabaseClient()
        .from('users_v2')
          .select('*', { count: 'exact', head: true })
          .gt('activity_score', activityScoreData.activity_score)
          .is('deleted_at', null)
        
        return {
          rank: (count || 0) + 1,
          score: activityScoreData.activity_score
        }
      } else {
        if (userValue === 0) return null
        
        const currentScore = userValue
        
        // 다른 사용자들의 해당 카테고리 점수와 비교
        const { data: allUsersData } = await supabaseClient()
        .from('users_v2')
          .select('metadata')
          .is('deleted_at', null)
        
        // Count users with higher scores in the same category
        const higherScores = allUsersData?.filter(user => {
          if (!user.metadata || typeof user.metadata !== 'object' || Array.isArray(user.metadata)) {
            return false
          }
          const otherUserMetadata = user.metadata as Record<string, any>
          const otherUserValue = otherUserMetadata[metadataKey] || 0
          return otherUserValue > currentScore
        }).length || 0
        
        return {
          rank: higherScores + 1,
          score: currentScore
        }
      }
    },
    enabled: !!user?.id && includeCurrentUser,
    staleTime: 5 * 60 * 1000,
  })

  // 리더보드 통계
  const { data: leaderboardStats } = useQuery({
    queryKey: ['leaderboard-stats-v2', period, category],
    queryFn: async () => {
      const { start, end } = getPeriodDates(period)
      
      const { count } = await supabaseClient()
        .from('users_v2')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', start)
      
      let avgScore = 0, maxScore = 0
      
      if (category === 'total_score') {
        const { data: scoreData } = await supabaseClient()
        .from('users_v2')
          .select('activity_score')
          .is('deleted_at', null)
          .gte('created_at', start)
          .order('activity_score', { ascending: false })
          .limit(1)
        
        maxScore = scoreData?.[0]?.activity_score || 0
        
        const { data: allScores } = await supabaseClient()
        .from('users_v2')
          .select('activity_score')
          .is('deleted_at', null)
          .gte('created_at', start)
        
        if (allScores?.length) {
          avgScore = allScores.reduce((sum, u) => sum + u.activity_score, 0) / allScores.length
        }
      }
      
      return {
        total_participants: count || 0,
        average_score: Math.round(avgScore),
        median_score: Math.round(avgScore), // 간단히 평균으로 대체
        top_score: maxScore,
        period_start: start,
        period_end: end
      } as LeaderboardStats
    },
    staleTime: 10 * 60 * 1000, // 10분
  })

  // GlobalRealtimeManager가 users_v2 실시간 업데이트를 처리함
  // 개별 Hook에서 직접 구독하지 않음 (중복 방지)
  // GlobalRealtimeManager의 handleUsersChange가 members 관련 쿼리를 자동 무효화함

  // 기간 변경 함수
  const changePeriod = useCallback((newPeriod: LeaderboardPeriod) => {
    queryClient.invalidateQueries({ 
      queryKey: ['leaderboard-v2', newPeriod, category, limit] 
    })
  }, [queryClient, category, limit])

  // 카테고리 변경 함수
  const changeCategory = useCallback((newCategory: LeaderboardCategory) => {
    queryClient.invalidateQueries({ 
      queryKey: ['leaderboard-v2', period, newCategory, limit] 
    })
  }, [queryClient, period, limit])

  return {
    // 데이터
    leaderboard: leaderboard || [],
    userRank,
    stats: leaderboardStats,
    
    // 설정
    period,
    category,
    limit,
    
    // 로딩 상태
    isLoading,
    
    // 에러 상태
    error,
    
    // 액션
    refetch,
    changePeriod,
    changeCategory,
    
    // 헬퍼 함수
    getPeriodDates,
    
    // 계산된 값들
    topScore: leaderboard?.[0]?.score || 0,
    averageScore: leaderboardStats?.average_score || 0,
    totalParticipants: leaderboardStats?.total_participants || 0,
    
    // 현재 사용자 관련
    userRankPosition: userRank?.rank,
    userScore: userRank?.score || 0,
    userEntry: leaderboard?.find(entry => entry.is_current_user),
    
    // 순위 관련 헬퍼
    isInTop10: userRank && userRank.rank <= 10,
    isInTop50: userRank && userRank.rank <= 50,
    
    // 기간별 라벨
    periodLabel: {
      weekly: '주간',
      monthly: '월간', 
      quarterly: '분기',
      yearly: '연간',
      all_time: '전체'
    }[period],
    
    // 카테고리별 라벨
    categoryLabel: {
      total_score: '종합 점수',
      content_created: '콘텐츠 작성',
      comments: '댓글 작성',
      likes_received: '좋아요 받음',
      activities: '활동 참여'
    }[category]
  }
}

/**
 * 간단한 사용자 랭킹만 조회하는 Hook
 */
export function useUserRank(userId?: string, period: LeaderboardPeriod = 'monthly') {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  const { data: rank } = useQuery({
    queryKey: ['user-simple-rank-v2', targetUserId, period],
    queryFn: async () => {
      if (!targetUserId) return null
      
      const { data: userData } = await supabaseClient()
        .from('users_v2')
        .select('activity_score')
        .eq('id', targetUserId)
        .single()
      
      if (!userData) return null
      
      const { count } = await supabaseClient()
        .from('users_v2')
        .select('*', { count: 'exact', head: true })
        .gt('activity_score', userData.activity_score)
        .is('deleted_at', null)
      
      return {
        rank: (count || 0) + 1,
        score: userData.activity_score
      }
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
  })
  
  return rank
}

/**
 * 리더보드 미니 위젯용 Hook (상위 5명만)
 */
export function useLeaderboardWidget(period: LeaderboardPeriod = 'monthly') {
  return useLeaderboardV2({ 
    period, 
    category: 'total_score', 
    limit: 5, 
    includeCurrentUser: false 
  })
}