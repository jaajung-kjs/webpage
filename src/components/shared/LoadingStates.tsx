'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { fadeIn, pulse, spin } from '@/lib/animations'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text = '로딩 중...'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <motion.div 
      {...fadeIn}
      className={cn("flex flex-col items-center justify-center gap-3", className)}
    >
      <motion.div
        {...spin}
        className={cn(
          "rounded-full border-2 border-primary border-t-transparent",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </motion.div>
  )
}

interface LoadingDotsProps {
  text?: string
  className?: string
}

export function LoadingDots({ text = '로딩 중', className }: LoadingDotsProps) {
  return (
    <motion.div 
      {...fadeIn}
      className={cn("flex items-center gap-1", className)}
    >
      <span className="text-sm text-muted-foreground">{text}</span>
      <motion.span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="h-1 w-1 rounded-full bg-primary"
          />
        ))}
      </motion.span>
    </motion.div>
  )
}

interface LoadingPulseProps {
  className?: string
}

export function LoadingPulse({ className }: LoadingPulseProps) {
  return (
    <motion.div
      {...pulse}
      className={cn(
        "h-2 w-2 rounded-full bg-primary",
        className
      )}
    />
  )
}

interface LoadingBarProps {
  progress?: number
  className?: string
}

export function LoadingBar({ progress, className }: LoadingBarProps) {
  return (
    <div className={cn("h-1 w-full bg-muted rounded-full overflow-hidden", className)}>
      <motion.div
        initial={{ width: '0%' }}
        animate={{ 
          width: progress ? `${progress}%` : '100%',
          x: progress ? 0 : '100%'
        }}
        transition={
          progress 
            ? { duration: 0.3 } 
            : { duration: 1.5, repeat: Infinity, ease: "linear" }
        }
        className="h-full kepco-gradient"
      />
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ 
  title = '오류가 발생했습니다',
  message = '잠시 후 다시 시도해주세요.',
  onRetry,
  className
}: ErrorStateProps) {
  return (
    <motion.div 
      {...fadeIn}
      className={cn("flex flex-col items-center justify-center gap-4 py-12", className)}
    >
      <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          다시 시도
        </Button>
      )}
    </motion.div>
  )
}

interface EmptyStateProps {
  title?: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  title = '데이터가 없습니다',
  message = '아직 표시할 내용이 없습니다.',
  action,
  className
}: EmptyStateProps) {
  return (
    <motion.div 
      {...fadeIn}
      className={cn("flex flex-col items-center justify-center gap-4 py-12", className)}
    >
      <div className="text-center space-y-2">
        <h3 className="font-semibold text-lg text-muted-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      </div>
      {action && (
        <Button
          className="kepco-gradient"
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}

interface LoadingCardProps {
  className?: string
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="h-2 kepco-gradient-animated" />
        <div className="p-6">
          <LoadingSpinner size="md" text="콘텐츠 로딩 중..." />
        </div>
      </CardContent>
    </Card>
  )
}

// Inline loading for buttons and small areas
export function InlineLoading() {
  return (
    <span className="inline-flex items-center gap-2">
      <motion.span
        {...spin}
        className="h-3 w-3 rounded-full border border-current border-t-transparent"
      />
      <span>처리 중...</span>
    </span>
  )
}