'use client'

import { useEffect } from 'react'
import { reportWebVitals, startPerformanceMonitoring } from '@/lib/performance'

interface PerformanceProviderProps {
  children: React.ReactNode
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  useEffect(() => {
    // Start continuous performance monitoring
    startPerformanceMonitoring()

    // Report Web Vitals when available
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      // If web-vitals library is loaded globally
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = (window as any)['web-vitals']
      
      if (getCLS) getCLS(reportWebVitals)
      if (getFID) getFID(reportWebVitals)  
      if (getFCP) getFCP(reportWebVitals)
      if (getLCP) getLCP(reportWebVitals)
      if (getTTFB) getTTFB(reportWebVitals)
    }

    // Fallback: Report basic performance metrics
    const reportBasicMetrics = () => {
      if ('performance' in window && 'timing' in performance) {
        const timing = performance.timing
        const navigationStart = timing.navigationStart

        // Calculate basic metrics
        const metrics = {
          domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
          pageLoad: timing.loadEventEnd - navigationStart,
          firstPaint: 0, // Will be updated if available
          resourceCount: performance.getEntriesByType('resource').length
        }

        // Get First Paint if available
        const paintEntries = performance.getEntriesByType('paint')
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
        if (firstPaint) {
          metrics.firstPaint = firstPaint.startTime
        }

        // Report as custom metrics
        Object.entries(metrics).forEach(([name, value]) => {
          if (value > 0) {
            reportWebVitals({
              name: name.toUpperCase(),
              value,
              id: `${name}-${Date.now()}`,
              delta: value,
              entries: []
            })
          }
        })
      }
    }

    // Report basic metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(reportBasicMetrics, 100)
    } else {
      window.addEventListener('load', () => setTimeout(reportBasicMetrics, 100))
    }

    // Monitor page visibility changes for performance
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page became hidden - log session time
        const sessionTime = performance.now()
        reportWebVitals({
          name: 'SESSION_TIME',
          value: sessionTime,
          id: `session-${Date.now()}`,
          delta: sessionTime,
          entries: []
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return <>{children}</>
}