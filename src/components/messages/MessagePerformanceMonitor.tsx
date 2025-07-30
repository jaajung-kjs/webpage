/**
 * Message Performance Monitor Component
 * 
 * Development tool for monitoring messaging system performance
 * Only visible in development or for admin users
 */

'use client'

import { useState, useEffect } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { CacheManager } from '@/lib/utils/cache-manager'
import { MessageNotifications } from '@/lib/api/messages'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Clock, 
  Database, 
  Bell, 
  BarChart3, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { motion } from 'framer-motion'

export function MessagePerformanceMonitor() {
  const { user, isAdmin } = useOptimizedAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // 관리자 또는 개발 환경에서만 표시
  const shouldShow = isAdmin && (process.env.NODE_ENV === 'development' || user?.email?.includes('@admin'))
  
  useEffect(() => {
    if (!shouldShow) return
    
    loadMetrics()
    
    // 30초마다 자동 새로고침
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [shouldShow])
  
  const loadMetrics = () => {
    const notificationStatus = MessageNotifications.getNotificationStatus()
    
    // CacheManager는 리포트 기능이 없으므로 기본 메트릭만 표시
    const defaultMetrics = {
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      efficiency: 'N/A'
    }
    
    setMetrics({
      cache: defaultMetrics,
      notifications: notificationStatus,
      timestamp: new Date().toLocaleTimeString()
    })
  }
  
  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 500)) // 시각적 피드백
    loadMetrics()
    setRefreshing(false)
  }
  
  const testNotification = () => {
    MessageNotifications.showNewMessageNotification(
      '테스트 사용자',
      '알림 시스템이 정상적으로 작동합니다.'
    )
  }
  
  if (!shouldShow || !metrics) {
    return null
  }
  
  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'Excellent': return 'text-green-600'
      case 'Good': return 'text-blue-600'
      case 'Fair': return 'text-yellow-600'
      case 'Poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }
  
  const getNotificationStatusIcon = (enabled: boolean, supported: boolean) => {
    if (!supported) return <XCircle className="h-4 w-4 text-red-500" />
    if (enabled) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50 max-w-sm"
    >
      <Card className="border-2 border-primary/20 bg-background/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              메시지 시스템 모니터
            </CardTitle>
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={refreshing}
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            마지막 업데이트: {metrics.timestamp}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 캐시 성능 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">캐시 성능</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>히트율</span>
                <Badge 
                  variant="secondary" 
                  className={getEfficiencyColor(metrics.cache.efficiency)}
                >
                  {metrics.cache.hitRate}%
                </Badge>
              </div>
              <Progress value={metrics.cache.hitRate} className="h-1" />
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">총 요청</div>
                <div className="font-medium">{metrics.cache.totalRequests}</div>
              </div>
              <div>
                <div className="text-muted-foreground">평균 응답</div>
                <div className="font-medium">{metrics.cache.averageResponseTime}ms</div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-green-600">히트: {metrics.cache.cacheHits}</span>
              <span className="text-red-600">미스: {metrics.cache.cacheMisses}</span>
            </div>
          </div>
          
          {/* 알림 상태 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">알림 시스템</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getNotificationStatusIcon(
                  metrics.notifications.enabled,
                  metrics.notifications.supported
                )}
                <span className="text-xs">
                  {metrics.notifications.enabled 
                    ? '활성화됨' 
                    : metrics.notifications.supported 
                      ? '비활성화됨' 
                      : '지원되지 않음'
                  }
                </span>
              </div>
              <Button
                onClick={testNotification}
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2"
              >
                테스트
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              권한: {metrics.notifications.permission}
            </div>
          </div>
          
          {/* 시스템 효율성 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-medium">전체 효율성</span>
            </div>
            
            <Badge 
              variant="outline" 
              className={`w-full justify-center ${getEfficiencyColor(metrics.cache.efficiency)}`}
            >
              {metrics.cache.efficiency}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

