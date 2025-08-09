/**
 * 타입 가드 유틸리티
 */

import type { 
  Tables,
  Enums
} from '@/lib/database.types'

// Type aliases
type User = Tables<'users_v2'>
type Content = Tables<'content_v2'>
type ContentType = 'post' | 'resource' | 'announcement' | 'case'
type UserRole = 'admin' | 'leader' | 'vice-leader' | 'member' | 'pending' | 'guest'

/**
 * User 프로필 타입 가드
 */
export function isUserProfile(profile: any): profile is User {
  return profile !== null &&
    typeof profile === 'object' &&
    typeof profile.id === 'string' &&
    typeof profile.email === 'string' &&
    typeof profile.created_at === 'string'
}

/**
 * Content 타입 가드
 */
export function isContent(content: any): content is Content {
  return content !== null &&
    typeof content === 'object' &&
    typeof content.id === 'string' &&
    typeof content.type === 'string' &&
    isValidContentType(content.type) &&
    typeof content.title === 'string' &&
    typeof content.content === 'string' &&
    typeof content.author_id === 'string'
}

/**
 * ContentType 유효성 검사
 */
export function isValidContentType(type: any): type is ContentType {
  return typeof type === 'string' &&
    ['post', 'case', 'announcement', 'resource', 'wiki'].includes(type)
}

/**
 * UserRole 유효성 검사
 */
export function isValidUserRole(role: any): role is UserRole {
  return typeof role === 'string' &&
    ['leader', 'vice-leader', 'admin', 'moderator', 'member'].includes(role)
}

/**
 * 관리자 권한 체크
 */
export function isAdminRole(role: UserRole | undefined): boolean {
  if (!role) return false
  return ['leader', 'vice-leader', 'admin', 'moderator'].includes(role)
}

/**
 * 리더십 권한 체크
 */
export function isLeadershipRole(role: UserRole | undefined): boolean {
  if (!role) return false
  return ['leader', 'vice-leader'].includes(role)
}

/**
 * null이 아닌 값 필터링
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * 빈 문자열이 아닌지 체크
 */
export function isNotEmpty(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * 유효한 이메일 체크
 */
export function isValidEmail(email: any): email is string {
  if (typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 유효한 URL 체크
 */
export function isValidUrl(url: any): url is string {
  if (typeof url !== 'string') return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 날짜 문자열 체크
 */
export function isDateString(value: any): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !isNaN(date.getTime())
}

/**
 * 배열 타입 가드
 */
export function isArray<T>(
  value: any,
  itemGuard?: (item: any) => item is T
): value is T[] {
  if (!Array.isArray(value)) return false
  if (!itemGuard) return true
  return value.every(item => itemGuard(item))
}

/**
 * 객체 타입 가드
 */
export function isObject(value: any): value is Record<string, any> {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
}

/**
 * 에러 객체 타입 가드
 */
export function isError(error: any): error is Error {
  return error instanceof Error ||
    (error !== null &&
     typeof error === 'object' &&
     typeof error.message === 'string' &&
     typeof error.name === 'string')
}