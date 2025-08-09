/**
 * Type Definitions Index
 * 
 * 모든 타입 정의를 한 곳에서 export
 */

// Database Types (자동 생성)
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums
} from '@/lib/database.types'

import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate
} from '@/lib/database.types'

// Metadata Types
export type {
  UserMetadata,
  ContentMetadata,
  ActivityMetadata,
  MessageMetadata,
  ReportMetadata,
  CommentMetadata,
  NotificationMetadata,
  StatsMetadata
} from './metadata'

export {
  isUserMetadata,
  isContentMetadata,
  isActivityMetadata,
  createDefaultUserMetadata,
  createDefaultContentMetadata,
  mergeMetadata,
  validateMetadata
} from './metadata'

// Event Types
export type {
  ReportDialogEvent,
  ReportDialogEventDetail,
  ModalEvent,
  ModalEventDetail,
  NotificationEvent,
  NotificationEventDetail,
  DataUpdateEvent,
  DataUpdateEventDetail,
  NavigationEvent,
  NavigationEventDetail,
  FileUploadEvent,
  FileUploadEventDetail,
  SearchEvent,
  SearchEventDetail,
  PermissionRequestEvent,
  PermissionRequestEventDetail,
  ClipboardPasteEvent,
  ClipboardPasteEventDetail,
  DragDropEvent,
  DragDropEventDetail,
  ShortcutEvent,
  ShortcutEventDetail,
  EventListenerMap
} from './events'

export {
  dispatchCustomEvent,
  addCustomEventListener,
  useCustomEventListener,
  isReportDialogEvent,
  isModalEvent,
  isNotificationEvent,
  isDataUpdateEvent,
  isNavigationEvent,
  isFileUploadEvent,
  isSearchEvent,
  isPermissionRequestEvent
} from './events'

// Mutation Types
export type {
  MutationContext,
  ListMutationContext,
  PaginatedMutationContext,
  CommentMutationContext,
  MessageMutationContext,
  ToggleMutationContext,
  UploadMutationContext,
  ProfileMutationContext,
  RoleMutationContext,
  BatchMutationContext,
  MutationError,
  MutationOptions,
  OptimisticUpdate,
  RetryStrategy,
  MutationStatus,
  MutationState
} from './mutations'

export {
  generateTempId,
  generateOptimisticTimestamp,
  hasPreviousData,
  safeRollback,
  calculateBatchProgress,
  calculateRetryDelay
} from './mutations'

/**
 * 공통 타입 별칭
 */

// 사용자 관련
export type User = Tables<'users_v2'>
export type UserInsert = TablesInsert<'users_v2'>
export type UserUpdate = TablesUpdate<'users_v2'>

// 콘텐츠 관련
export type Content = Tables<'content_v2'>
export type ContentInsert = TablesInsert<'content_v2'>
export type ContentUpdate = TablesUpdate<'content_v2'>

// 댓글 관련
export type Comment = Tables<'comments_v2'>
export type CommentInsert = TablesInsert<'comments_v2'>
export type CommentUpdate = TablesUpdate<'comments_v2'>

// 메시지 관련
export type Message = Tables<'messages_v2'>
export type MessageInsert = TablesInsert<'messages_v2'>
export type MessageUpdate = TablesUpdate<'messages_v2'>

// 활동 관련
export type Activity = Tables<'activities_v2'>
export type ActivityInsert = TablesInsert<'activities_v2'>
export type ActivityUpdate = TablesUpdate<'activities_v2'>

// 신고 관련 - V2에서는 interactions_v2 테이블을 사용
// export type Report = Tables<'interactions_v2'>
// export type ReportInsert = TablesInsert<'interactions_v2'>
// export type ReportUpdate = TablesUpdate<'interactions_v2'>

// 역할 타입 - V2에서는 수동 정의
export type UserRole = 'admin' | 'leader' | 'vice-leader' | 'member' | 'pending' | 'guest'

// 콘텐츠 타입
export type ContentType = 'post' | 'resource' | 'announcement' | 'case'

// 콘텐츠 상태
export type ContentStatus = 'draft' | 'published' | 'archived'

/**
 * JOIN된 데이터 타입
 */

// 작성자 정보가 포함된 콘텐츠
export interface ContentWithAuthor extends Content {
  author: Pick<User, 'id' | 'name' | 'avatar_url'>
}

// 작성자 정보가 포함된 댓글
export interface CommentWithAuthor extends Comment {
  author: Pick<User, 'id' | 'name' | 'avatar_url'>
  likes_count?: number
  is_liked?: boolean
}

// 발신자 정보가 포함된 메시지
export interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'name' | 'avatar_url'>
}

// 통계가 포함된 사용자
export interface UserWithStats extends User {
  posts_count?: number
  comments_count?: number
  likes_received?: number
  // activity_score는 User에서 이미 정의됨
}

// 참가자 정보가 포함된 활동
export interface ActivityWithParticipants extends Activity {
  participants: User[]
  participant_count: number
  is_joined?: boolean
}

/**
 * API 응답 타입
 */

// 페이지네이션 응답
export interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasMore: boolean
  nextCursor?: string | null
}

// 성공 응답
export interface SuccessResponse<T = any> {
  success: true
  data: T
  message?: string
}

// 에러 응답
export interface ErrorResponse {
  success: false
  error: {
    message: string
    code?: string
    details?: any
  }
}

// API 응답 (성공 또는 에러)
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

/**
 * 유틸리티 타입
 */

// Nullable 타입
export type Nullable<T> = T | null

// Optional 타입
export type Optional<T> = T | undefined

// Maybe 타입 (null 또는 undefined)
export type Maybe<T> = T | null | undefined

// DeepPartial 타입
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// RequireAtLeastOne 타입
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

// RequireOnlyOne 타입
export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]