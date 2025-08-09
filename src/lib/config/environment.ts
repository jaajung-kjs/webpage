/**
 * 환경 설정 관리
 * 
 * 개발/프로덕션 환경 분리 및 동적 전환
 */

export type Environment = 'development' | 'production' | 'local'

export interface EnvConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey?: string
  environment: Environment
  isDevelopment: boolean
  isProduction: boolean
  isLocal: boolean
}

/**
 * 현재 환경 감지
 */
function detectEnvironment(): Environment {
  // 환경 변수로 명시적 지정
  if (process.env.NEXT_PUBLIC_ENV_MODE === 'development') return 'development'
  if (process.env.NEXT_PUBLIC_ENV_MODE === 'local') return 'local'
  
  // URL 기반 감지
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (url.includes('127.0.0.1') || url.includes('localhost')) return 'local'
  if (url.includes('supabase.co')) return 'production'
  
  // 기본값
  return process.env.NODE_ENV === 'development' ? 'development' : 'production'
}

/**
 * 환경 설정 가져오기
 */
export function getEnvConfig(): EnvConfig {
  const environment = detectEnvironment()
  
  const config: EnvConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    environment,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    isLocal: environment === 'local'
  }
  
  // 필수 환경 변수 검증
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      `Missing required Supabase environment variables for ${environment} environment`
    )
  }
  
  return config
}

/**
 * 환경별 기능 플래그
 */
export const featureFlags = {
  // 개발 환경에서만 활성화
  debugMode: () => {
    const env = getEnvConfig()
    return env.isDevelopment || env.isLocal
  },
  
  // 로컬 환경에서만 활성화
  mockData: () => {
    const env = getEnvConfig()
    return env.isLocal
  },
  
  // 프로덕션 환경에서만 활성화
  analytics: () => {
    const env = getEnvConfig()
    return env.isProduction
  },
  
  // 개발/로컬 환경에서 활성화
  devTools: () => {
    const env = getEnvConfig()
    return env.isDevelopment || env.isLocal
  }
}

/**
 * 환경별 상수
 */
export const envConstants = {
  // 세션 타임아웃 (밀리초)
  sessionTimeout: () => {
    const env = getEnvConfig()
    return env.isProduction ? 3600000 : 7200000 // 프로덕션: 1시간, 개발: 2시간
  },
  
  // 캐시 TTL (밀리초)
  cacheTTL: () => {
    const env = getEnvConfig()
    return env.isProduction ? 300000 : 60000 // 프로덕션: 5분, 개발: 1분
  },
  
  // API 재시도 횟수
  maxRetries: () => {
    const env = getEnvConfig()
    return env.isProduction ? 3 : 5
  }
}

// 개발 환경 경고
if (typeof window !== 'undefined') {
  const config = getEnvConfig()
  
  if (config.isLocal) {
    console.log(
      '%c🔧 Local Development Mode',
      'background: #ff6b6b; color: white; padding: 4px 8px; border-radius: 4px;',
      '\nUsing local Supabase instance at:', config.supabaseUrl
    )
  } else if (config.isDevelopment) {
    console.log(
      '%c🚧 Development Mode',
      'background: #feca57; color: black; padding: 4px 8px; border-radius: 4px;',
      '\nDebug features enabled'
    )
  }
}