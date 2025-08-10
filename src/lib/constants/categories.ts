/**
 * 중앙화된 카테고리 설정
 * DB의 slug와 Frontend 라벨을 일관성 있게 관리
 */

import {
  Coffee,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  BookOpen,
  AlertCircle,
  Bell,
  Calendar,
  Briefcase,
  Sparkles,
  Code,
  BarChart,
  FileText,
  Download,
  BookMarked,
  Info
} from 'lucide-react'

// 카테고리 타입 정의
export type ContentType = 'community' | 'activity' | 'announcement' | 'case' | 'resource'

export type CategorySlug = 
  // Community
  | 'tips' | 'help' | 'discussion' | 'question' | 'chat'
  // Activity  
  | 'regular' | 'study' | 'dinner' | 'lecture'
  // Announcement
  | 'general' | 'important' | 'urgent' | 'event'
  // Case
  | 'productivity' | 'creativity' | 'development' | 'analysis' | 'other'
  // Resource
  | 'presentation' | 'installation' | 'tutorial' | 'other'

// 카테고리 설정 인터페이스
interface CategoryConfig {
  slug: CategorySlug
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
}

// Content Type별 카테고리 설정
export const CATEGORY_CONFIG: Record<ContentType, Record<string, CategoryConfig>> = {
  community: {
    tips: {
      slug: 'tips',
      label: '꿀팁공유',
      icon: Lightbulb,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    },
    help: {
      slug: 'help',
      label: '도움요청',
      icon: HelpCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    },
    discussion: {
      slug: 'discussion',
      label: '토론',
      icon: MessageCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    },
    question: {
      slug: 'question',
      label: '질문',
      icon: HelpCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    },
    chat: {
      slug: 'chat',
      label: '잡담',
      icon: Coffee,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  },
  activity: {
    regular: {
      slug: 'regular',
      label: '정기모임',
      icon: Calendar,
      color: 'text-kepco-blue-600',
      bgColor: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900 dark:text-kepco-blue-300'
    },
    study: {
      slug: 'study',
      label: '스터디',
      icon: BookOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    },
    dinner: {
      slug: 'dinner',
      label: '회식',
      icon: Coffee,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    },
    lecture: {
      slug: 'lecture',
      label: '강연',
      icon: MessageCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    }
  },
  announcement: {
    general: {
      slug: 'general',
      label: '일반',
      icon: Info,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    },
    important: {
      slug: 'important',
      label: '중요',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    },
    urgent: {
      slug: 'urgent',
      label: '긴급',
      icon: Bell,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    },
    event: {
      slug: 'event',
      label: '이벤트',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    }
  },
  case: {
    productivity: {
      slug: 'productivity',
      label: '업무효율',
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    },
    creativity: {
      slug: 'creativity',
      label: '일상',
      icon: Sparkles,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    },
    development: {
      slug: 'development',
      label: '개발',
      icon: Code,
      color: 'text-green-600',
      bgColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    },
    analysis: {
      slug: 'analysis',
      label: '분석',
      icon: BarChart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    },
    other: {
      slug: 'other',
      label: '기타',
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  },
  resource: {
    presentation: {
      slug: 'presentation',
      label: '발표자료',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    },
    installation: {
      slug: 'installation',
      label: '설치방법',
      icon: Download,
      color: 'text-green-600',
      bgColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    },
    tutorial: {
      slug: 'tutorial',
      label: '튜토리얼',
      icon: BookMarked,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    },
    other: {
      slug: 'other',
      label: '기타',
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }
}

// Helper 함수들

/**
 * Content Type과 Category Slug로 카테고리 설정 가져오기
 */
export function getCategoryConfig(contentType: ContentType, categorySlug: string): CategoryConfig | null {
  return CATEGORY_CONFIG[contentType]?.[categorySlug] || null
}

/**
 * Category Slug로 라벨 가져오기
 */
export function getCategoryLabel(contentType: ContentType, categorySlug: string): string {
  const config = getCategoryConfig(contentType, categorySlug)
  return config?.label || categorySlug
}

/**
 * Category Slug로 아이콘 가져오기
 */
export function getCategoryIcon(contentType: ContentType, categorySlug: string): React.ElementType | null {
  const config = getCategoryConfig(contentType, categorySlug)
  return config?.icon || null
}

/**
 * Category Slug로 색상 클래스 가져오기
 */
export function getCategoryColor(contentType: ContentType, categorySlug: string): string {
  const config = getCategoryConfig(contentType, categorySlug)
  return config?.bgColor || 'bg-gray-100 text-gray-800'
}

/**
 * Content Type별 모든 카테고리 가져오기
 */
export function getCategoriesByType(contentType: ContentType): CategoryConfig[] {
  const categories = CATEGORY_CONFIG[contentType]
  return categories ? Object.values(categories) : []
}

/**
 * Content Type별 카테고리 옵션 가져오기 (Select 컴포넌트용)
 */
export function getCategoryOptions(contentType: ContentType): Array<{ value: string; label: string }> {
  const categories = getCategoriesByType(contentType)
  return categories.map(cat => ({
    value: cat.slug,
    label: cat.label
  }))
}

// 기본 카테고리 정의
export const DEFAULT_CATEGORIES: Record<ContentType, CategorySlug> = {
  community: 'chat',
  activity: 'regular',
  announcement: 'general',
  case: 'other',
  resource: 'other'
}