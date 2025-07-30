/**
 * Message Notification Badge Component
 * 
 * Shows unread message count on profile icon
 * Real-time updates with smooth animations
 */

'use client'

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { useRealtimeUnreadCount } from '@/hooks/useRealtime'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface MessageNotificationBadgeProps {
  className?: string
  showCount?: boolean
}

export function MessageNotificationBadge({ 
  className,
  showCount = true 
}: MessageNotificationBadgeProps) {
  const { user, isMember } = useOptimizedAuth()
  const { unreadCount, loading } = useRealtimeUnreadCount(user?.id || '')

  // 로딩 중이거나, 미인증 사용자, 또는 멤버가 아닌 경우 표시하지 않음
  if (loading || !user || !isMember || unreadCount === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        className={cn(
          "absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg ring-2 ring-white",
          className
        )}
      >
        {showCount && unreadCount > 0 ? (
          unreadCount > 99 ? '99+' : unreadCount
        ) : (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Simple red dot badge (for minimal UI)
 */
export function MessageNotificationDot({ className }: { className?: string }) {
  return (
    <MessageNotificationBadge 
      className={cn("w-3 h-3 min-w-0", className)} 
      showCount={false} 
    />
  )
}

/**
 * Animated pulse effect for new messages
 */
export function MessageNotificationPulse({ 
  children,
  hasNewMessages = false 
}: { 
  children: React.ReactNode
  hasNewMessages?: boolean 
}) {
  return (
    <div className="relative">
      {children}
      {hasNewMessages && (
        <motion.div
          className="absolute inset-0 bg-red-500 rounded-full opacity-30"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  )
}