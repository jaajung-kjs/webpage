// Performance monitoring utilities

export const reportWebVitals = (metric: { name: string; value: number }) => {
  // Log performance metrics
  if (process.env.NODE_ENV === 'development') {
    console.log(`${metric.name}: ${metric.value}`)
  }

  // Send to analytics service
  // TODO: Integrate with your analytics service
  // Example: gtag('event', metric.name, { value: metric.value })
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
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      }
    }
  }
  
  return null
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