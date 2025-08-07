/**
 * Mutation Type Definitions
 * 
 * TanStack Query Mutation에서 사용하는 타입 정의
 * 옵티미스틱 업데이트를 위한 Context 타입 포함
 */

/**
 * Mutation Context 기본 타입
 */
export interface MutationContext<T = unknown> {
  previous?: T
  optimisticData?: T
  timestamp?: number
}

/**
 * 리스트 Mutation Context
 */
export interface ListMutationContext<T = unknown> extends MutationContext<T[]> {
  addedItems?: T[]
  removedItems?: T[]
  updatedItems?: Array<{ old: T; new: T }>
}

/**
 * 페이지네이션 Mutation Context
 */
export interface PaginatedMutationContext<T = unknown> {
  pages?: Array<{
    data: T[]
    nextCursor?: string | null
    totalCount?: number
  }>
  pageParams?: unknown[]
}

/**
 * 댓글 Mutation Context
 */
export interface CommentMutationContext {
  previous?: any[]  // Comment type from database
  optimisticComment?: any
  parentId?: string
  contentId: string
}

/**
 * 메시지 Mutation Context
 */
export interface MessageMutationContext {
  previous?: any[]  // Message type from database
  optimisticMessage?: any
  conversationId: string
  recipientId: string
}

/**
 * 좋아요/북마크 토글 Context
 */
export interface ToggleMutationContext {
  previous?: {
    isActive: boolean
    count: number
  }
  entityId: string
  entityType: 'post' | 'comment' | 'resource'
}

/**
 * 파일 업로드 Mutation Context
 */
export interface UploadMutationContext {
  files: File[]
  uploadedUrls?: string[]
  progress?: number
  errors?: Error[]
}

/**
 * 프로필 업데이트 Context
 */
export interface ProfileMutationContext<T = any> {
  previous?: T
  updates: Partial<T>
  fields: (keyof T)[]
}

/**
 * 역할 변경 Context
 */
export interface RoleMutationContext {
  previous?: {
    userId: string
    oldRole: string
  }
  newRole: string
  userId: string
}

/**
 * 일괄 작업 Context
 */
export interface BatchMutationContext<T = unknown> {
  items: T[]
  successful?: T[]
  failed?: Array<{ item: T; error: Error }>
  progress?: {
    total: number
    completed: number
    failed: number
  }
}

/**
 * Mutation 에러 타입
 */
export interface MutationError {
  message: string
  code?: string
  details?: any
  timestamp: number
  retry?: {
    count: number
    maxRetries: number
    nextRetryAt?: number
  }
}

/**
 * Mutation 옵션 타입
 */
export interface MutationOptions<TData = unknown, TError = Error, TVariables = unknown, TContext = unknown> {
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void
  onError?: (error: TError, variables: TVariables, context?: TContext) => void
  onSettled?: (data?: TData, error?: TError, variables?: TVariables, context?: TContext) => void
  retry?: boolean | number
  retryDelay?: number | ((attemptIndex: number) => number)
}

/**
 * 옵티미스틱 업데이트 헬퍼 타입
 */
export interface OptimisticUpdate<T = unknown> {
  // 임시 ID 생성
  generateTempId: () => string
  
  // 옵티미스틱 데이터 생성
  createOptimisticData: (input: Partial<T>) => T
  
  // 롤백 데이터 준비
  prepareRollback: (current: T) => T
  
  // 서버 응답으로 교체
  replaceWithServerData: (optimistic: T, server: T) => T
}

/**
 * 재시도 전략 타입
 */
export interface RetryStrategy {
  maxAttempts: number
  delay: number | ((attempt: number) => number)
  shouldRetry: (error: Error, attempt: number) => boolean
  onRetry?: (error: Error, attempt: number) => void
}

/**
 * 헬퍼 함수들
 */

/**
 * 임시 ID 생성
 */
export function generateTempId(prefix = 'temp'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 옵티미스틱 타임스탬프 생성
 */
export function generateOptimisticTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Context 타입 가드
 */
export function hasPreviousData<T>(
  context: unknown
): context is MutationContext<T> {
  return (
    context !== null &&
    context !== undefined &&
    typeof context === 'object' &&
    'previous' in context
  )
}

/**
 * 안전한 롤백 함수
 */
export function safeRollback<T>(
  context: unknown,
  fallback: T
): T {
  if (hasPreviousData<T>(context)) {
    return context.previous ?? fallback
  }
  return fallback
}

/**
 * 배치 작업 진행률 계산
 */
export function calculateBatchProgress(
  context: BatchMutationContext
): number {
  if (!context.progress) return 0
  const { total, completed } = context.progress
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

/**
 * 재시도 지연 시간 계산 (지수 백오프)
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay = 1000,
  maxDelay = 30000
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  // 지터 추가 (±25%)
  const jitter = delay * 0.25
  return delay + (Math.random() * jitter * 2 - jitter)
}

/**
 * Mutation 상태 타입
 */
export type MutationStatus = 'idle' | 'pending' | 'success' | 'error'

export interface MutationState<TData = unknown, TError = Error> {
  status: MutationStatus
  data?: TData
  error?: TError
  isIdle: boolean
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  submittedAt?: number
  failedAt?: number
  succeededAt?: number
}

// Note: Comment and Message types are defined in database.types.ts
// They should be imported directly from there when needed