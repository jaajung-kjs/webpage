/**
 * Background Recovery Test Page
 * 
 * 새로운 아키텍처의 백그라운드 복구 기능을 테스트하는 페이지
 */

'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/providers'
import { useConnectionV2 } from '@/hooks/core/useConnectionV2'
import { useQuery } from '@tanstack/react-query'
import { connectionCore } from '@/lib/core/connection-core'
import { supabaseClient } from '@/lib/core/connection-core'
import { CheckCircle, XCircle, RefreshCw, Wifi, WifiOff, Monitor, Eye, EyeOff } from 'lucide-react'

export default function BackgroundRecoveryTestPage() {
  const { user, profile } = useAuth()
  const connection = useConnectionV2()
  const status = {
    state: connection.connectionState,
    reconnectAttempts: connection.reconnectAttempts,
    lastConnectedAt: null,
    lastError: connection.lastError,
    isVisible: connection.isVisible
  }
  const [testResults, setTestResults] = useState<{
    visibilityTest: 'pending' | 'testing' | 'passed' | 'failed'
    reconnectTest: 'pending' | 'testing' | 'passed' | 'failed'
    dataRefreshTest: 'pending' | 'testing' | 'passed' | 'failed'
    realtimeTest: 'pending' | 'testing' | 'passed' | 'failed'
  }>({
    visibilityTest: 'pending',
    reconnectTest: 'pending',
    dataRefreshTest: 'pending',
    realtimeTest: 'pending'
  })
  
  const [logs, setLogs] = useState<string[]>([])
  const [isPageHidden, setIsPageHidden] = useState(false)
  const [connectionHistory, setConnectionHistory] = useState<Array<{
    time: string
    event: string
    state: string
  }>>([])
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }
  
  const addConnectionEvent = (event: string, state: string) => {
    setConnectionHistory(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      event,
      state
    }])
  }
  
  // Monitor visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.hidden
      setIsPageHidden(hidden)
      addLog(`Page visibility changed: ${hidden ? 'hidden' : 'visible'}`)
      addConnectionEvent(
        hidden ? 'Page Hidden' : 'Page Visible',
        status.state
      )
      
      if (!hidden) {
        // Page became visible - test recovery
        addLog('Testing automatic recovery after page becomes visible...')
        setTestResults(prev => ({ ...prev, visibilityTest: 'testing' }))
        
        setTimeout(() => {
          if (status.state === 'connected') {
            setTestResults(prev => ({ ...prev, visibilityTest: 'passed' }))
            addLog('✅ Visibility recovery test PASSED')
          } else {
            setTestResults(prev => ({ ...prev, visibilityTest: 'failed' }))
            addLog('❌ Visibility recovery test FAILED')
          }
        }, 2000)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [status.state])
  
  // Monitor connection changes
  useEffect(() => {
    addConnectionEvent('Connection State Change', status.state)
    addLog(`Connection state: ${status.state}`)
  }, [status.state])
  
  // Test data query with auto-refresh
  const { data: testData, isLoading, error, refetch } = useQuery({
    queryKey: ['test', 'timestamp'],
    queryFn: async () => {
      const { data, error } = await supabaseClient()
        .from('users_v2')
        .select('id, created_at')
        .eq('id', user?.id || '')
        .single()
      
      if (error) throw error
      return {
        ...data,
        fetchedAt: new Date().toISOString()
      }
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    staleTime: 5000 // 5 seconds
  })
  
  // Test reconnection
  const testReconnection = async () => {
    addLog('Starting reconnection test...')
    setTestResults(prev => ({ ...prev, reconnectTest: 'testing' }))
    
    try {
      // Force disconnect
      addLog('Forcing disconnect...')
      await connectionCore.disconnect()
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reconnect
      addLog('Attempting reconnection...')
      await connectionCore.connect()
      
      // Check status
      const finalStatus = connectionCore.getStatus()
      if (finalStatus.state === 'connected') {
        setTestResults(prev => ({ ...prev, reconnectTest: 'passed' }))
        addLog('✅ Reconnection test PASSED')
      } else {
        setTestResults(prev => ({ ...prev, reconnectTest: 'failed' }))
        addLog('❌ Reconnection test FAILED')
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, reconnectTest: 'failed' }))
      addLog(`❌ Reconnection test error: ${error}`)
    }
  }
  
  // Test data refresh
  const testDataRefresh = async () => {
    addLog('Starting data refresh test...')
    setTestResults(prev => ({ ...prev, dataRefreshTest: 'testing' }))
    
    try {
      await refetch()
      setTestResults(prev => ({ ...prev, dataRefreshTest: 'passed' }))
      addLog('✅ Data refresh test PASSED')
    } catch (error) {
      setTestResults(prev => ({ ...prev, dataRefreshTest: 'failed' }))
      addLog(`❌ Data refresh test error: ${error}`)
    }
  }
  
  // Test realtime subscription
  const testRealtimeSubscription = async () => {
    addLog('Starting realtime subscription test...')
    setTestResults(prev => ({ ...prev, realtimeTest: 'testing' }))
    
    try {
      const channel = supabaseClient()
        .channel('test-channel')
        .on('presence', { event: 'sync' }, () => {
          addLog('Realtime presence sync received')
        })
        .subscribe()
      
      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const status = channel.state
      if (status === 'joined') {
        setTestResults(prev => ({ ...prev, realtimeTest: 'passed' }))
        addLog('✅ Realtime subscription test PASSED')
      } else {
        setTestResults(prev => ({ ...prev, realtimeTest: 'failed' }))
        addLog(`❌ Realtime subscription test FAILED: ${status}`)
      }
      
      // Cleanup
      await supabaseClient().removeChannel(channel)
    } catch (error) {
      setTestResults(prev => ({ ...prev, realtimeTest: 'failed' }))
      addLog(`❌ Realtime test error: ${error}`)
    }
  }
  
  // Run all tests
  const runAllTests = async () => {
    setLogs([])
    setTestResults({
      visibilityTest: 'pending',
      reconnectTest: 'pending',
      dataRefreshTest: 'pending',
      realtimeTest: 'pending'
    })
    
    addLog('Starting all tests...')
    
    await testReconnection()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testDataRefresh()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testRealtimeSubscription()
    
    addLog('All tests completed!')
  }
  
  const getTestIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'testing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }
  
  const getConnectionIcon = () => {
    switch (status.state) {
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-500" />
      case 'connecting':
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'error':
        return <WifiOff className="h-5 w-5 text-red-500" />
      default:
        return <WifiOff className="h-5 w-5 text-gray-500" />
    }
  }
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">백그라운드 복구 테스트</h1>
        <p className="text-muted-foreground">
          새로운 아키텍처의 백그라운드 복구 기능을 테스트합니다.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getConnectionIcon()}
              연결 상태
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>상태:</span>
              <Badge variant={status.state === 'connected' ? 'default' : 'destructive'}>
                {status.state}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>페이지 표시:</span>
              <Badge variant={isPageHidden ? 'secondary' : 'default'}>
                {isPageHidden ? 'Hidden' : 'Visible'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>재연결 시도:</span>
              <span>{status.reconnectAttempts}</span>
            </div>
            {status.lastConnectedAt && (
              <div className="flex justify-between">
                <span>마지막 연결:</span>
                <span className="text-sm">
                  {new Date(status.lastConnectedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>테스트 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>페이지 전환 복구</span>
              {getTestIcon(testResults.visibilityTest)}
            </div>
            <div className="flex items-center justify-between">
              <span>재연결 테스트</span>
              {getTestIcon(testResults.reconnectTest)}
            </div>
            <div className="flex items-center justify-between">
              <span>데이터 갱신</span>
              {getTestIcon(testResults.dataRefreshTest)}
            </div>
            <div className="flex items-center justify-between">
              <span>실시간 구독</span>
              {getTestIcon(testResults.realtimeTest)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Test Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>테스트 제어</CardTitle>
          <CardDescription>
            브라우저 탭을 전환하거나 아래 버튼으로 테스트를 실행하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runAllTests} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              모든 테스트 실행
            </Button>
            <Button 
              onClick={testReconnection} 
              variant="outline"
              className="flex-1"
            >
              재연결 테스트
            </Button>
            <Button 
              onClick={testDataRefresh} 
              variant="outline"
              className="flex-1"
            >
              데이터 갱신 테스트
            </Button>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">📋 테스트 방법:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>이 페이지를 열어둔 상태에서 다른 탭으로 전환하세요</li>
              <li>30초 이상 다른 탭에 머무르세요</li>
              <li>다시 이 탭으로 돌아와서 자동 복구를 확인하세요</li>
              <li>또는 위 버튼으로 개별 테스트를 실행하세요</li>
            </ol>
          </div>
        </CardContent>
      </Card>
      
      {/* Connection History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>연결 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {connectionHistory.length === 0 ? (
              <p className="text-muted-foreground text-sm">아직 이벤트가 없습니다</p>
            ) : (
              connectionHistory.map((event, i) => (
                <div key={i} className="flex gap-2 text-sm font-mono">
                  <span className="text-muted-foreground">{event.time}</span>
                  <span className="font-semibold">{event.event}</span>
                  <Badge variant="outline" className="text-xs">
                    {event.state}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>실행 로그</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
            {logs.length === 0 ? (
              <p>테스트를 실행하면 로그가 여기에 표시됩니다...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}