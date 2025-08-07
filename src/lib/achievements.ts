/**
 * 업적(Achievement) 시스템 정의
 * 
 * metadata.achievements 배열에 저장된 업적 ID와 매칭되는 정의
 * 프론트엔드에서만 관리하여 쉽게 수정 가능
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Achievement {
  name: string
  description: string
  icon: string
  tier: AchievementTier
  points: number
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  // ===== 콘텐츠 생성 업적 =====
  first_post: {
    name: '첫 발걸음',
    description: '첫 게시글 작성',
    icon: '✍️',
    tier: 'bronze',
    points: 10
  },
  post_10: {
    name: '활발한 작성자',
    description: '게시글 10개 작성',
    icon: '📝',
    tier: 'bronze',
    points: 20
  },
  post_50: {
    name: '콘텐츠 크리에이터',
    description: '게시글 50개 작성',
    icon: '📚',
    tier: 'silver',
    points: 50
  },
  post_100: {
    name: '콘텐츠 마스터',
    description: '게시글 100개 작성',
    icon: '🏆',
    tier: 'gold',
    points: 100
  },

  // ===== 사례 공유 업적 =====
  case_sharer: {
    name: '사례 공유자',
    description: 'AI 활용 사례 5개 공유',
    icon: '💡',
    tier: 'silver',
    points: 30
  },
  case_expert: {
    name: '사례 전문가',
    description: 'AI 활용 사례 10개 공유',
    icon: '🎯',
    tier: 'gold',
    points: 60
  },

  // ===== 자료 공유 업적 =====
  resource_contributor: {
    name: '자료 기여자',
    description: '학습 자료 5개 공유',
    icon: '📁',
    tier: 'silver',
    points: 25
  },
  resource_hero: {
    name: '자료 영웅',
    description: '학습 자료 15개 공유',
    icon: '🗂️',
    tier: 'gold',
    points: 75
  },

  // ===== 활동 참여 업적 =====
  activity_starter: {
    name: '활동 시작',
    description: '학습 활동 5회 참여',
    icon: '🎪',
    tier: 'bronze',
    points: 15
  },
  activity_master: {
    name: '활동 마스터',
    description: '학습 활동 20회 참여',
    icon: '🎭',
    tier: 'silver',
    points: 40
  },
  activity_legend: {
    name: '활동 레전드',
    description: '학습 활동 50회 참여',
    icon: '🌟',
    tier: 'platinum',
    points: 100
  },

  // ===== 인기도 업적 =====
  popular_10: {
    name: '인기 급상승',
    description: '좋아요 10개 획득',
    icon: '❤️',
    tier: 'bronze',
    points: 15
  },
  popular_50: {
    name: '인기 작성자',
    description: '좋아요 50개 획득',
    icon: '💖',
    tier: 'silver',
    points: 30
  },
  popular_200: {
    name: '인기 스타',
    description: '좋아요 200개 획득',
    icon: '🌟',
    tier: 'gold',
    points: 80
  },

  // ===== 조회수 업적 =====
  views_1000: {
    name: '주목받는 글',
    description: '총 조회수 1,000회',
    icon: '👀',
    tier: 'bronze',
    points: 20
  },
  views_10000: {
    name: '화제의 작성자',
    description: '총 조회수 10,000회',
    icon: '🔥',
    tier: 'gold',
    points: 60
  },

  // ===== 댓글 업적 =====
  commenter_20: {
    name: '활발한 토론자',
    description: '댓글 20개 작성',
    icon: '💬',
    tier: 'bronze',
    points: 15
  },
  commenter_100: {
    name: '토론 마스터',
    description: '댓글 100개 작성',
    icon: '🗣️',
    tier: 'silver',
    points: 50
  },

  // ===== 활동 점수 업적 =====
  active_member: {
    name: '활발한 회원',
    description: '활동 점수 100점 달성',
    icon: '⚡',
    tier: 'bronze',
    points: 20
  },
  passionate_member: {
    name: '열정적인 회원',
    description: '활동 점수 300점 달성',
    icon: '🔥',
    tier: 'silver',
    points: 50
  },
  ai_leader: {
    name: 'AI 리더',
    description: '활동 점수 1000점 달성',
    icon: '👑',
    tier: 'platinum',
    points: 200
  },

  // ===== 가입 기간 업적 =====
  member_30days: {
    name: '한달 회원',
    description: '가입 후 30일',
    icon: '📅',
    tier: 'bronze',
    points: 10
  },
  member_100days: {
    name: '100일 회원',
    description: '가입 후 100일',
    icon: '💯',
    tier: 'silver',
    points: 30
  },
  member_1year: {
    name: '1년 회원',
    description: '가입 후 365일',
    icon: '🎂',
    tier: 'gold',
    points: 100
  },

  // ===== 특별 업적 =====
  early_bird: {
    name: '얼리버드',
    description: '오전 6시 이전 활동',
    icon: '🌅',
    tier: 'bronze',
    points: 10
  },
  night_owl: {
    name: '올빼미',
    description: '자정 이후 활동',
    icon: '🦉',
    tier: 'bronze',
    points: 10
  },
  weekend_warrior: {
    name: '주말 전사',
    description: '주말 연속 4주 활동',
    icon: '⚔️',
    tier: 'silver',
    points: 20
  },
  all_rounder: {
    name: '올라운더',
    description: '모든 콘텐츠 타입 작성',
    icon: '🎨',
    tier: 'gold',
    points: 50
  }
}

/**
 * 업적 티어별 색상
 */
