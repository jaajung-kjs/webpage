/**
 * 캐싱 전략 정의
 * 
 * TanStack Query를 위한 데이터 특성별 캐싱 전략
 */

/**
 * 데이터 특성별 staleTime 정의 (밀리초)
 * 
 * staleTime: 데이터가 "신선한" 상태로 유지되는 시간
 * - 이 시간 동안은 캐시된 데이터를 사용하며 네트워크 요청을 하지 않음
 * - 실시간성이 중요한 데이터일수록 짧게 설정
 */
export const STALE_TIME = {
  // 실시간성 중요 (1-2분)
  messages: 1 * 60 * 1000,         // 1분 - 메시지는 실시간성이 가장 중요
  notifications: 1 * 60 * 1000,    // 1분 - 알림도 즉시 확인 필요
  comments: 2 * 60 * 1000,         // 2분 - 댓글은 약간의 지연 허용
  
  // 보통 변경 빈도 (5분)
  content: 5 * 60 * 1000,          // 5분 - 게시글은 자주 변경되지 않음
  members: 5 * 60 * 1000,          // 5분 - 회원 목록도 자주 변경되지 않음
  search: 5 * 60 * 1000,           // 5분 - 검색 결과 캐싱
  
  // 거의 변경 안됨 (10-30분)
  profile: 10 * 60 * 1000,         // 10분 - 프로필은 거의 변경 안됨
  categories: 30 * 60 * 1000,      // 30분 - 카테고리는 매우 정적
  stats: 30 * 60 * 1000,           // 30분 - 통계는 실시간일 필요 없음
  settings: 30 * 60 * 1000,        // 30분 - 설정은 거의 변경 안됨
  
  // 정적 데이터 (1시간 이상)
  staticContent: 60 * 60 * 1000,   // 1시간 - 정적 콘텐츠
  metadata: 60 * 60 * 1000,        // 1시간 - 메타데이터
} as const

/**
 * 데이터 특성별 gcTime 정의 (밀리초)
 * 
 * gcTime (Garbage Collection Time): 캐시가 메모리에서 제거되는 시간
 * - 일반적으로 staleTime의 2-3배로 설정
 * - 사용자가 페이지를 떠났다가 돌아올 때를 대비
 */
export const GC_TIME = {
  // 실시간성 중요 (5-10분)
  messages: 5 * 60 * 1000,
  notifications: 5 * 60 * 1000,
  comments: 10 * 60 * 1000,
  
  // 보통 변경 빈도 (15-30분)
  content: 15 * 60 * 1000,
  members: 15 * 60 * 1000,
  search: 15 * 60 * 1000,
  
  // 거의 변경 안됨 (1-2시간)
  profile: 60 * 60 * 1000,
  categories: 2 * 60 * 60 * 1000,
  stats: 2 * 60 * 60 * 1000,
  settings: 2 * 60 * 60 * 1000,
  
  // 정적 데이터 (24시간)
  staticContent: 24 * 60 * 60 * 1000,
  metadata: 24 * 60 * 60 * 1000,
} as const

/**
 * 캐싱 전략 프리셋
 * 
 * 각 데이터 타입에 맞는 staleTime과 gcTime 조합
 */
export const CACHE_PRESETS = {
  realtime: {
    staleTime: STALE_TIME.messages,
    gcTime: GC_TIME.messages,
  },
  frequent: {
    staleTime: STALE_TIME.content,
    gcTime: GC_TIME.content,
  },
  occasional: {
    staleTime: STALE_TIME.profile,
    gcTime: GC_TIME.profile,
  },
  static: {
    staleTime: STALE_TIME.staticContent,
    gcTime: GC_TIME.staticContent,
  },
} as const

/**
 * 리페치 인터벌 정의 (밀리초)
 * 
 * 특정 데이터는 주기적으로 백그라운드에서 리페치
 */
