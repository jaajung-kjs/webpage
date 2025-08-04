import React from 'react'
import { ROLE_CONFIGS, getRoleConfig } from './roles'
import { SKILL_LEVEL_CONFIGS, getSkillLevelConfig } from './skills'
import { STATUS_CONFIGS, getStatusConfig } from './status'
import { BOARD_CATEGORIES, getCategoryConfig } from './categories'
import type { BoardType } from './categories'

/**
 * Badge 설정 인터페이스
 */
export interface BadgeConfig {
  label: string
  color: string
  icon: React.ElementType
  description?: string
}

/**
 * Badge 타입
 */
export type BadgeType = 'role' | 'skill' | 'status' | 'category' | 'custom'

/**
 * Badge 속성 인터페이스
 */
export interface BadgeProps {
  type: BadgeType
  value: string
  boardType?: BoardType // category 타입일 때 필요
  className?: string
  showIcon?: boolean
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Badge 설정 가져오기
 */
export function getBadgeConfig(type: BadgeType, value: string, boardType?: BoardType): BadgeConfig | undefined {
  switch (type) {
    case 'role':
      return getRoleConfig(value)
    case 'skill':
      return getSkillLevelConfig(value)
    case 'status':
      return getStatusConfig(value)
    case 'category':
      if (!boardType) return undefined
      return getCategoryConfig(boardType, value)
    default:
      return undefined
  }
}

/**
 * 모든 역할 Badge 설정
 */
export function getAllRoleBadges(): Record<string, BadgeConfig> {
  return ROLE_CONFIGS
}

/**
 * 모든 스킬 레벨 Badge 설정
 */
export function getAllSkillBadges(): Record<string, BadgeConfig> {
  return SKILL_LEVEL_CONFIGS
}

/**
 * 모든 상태 Badge 설정
 */
export function getAllStatusBadges(): Record<string, BadgeConfig> {
  return STATUS_CONFIGS
}

/**
 * 특정 게시판의 모든 카테고리 Badge 설정
 */
export function getAllCategoryBadges(boardType: BoardType): Record<string, BadgeConfig> {
  return BOARD_CATEGORIES[boardType] || {}
}

/**
 * Badge 크기별 클래스
 */
export const BADGE_SIZES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5'
} as const

/**
 * Badge 아이콘 크기별 클래스
 */
export const BADGE_ICON_SIZES = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
} as const

/**
 * 커스텀 Badge 설정
 */
export const CUSTOM_BADGES: Record<string, BadgeConfig> = {
  new: {
    label: 'New',
    color: 'bg-gradient-to-r from-green-400 to-blue-500 text-white',
    icon: () => null // 아이콘 없음
  },
  hot: {
    label: 'Hot',
    color: 'bg-gradient-to-r from-orange-400 to-red-500 text-white',
    icon: () => null
  },
  pinned: {
    label: '고정',
    color: 'bg-primary text-primary-foreground',
    icon: () => null
  }
}

/**
 * Badge 클래스 생성 헬퍼
 */
export function getBadgeClasses(config: BadgeConfig | undefined, size: 'sm' | 'md' | 'lg' = 'md', className?: string): string {
  const baseClasses = 'inline-flex items-center gap-1 font-medium rounded-full transition-colors'
  const sizeClasses = BADGE_SIZES[size]
  const colorClasses = config?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  
  return [baseClasses, sizeClasses, colorClasses, className].filter(Boolean).join(' ')
}

/**
 * Badge 아이콘 클래스 생성 헬퍼
 */
export function getBadgeIconClasses(size: 'sm' | 'md' | 'lg' = 'md'): string {
  return BADGE_ICON_SIZES[size]
}