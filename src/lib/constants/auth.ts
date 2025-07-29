/**
 * Auth System Constants
 * 중앙 집중식 상수 관리로 유지보수성 향상
 */

// Storage key for auth state
export const AUTH_STORAGE_KEY = 'sb-auth-token'

// Auth 타이밍 관련 상수
export const AUTH_CONSTANTS = {
  // 재시도 관련
  MAX_REFRESH_RETRIES: 3,
  REFRESH_BACKOFF_BASE_MS: 1000,
  
  // 디바운싱 관련
  AUTH_UPDATE_DEBOUNCE_MS: 300,
  
  // 루프 감지 관련
  LOOP_DETECTION_WINDOW_MS: 5000, // 5초
  MAX_AUTH_UPDATES_PER_WINDOW: 10,
  
  // JWT 관련
  JWT_EXPIRY_BUFFER: 300, // 5분 (초 단위)
  
  // 캐시 관련
  DEFAULT_CACHE_DURATION: 300000, // 5분 (밀리초)
  MAX_CACHE_DURATION: 300000,
  
  // 개발 환경 설정
  ENABLE_AUTH_MONITORING: process.env.NODE_ENV === 'development',
  ENABLE_VERBOSE_LOGGING: process.env.NODE_ENV === 'development',
} as const

// 로깅 유틸리티
export const authLog = {
  info: (message: string, data?: any) => {
    if (AUTH_CONSTANTS.ENABLE_VERBOSE_LOGGING) {
      console.log(message, data || '')
    }
  },
  
  warn: (message: string, data?: any) => {
    if (AUTH_CONSTANTS.ENABLE_VERBOSE_LOGGING) {
      console.warn(message, data || '')
    }
  },
  
  error: (message: string, data?: any) => {
    // 에러는 항상 로그 (프로덕션에서도 필요)
    console.error(message, data || '')
  }
}