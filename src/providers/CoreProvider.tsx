/**
 * CoreProvider - 단순화된 통합 Provider
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { connectionCore } from '@/lib/core/connection-core'
import { realtimeCore } from '@/lib/core/realtime-core'
import { globalRealtimeManager } from '@/lib/realtime/GlobalRealtimeManager'

interface CoreProviderState {
  isInitialized: boolean
  isReconnecting: boolean
}

const CoreContext = createContext<CoreProviderState>({
  isInitialized: false,
  isReconnecting: false
})

// TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})

/**
 * 단순화된 CoreProvider
 */
export function CoreProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[CoreProvider] Initializing...')
        
        // GlobalRealtimeManager 초기화
        globalRealtimeManager.setQueryClient(queryClient)
        
        try {
          await globalRealtimeManager.initialize()
        } catch (error) {
          console.error('[CoreProvider] Realtime initialization failed:', error)
        }
        
        // 클라이언트 변경 감지 (재연결 시)
        connectionCore.onClientChange(async (newClient) => {
          console.log('[CoreProvider] Client recreated, refreshing data...')
          setIsReconnecting(true)
          
          // 캐시 클리어 및 재조회
          queryClient.clear()
          await queryClient.refetchQueries()
          
          setIsReconnecting(false)
        })
        
        setIsInitialized(true)
        console.log('[CoreProvider] Initialized')
      } catch (error) {
        console.error('[CoreProvider] Initialization error:', error)
        setIsInitialized(true) // 에러가 나도 앱은 계속 실행
      }
    }

    initialize()

    return () => {
      console.log('[CoreProvider] Cleaning up...')
      realtimeCore.cleanup()
      globalRealtimeManager.cleanup()
    }
  }, [])

  // 개발 환경 디버그
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      (window as any).__DEBUG__ = {
        connection: () => connectionCore.getStatus(),
        realtime: () => realtimeCore.getStatus(),
        recreateClient: () => connectionCore.recreateClient(),
        clearCache: () => queryClient.clear(),
      }
      console.log('[CoreProvider] Debug functions: window.__DEBUG__')
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <CoreContext.Provider value={{ isInitialized, isReconnecting }}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </CoreContext.Provider>
    </QueryClientProvider>
  )
}

export function useCore() {
  const context = useContext(CoreContext)
  if (!context) {
    throw new Error('useCore must be used within CoreProvider')
  }
  return context
}