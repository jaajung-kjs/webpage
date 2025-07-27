// Performance monitoring utilities

interface WebVitalsMetric {
  name: string
  value: number
  id: string
  delta: number
  entries: PerformanceEntry[]
}

export const reportWebVitals = (metric: WebVitalsMetric) => {
  // Log performance metrics
  console.log(`Web Vital: ${metric.name}`, {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta,
    rating: getMetricRating(metric.name, metric.value),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
  })

  // Send to analytics service in production
  if (process.env.NODE_ENV === 'production') {
    sendToAnalytics(metric)
  }
}

// Performance rating based on Web Vitals thresholds
function getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    CLS: { good: 0.1, poor: 0.25 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
    INP: { good: 200, poor: 500 }
  }

  const threshold = thresholds[name as keyof typeof thresholds]
  if (!threshold) return 'good'

  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

// Send metrics to external analytics service
function sendToAnalytics(metric: WebVitalsMetric) {
  // Google Analytics 4 example
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  }

  // Custom analytics endpoint
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...metric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }),
  }).catch(error => {
    console.error('Failed to send Web Vitals to analytics:', error, metric)
  })
}

// Lazy loading intersection observer
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => {
  if (typeof window === 'undefined') return null
  
  return new IntersectionObserver(callback, {
    rootMargin: '10px',
    threshold: 0.1,
    ...options,
  })
}

// Debounce function for search and other user inputs
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function for scroll events
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Check if device is mobile
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Get network connection info
export const getNetworkInfo = () => {
  if (typeof window === 'undefined') return null
  
  // Check if connection API is available
  if ('connection' in navigator) {
    const connection = (navigator as { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection
    if (connection) {
      const info = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      }
      
      // Log significant network changes
      console.log('Network info updated:', info)
      return info
    }
  }
  
  return null
}

// Monitor performance continuously
export const startPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return

  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.log('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
              url: window.location.href
            })
          }
        })
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })

      // Monitor layout shifts
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.hadRecentInput) return // Ignore shifts caused by user input
          
          console.log('Layout shift detected:', {
            value: entry.value,
            startTime: entry.startTime,
            sources: entry.sources?.map((source: any) => ({
              node: source.node?.tagName,
              currentRect: source.currentRect,
              previousRect: source.previousRect
            })),
            url: window.location.href
          })
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })

    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error)
    }
  }

  // Monitor resource loading
  window.addEventListener('load', () => {
    // Report initial page load metrics
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        console.log('Page load completed:', {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: getFirstPaint(),
          resourceCount: performance.getEntriesByType('resource').length,
          url: window.location.href
        })
      }
    }, 0)
  })
}

// Get First Paint timing
function getFirstPaint(): number | null {
  const paintEntries = performance.getEntriesByType('paint')
  const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
  return firstPaint ? firstPaint.startTime : null
}

// Preload critical resources
export const preloadResource = (href: string, as: string) => {
  if (typeof window === 'undefined') return
  
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  link.as = as
  document.head.appendChild(link)
}