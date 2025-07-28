/**
 * KEPCO AI Community - Core Type System
 * 
 * 목적: 데이터베이스 스키마와 API 인터페이스의 완전한 일치화
 * 원칙: 
 * 1. 모든 타입은 실제 데이터베이스 스키마와 정확히 일치
 * 2. Null safety는 기본 원칙 
 * 3. Enum은 타입 안전하게 처리
 * 4. 부분 타입(Partial)은 명시적으로 정의
 */

import { Database } from './database.types'

// =============================================================================
// 기본 데이터베이스 타입 (완전히 일치)
// =============================================================================

// Modern unified content system
export type Content = Database['public']['Tables']['content']['Row']
export type ContentInsert = Database['public']['Tables']['content']['Insert']
export type ContentUpdate = Database['public']['Tables']['content']['Update']

export type Comment = Database['public']['Tables']['comments']['Row']
export type CommentInsert = Database['public']['Tables']['comments']['Insert']
export type CommentUpdate = Database['public']['Tables']['comments']['Update']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Activity = Database['public']['Tables']['activities']['Row']
export type ActivityInsert = Database['public']['Tables']['activities']['Insert']
export type ActivityUpdate = Database['public']['Tables']['activities']['Update']

export type Interaction = Database['public']['Tables']['interactions']['Row']
export type InteractionInsert = Database['public']['Tables']['interactions']['Insert']
export type InteractionUpdate = Database['public']['Tables']['interactions']['Update']

export type Media = Database['public']['Tables']['media']['Row']
export type MediaInsert = Database['public']['Tables']['media']['Insert']
export type MediaUpdate = Database['public']['Tables']['media']['Update']

// Legacy aliases for backward compatibility
export type Case = Content
export type CaseInsert = ContentInsert
export type CaseUpdate = ContentUpdate

export type CommunityPost = Content
export type CommunityPostInsert = ContentInsert
export type CommunityPostUpdate = ContentUpdate

export type Resource = Content
export type ResourceInsert = ContentInsert
export type ResourceUpdate = ContentUpdate

export type Announcement = Content
export type AnnouncementInsert = ContentInsert
export type AnnouncementUpdate = ContentUpdate

export type Report = Interaction
export type ReportInsert = InteractionInsert
export type ReportUpdate = InteractionUpdate

// Profile is part of User now
export type Profile = User
export type ProfileInsert = UserInsert
export type ProfileUpdate = UserUpdate

// =============================================================================
// Enum 타입 (타입 안전)
// =============================================================================

export type ContentType = Database['public']['Enums']['content_type']
export type ContentStatus = Database['public']['Enums']['content_status']
export type UserRole = Database['public']['Enums']['user_role']
export type ActivityStatus = Database['public']['Enums']['activity_status']
export type InteractionType = Database['public']['Enums']['interaction_type']

// Legacy enum aliases
export type PostCategory = ContentType
export type SkillLevel = string // No longer an enum
export type ActivityCategory = string // Stored in content.category
export type AnnouncementPriority = string // Stored in content.metadata
export type AnnouncementCategory = string // Stored in content.category

// 필터용 Union 타입 (타입 안전)
export type PostCategoryFilter = PostCategory | 'all'
export type ResourceTypeFilter = 'guide' | 'presentation' | 'video' | 'document' | 'spreadsheet' | 'template' | 'all'
export type ResourceCategoryFilter = 'tutorial' | 'workshop' | 'template' | 'reference' | 'guideline' | 'all'
export type ActivityStatusFilter = 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'all'
export type ActivityCategoryFilter = ActivityCategory | 'all'
export type AnnouncementCategoryFilter = AnnouncementCategory | 'all'
export type AnnouncementPriorityFilter = 'high' | 'medium' | 'low' | 'all'
export type CommunityTypeFilter = 'tips' | 'review' | 'help' | 'discussion' | 'question' | 'chat' | 'all'

// =============================================================================
// 부분 프로필 타입 (실제 API에서 조회하는 필드만)
// =============================================================================

export interface PartialProfile {
  id: string
  name: string
  avatar_url: string | null
  role: UserRole
  department: string | null
}

// =============================================================================
// 조인된 타입 (실제 API 응답과 정확히 일치)
// =============================================================================

// Modern view types
export type ContentWithAuthor = Database['public']['Views']['content_with_author']['Row']
export type CommentWithAuthor = Database['public']['Views']['comments_with_author']['Row']
export type ActivityWithDetails = Database['public']['Views']['activities_with_details']['Row']

// Legacy aliases for backward compatibility
export type CaseWithAuthor = ContentWithAuthor
export type CommunityPostWithAuthor = ContentWithAuthor
export type ResourceWithAuthor = ContentWithAuthor
export type AnnouncementWithAuthor = ContentWithAuthor

export interface ActivityWithInstructor extends Activity {
  profiles?: PartialProfile | null
}

// =============================================================================
// API 필터 타입 (타입 안전)
// =============================================================================

export interface CaseFilters {
  category?: PostCategoryFilter
  search?: string
  limit?: number
}

export interface CommunityFilters {
  category?: CommunityTypeFilter
  search?: string
  limit?: number
}

export interface ResourceFilters {
  category?: ResourceCategoryFilter
  type?: ResourceTypeFilter
  search?: string
  limit?: number
}

export interface ActivityFilters {
  category?: ActivityCategoryFilter
  status?: ActivityStatusFilter
  search?: string
  limit?: number
}

export interface AnnouncementFilters {
  category?: AnnouncementCategoryFilter
  priority?: AnnouncementPriorityFilter
  search?: string
  limit?: number
}

// =============================================================================
// API 응답 타입 (일관성)
// =============================================================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number
  page?: number
  limit?: number
}

// =============================================================================
// 검색 결과 타입
// =============================================================================

export interface SearchResult {
  community: CommunityPostWithAuthor[]
  cases: CaseWithAuthor[]
  resources: ResourceWithAuthor[]
  announcements: AnnouncementWithAuthor[]
  total: number
}

// =============================================================================
// 통계 타입
// =============================================================================

export interface ReportsStats {
  statusCounts: Record<string, number>
  typeCounts: Record<string, number>
  totalReports: number
}

// =============================================================================
// 타입 가드 (런타임 안전성)
// =============================================================================

export function isValidPostCategory(value: string): value is PostCategory {
  return ['productivity', 'creativity', 'development', 'analysis', 'other'].includes(value)
}

export function isValidResourceType(value: string): value is ResourceTypeFilter {
  return ['guide', 'presentation', 'video', 'document', 'spreadsheet', 'template', 'all'].includes(value)
}

export function isValidActivityStatus(value: string): value is ActivityStatusFilter {
  return ['upcoming', 'ongoing', 'completed', 'cancelled', 'all'].includes(value)
}

export function isValidActivityCategory(value: string): value is ActivityCategory {
  return ['workshop', 'seminar', 'study', 'discussion', 'meeting'].includes(value)
}

export function isValidAnnouncementCategory(value: string): value is AnnouncementCategory {
  return ['notice', 'event', 'meeting', 'announcement'].includes(value)
}

export function isValidAnnouncementPriority(value: string): value is AnnouncementPriorityFilter {
  return ['high', 'medium', 'low', 'all'].includes(value)
}

// =============================================================================
// 유틸리티 타입
// =============================================================================

export type NonNullable<T> = T extends null | undefined ? never : T
export type OptionalToNullable<T> = {
  [K in keyof T]: T[K] extends undefined ? T[K] | null : T[K]
}

// =============================================================================
// 에러 타입
// =============================================================================

export interface TypedError {
  code: string
  message: string
  field?: string
  details?: Record<string, any>
}