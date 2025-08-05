import React from 'react'
import {
  MessageSquare,
  Brain,
  Image,
  FileText,
  Code,
  Bot,
  Sparkles,
  Wand2,
  Palette,
  PenTool,
  Database,
  GitBranch,
  Terminal,
  Mic,
  Video,
  BookOpen,
  Search,
  Cpu,
  LineChart
} from 'lucide-react'

/**
 * AI 도구 설정 인터페이스
 */
interface AIToolConfig {
  label: string
  icon: React.ElementType
  category: 'chat' | 'image' | 'code' | 'data' | 'other'
  description?: string
  color?: string
}

/**
 * AI 도구별 설정
 */
export const AI_TOOL_CONFIGS: Record<string, AIToolConfig> = {
  // Chat & Language Models
  chatgpt: {
    label: 'ChatGPT',
    icon: MessageSquare,
    category: 'chat',
    description: 'OpenAI의 대화형 AI',
    color: 'text-green-600'
  },
  claude: {
    label: 'Claude',
    icon: Brain,
    category: 'chat',
    description: 'Anthropic의 AI 어시스턴트',
    color: 'text-orange-600'
  },
  gemini: {
    label: 'Gemini',
    icon: Sparkles,
    category: 'chat',
    description: 'Google의 AI 모델',
    color: 'text-blue-600'
  },
  copilot: {
    label: 'Copilot',
    icon: Bot,
    category: 'chat',
    description: 'Microsoft의 AI 어시스턴트',
    color: 'text-blue-700'
  },
  
  // Image Generation
  midjourney: {
    label: 'Midjourney',
    icon: Image,
    category: 'image',
    description: 'AI 이미지 생성 도구',
    color: 'text-purple-600'
  },
  dalle: {
    label: 'DALL-E',
    icon: Palette,
    category: 'image',
    description: 'OpenAI의 이미지 생성 AI',
    color: 'text-indigo-600'
  },
  'stable-diffusion': {
    label: 'Stable Diffusion',
    icon: Wand2,
    category: 'image',
    description: '오픈소스 이미지 생성 AI',
    color: 'text-purple-700'
  },
  
  // Code & Development
  'github-copilot': {
    label: 'GitHub Copilot',
    icon: Code,
    category: 'code',
    description: 'AI 코드 어시스턴트',
    color: 'text-gray-700'
  },
  cursor: {
    label: 'Cursor',
    icon: Terminal,
    category: 'code',
    description: 'AI 통합 코드 에디터',
    color: 'text-blue-800'
  },
  codeium: {
    label: 'Codeium',
    icon: GitBranch,
    category: 'code',
    description: 'AI 코드 자동완성',
    color: 'text-green-700'
  },
  
  // Data & Analytics
  'power-bi': {
    label: 'Power BI',
    icon: LineChart,
    category: 'data',
    description: '데이터 시각화 도구',
    color: 'text-yellow-600'
  },
  tableau: {
    label: 'Tableau',
    icon: Database,
    category: 'data',
    description: '비즈니스 인텔리전스 플랫폼',
    color: 'text-orange-700'
  },
  
  // Other AI Tools
  notion: {
    label: 'Notion AI',
    icon: FileText,
    category: 'other',
    description: 'AI 기반 문서 작성 도우미',
    color: 'text-gray-600'
  },
  'whisper-ai': {
    label: 'Whisper AI',
    icon: Mic,
    category: 'other',
    description: '음성 인식 AI',
    color: 'text-red-600'
  },
  'elevenlabs': {
    label: 'ElevenLabs',
    icon: Mic,
    category: 'other',
    description: 'AI 음성 합성',
    color: 'text-purple-500'
  },
  runway: {
    label: 'Runway',
    icon: Video,
    category: 'other',
    description: 'AI 비디오 편집 도구',
    color: 'text-pink-600'
  },
  perplexity: {
    label: 'Perplexity',
    icon: Search,
    category: 'other',
    description: 'AI 검색 엔진',
    color: 'text-cyan-600'
  },
  'hugging-face': {
    label: 'Hugging Face',
    icon: Cpu,
    category: 'other',
    description: 'AI 모델 플랫폼',
    color: 'text-yellow-700'
  }
} as const

/**
 * AI 도구 타입
 */
export type AIToolType = keyof typeof AI_TOOL_CONFIGS

/**
 * AI 도구 카테고리별 그룹
 */
export const AI_TOOL_CATEGORIES = {
  chat: '대화형 AI',
  image: '이미지 생성',
  code: '코드 어시스턴트',
  data: '데이터 분석',
  other: '기타 도구'
} as const

/**
 * 자주 사용되는 AI 도구 목록
 */
export const POPULAR_AI_TOOLS: AIToolType[] = [
  'chatgpt',
  'claude',
  'gemini',
  'midjourney',
  'github-copilot',
  'notion'
]

/**
 * AI 도구 목록 반환 (카테고리별)
 */
export function getAIToolsByCategory(): Record<string, Array<{ value: string; label: string; icon: React.ElementType }>> {
  const grouped: Record<string, Array<{ value: string; label: string; icon: React.ElementType }>> = {}
  
  Object.entries(AI_TOOL_CONFIGS).forEach(([key, config]) => {
    const category = config.category
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push({
      value: key,
      label: config.label,
      icon: config.icon
    })
  })
  
  return grouped
}

/**
 * AI 도구 설정 반환
 */
export function getAIToolConfig(tool: string): AIToolConfig | undefined {
  return AI_TOOL_CONFIGS[tool as AIToolType]
}

/**
 * AI 도구 라벨 반환
 */
export function getAIToolLabel(tool: string): string {
  return AI_TOOL_CONFIGS[tool as AIToolType]?.label || tool
}

/**
 * AI 도구 아이콘 반환
 */
export function getAIToolIcon(tool: string): React.ElementType {
  return AI_TOOL_CONFIGS[tool as AIToolType]?.icon || FileText
}