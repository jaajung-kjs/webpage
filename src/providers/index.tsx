/**
 * Providers 통합 export 및 RootProvider
 */

'use client'

import React from 'react'
import { CoreProvider } from './CoreProvider'
import { AuthProvider } from './AuthProvider'

// Export individual providers
export { CoreProvider, useCore } from './CoreProvider'
export { AuthProvider, useAuth } from './AuthProvider'

/**
 * 모든 Provider를 통합한 Root Provider
 */
export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <CoreProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </CoreProvider>
  )
}