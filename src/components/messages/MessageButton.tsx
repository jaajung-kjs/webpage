/**
 * Message Button Component
 * 
 * Quick action button to send messages to specific users
 * Can be used in member profiles, member lists, etc.
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { MessagesAPI } from '@/lib/api/messages'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useMessageModal } from './MessageModal'

interface MessageButtonProps {
  recipientId: string
  recipientName: string
  recipientAvatar?: string | null
  recipientRole?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  children?: React.ReactNode
  disabled?: boolean
  onMessageSent?: (conversationId: string) => void
}

export function MessageButton({
  recipientId,
  recipientName,
  recipientAvatar,
  recipientRole,
  variant = 'outline',
  size = 'sm',
  className,
  children,
  disabled,
  onMessageSent
}: MessageButtonProps) {
  const { user, isMember } = useAuth()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  // 자신에게는 메시지를 보낼 수 없음
  if (!user || !isMember || user.id === recipientId) {
    return null
  }

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return

    setSending(true)
    try {
      // 대화방 찾기 또는 생성
      const conversationResult = await MessagesAPI.findOrCreateConversation(
        user.id,
        recipientId
      )

      if (!conversationResult.success) {
        throw new Error(conversationResult.error)
      }

      // 메시지 전송
      const messageResult = await MessagesAPI.sendMessage(
        user.id,
        recipientId,
        message.trim(),
        conversationResult.data
      )

      if (!messageResult.success) {
        throw new Error(messageResult.error)
      }

      // 성공 처리
      setMessage('')
      setOpen(false)
      toast.success(`${recipientName}님에게 메시지를 전송했습니다.`)

      if (onMessageSent) {
        onMessageSent(conversationResult.data!)
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('메시지 전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  const getRoleBadge = (role?: string) => {
    if (!role) return null
    
    const roleMap = {
      member: { label: '회원', variant: 'secondary' as const },
      'vice-leader': { label: '운영진', variant: 'default' as const },
      leader: { label: '동아리장', variant: 'default' as const },
      admin: { label: '관리자', variant: 'destructive' as const }
    }
    
    const roleBadge = roleMap[role as keyof typeof roleMap]
    if (!roleBadge) return null

    return (
      <Badge variant={roleBadge.variant} className="text-xs">
        {roleBadge.label}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("gap-2", className)}
          disabled={disabled}
        >
          <MessageCircle className="h-4 w-4" />
          {children || '메시지'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>메시지 보내기</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 받는 사람 정보 */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipientAvatar || undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{recipientName}</span>
                {getRoleBadge(recipientRole)}
              </div>
              <span className="text-sm text-muted-foreground">
                받는 사람
              </span>
            </div>
          </div>

          {/* 메시지 입력 */}
          <div className="space-y-2">
            <Label htmlFor="message">메시지</Label>
            <Textarea
              id="message"
              placeholder="메시지를 입력하세요..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (message.trim() && !sending) {
                    handleSendMessage()
                  }
                }
              }}
              rows={4}
              maxLength={1000}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length}/1000
            </div>
            <div className="text-xs text-muted-foreground">
              Enter로 전송, Shift+Enter로 줄바꿈
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setOpen(false)}
              variant="outline"
              disabled={sending}
            >
              취소
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  전송
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Icon-only message button for compact layouts
 */
export function MessageIconButton({
  recipientId,
  recipientName,
  recipientAvatar,
  recipientRole,
  className,
  onMessageSent
}: Omit<MessageButtonProps, 'variant' | 'size' | 'children'>) {
  return (
    <MessageButton
      recipientId={recipientId}
      recipientName={recipientName}
      recipientAvatar={recipientAvatar}
      recipientRole={recipientRole}
      variant="ghost"
      size="sm"
      className={cn("h-8 w-8 p-0", className)}
      onMessageSent={onMessageSent}
    >
      <MessageCircle className="h-4 w-4" />
    </MessageButton>
  )
}

/**
 * Message button with full modal integration
 */
interface MessageButtonWithModalProps extends Omit<MessageButtonProps, 'onMessageSent'> {
  openInModal?: boolean
}

export function MessageButtonWithModal({
  recipientId,
  recipientName,
  recipientAvatar,
  recipientRole,
  openInModal = false,
  ...buttonProps
}: MessageButtonWithModalProps) {
  const { openModal } = useMessageModal()

  const handleClick = () => {
    if (openInModal) {
      // 모달에서 대화방 직접 열기는 구현 복잡하므로
      // 새 메시지 다이얼로그를 통해 처리
      openModal()
    }
  }

  if (openInModal) {
    return (
      <Button
        onClick={handleClick}
        variant={buttonProps.variant || 'outline'}
        size={buttonProps.size || 'sm'}
        className={cn("gap-2", buttonProps.className)}
        disabled={buttonProps.disabled}
      >
        <MessageCircle className="h-4 w-4" />
        {buttonProps.children || '메시지'}
      </Button>
    )
  }

  return (
    <MessageButton 
      recipientId={recipientId}
      recipientName={recipientName}
      recipientAvatar={recipientAvatar}
      recipientRole={recipientRole}
      {...buttonProps} 
    />
  )
}