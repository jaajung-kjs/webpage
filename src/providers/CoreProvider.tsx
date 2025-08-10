/**
 * CoreProvider - 통합 Provider 컴포넌트
 * 
 * 모든 핵심 시스템을 초기화하고 제공
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { connectionCore } from '@/lib/core/connection-core'
import { authManager } from '@/lib/core/auth-manager'
// Removed redundant realtimeSync - GlobalRealtimeManager handles all real-time updates
import { connectionRecovery } from '@/lib/core/connection-recovery'
import { globalRealtimeManager } from '@/lib/realtime/GlobalRealtimeManager'

// Provider 상태
interface CoreProviderState {
  isInitialized: boolean
}

// Context
const CoreContext = createContext<CoreProviderState>({
  isInitialized: false
})

// TanStack Query Client 설정 (Real-time 최적화)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분 (Real-time이 업데이트를 처리)
      gcTime: 10 * 60 * 1000, // 10분 (메모리 효율성)
      retry: (failureCount, error: any) => {
        // DB 스키마 에러나 존재하지 않는 컬럼 에러는 재시도하지 않음
        if (error?.code === 'PGRST116' || error?.message?.includes('does not exist')) {
          return false
        }
        // 일반적인 네트워크 에러만 최대 1번 재시도
        return failureCount < 1
      },
      retryDelay: 1000, // 1초 고정
      refetchOnWindowFocus: false, // Real-time이 처리하므로 비활성화
      refetchOnReconnect: true, // 연결 복구 시에는 필요
      throwOnError: false, // 에러를 조용히 처리하여 UI에 빈 상태 표시
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})

/**
 * 핵심 시스템 Provider
 */
export function CoreProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // 초기화 로직
    const initialize = async () => {
      try {
        console.log('[CoreProvider] Initializing core systems...')
        
        // ConnectionCore는 싱글톤이므로 자동 초기화됨
        // AuthManager도 싱글톤이므로 자동 초기화됨
        
        // RealtimeSync removed - GlobalRealtimeManager handles all real-time updates
        
        // ConnectionRecovery에 QueryClient 설정
        connectionRecovery.setQueryClient(queryClient)
        
        // GlobalRealtimeManager에 QueryClient 설정 및 초기화
        globalRealtimeManager.setQueryClient(queryClient)
        
        // 초기 연결 시도
        await connectionCore.connect()
        
        // Realtime 구독 초기화
        await globalRealtimeManager.initialize()
        
        // 연결 상태 변경 시 쿼리 재검증 (ConnectionRecovery가 이제 처리)
        connectionCore.subscribe((status) => {
          if (status.state === 'connected' && status.isVisible) {
            console.log('[CoreProvider] Connection restored, handled by ConnectionRecovery')
            // ConnectionRecovery가 더 정교하게 처리하므로 여기서는 간단한 처리만
          }
        })
        
        setIsInitialized(true)
        console.log('[CoreProvider] Core systems initialized')
      } catch (error) {
        console.error('[CoreProvider] Initialization error:', error)
        setIsInitialized(true) // 에러가 나도 앱은 계속 실행
      }
    }

    initialize()

    // Cleanup
    return () => {
      console.log('[CoreProvider] Cleaning up...')
      globalRealtimeManager.cleanup()
    }
  }, [])

  // 개발 환경에서 디버그 정보 표시
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // 전역 디버그 함수 등록
      if (typeof window !== 'undefined') {
        (window as any).__DEBUG__ = {
          connection: () => connectionCore.getStatus(),
          auth: () => authManager.getState(),
          queryClient: () => queryClient.getQueryCache().getAll(),
          clearCache: () => queryClient.clear()
        }
        
        console.log('[CoreProvider] Debug functions registered: window.__DEBUG__')
      }
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <CoreContext.Provider value={{ isInitialized }}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </CoreContext.Provider>
    </QueryClientProvider>
  )
}

/**
 * Core Context 사용 Hook
 */
export function useCore() {
  const context = useContext(CoreContext)
  if (!context) {
    throw new Error('useCore must be used within CoreProvider')
  }
  return context
}