export const REFETCH_INTERVALS = {
  messages: 30 * 1000,        // 30초마다 메시지 확인
  notifications: 60 * 1000,   // 1분마다 알림 확인
  activeChat: 10 * 1000,      // 활성 채팅은 10초마다
  disabled: false,             // 리페치 비활성화
} as const

/**
 * 캐시 키 팩토리
 * 
 * 일관된 캐시 키 생성을 위한 팩토리 함수들
 */
export const cacheKeys = {
  // 메시지 관련
  messages: {
    all: ['messages'] as const,
    lists: () => [...cacheKeys.messages.all, 'list'] as const,
    list: (filters: string) => [...cacheKeys.messages.lists(), { filters }] as const,
    details: () => [...cacheKeys.messages.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.messages.details(), id] as const,
  },
  
  // 콘텐츠 관련
  content: {
    all: ['content'] as const,
    lists: () => [...cacheKeys.content.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...cacheKeys.content.lists(), filters] as const,
    details: () => [...cacheKeys.content.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.content.details(), id] as const,
  },
  
  // 회원 관련
  members: {
    all: ['members'] as const,
    lists: () => [...cacheKeys.members.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...cacheKeys.members.lists(), filters] as const,
    details: () => [...cacheKeys.members.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.members.details(), id] as const,
  },
  
  // 프로필 관련
  profile: {
    all: ['profile'] as const,
    current: () => [...cacheKeys.profile.all, 'current'] as const,
    detail: (id: string) => [...cacheKeys.profile.all, id] as const,
  },
  
  // 통계 관련
  stats: {
    all: ['stats'] as const,
    global: () => [...cacheKeys.stats.all, 'global'] as const,
    user: (userId: string) => [...cacheKeys.stats.all, 'user', userId] as const,
  },
}

/**
 * 프리페칭 전략
 * 
 * 사용자의 다음 행동을 예측하여 미리 데이터를 가져오는 전략
 */
export const PREFETCH_STRATEGIES = {
  // 상세 페이지 진입 전 hover 시 프리페치
  onHover: {
    delay: 200, // 200ms hover 후 프리페치 시작
    staleTime: STALE_TIME.content,
  },
  
  // 페이지네이션 다음 페이지 프리페치
  pagination: {
    prefetchNext: true,
    prefetchPrevious: false,
    maxPrefetchPages: 2,
  },
  
  // 무한 스크롤 프리페치
  infiniteScroll: {
    prefetchDistance: 2, // 2 페이지 미리 가져오기
    maxPages: 10,       // 최대 10 페이지까지만 캐시
  },
}

/**
 * 캐시 무효화 전략
 * 
 * 특정 액션 후 어떤 캐시를 무효화할지 정의
 */
export const INVALIDATION_STRATEGIES = {
  // 콘텐츠 생성/수정/삭제
  contentMutation: [
    cacheKeys.content.all,
    cacheKeys.stats.global,
  ],
  
  // 댓글 생성/수정/삭제
  commentMutation: (contentId: string) => [
    cacheKeys.content.detail(contentId),
    ['comments', contentId],
  ],
  
  // 프로필 업데이트
  profileUpdate: (userId: string) => [
    cacheKeys.profile.detail(userId),
    cacheKeys.members.all,
  ],
  
  // 메시지 전송
  messageSend: (conversationId: string) => [
    ['messages', conversationId],
    ['conversations'],
  ],
}

/**
 * 캐시 설정 헬퍼 함수
 */
export function getCacheConfig(dataType: keyof typeof CACHE_PRESETS) {
  return CACHE_PRESETS[dataType]
}

export function getStaleTime(dataType: keyof typeof STALE_TIME) {
  return STALE_TIME[dataType]
}

export function getGcTime(dataType: keyof typeof GC_TIME) {
  return GC_TIME[dataType]
}

export function getRefetchInterval(dataType: keyof typeof REFETCH_INTERVALS) {
  return REFETCH_INTERVALS[dataType]
}