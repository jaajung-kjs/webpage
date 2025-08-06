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
import { realtimeSync } from '@/lib/cache/realtime-sync'

// Provider 상태
interface CoreProviderState {
  isInitialized: boolean
}

// Context
const CoreContext = createContext<CoreProviderState>({
  isInitialized: false
})

// TanStack Query Client 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분 (이전 cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
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
        
        // RealtimeSync에 QueryClient 설정
        realtimeSync.setQueryClient(queryClient)
        
        // 초기 연결 시도
        await connectionCore.connect()
        
        // 연결 상태 변경 시 쿼리 재검증
        connectionCore.subscribe((status) => {
          if (status.state === 'connected' && status.isVisible) {
            console.log('[CoreProvider] Connection restored, invalidating queries')
            queryClient.invalidateQueries()
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
      // 페이지 언로드 시 정리 (옵션)
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