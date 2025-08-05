import React from 'react'
import {
  Zap,
  TrendingUp,
  Trophy,
  Star,
  Sparkles
} from 'lucide-react'

/**
 * 스킬 레벨 설정 인터페이스
 */
interface SkillLevelConfig {
  label: string
  color: string
  icon: React.ElementType
  description?: string
  minScore?: number // 최소 활동 점수
}

/**
 * 스킬 레벨별 설정
 */
export const SKILL_LEVEL_CONFIGS: Record<string, SkillLevelConfig> = {
  beginner: {
    label: '초급',
    color: 'bg-kepco-gray-100 text-kepco-gray-700 dark:bg-kepco-gray-900 dark:text-kepco-gray-300',
    icon: Zap,
    description: 'AI 활용을 시작하는 단계',
    minScore: 0
  },
  intermediate: {
    label: '중급',
    color: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
    icon: TrendingUp,
    description: '기본적인 AI 활용이 가능한 단계',
    minScore: 100
  },
  advanced: {
    label: '고급',
    color: 'bg-kepco-blue-300 text-kepco-blue-900 dark:bg-kepco-blue-700/20 dark:text-kepco-blue-200',
    icon: Trophy,
    description: '다양한 AI 도구를 능숙하게 활용하는 단계',
    minScore: 200
  },
  expert: {
    label: '전문가',
    color: 'bg-gradient-to-r from-kepco-blue-500 to-kepco-blue-600 text-white',
    icon: Star,
    description: 'AI 활용의 전문가 단계',
    minScore: 300
  }
} as const

/**
 * 스킬 레벨 타입
 */
export type SkillLevelType = keyof typeof SKILL_LEVEL_CONFIGS

/**
 * 스킬 레벨 라벨 객체 반환
 */
export function getSkillLevelLabels(): Record<string, string> {
  const labels: Record<string, string> = { all: '전체' }
  
  Object.entries(SKILL_LEVEL_CONFIGS).forEach(([key, config]) => {
    labels[key] = config.label
  })
  
  return labels
}

/**
 * 스킬 레벨 색상 객체 반환
 */
export function getSkillLevelColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  
  Object.entries(SKILL_LEVEL_CONFIGS).forEach(([key, config]) => {
    colors[key] = config.color
  })
  
  return colors
}

/**
 * 스킬 레벨 아이콘 객체 반환
 */
export function getSkillLevelIcons(): Record<string, React.ElementType> {
  const icons: Record<string, React.ElementType> = {
    all: Sparkles
  }
  
  Object.entries(SKILL_LEVEL_CONFIGS).forEach(([key, config]) => {
    icons[key] = config.icon
  })
  
  return icons
}

/**
 * 특정 스킬 레벨의 설정 반환
 */
export function getSkillLevelConfig(level: string): SkillLevelConfig | undefined {
  return SKILL_LEVEL_CONFIGS[level as SkillLevelType]
}

/**
 * 활동 점수에 따른 스킬 레벨 계산
 */
export function calculateSkillLevel(activityScore: number): SkillLevelType {
  if (activityScore >= 300) return 'expert'
  if (activityScore >= 200) return 'advanced'
  if (activityScore >= 100) return 'intermediate'
  return 'beginner'
}

/**
 * 다음 스킬 레벨까지 필요한 점수
 */
export function getPointsToNextLevel(currentScore: number): { nextLevel: string; pointsNeeded: number } | null {
  const levels = Object.entries(SKILL_LEVEL_CONFIGS).sort((a, b) => 
    (a[1].minScore || 0) - (b[1].minScore || 0)
  )
  
  for (const [level, config] of levels) {
    if (currentScore < (config.minScore || 0)) {
      return {
        nextLevel: config.label,
        pointsNeeded: (config.minScore || 0) - currentScore
      }
    }
  }
  
  return null // 이미 최고 레벨
}

/**
 * 스킬 레벨 진행률 계산 (0-100)
 */
export function calculateLevelProgress(activityScore: number): number {
  const currentLevel = calculateSkillLevel(activityScore)
  const currentConfig = SKILL_LEVEL_CONFIGS[currentLevel]
  const currentMin = currentConfig.minScore || 0
  
  // 다음 레벨 찾기
  const nextLevelInfo = getPointsToNextLevel(activityScore)
  if (!nextLevelInfo) return 100 // 최고 레벨인 경우
  
  const nextMin = currentMin + nextLevelInfo.pointsNeeded + (activityScore - currentMin)
  const progress = ((activityScore - currentMin) / (nextMin - currentMin)) * 100
  
  return Math.min(Math.max(progress, 0), 100)
}