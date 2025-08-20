/**
 * KEPCO AI Community - Hooks Entry Point
 * 
 * 통합 hooks export - V1과 V2 hooks 모두 제공
 * V2 hooks 사용을 권장합니다.
 */

// Core Hooks
export * from './core'

// Feature Hooks  
export * from './features'

// Utility Hooks
export * from './useIsMobile'

// Migration Utilities
// TODO: Add migration utilities when needed

// Types
export * from './types/v2-types'

// Re-exports for convenience
import { CacheKeys, QueryOptionsPresets, useQueryPerformanceMonitor } from './core/useCacheStrategyV2'
export { CacheKeys, QueryOptionsPresets, useQueryPerformanceMonitor }
// Realtime exports temporarily disabled due to dependency issues
// Connection exports temporarily disabled due to dependency issues
// Auth exports removed - use useAuth from @/providers instead

/**
 * V2 Hook Groups for Easy Migration
 */
export const V2Hooks = {
  // Most hooks are exported individually above
  // Use individual imports instead of this grouped object
  cache: {
    CacheKeys,
    QueryOptionsPresets,
    useQueryPerformanceMonitor
  }
} as const

// Import statements for easy copy-paste
export const ImportExamples = {
  // Core V2 imports
  auth: "import { useAuth } from '@/providers' // useAuthV2 integrated into AuthProvider",
  connection: "import { useConnectionV2, useNetworkQuality } from '@/hooks'",
  realtime: "import { useRealtimeQueryV2, useRealtimeListV2 } from '@/hooks'",
  cache: "import { CacheKeys, QueryOptionsPresets } from '@/hooks'",
  
  // Feature V2 imports (Actually Implemented)
  activities: "import { useActivitiesV2, useActivityLogsV2, useAuditLogsV2 } from '@/hooks'",
  content: "import { useContentV2 } from '@/hooks'",
  interactions: "import { useInteractionsV2 } from '@/hooks'",
  membership: "import { useMembershipV2 } from '@/hooks'",
  notifications: "import { useNotificationsV2 } from '@/hooks'",
  search: "import { useSearchV2 } from '@/hooks'",
  settings: "import { useSettingsV2 } from '@/hooks'",
  statistics: "import { useStatisticsV2 } from '@/hooks'",
  comments: "import { useCommentsV2 } from '@/hooks'",
  members: "import { useMembersV2 } from '@/hooks'",
  profile: "import { useProfileV2 } from '@/hooks'",
  
  // Migration utilities
  migration: "import { useMigrationProgress, MigrationUtils } from '@/hooks'"
} as const