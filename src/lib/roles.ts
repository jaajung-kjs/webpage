import React from 'react'
import {
  Crown,
  Award,
  Shield,
  User,
  UserCheck,
  Clock,
  Users
} from 'lucide-react'

/**
 * 역할 설정 인터페이스
 */
interface RoleConfig {
  label: string
  color: string
  icon: React.ElementType
  description?: string
}

/**
 * 역할별 설정
 */
export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  leader: {
    label: '동아리장',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: Crown,
    description: '동아리 전체를 이끄는 리더'
  },
  'vice-leader': {
    label: '부동아리장',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    icon: Award,
    description: '동아리장을 보좌하는 부리더'
  },
  admin: {
    label: '운영진',
    color: 'bg-kepco-blue-500/10 text-kepco-blue-700 dark:bg-kepco-blue-500/20 dark:text-kepco-blue-300',
    icon: Shield,
    description: '동아리 운영을 담당하는 운영진'
  },
  member: {
    label: '일반회원',
    color: 'bg-kepco-gray-100 text-kepco-gray-700 dark:bg-kepco-gray-900 dark:text-kepco-gray-300',
    icon: User,
    description: '동아리 정회원'
  },
  guest: {
    label: '게스트',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400',
    icon: UserCheck,
    description: '가입 승인 대기 중인 게스트'
  },
  pending: {
    label: '대기중',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    icon: Clock,
    description: '가입 신청 검토 중'
  }
} as const

/**
 * 역할 타입
 */
export type RoleType = keyof typeof ROLE_CONFIGS

/**
 * 역할 라벨 객체 반환
 */
export function getRoleLabels(): Record<string, string> {
  const labels: Record<string, string> = { all: '전체' }
  
  Object.entries(ROLE_CONFIGS).forEach(([key, config]) => {
    labels[key] = config.label
  })
  
  return labels
}

/**
 * 역할 색상 객체 반환
 */
export function getRoleColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  
  Object.entries(ROLE_CONFIGS).forEach(([key, config]) => {
    colors[key] = config.color
  })
  
  return colors
}

/**
 * 역할 아이콘 객체 반환
 */
export function getRoleIcons(): Record<string, React.ElementType> {
  const icons: Record<string, React.ElementType> = {
    all: Users
  }
  
  Object.entries(ROLE_CONFIGS).forEach(([key, config]) => {
    icons[key] = config.icon
  })
  
  return icons
}

/**
 * 특정 역할의 설정 반환
 */
export function getRoleConfig(role: string): RoleConfig | undefined {
  return ROLE_CONFIGS[role as RoleType]
}

/**
 * 역할별 권한 레벨 (숫자가 클수록 높은 권한)
 */
export const ROLE_LEVELS: Record<string, number> = {
  admin: 100,
  leader: 90,
  'vice-leader': 80,
  member: 50,
  guest: 10,
  pending: 5
}

/**
 * 역할 권한 비교
 */
export function hasHigherRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_LEVELS[userRole] || 0
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0
  return userLevel >= requiredLevel
}

/**
 * 관리자 권한 확인
 */
export function isAdminRole(role: string): boolean {
  return ['admin', 'leader', 'vice-leader'].includes(role)
}