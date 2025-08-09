/**
 * Message Inbox Component - V2 Migration
 * 
 * Displays conversations with participant info and unread counts
 * Uses V2 messaging system with dedicated tables and real-time updates
 * Migration: useConversationsV2 with proper participant data structure
 */

'use client'

import { useState } from 'react'
import { useAuthV2 } from '@/hooks/features/useAuthV2'
import { useConversationsV2, type ConversationV2 } from '@/hooks/features/useMessagesV2'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, User, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
// InboxMessage type is now handled internally by the hook

interface MessageInboxProps {
  onConversationSelect?: (conversationId: string, recipientId: string, recipientName: string, recipientAvatar?: string | null) => void
  className?: string
}

export function MessageInbox({ onConversationSelect, className }: MessageInboxProps) {
  const { user, isMember } = useAuthV2()
  const { data: conversations, isLoading: loading, error, refetch } = useConversationsV2()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    refetch()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleConversationClick = (conversation: ConversationV2) => {
    if (onConversationSelect) {
      onConversationSelect(
        conversation.id,
        conversation.participant.id,
        conversation.participant.name,
        conversation.participant.avatar_url
      )
    }
  }

  // 권한 체크
  if (!user || !isMember) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">메시지 기능</h3>
          <p className="text-muted-foreground text-center">
            메시지 기능은 정회원 이상만 사용할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-destructive mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">오류 발생</h3>
          <p className="text-muted-foreground text-center mb-4">{error?.message || '메시지를 불러올 수 없습니다.'}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          받은 메시지
        </CardTitle>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          disabled={refreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {loading ? (
            <InboxSkeleton />
          ) : conversations && conversations.length === 0 ? (
            <EmptyInbox />
          ) : (
            <AnimatePresence>
              {conversations?.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <InboxConversationItem
                    conversation={conversation}
                    onClick={() => handleConversationClick(conversation)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

/**
 * Individual conversation item in inbox
 */
interface InboxConversationItemProps {
  conversation: ConversationV2
  onClick: () => void
}

function InboxConversationItem({ conversation, onClick }: InboxConversationItemProps) {
  const isUnread = conversation.unread_count > 0

  return (
    <motion.div
      className={cn(
        "flex items-start gap-3 p-4 border-b cursor-pointer transition-colors hover:bg-muted/50 message-item-touch",
        isUnread && "bg-primary/5 border-l-4 border-l-primary"
      )}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* 상대방 아바타 */}
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.participant.avatar_url || undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        {isUnread && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full ring-2 ring-background" />
        )}
      </div>

      {/* 대화 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className={cn(
            "text-sm font-medium truncate",
            isUnread && "font-semibold"
          )}>
            {conversation.participant.name}
          </h4>
          <div className="flex items-center gap-2 flex-shrink-0">
            {conversation.unread_count > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </Badge>
            )}
            {conversation.last_message_at && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(conversation.last_message_at), {
                  addSuffix: true,
                  locale: ko
                })}
              </span>
            )}
          </div>
        </div>
        
        <p className={cn(
          "text-sm text-muted-foreground truncate",
          isUnread && "text-foreground font-medium"
        )}>
          {conversation.last_message?.content || '새 대화를 시작해보세요'}
        </p>
      </div>
    </motion.div>
  )
}

/**
 * Empty inbox placeholder
 */
function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">받은 메시지가 없습니다</h3>
      <p className="text-muted-foreground">
        다른 회원들과 메시지를 주고받아보세요.
      </p>
    </div>
  )
}

/**
 * Loading skeleton
 */
function InboxSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}