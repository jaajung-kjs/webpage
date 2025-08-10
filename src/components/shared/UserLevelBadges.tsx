/**
 * UserLevelBadges - 사용자 레벨 뱃지 표시 컴포넌트
 * 
 * 게임화 V2 시스템의 레벨 정보를 표시하는 재사용 가능한 컴포넌트
 */

'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Trophy, Activity, TrendingUp, Crown } from 'lucide-react'
import { useUserLevel, useUserRank } from '@/hooks/features'

interface UserLevelBadgesProps {
  userId?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'minimal' | 'compact' | 'detailed'
  showRank?: boolean
  showOnlySkill?: boolean
  showOnlyActivity?: boolean
  showOnlyRank?: boolean
  showAllBadges?: boolean  // 모든 뱃지를 보여줄지 여부 (상세보기 페이지용)
  className?: string
}

// 레벨 정보 매핑
const SKILL_LEVEL_CONFIG = {
  beginner: { label: '초급', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '🌱' },
  intermediate: { label: '중급', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '🌿' },
  advanced: { label: '고급', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🌳' },
  expert: { label: '전문가', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🏆' }
}

const ACTIVITY_LEVEL_CONFIG = {
  beginner: { label: '신입', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: '👋' },
  active: { label: '활발', color: 'bg-green-100 text-green-800 border-green-300', icon: '⚡' },
  enthusiast: { label: '열정', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🔥' },
  leader: { label: '리더', color: 'bg-red-100 text-red-800 border-red-300', icon: '👑' }
}

// 랭킹별 색상 결정 함수
const getRankColor = (rank: number) => {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white border-yellow-400'
  if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 border-gray-300'  
  if (rank === 3) return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-500'
  if (rank <= 10) return 'bg-blue-100 text-blue-800 border-blue-300'
  if (rank <= 50) return 'bg-green-100 text-green-800 border-green-300'
  return 'bg-gray-100 text-gray-800 border-gray-300'
}

// 랭킹별 아이콘 결정 함수
const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-3 w-3 mr-0.5" />
  if (rank === 2) return <Trophy className="h-3 w-3 mr-0.5" />
  if (rank === 3) return <Trophy className="h-3 w-3 mr-0.5" />
  return <TrendingUp className="h-3 w-3 mr-0.5" />
}

export default function UserLevelBadges({
  userId,
  size = 'sm',
  variant = 'minimal',
  showRank = false,
  showOnlySkill = false,
  showOnlyActivity = false,
  showOnlyRank = false,
  showAllBadges = false,
  className = ''
}: UserLevelBadgesProps) {
  const { skillLevel, activityLevel, score } = useUserLevel(userId)
  const userRank = useUserRank(userId)

  // 데이터가 없으면 아무것도 렌더링하지 않음
  if (!skillLevel || !activityLevel) {
    return null
  }

  const skillConfig = SKILL_LEVEL_CONFIG[skillLevel as keyof typeof SKILL_LEVEL_CONFIG]
  const activityConfig = ACTIVITY_LEVEL_CONFIG[activityLevel as keyof typeof ACTIVITY_LEVEL_CONFIG]

  const sizeClasses = {
    sm: 'text-xs h-5',
    md: 'text-xs h-6',
    lg: 'text-sm h-7'
  }

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5'
  }

  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        {/* 스킬 레벨만 표시 */}
        {showOnlySkill && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className={`${skillConfig.color} ${sizeClasses[size]} px-1.5`}>
                  <span className="mr-0.5 text-xs">{skillConfig.icon}</span>
                  <span className="hidden sm:inline">{skillConfig.label}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold">스킬 레벨: {skillConfig.label}</p>
                  <p className="text-muted-foreground">사용자 설정값</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* 활동 레벨만 표시 */}
        {showOnlyActivity && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className={`${activityConfig.color} ${sizeClasses[size]} px-1.5`}>
                  <span className="mr-0.5 text-xs">{activityConfig.icon}</span>
                  <span className="hidden sm:inline">{activityConfig.label}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold">활동 레벨: {activityConfig.label}</p>
                  <p className="text-muted-foreground">활동 점수: {score}점</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* 랭킹만 표시 */}
        {showOnlyRank && userRank && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className={`${getRankColor(userRank.rank)} ${sizeClasses[size]} px-1.5`}>
                  {getRankIcon(userRank.rank)}
                  <span>#{userRank.rank}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold">전체 순위: #{userRank.rank}</p>
                  <p className="text-muted-foreground">활동 점수: {userRank.score}점</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* showAllBadges가 true면 모든 뱃지 표시 (상세보기 페이지용) */}
        {showAllBadges && !showOnlySkill && !showOnlyActivity && !showOnlyRank && (
          <>
            {/* 랭킹 뱃지 */}
            {userRank && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className={`${getRankColor(userRank.rank)} ${sizeClasses[size]} px-1.5`}>
                      {getRankIcon(userRank.rank)}
                      <span>#{userRank.rank}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-semibold">전체 순위: #{userRank.rank}</p>
                      <p className="text-muted-foreground">활동 점수: {userRank.score}점</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* 활동레벨 뱃지 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className={`${activityConfig.color} ${sizeClasses[size]} px-1.5`}>
                    <span className="mr-0.5 text-xs">{activityConfig.icon}</span>
                    <span className="hidden sm:inline">{activityConfig.label}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold">활동 레벨: {activityConfig.label}</p>
                    <p className="text-muted-foreground">활동 점수: {score}점</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* 스킬레벨 뱃지 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className={`${skillConfig.color} ${sizeClasses[size]} px-1.5`}>
                    <span className="mr-0.5 text-xs">{skillConfig.icon}</span>
                    <span className="hidden sm:inline">{skillConfig.label}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold">스킬 레벨: {skillConfig.label}</p>
                    <p className="text-muted-foreground">사용자 설정값</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
        
        {/* 랭킹 뱃지만 표시 (기본) - 미리보기와 댓글에서 사용 */}
        {!showAllBadges && !showOnlySkill && !showOnlyActivity && !showOnlyRank && userRank && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className={`${getRankColor(userRank.rank)} ${sizeClasses[size]} px-1.5`}>
                  {getRankIcon(userRank.rank)}
                  <span>#{userRank.rank}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold">전체 순위: #{userRank.rank}</p>
                  <p className="text-muted-foreground">활동 점수: {userRank.score}점</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className={`${skillConfig.color} ${sizeClasses[size]} px-1.5`}>
                <Trophy className={`${iconSizes[size]} mr-1`} />
                <span>{skillConfig.label}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-semibold">스킬 레벨: {skillConfig.label}</p>
                <p className="text-muted-foreground">현재 점수: {score}점</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className={`${activityConfig.color} ${sizeClasses[size]} px-1.5`}>
                <Activity className={`${iconSizes[size]} mr-1`} />
                <span>{activityConfig.label}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-semibold">활동 레벨: {activityConfig.label}</p>
                <p className="text-muted-foreground">참여도 기반</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {showRank && userRank && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className={`bg-yellow-100 text-yellow-800 border-yellow-300 ${sizeClasses[size]} px-1.5`}>
                  <TrendingUp className={`${iconSizes[size]} mr-1`} />
                  #{userRank.rank}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold">전체 순위: #{userRank.rank}</p>
                  <p className="text-muted-foreground">월간 기준</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  // detailed variant
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className={`${skillConfig.color} ${sizeClasses[size]}`}>
                <Trophy className={`${iconSizes[size]} mr-1`} />
                <span>{skillConfig.label}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-semibold">스킬 레벨: {skillConfig.label}</p>
                <p className="text-muted-foreground">현재 점수: {score}점</p>
                <p className="text-muted-foreground">
                  {skillLevel === 'beginner' && '0-99점 구간'}
                  {skillLevel === 'intermediate' && '100-499점 구간'}
                  {skillLevel === 'advanced' && '500-999점 구간'}
                  {skillLevel === 'expert' && '1000점 이상'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className={`${activityConfig.color} ${sizeClasses[size]}`}>
                <Activity className={`${iconSizes[size]} mr-1`} />
                <span>{activityConfig.label}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-semibold">활동 레벨: {activityConfig.label}</p>
                <p className="text-muted-foreground">커뮤니티 참여도 기반</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {showRank && userRank && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className={`bg-yellow-100 text-yellow-800 border-yellow-300 ${sizeClasses[size]}`}>
                <Crown className={`${iconSizes[size]} mr-1`} />
                <span>#{userRank.rank}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-semibold">전체 순위</p>
                <p className="text-muted-foreground">#{userRank.rank} / 월간 기준</p>
                <p className="text-muted-foreground">{userRank.score}점</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

/**
 * 간단한 레벨 아이콘만 표시하는 컴포넌트
 */
export function UserLevelIcon({ 
  userId, 
  level = 'skill',
  className = '' 
}: {
  userId?: string
  level?: 'skill' | 'activity'
  className?: string
}) {
  const { skillLevel, activityLevel } = useUserLevel(userId)
  
  const currentLevel = level === 'skill' ? skillLevel : activityLevel
  const config = level === 'skill' ? 
    SKILL_LEVEL_CONFIG[currentLevel as keyof typeof SKILL_LEVEL_CONFIG] :
    ACTIVITY_LEVEL_CONFIG[currentLevel as keyof typeof ACTIVITY_LEVEL_CONFIG]
  
  if (!config) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center text-sm ${className}`}>
            {config.icon}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold">
              {level === 'skill' ? '스킬' : '활동'} 레벨: {config.label}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}