export const TIER_COLORS = {
  bronze: 'bg-amber-100 text-amber-800 border-amber-300',
  silver: 'bg-gray-100 text-gray-800 border-gray-300',
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  platinum: 'bg-purple-100 text-purple-800 border-purple-300'
}

/**
 * 업적 티어별 아이콘
 */
export const TIER_ICONS = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎'
}

/**
 * 사용자 업적 계산 헬퍼 함수
 */
export function getUserAchievements(achievementIds: string[]): Achievement[] {
  return achievementIds
    .map(id => ACHIEVEMENTS[id])
    .filter(Boolean)
}

/**
 * 총 업적 포인트 계산
 */
export function getTotalAchievementPoints(achievementIds: string[]): number {
  return achievementIds.reduce((total, id) => {
    const achievement = ACHIEVEMENTS[id]
    return total + (achievement?.points || 0)
  }, 0)
}

/**
 * 티어별 업적 개수 계산
 */
export function getAchievementsByTier(achievementIds: string[]) {
  const counts = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0
  }

  achievementIds.forEach(id => {
    const achievement = ACHIEVEMENTS[id]
    if (achievement) {
      counts[achievement.tier]++
    }
  })

  return counts
}

/**
 * 다음 획득 가능한 업적 추천
 * 현재 통계를 기반으로 곧 달성 가능한 업적 반환
 */
export function getUpcomingAchievements(
  stats: {
    posts_count?: number
    comments_count?: number
    total_likes_received?: number
    activities_joined?: number
    activity_score?: number
  },
  currentAchievements: string[]
): Array<{ id: string; achievement: Achievement; progress: number }> {
  const upcoming = []

  // 게시글 업적 체크
  if (!currentAchievements.includes('first_post') && stats.posts_count === 0) {
    upcoming.push({
      id: 'first_post',
      achievement: ACHIEVEMENTS.first_post,
      progress: 0
    })
  } else if (!currentAchievements.includes('post_10') && stats.posts_count && stats.posts_count < 10) {
    upcoming.push({
      id: 'post_10',
      achievement: ACHIEVEMENTS.post_10,
      progress: (stats.posts_count / 10) * 100
    })
  } else if (!currentAchievements.includes('post_50') && stats.posts_count && stats.posts_count < 50) {
    upcoming.push({
      id: 'post_50',
      achievement: ACHIEVEMENTS.post_50,
      progress: (stats.posts_count / 50) * 100
    })
  }

  // 활동 참여 업적 체크
  if (!currentAchievements.includes('activity_starter') && stats.activities_joined && stats.activities_joined < 5) {
    upcoming.push({
      id: 'activity_starter',
      achievement: ACHIEVEMENTS.activity_starter,
      progress: (stats.activities_joined / 5) * 100
    })
  } else if (!currentAchievements.includes('activity_master') && stats.activities_joined && stats.activities_joined < 20) {
    upcoming.push({
      id: 'activity_master',
      achievement: ACHIEVEMENTS.activity_master,
      progress: (stats.activities_joined / 20) * 100
    })
  }

  // 인기도 업적 체크
  if (!currentAchievements.includes('popular_10') && stats.total_likes_received && stats.total_likes_received < 10) {
    upcoming.push({
      id: 'popular_10',
      achievement: ACHIEVEMENTS.popular_10,
      progress: (stats.total_likes_received / 10) * 100
    })
  }

  // 진행률 80% 이상인 것만 반환 (곧 달성 가능한 것)
  return upcoming
    .filter(item => item.progress >= 80)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3) // 최대 3개만 표시
}