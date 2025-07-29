/**
 * Performance Monitoring Utility
 * 
 * Tracks and reports performance metrics for the application
 */

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
}

interface PerformanceReport {
  metrics: PerformanceMetric[]
  url: string
  userAgent: string
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: Map<string, PerformanceObserver> = new Map()
  
  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.setupObservers()
    }
  }
  
  private setupObservers() {
    // Monitor Core Web Vitals
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        this.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime, 'ms')
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.set('lcp', lcpObserver)
      
      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.recordMetric('FID', entry.processingStart - entry.startTime, 'ms')
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.set('fid', fidObserver)
      
      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            this.recordMetric('CLS', clsValue, 'score')
          }
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.set('cls', clsObserver)
      
      // Navigation timing
      if (window.performance && window.performance.timing) {
        window.addEventListener('load', () => {
          const timing = window.performance.timing
          const navigationStart = timing.navigationStart
          
          this.recordMetric('DNS', timing.domainLookupEnd - timing.domainLookupStart, 'ms')
          this.recordMetric('TCP', timing.connectEnd - timing.connectStart, 'ms')
          this.recordMetric('TTFB', timing.responseStart - navigationStart, 'ms')
          this.recordMetric('DOMContentLoaded', timing.domContentLoadedEventEnd - navigationStart, 'ms')
          this.recordMetric('Load', timing.loadEventEnd - navigationStart, 'ms')
        })
      }
    } catch (error) {
      console.warn('Failed to setup performance observers:', error)
    }
  }
  
  recordMetric(name: string, value: number, unit: string = 'ms') {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now()
    })
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value}${unit}`)
    }
  }
  
  // Measure custom operations
  startMeasure(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      this.recordMetric(name, duration, 'ms')
    }
  }
  
  // Get current metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }
  
  // Generate performance report
  generateReport(): PerformanceReport {
    return {
      metrics: this.getMetrics(),
      url: window.location.href,
      userAgent: window.navigator.userAgent,
      timestamp: Date.now()
    }
  }
  
  // Send metrics to analytics service
  async reportMetrics() {
    const report = this.generateReport()
    
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: Send to your analytics endpoint
        // await fetch('/api/analytics/performance', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(report)
        // })
        console.log('Performance report:', report)
      } catch (error) {
        console.error('Failed to send performance metrics:', error)
      }
    } else {
      console.table(report.metrics)
    }
  }
  
  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.metrics = []
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = new PerformanceMonitor()
  }
  return performanceMonitor!
}

// Utility functions
export function measurePerformance(name: string) {
  const monitor = getPerformanceMonitor()
  return monitor ? monitor.startMeasure(name) : () => {}
}

export function recordMetric(name: string, value: number, unit: string = 'ms') {
  const monitor = getPerformanceMonitor()
  if (monitor) {
    monitor.recordMetric(name, value, unit)
  }
}

// Utility function to measure component render time
export function measureRenderTime(componentName: string): () => void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      recordMetric(`${componentName}_render`, duration, 'ms')
    }
  }
  
  return () => {} // No-op in production
}

// Export types
export type { PerformanceMetric, PerformanceReport }