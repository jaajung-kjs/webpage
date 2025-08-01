/**
 * Conversation Thread Component
 * 
 * Real-time chat interface for 1:1 conversations
 * Handles message sending, reading status, and auto-scroll
 */

'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { useRealtimeConversation } from '@/hooks/useRealtime'
import { MessagesAPI } from '@/lib/api/messages'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Send, User, Loader2, Check, CheckCheck, AlertCircle, MoreVertical, RotateCw, Trash2, Clock } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { MessageWithSender } from '@/lib/api/messages'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// 개발 환경 체크
const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}
const logError = console.error // 에러는 항상 출력

interface ConversationThreadProps {
  conversationId: string
  recipientId: string
  recipientName: string
  recipientAvatar?: string | null
  onBack?: () => void
  className?: string
}

export function ConversationThread({
  conversationId,
  recipientId,
  recipientName,
  recipientAvatar,
  onBack,
  className
}: ConversationThreadProps) {
  const { user, profile } = useOptimizedAuth()
  const { messages, loading, error, addOptimisticMessage, replaceOptimisticMessage, updateMessageStatus } = useRealtimeConversation(conversationId, user?.id)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [optimisticId, setOptimisticId] = useState<string | null>(null)
  const [recentMessageIds, setRecentMessageIds] = useState<Set<string>>(new Set())
  const [failedMessages, setFailedMessages] = useState<Map<string, string>>(new Map()) // 실패한 메시지 내용 저장
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousMessageCountRef = useRef(0)


  // 자동 스크롤 (디바운스 적용)
  useEffect(() => {
    // 메시지가 추가되었을 때만 스크롤 (초기 로드 또는 새 메시지)
    if (messages.length > previousMessageCountRef.current) {
      // 이전 타이머 취소
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // 디바운스로 스크롤 지연
      scrollTimeoutRef.current = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: messages.length > 20 ? 'auto' : 'smooth' // 많은 메시지일 때는 즉시 스크롤
        })
      }, 100)
    }
    
    previousMessageCountRef.current = messages.length
    
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [messages.length])

  // 대화방 진입 시 메시지 읽음 처리 (중복 방지)
  useEffect(() => {
    if (user && conversationId && messages.length > 0) {
      // 읽지 않은 메시지가 있는지 확인 후 읽음 처리
      const hasUnreadMessages = messages.some((msg: MessageWithSender) => 
        msg.recipient_id === user.id && !msg.is_read
      )
      
      if (hasUnreadMessages) {
        log('📖 Marking messages as read for conversation:', conversationId)
        MessagesAPI.markMessagesAsRead(user.id, conversationId)
      }
    }
  }, [user, conversationId, messages.length])

  // 메시지 재전송
  const handleRetryMessage = async (messageId: string) => {
    const messageContent = failedMessages.get(messageId)
    if (!messageContent || !user) return

    // 실패한 메시지를 다시 sending 상태로 변경
    updateMessageStatus(messageId, {
      status: 'sending'
    })

    try {
      const result = await MessagesAPI.sendMessage(
        user.id,
        recipientId,
        messageContent,
        conversationId
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      // 성공 시 상태만 업데이트
      if (result.data) {
        updateMessageStatus(messageId, {
          status: 'sent',
          serverMessageId: result.data.id,
          is_read: result.data.is_read,
          read_at: result.data.read_at
        })
        // 실패 목록에서 제거
        setFailedMessages(prev => {
          const next = new Map(prev)
          next.delete(messageId)
          return next
        })
      }
    } catch (error) {
      // 재전송도 실패 - 상태만 변경
      updateMessageStatus(messageId, {
        status: 'failed'
      })
      toast.error('재전송에 실패했습니다.')
    }
  }

  // 메시지 삭제
  const handleDeleteMessage = (messageId: string) => {
    replaceOptimisticMessage(messageId, null)
    setFailedMessages(prev => {
      const next = new Map(prev)
      next.delete(messageId)
      return next
    })
    toast.success('메시지가 삭제되었습니다.')
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !newMessage.trim() || sending) return

    // 자기 자신에게 메시지 보내기 방지
    if (user.id === recipientId) {
      toast.error('자기 자신에게는 메시지를 보낼 수 없습니다.')
      return
    }

    const messageContent = newMessage.trim()
    setNewMessage('')
    setSending(true)

    // 낙관적 메시지 생성
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: MessageWithSender = {
      id: tempId,
      sender_id: user.id,
      recipient_id: recipientId,
      content: messageContent,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      conversation_id: conversationId,
      sender: {
        id: user.id,
        name: profile?.name || user.email || 'You',
        avatar_url: profile?.avatar_url || null
      },
      status: 'sending' // 전송 중 상태로 시작
    }

    // UI에 즉시 추가
    setOptimisticId(tempId)
    addOptimisticMessage(optimisticMessage)
    
    // 최근 메시지로 표시 (애니메이션을 위해)
    setRecentMessageIds(prev => new Set([...prev, tempId]))
    setTimeout(() => {
      setRecentMessageIds(prev => {
        const next = new Set(prev)
        next.delete(tempId)
        return next
      })
    }, 300) // 애니메이션 시간과 동일하게

    log('🚀 Sending message:', messageContent)

    try {
      const result = await MessagesAPI.sendMessage(
        user.id,
        recipientId,
        messageContent,
        conversationId
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      log('✅ Message sent successfully:', result.data)
      
      // 상태만 업데이트 (재렌더링 최소화)
      if (result.data) {
        updateMessageStatus(tempId, {
          status: 'sent',
          serverMessageId: result.data.id,
          is_read: result.data.is_read,
          read_at: result.data.read_at
        })
      }
      setOptimisticId(null)
      
    } catch (error) {
      logError('❌ Failed to send message:', error)
      // 실패 시 상태만 변경
      updateMessageStatus(tempId, {
        status: 'failed'
      })
      // 실패한 메시지 내용 저장
      setFailedMessages(prev => new Map(prev).set(tempId, messageContent))
      toast.error('메시지 전송에 실패했습니다. 재전송하거나 삭제할 수 있습니다.')
    } finally {
      setSending(false)
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-destructive mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">오류 발생</h3>
          <p className="text-muted-foreground text-center">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("flex flex-col h-[600px]", className)}>
      {/* 헤더 */}
      <CardHeader className="flex flex-row items-center gap-3 py-4 border-b">
        {onBack && (
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="p-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        
        <Avatar className="h-8 w-8">
          <AvatarImage src={recipientAvatar || undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        
        <CardTitle className="text-lg">{recipientName}</CardTitle>
      </CardHeader>

      {/* 메시지 영역 */}
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          {loading ? (
            <ConversationSkeleton />
          ) : messages.length === 0 ? (
            <EmptyConversation recipientName={recipientName} />
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message: MessageWithSender, index: number) => {
                  const isOwn = message.sender_id === user?.id
                  const showAvatar = index === 0 || messages[index - 1]?.sender_id !== message.sender_id
                  
                  // 시간 표시 여부 결정: 다음 메시지와 1분 이상 차이나거나 마지막 메시지인 경우
                  const showTime = (() => {
                    if (index === messages.length - 1) return true // 마지막 메시지
                    
                    const currentTime = new Date(message.created_at)
                    const nextMessage = messages[index + 1]
                    
                    if (!nextMessage) return true
                    if (nextMessage.sender_id !== message.sender_id) return true // 다른 발신자
                    
                    const nextTime = new Date(nextMessage.created_at)
                    const timeDiff = Math.abs(nextTime.getTime() - currentTime.getTime())
                    
                    return timeDiff >= 60000 // 1분(60초) 이상 차이
                  })()
                  
                  // 새로 추가된 메시지만 애니메이션
                  const isRecent = recentMessageIds.has(message.id)
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={isRecent ? { opacity: 0, y: 10 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={isRecent ? { duration: 0.3, ease: "easeOut" } : undefined}
                    >
                      <MessageBubble
                        message={message}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        showTime={showTime}
                        onRetry={() => handleRetryMessage(message.id)}
                        onDelete={() => handleDeleteMessage(message.id)}
                      />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        {/* 메시지 입력 */}
        <div className="border-t p-4 space-y-2">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (newMessage.trim() && !sending) {
                    handleSendMessage(e)
                  }
                }
              }}
              placeholder="메시지를 입력하세요..."
              disabled={sending}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              maxLength={1000}
              rows={1}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              size="sm"
              className="mb-[2px]"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <div className="text-xs text-muted-foreground">
            Enter로 전송, Shift+Enter로 줄바꿈
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Individual message bubble
 */
interface MessageBubbleProps {
  message: MessageWithSender
  isOwn: boolean
  showAvatar: boolean
  showTime: boolean
  onRetry?: () => void
  onDelete?: () => void
}

const MessageBubble = memo(function MessageBubble({ message, isOwn, showAvatar, showTime, onRetry, onDelete }: MessageBubbleProps) {
  return (
    <div className={cn(
      "flex items-end gap-2",
      isOwn ? "justify-end" : "justify-start"
    )}>
      {/* 아바타 (상대방 메시지만) */}
      {!isOwn && (
        <div className="w-8">
          {showAvatar ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={message.sender.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      )}
      
      {/* 메시지 버블 */}
      <div className={cn(
        "flex flex-col gap-1",
        isOwn ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm",
          "w-fit min-w-0 max-w-xs sm:max-w-sm md:max-w-md",
          isOwn 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          <p className="whitespace-pre-wrap break-words hyphens-auto">
            {message.content}
          </p>
        </div>
        
        {/* 시간과 읽음 상태 (메시지 박스 밖) - showTime이 true일 때만 표시 */}
        {showTime && (
          <div className={cn(
            "text-xs opacity-70 flex items-center gap-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            <span title={format(new Date(message.created_at), 'yyyy년 MM월 dd일 HH:mm:ss')}>
              {(() => {
                const messageDate = new Date(message.created_at)
                const now = new Date()
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())
                
                const diffDays = Math.floor((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24))
                
                if (diffDays === 0) {
                  // 오늘: 시간만 표시
                  return format(messageDate, 'HH:mm')
                } else if (diffDays === 1) {
                  // 어제: 어제 + 시간
                  return `어제 ${format(messageDate, 'HH:mm')}`
                } else if (diffDays < 7) {
                  // 일주일 이내: 상대 시간
                  return formatDistanceToNow(messageDate, { addSuffix: true, locale: ko })
                } else {
                  // 그 이상: 날짜 + 시간
                  return format(messageDate, 'MM/dd HH:mm')
                }
              })()}
            </span>
            
            {/* 상태 아이콘 (내가 보낸 메시지만) */}
            {isOwn && (
              <div className="flex items-center gap-1 ml-1">
                {/* 전송 상태에 따른 아이콘 */}
                {message.status === 'sending' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                ) : message.status === 'failed' ? (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onRetry}>
                          <RotateCw className="h-4 w-4 mr-2" />
                          재전송
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <motion.div 
                    className="flex items-center"
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {message.is_read ? (
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                        title="읽음"
                      >
                        <CheckCheck className="h-4 w-4 text-blue-500" />
                      </motion.div>
                    ) : (
                      <Check className="h-4 w-4 text-muted-foreground" />
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // 메시지 내용이나 읽음 상태, 전송 상태가 변경될 때만 리렌더링
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.is_read === nextProps.message.is_read &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.showTime === nextProps.showTime &&
    prevProps.onRetry === nextProps.onRetry &&
    prevProps.onDelete === nextProps.onDelete
  )
})

/**
 * Empty conversation placeholder
 */
function EmptyConversation({ recipientName }: { recipientName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <User className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">대화 시작</h3>
      <p className="text-muted-foreground">
        {recipientName}님과의 첫 번째 대화를 시작해보세요.
      </p>
    </div>
  )
}

/**
 * Loading skeleton
 */
function ConversationSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn(
          "flex items-end gap-2",
          i % 2 === 0 ? "justify-start" : "justify-end"
        )}>
          {i % 2 === 0 && <Skeleton className="h-6 w-6 rounded-full" />}
          <div className={cn(
            "max-w-[70%] space-y-1",
            i % 2 === 0 ? "" : "items-end"
          )}>
            <Skeleton className={cn(
              "h-12 rounded-lg",
              i % 2 === 0 ? "w-48" : "w-32"
            )} />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}