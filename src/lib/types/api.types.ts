/**
 * API 응답 및 에러 타입 정의
 */

// 성공/실패를 명확히 구분하는 Result 타입
export type ApiResult<T> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string }

// 에러 타입 분류
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  PERMISSION = 'PERMISSION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

// 애플리케이션 에러 클래스
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }

  // 사용자 친화적 메시지 반환
  getUserMessage(): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: '네트워크 연결을 확인해주세요.',
      [ErrorType.AUTH]: '인증이 만료되었습니다. 다시 로그인해주세요.',
      [ErrorType.PERMISSION]: '이 작업을 수행할 권한이 없습니다.',
      [ErrorType.VALIDATION]: '입력한 정보를 다시 확인해주세요.',
      [ErrorType.NOT_FOUND]: '요청한 내용을 찾을 수 없습니다.',
      [ErrorType.SERVER]: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      [ErrorType.RATE_LIMIT]: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
      [ErrorType.UNKNOWN]: '알 수 없는 오류가 발생했습니다.'
    }
    return messages[this.type] || this.message
  }
}

// 에러 분류 유틸리티
export function classifyError(error: unknown): AppError {
  // 이미 분류된 에러인 경우
  if (error instanceof AppError) return error
  
  // 일반 Error 객체인 경우
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Supabase 인증 에러
    if (message.includes('jwt') || message.includes('token') || message.includes('refresh')) {
      return new AppError(ErrorType.AUTH, error.message, 'AUTH_ERROR')
    }
    
    // 네트워크 에러
    if (message.includes('network') || message.includes('fetch')) {
      return new AppError(ErrorType.NETWORK, error.message, 'NETWORK_ERROR')
    }
    
    // 권한 에러
    if (message.includes('permission') || message.includes('denied') || message.includes('unauthorized')) {
      return new AppError(ErrorType.PERMISSION, error.message, 'PERMISSION_ERROR')
    }
    
    // 유효성 검사 에러
    if (message.includes('invalid') || message.includes('validation')) {
      return new AppError(ErrorType.VALIDATION, error.message, 'VALIDATION_ERROR')
    }
    
    // 404 에러
    if (message.includes('not found')) {
      return new AppError(ErrorType.NOT_FOUND, error.message, 'NOT_FOUND')
    }
    
    // Rate limit 에러
    if (message.includes('rate limit') || message.includes('too many')) {
      return new AppError(ErrorType.RATE_LIMIT, error.message, 'RATE_LIMIT')
    }
    
    // 서버 에러
    if (message.includes('500') || message.includes('server')) {
      return new AppError(ErrorType.SERVER, error.message, 'SERVER_ERROR')
    }
  }
  
  // 알 수 없는 에러
  return new AppError(
    ErrorType.UNKNOWN, 
    '알 수 없는 오류가 발생했습니다.',
    'UNKNOWN_ERROR',
    error
  )
}

// 타입 가드
export function isApiSuccess<T>(result: ApiResult<T>): result is { success: true; data: T } {
  return result.success === true
}

export function isApiError(result: ApiResult<any>): result is { success: false; error: string } {
  return result.success === false
}