/**
 * useConnectionV2 - 최적화된 연결 상태 Hook
 * 
 * Supabase의 자동 재연결에 의존하므로 최소한의 상태만 관리
 */

import { useState, useEffect } from 'react'
import { connectionCore } from '@/lib/core/connection-core'

export interface ConnectionStateV2 {
  isConnected: boolean
  connectionState: 'online' | 'offline'
}

export function useConnectionV2() {
  const [state, setState] = useState<ConnectionStateV2>(() => {
    const status = connectionCore.getStatus()
    return {
      isConnected: status.state === 'online',
      connectionState: status.state
    }
  })

  useEffect(() => {
    // visibilitychange 이벤트로 탭 활성화 감지
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const status = connectionCore.getStatus()
        setState({
          isConnected: status.state === 'online',
          connectionState: status.state
        })
      }
    }

    // focus 이벤트로 창 포커스 감지
    const handleFocus = () => {
      const status = connectionCore.getStatus()
      setState({
        isConnected: status.state === 'online',
        connectionState: status.state
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return {
    ...state,
    // 호환성을 위한 최소한의 필드
    isError: state.connectionState === 'offline',
    isReconnecting: false, // Supabase가 자동 처리
    reconnect: async () => {
      // Visibility handler가 자동으로 처리하므로 수동 재연결 불필요
      console.log('[useConnectionV2] Manual reconnect called - handled by visibility handler')
      return true
    }
  }
}