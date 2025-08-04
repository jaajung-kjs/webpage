import React from 'react'
import {
  Info,
  AlertCircle,
  Megaphone,
  CheckCircle,
  Zap,
  Lightbulb,
  Cpu,
  ChartBar,
  BookOpen,
  Star,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  Coffee,
  FileText,
  Download,
  BookMarked,
  Presentation,
  Video,
  Link,
  Calendar,
  GraduationCap,
  Users,
  Utensils
} from 'lucide-react'

/**
 * 카테고리 설정 인터페이스
 */
interface CategoryConfig {
  label: string
  color: string
  icon: React.ElementType
}

/**
 * 게시판별 카테고리 설정
 */
export const BOARD_CATEGORIES = {
  // 공지사항 카테고리
  announcements: {
    general: {
      label: '일반',
      color: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
      icon: Info
    },
    important: {
      label: '중요',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      icon: AlertCircle
    },
    urgent: {
      label: '긴급',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      icon: Megaphone
    },
    event: {
      label: '이벤트',
      color: 'bg-kepco-blue-200 text-kepco-blue-900 dark:bg-kepco-blue-800/20 dark:text-kepco-blue-200',
      icon: CheckCircle
    }
  },

  // AI 활용사례 카테고리
  cases: {
    productivity: {
      label: '업무효율',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      icon: Zap
    },
    creativity: {
      label: '일상',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      icon: Lightbulb
    },
    development: {
      label: '개발',
      color: 'bg-kepco-blue-200 text-kepco-blue-900 dark:bg-kepco-blue-800/20 dark:text-kepco-blue-200',
      icon: Cpu
    },
    analysis: {
      label: '분석',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      icon: ChartBar
    },
    other: {
      label: '기타',
      color: 'bg-kepco-gray-100 text-kepco-gray-700 dark:bg-kepco-gray-900 dark:text-kepco-gray-300',
      icon: BookOpen
    }
  },

  // 자유게시판 카테고리
  community: {
    tips: {
      label: '꿀팁공유',
      color: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
      icon: Lightbulb
    },
    help: {
      label: '도움요청',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      icon: HelpCircle
    },
    discussion: {
      label: '토론',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      icon: MessageCircle
    },
    question: {
      label: '질문',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      icon: MessageSquare
    },
    chat: {
      label: '잡담',
      color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
      icon: Coffee
    }
  },

  // 자료실 카테고리
  resources: {
    presentation: {
      label: '발표자료',
      color: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
      icon: Presentation
    },
    installation: {
      label: '설치방법',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      icon: Download
    },
    tutorial: {
      label: '튜토리얼',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      icon: BookOpen
    },
    other: {
      label: '기타',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      icon: FileText
    }
  },

  // 활동일정 카테고리
  activities: {
    regular: {
      label: '정기모임',
      color: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
      icon: Calendar
    },
    study: {
      label: '스터디',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      icon: GraduationCap
    },
    dinner: {
      label: '회식',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      icon: Utensils
    },
    lecture: {
      label: '강연',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      icon: Presentation
    }
  }
} as const

/**
 * 게시판 타입
 */
export type BoardType = keyof typeof BOARD_CATEGORIES

/**
 * 카테고리 키 타입
 */
export type CategoryKey<T extends BoardType> = keyof typeof BOARD_CATEGORIES[T]

/**
 * 카테고리 라벨 객체 반환
 */
export function getCategoryLabels(boardType: BoardType): Record<string, string> {
  const boardCategories = BOARD_CATEGORIES[boardType]
  const labels: Record<string, string> = { all: '전체' }
  
  Object.entries(boardCategories).forEach(([key, config]) => {
    labels[key] = config.label
  })
  
  return labels
}

/**
 * 카테고리 색상 객체 반환
 */
export function getCategoryColors(boardType: BoardType): Record<string, string> {
  const boardCategories = BOARD_CATEGORIES[boardType]
  const colors: Record<string, string> = {}
  
  Object.entries(boardCategories).forEach(([key, config]) => {
    colors[key] = config.color
  })
  
  return colors
}

/**
 * 카테고리 아이콘 객체 반환
 */
export function getCategoryIcons(boardType: BoardType): Record<string, React.ElementType> {
  const boardCategories = BOARD_CATEGORIES[boardType]
  const icons: Record<string, React.ElementType> = {}
  
  Object.entries(boardCategories).forEach(([key, config]) => {
    icons[key] = config.icon
  })
  
  return icons
}

/**
 * 글 작성용 카테고리 선택 배열 반환
 */
export function getCategoriesForSelect(boardType: BoardType): Array<{ value: string; label: string }> {
  const boardCategories = BOARD_CATEGORIES[boardType]
  
  return Object.entries(boardCategories).map(([key, config]) => ({
    value: key,
    label: config.label
  }))
}

/**
 * 특정 카테고리의 설정 반환
 */
export function getCategoryConfig(boardType: BoardType, categoryKey: string): CategoryConfig | undefined {
  return BOARD_CATEGORIES[boardType]?.[categoryKey as keyof typeof BOARD_CATEGORIES[typeof boardType]]
}

/**
 * 모든 카테고리 정보를 한 번에 반환 (기존 컴포넌트 호환성)
 */
export function getBoardCategoryData(boardType: BoardType) {
  return {
    categoryLabels: getCategoryLabels(boardType),
    categoryColors: getCategoryColors(boardType),
    categoryIcons: getCategoryIcons(boardType),
    categories: getCategoriesForSelect(boardType)
  }
}