/**
 * useConnection - 연결 상태 관리 Hook
 * 
 * ConnectionCore의 React 바인딩
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { connectionCore, ConnectionStatus } from '@/lib/core/connection-core'

/**
 * 연결 상태를 관리하는 Hook
 */
export function useConnection() {
  const [status, setStatus] = useState<ConnectionStatus>(() => 
    connectionCore.getStatus()
  )

  useEffect(() => {
    // 연결 상태 구독
    const unsubscribe = connectionCore.subscribe(setStatus)
    return unsubscribe
  }, [])

  const reconnect = useCallback(async () => {
    await connectionCore.reconnect()
  }, [])

  return {
    isConnected: status.state === 'connected',
    isConnecting: status.state === 'connecting',
    isError: status.state === 'error',
    connectionState: status.state,
    lastError: status.lastError,
    reconnectAttempts: status.reconnectAttempts,
    isVisible: status.isVisible,
    reconnect
  }
}

/**
 * 연결 상태만 간단히 확인하는 Hook
 */
export function useIsConnected(): boolean {
  const [isConnected, setIsConnected] = useState(() => 
    connectionCore.isConnected()
  )

  useEffect(() => {
    const unsubscribe = connectionCore.subscribe((status) => {
      setIsConnected(status.state === 'connected')
    })
    return unsubscribe
  }, [])

  return isConnected
}