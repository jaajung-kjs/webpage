/**
 * Profile System V2 - Type Definitions
 * 
 * 새로운 통합 프로필 시스템을 위한 타입 정의
 * DB 타입을 최대한 재사용하여 유지보수성 향상
 */

import { Tables, Json } from '@/lib/database.types'

// 기본 타입 (기존 시스템과 호환)
export type UserRole = 'guest' | 'pending' | 'member' | 'vice-leader' | 'leader' | 'admin'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type ContentType = 'post' | 'case' | 'announcement' | 'resource' | 'activity'
export type ActivityType = ContentType | 'comment'

/**
 * 사용자 통계 정보
 */
export interface UserStatsV2 {
  posts_count: number
  cases_count: number
  announcements_count: number
  resources_count: number
  activities_count: number  // activity 타입 게시글 수 추가
  total_content_count: number  // 전체 콘텐츠 수 (모든 타입 합계)
  comments_count: number
  total_views: number
  total_likes_received: number
  activities_joined: number
  // 진행률 필드 제거 (업적 시스템으로 대체)
  // activity_master_progress: number
  // content_creator_progress: number
}

/**
 * 활동 참여 정보
 */
export interface ActivityEngagement {
  views: number
  likes: number
  comments: number
}

/**
 * 최근 활동 정보
 */
export interface RecentActivityV2 {
  type: ActivityType
  title: string
  date: string
  engagement: ActivityEngagement
}

/**
 * 통합 프로필 응답 타입
 * RPC 함수 profile_v2.get_user_profile_complete의 반환 타입
 * DB 타입을 재사용하여 자동 동기화
 * 업적 데이터 통합 (2025-08-07)
 */
export interface UserProfileComplete {
  profile: Tables<'users'> | null  // DB 타입 그대로 사용
  stats: UserStatsV2 | null
  recent_activities: RecentActivityV2[]
  achievements?: AchievementProgress[]  // 업적 데이터 (선택적)
}

/**
 * Hook 응답 타입 (로딩 상태 포함)
 */
export interface UseProfileV2Result {
  data: UserProfileComplete | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * 프로필 업데이트 요청 타입
 */
export interface ProfileUpdateRequest {
  name?: string
  department?: string
  bio?: string
  avatar_url?: string
  metadata?: Json
}

/**
 * 통계 요약 타입 (대시보드용)
 */
export interface ProfileSummary {
  user: {
    id: string
    name: string
    avatar_url: string | null
    role: UserRole
  }
  stats: {
    totalContent: number
    totalEngagement: number
    activityLevel: string
  }
}

/**
 * 업적 진행률 정보
 */
export interface AchievementProgress {
  achievement_id: string
  name: string
  description: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  points: number
  icon: string
  requirement_type: string
  requirement_count: number
  current_progress: number
  progress_percentage: number
  is_completed: boolean
  completed_at: string | null
}

/**
 * 프로필 목록 아이템 타입 (회원 목록용)
 */
export interface ProfileListItem {
  id: string
  name: string
  email: string
  avatar_url: string | null
  department: string | null
  role: UserRole
  activity_score: number
  last_seen_at: string | null
  metadata?: Json | null
  created_at?: string
  bio?: string | null
  stats?: {
    posts_count: number
    comments_count: number
  }
}