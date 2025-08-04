import React from 'react'
import {
  CheckCircle,
  Clock,
  XCircle,
  CheckCircle2,
  Calendar,
  Activity,
  AlertCircle,
  Loader2
} from 'lucide-react'

/**
 * 상태 설정 인터페이스
 */
interface StatusConfig {
  label: string
  color: string
  icon: React.ElementType
  description?: string
}

/**
 * 상태별 설정
 */
export const STATUS_CONFIGS: Record<string, StatusConfig> = {
  // 일반 상태
  active: {
    label: '활성',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: CheckCircle,
    description: '현재 활성 상태'
  },
  pending: {
    label: '대기중',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    icon: Clock,
    description: '처리 대기 중'
  },
  inactive: {
    label: '비활성',
    color: 'bg-kepco-gray-100 text-kepco-gray-600 dark:bg-kepco-gray-900 dark:text-kepco-gray-400',
    icon: XCircle,
    description: '비활성 상태'
  },
  completed: {
    label: '완료',
    color: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
    icon: CheckCircle2,
    description: '완료됨'
  },
  cancelled: {
    label: '취소됨',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: XCircle,
    description: '취소됨'
  },
  
  // 활동 관련 상태
  upcoming: {
    label: '예정',
    color: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
    icon: Calendar,
    description: '곧 시작 예정'
  },
  ongoing: {
    label: '진행중',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: Activity,
    description: '현재 진행 중'
  },
  
  // 게시글 상태
  published: {
    label: '게시됨',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: CheckCircle,
    description: '게시됨'
  },
  draft: {
    label: '임시저장',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    icon: AlertCircle,
    description: '임시 저장된 상태'
  },
  
  // 처리 상태
  processing: {
    label: '처리중',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    icon: Loader2,
    description: '처리 진행 중'
  },
  error: {
    label: '오류',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: AlertCircle,
    description: '오류 발생'
  }
} as const

/**
 * 상태 타입
 */
export type StatusType = keyof typeof STATUS_CONFIGS

/**
 * 상태 라벨 객체 반환
 */
export function getStatusLabels(): Record<string, string> {
  const labels: Record<string, string> = {}
  
  Object.entries(STATUS_CONFIGS).forEach(([key, config]) => {
    labels[key] = config.label
  })
  
  return labels
}

/**
 * 상태 색상 객체 반환
 */
export function getStatusColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  
  Object.entries(STATUS_CONFIGS).forEach(([key, config]) => {
    colors[key] = config.color
  })
  
  return colors
}

/**
 * 상태 아이콘 객체 반환
 */
export function getStatusIcons(): Record<string, React.ElementType> {
  const icons: Record<string, React.ElementType> = {}
  
  Object.entries(STATUS_CONFIGS).forEach(([key, config]) => {
    icons[key] = config.icon
  })
  
  return icons
}

/**
 * 특정 상태의 설정 반환
 */
export function getStatusConfig(status: string): StatusConfig | undefined {
  return STATUS_CONFIGS[status as StatusType]
}

/**
 * 활동 상태 계산 (활동 점수 기반)
 */
export function calculateActivityStatus(lastActivityDate: string | null, activityScore: number): StatusType {
  if (!lastActivityDate) return 'inactive'
  
  const daysSinceLastActivity = Math.floor(
    (new Date().getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysSinceLastActivity > 30) return 'inactive'
  if (activityScore > 200) return 'active'
  return 'pending'
}

/**
 * 게시글 상태별 필터링 가능 여부
 */
export const FILTERABLE_STATUSES = ['published', 'draft', 'pending'] as const

/**
 * 회원 상태별 필터링 가능 여부
 */
export const MEMBER_STATUSES = ['active', 'inactive', 'pending'] as const