/**
 * Message Modal Component
 * 
 * Main messaging interface combining inbox and conversation views
 * Handles navigation between inbox and individual conversations
 */

'use client'

import { useState } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { MessageInbox } from './MessageInbox'
import { ConversationThread } from './ConversationThread'
import { NewMessageDialog } from './NewMessageDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MessageCircle, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialConversationId?: string
  initialRecipientId?: string
  initialRecipientName?: string
}

type ViewState = 
  | { type: 'inbox' }
  | { 
      type: 'conversation'
      conversationId: string
      recipientId: string
      recipientName: string
      recipientAvatar?: string | null
    }

export function MessageModal({
  open,
  onOpenChange,
  initialConversationId,
  initialRecipientId,
  initialRecipientName
}: MessageModalProps) {
  const { isMember } = useOptimizedAuth()
  const [viewState, setViewState] = useState<ViewState>(() => {
    if (initialConversationId && initialRecipientId && initialRecipientName) {
      return {
        type: 'conversation',
        conversationId: initialConversationId,
        recipientId: initialRecipientId,
        recipientName: initialRecipientName
      }
    }
    return { type: 'inbox' }
  })
  const [showNewMessage, setShowNewMessage] = useState(false)

  const handleConversationSelect = (
    conversationId: string,
    recipientId: string,
    recipientName: string,
    recipientAvatar?: string | null
  ) => {
    setViewState({
      type: 'conversation',
      conversationId,
      recipientId,
      recipientName,
      recipientAvatar
    })
  }

  const handleBackToInbox = () => {
    setViewState({ type: 'inbox' })
  }

  const handleNewConversation = () => {
    setShowNewMessage(true)
  }

  const handleNewConversationStart = (
    conversationId: string,
    recipientId: string,
    recipientName: string,
    recipientAvatar?: string | null
  ) => {
    setShowNewMessage(false)
    setViewState({
      type: 'conversation',
      conversationId,
      recipientId,
      recipientName,
      recipientAvatar
    })
  }

  // 권한이 없는 경우
  if (!isMember) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              메시지
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">메시지 기능</h3>
            <p className="text-muted-foreground">
              메시지 기능은 정회원 이상만 사용할 수 있습니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl w-full h-full sm:h-auto sm:max-h-[80vh] p-0 m-0 sm:m-4 rounded-none sm:rounded-lg">
          <DialogHeader className="relative px-4 sm:px-6 py-3 sm:py-4 border-b">
            <div className="flex items-center justify-between pr-8 sm:pr-0">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                {viewState.type === 'inbox' ? '메시지함' : '대화'}
              </DialogTitle>
              
              {viewState.type === 'inbox' && (
                <Button
                  onClick={handleNewConversation}
                  size="sm"
                  className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-4 text-xs sm:text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">새 메시지</span>
                  <span className="sm:hidden">새글</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="relative overflow-hidden h-[calc(100vh-8rem)] sm:h-auto">
            <AnimatePresence mode="wait">
              {viewState.type === 'inbox' ? (
                <motion.div
                  key="inbox"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <MessageInbox
                    onConversationSelect={handleConversationSelect}
                    className="border-0 shadow-none"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="conversation"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ConversationThread
                    conversationId={viewState.conversationId}
                    recipientId={viewState.recipientId}
                    recipientName={viewState.recipientName}
                    recipientAvatar={viewState.recipientAvatar}
                    onBack={handleBackToInbox}
                    className="border-0 shadow-none h-[calc(100vh-8rem)] sm:h-[500px]"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* 새 메시지 다이얼로그 */}
      <NewMessageDialog
        open={showNewMessage}
        onOpenChange={setShowNewMessage}
        onConversationStart={handleNewConversationStart}
      />
    </>
  )
}

/**
 * Hook for managing message modal state
 */
export function useMessageModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [initialState, setInitialState] = useState<{
    conversationId?: string
    recipientId?: string
    recipientName?: string
  }>({})

  const openModal = (options?: {
    conversationId?: string
    recipientId?: string
    recipientName?: string
  }) => {
    setInitialState(options || {})
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setInitialState({})
  }

  return {
    isOpen,
    openModal,
    closeModal,
    modalProps: {
      open: isOpen,
      onOpenChange: setIsOpen,
      ...initialState
    }
  }
}