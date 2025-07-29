'use client'

import { useEffect } from 'react'
import { getPerformanceMonitor } from '@/lib/utils/performance-monitor'

interface PerformanceProviderProps {
  children: React.ReactNode
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  useEffect(() => {
    // Get performance monitor instance
    const monitor = getPerformanceMonitor()
    
    // Report metrics after page load
    if (typeof window !== 'undefined') {
      const handleLoad = () => {
        setTimeout(() => {
          monitor?.reportMetrics()
        }, 3000)
      }
      
      if (document.readyState === 'complete') {
        handleLoad()
      } else {
        window.addEventListener('load', handleLoad)
      }
    }
    
    return () => {
      // Cleanup on unmount
      monitor?.cleanup()
    }
  }, [])

  return <>{children}</>
}