/**
 * Metadata Type Definitions
 * 
 * 데이터베이스의 JSONB 필드에 저장되는 metadata 타입 정의
 * 타입 안전성을 위해 as any 대신 사용
 */

/**
 * 사용자 메타데이터
 */
export interface UserMetadata {
  // 연락처 정보
  phone?: string
  location?: string
  
  // 스킬 및 경력
  skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  job_position?: string
  years_of_experience?: number
  
  // AI 관련
  ai_expertise?: string[]
  ai_tools?: string[]
  
  // 성과 및 활동
  achievements?: string[]
  certifications?: string[]
  
  // 소셜 링크
  github?: string
  linkedin?: string
  website?: string
  
  // 기타
  bio?: string
  interests?: string[]
  preferred_language?: string
}

/**
 * 콘텐츠 메타데이터 (게시글, 리소스, 공지사항 등)
 */
export interface ContentMetadata {
  // 고정 및 강조
  is_pinned?: boolean
  is_featured?: boolean
  
  // 이미지 및 첨부파일
  has_image?: boolean
  thumbnail_url?: string
  attachments?: Array<{
    name: string
    url: string
    size: number
    type: string
  }>
  
  // 리소스 관련
  downloads?: number
  file_url?: string
  file_size?: number
  file_type?: string
  
  // SEO
  meta_title?: string
  meta_description?: string
  keywords?: string[]
  
  // 통계
  read_time?: number // 예상 읽기 시간 (분)
  word_count?: number
  
  // 기타
  external_link?: string
  source?: string
  author_note?: string
}

/**
 * 활동 메타데이터
 */
export interface ActivityMetadata {
  // 활동 정보
  location?: string
  max_participants?: number
  current_participants?: number
  
  // 일정
  start_date?: string
  end_date?: string
  duration?: string
  
  // 온라인/오프라인
  is_online?: boolean
  meeting_link?: string
  
  // 요구사항
  requirements?: string[]
  prerequisites?: string[]
  
  // 기타
  materials?: string[]
  agenda?: string[]
  organizer?: string
}

/**
 * 메시지 메타데이터
 */
export interface MessageMetadata {
  // 메시지 타입
  message_type?: 'text' | 'image' | 'file' | 'system'
  
  // 첨부파일
  attachments?: Array<{
    name: string
    url: string
    size: number
    type: string
  }>
  
  // 읽음 확인
  read_receipts?: Array<{
    user_id: string
    read_at: string
  }>
  
  // 기타
  is_edited?: boolean
  edited_at?: string
  reply_to?: string // 답장 대상 메시지 ID
}

/**
 * 신고 메타데이터
 */
export interface ReportMetadata {
  // 신고 상세
  severity?: 'low' | 'medium' | 'high' | 'critical'
  category?: string
  
  // 처리 정보
  reviewed_by?: string
  reviewed_at?: string
  action_taken?: string
  
  // 증거
  screenshots?: string[]
  evidence?: string[]
  
  // 기타
  notes?: string
  resolution?: string
}

/**
 * 댓글 메타데이터
 */
export interface CommentMetadata {
  // 댓글 타입
  comment_type?: 'comment' | 'reply' | 'question' | 'answer'
  
  // 편집 이력
  is_edited?: boolean
  edited_at?: string
  edit_history?: Array<{
    content: string
    edited_at: string
  }>
  
  // 기타
  is_solution?: boolean // Q&A에서 해결책으로 채택됨
  mentions?: string[] // 멘션된 사용자 ID
}

/**
 * 알림 메타데이터
 */
export interface NotificationMetadata {
  // 알림 타입
  notification_type?: 'comment' | 'like' | 'mention' | 'follow' | 'system'
  
  // 관련 엔티티
  related_entity?: {
    type: 'post' | 'comment' | 'user' | 'activity'
    id: string
    title?: string
  }
  
  // 액션
  action_url?: string
  action_text?: string
  
  // 기타
  priority?: 'low' | 'normal' | 'high'
  expires_at?: string
}

/**
 * 통계 메타데이터
 */
export interface StatsMetadata {
  // 기간별 통계
  daily_stats?: Record<string, number>
  weekly_stats?: Record<string, number>
  monthly_stats?: Record<string, number>
  
  // 카테고리별 통계
  by_category?: Record<string, number>
  by_type?: Record<string, number>
  
  // 트렌드
  trend?: 'up' | 'down' | 'stable'
  change_percentage?: number
  
  // 기타
  last_calculated?: string
  calculation_method?: string
}

/**
 * 메타데이터 타입 가드 함수들
 */
export function isUserMetadata(metadata: any): metadata is UserMetadata {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
}

export function isContentMetadata(metadata: any): metadata is ContentMetadata {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
}

export function isActivityMetadata(metadata: any): metadata is ActivityMetadata {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
}

// 메타데이터 기본값 생성 함수
export function createDefaultUserMetadata(): UserMetadata {
  return {
    skill_level: 'beginner',
    ai_expertise: [],
    achievements: [],
    interests: []
  }
}

export function createDefaultContentMetadata(): ContentMetadata {
  return {
    is_pinned: false,
    is_featured: false,
    has_image: false,
    attachments: [],
    downloads: 0,
    keywords: []
  }
}

// 메타데이터 병합 함수 (기존 데이터와 새 데이터 병합)
export function mergeMetadata<T extends Record<string, any>>(
  existing: T | null | undefined,
  updates: Partial<T>
): T {
  return {
    ...(existing || {} as T),
    ...updates
  } as T
}

// 메타데이터 검증 함수
export function validateMetadata<T extends Record<string, any>>(
  metadata: any,
  requiredFields: (keyof T)[] = []
): metadata is T {
  if (!metadata || typeof metadata !== 'object') {
    return false
  }
  
  return requiredFields.every(field => field in metadata)
}