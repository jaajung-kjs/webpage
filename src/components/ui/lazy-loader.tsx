'use client'

import { Suspense, lazy, ComponentType } from 'react'
import { LoadingSpinner } from './loading-spinner'

interface LazyComponentProps {
  fallback?: React.ReactNode
}

// Generic lazy component wrapper
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc)
  
  return function LazyWrapper(props: React.ComponentProps<T> & LazyComponentProps) {
    const { fallback: propFallback, ...componentProps } = props
    
    return (
      <Suspense 
        fallback={
          propFallback || 
          fallback || 
          <div className="flex min-h-[400px] items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <LazyComponent {...componentProps as React.ComponentProps<T>} />
      </Suspense>
    )
  }
}

// Predefined loading fallbacks for different page types
export const PageLoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="space-y-4 text-center">
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground">페이지를 불러오는 중...</p>
    </div>
  </div>
)

export const ComponentLoadingFallback = () => (
  <div className="flex min-h-[200px] items-center justify-center">
    <LoadingSpinner />
  </div>
)

export const CardLoadingFallback = () => (
  <div className="rounded-lg border p-6">
    <div className="flex items-center justify-center">
      <LoadingSpinner size="sm" />
    </div>
  </div>
)

// Lazy component creators for different scenarios
export const createLazyPage = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => createLazyComponent(importFunc, <PageLoadingFallback />)

export const createLazyComponentWithFallback = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => createLazyComponent(importFunc, <ComponentLoadingFallback />)

export const createLazyCard = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => createLazyComponent(importFunc, <CardLoadingFallback />)

// HOC for adding lazy loading to existing components
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function LazyWrappedComponent(props: P & LazyComponentProps) {
    const { fallback: propFallback, ...componentProps } = props
    
    return (
      <Suspense fallback={propFallback || fallback || <ComponentLoadingFallback />}>
        <Component {...componentProps as P} />
      </Suspense>
    )
  }
}