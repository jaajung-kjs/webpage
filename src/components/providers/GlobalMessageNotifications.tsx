/**
 * Global Message Notifications Provider
 * 
 * Provides global message notifications across all pages
 */

'use client'

import { useGlobalMessageNotifications } from '@/hooks/useGlobalMessageNotifications'

export function GlobalMessageNotifications() {
  // This hook sets up the global message listener
  useGlobalMessageNotifications()
  
  // This component doesn't render anything
  return null
}