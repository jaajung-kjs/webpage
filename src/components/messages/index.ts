/**
 * Messages Components Export
 * 
 * All messaging-related components
 */

// Main components
export { MessageModal, useMessageModal } from './MessageModal'
export { MessageInbox } from './MessageInbox'
export { ConversationThread } from './ConversationThread'
export { NewMessageDialog } from './NewMessageDialog'

// Utility components
export { 
  MessageNotificationBadge, 
  MessageNotificationDot, 
  MessageNotificationPulse 
} from './MessageNotificationBadge'

export { 
  MessageButton, 
  MessageIconButton, 
  MessageButtonWithModal 
} from './MessageButton'


// API and utilities
export { MessagesAPI, MessageNotifications } from '@/lib/api/messages'
export type { 
  MessageWithSender, 
  ConversationWithLastMessage, 
  InboxMessage 
} from '@/lib/api/messages'