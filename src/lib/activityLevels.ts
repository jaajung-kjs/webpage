import React from 'react'
import {
  Sprout,
  TrendingUp,
  Trophy,
  Crown,
  Activity
} from 'lucide-react'

/**
 * 활동 레벨 설정 인터페이스
 */
interface ActivityLevelConfig {
  label: string
  color: string
  icon: React.ElementType
  description?: string
  minScore: number
  maxScore?: number
}

/**
 * 활동 레벨별 설정
 */
export const ACTIVITY_LEVEL_CONFIGS: Record<string, ActivityLevelConfig> = {
  beginner: {
    label: '신입',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: Sprout,
    description: '동아리 활동을 시작하는 새로운 멤버',
    minScore: 0,
    maxScore: 99
  },
  intermediate: {
    label: '활발',
    color: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
    icon: TrendingUp,
    description: '적극적으로 참여하고 있는 멤버',
    minScore: 100,
    maxScore: 199
  },
  advanced: {
    label: '열정',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    icon: Trophy,
    description: '동아리 활동에 열정적으로 기여하는 멤버',
    minScore: 200,
    maxScore: 299
  },
  expert: {
    label: '리더',
    color: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
    icon: Crown,
    description: '동아리를 이끌어가는 핵심 멤버',
    minScore: 300
  }
} as const

/**
 * 활동 레벨 타입
 */
export type ActivityLevelType = keyof typeof ACTIVITY_LEVEL_CONFIGS

/**
 * 활동 레벨 라벨 객체 반환
 */
export function getActivityLevelLabels(): Record<string, string> {
  const labels: Record<string, string> = {}
  
  Object.entries(ACTIVITY_LEVEL_CONFIGS).forEach(([key, config]) => {
    labels[key] = config.label
  })
  
  return labels
}

/**
 * 활동 레벨 색상 객체 반환
 */
export function getActivityLevelColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  
  Object.entries(ACTIVITY_LEVEL_CONFIGS).forEach(([key, config]) => {
    colors[key] = config.color
  })
  
  return colors
}

/**
 * 활동 레벨 아이콘 객체 반환
 */
export function getActivityLevelIcons(): Record<string, React.ElementType> {
  const icons: Record<string, React.ElementType> = {
    all: Activity
  }
  
  Object.entries(ACTIVITY_LEVEL_CONFIGS).forEach(([key, config]) => {
    icons[key] = config.icon
  })
  
  return icons
}

/**
 * 특정 활동 레벨의 설정 반환
 */
export function getActivityLevelConfig(level: string): ActivityLevelConfig | undefined {
  return ACTIVITY_LEVEL_CONFIGS[level as ActivityLevelType]
}

/**
 * 활동 점수에 따른 활동 레벨 계산
 */
export function calculateActivityLevel(activityScore: number): ActivityLevelType {
  if (activityScore >= 300) return 'expert'
  if (activityScore >= 200) return 'advanced'
  if (activityScore >= 100) return 'intermediate'
  return 'beginner'
}

/**
 * 활동 레벨 정보 반환 (레벨, 색상, 아이콘 포함)
 */
export function getActivityLevelInfo(score: number) {
  const level = calculateActivityLevel(score)
  const config = ACTIVITY_LEVEL_CONFIGS[level]
  
  return {
    level: config.label,
    color: config.color,
    icon: config.icon,
    description: config.description,
    scoreRange: config.maxScore 
      ? `${config.minScore}-${config.maxScore}점` 
      : `${config.minScore}점 이상`
  }
}

/**
 * 다음 레벨까지 필요한 점수
 */
export function getPointsToNextLevel(currentScore: number): { nextLevel: string; pointsNeeded: number } | null {
  const currentLevel = calculateActivityLevel(currentScore)
  const levels = Object.entries(ACTIVITY_LEVEL_CONFIGS).sort((a, b) => 
    a[1].minScore - b[1].minScore
  )
  
  const currentIndex = levels.findIndex(([key]) => key === currentLevel)
  if (currentIndex === levels.length - 1) {
    return null // 이미 최고 레벨
  }
  
  const nextLevel = levels[currentIndex + 1]
  return {
    nextLevel: nextLevel[1].label,
    pointsNeeded: nextLevel[1].minScore - currentScore
  }
}

/**
 * 활동 레벨 진행률 계산 (0-100)
 */
export function calculateLevelProgress(activityScore: number): number {
  const currentLevel = calculateActivityLevel(activityScore)
  const config = ACTIVITY_LEVEL_CONFIGS[currentLevel]
  
  if (!config.maxScore) {
    // 최고 레벨인 경우
    return 100
  }
  
  const levelRange = (config.maxScore - config.minScore) + 1
  const scoreInLevel = activityScore - config.minScore
  const progress = (scoreInLevel / levelRange) * 100
  
  return Math.min(Math.max(progress, 0), 100)
}