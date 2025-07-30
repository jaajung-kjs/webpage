'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { PerformanceProvider } from './performance-provider'
import { Toaster } from '@/components/ui/sonner'

interface OptimizedProvidersProps {
  children: ReactNode
}

export function OptimizedProviders({ children }: OptimizedProvidersProps) {
  return (
    <ErrorBoundary>
      <PerformanceProvider>
        {children}
        <Toaster />
      </PerformanceProvider>
    </ErrorBoundary>
  )
}

// Create async loading boundary for heavy components
export function AsyncBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">오류가 발생했습니다.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-primary underline"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}