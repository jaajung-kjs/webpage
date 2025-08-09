# Messaging System V2 Implementation Plan

## Overview
Design and implement a proper messaging system for KEPCO AI Community V2 with dedicated tables, optimal performance, and real-time capabilities.

## Current Issues Analysis

### Problems with Current useMessagesV2.ts
1. **Misuse of `interactions_v2` table**: Using for messaging when designed for likes, bookmarks, etc.
2. **No conversation management**: Complex logic to determine conversation partners
3. **Inefficient queries**: Multiple N+1 queries for user lookups
4. **No proper read status**: Stored in JSON metadata instead of proper columns
5. **Poor performance**: Complex filtering and JSON operations
6. **No real conversation history**: Difficult to maintain message threads
7. **Scalability issues**: All messages stored with generic interaction type

### Schema Requirements
Based on V2 patterns observed in database.types.ts:
- Consistent naming: `table_name_v2`
- Standard fields: `id`, `created_at`, `updated_at`, `deleted_at` (soft delete)
- UUID primary keys with `gen_random_uuid()` default
- Proper foreign key relationships with cascade options
- Boolean flags with NOT NULL and DEFAULT values
- Status fields as strings with DEFAULT values

## New Database Schema Design

### 1. conversations_v2 Table
```sql
CREATE TABLE conversations_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Participants (only support 2-person conversations for now)
  user1_id UUID NOT NULL REFERENCES users_v2(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users_v2(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  title VARCHAR(255) DEFAULT NULL, -- Optional custom title
  conversation_type VARCHAR(50) DEFAULT 'direct', -- 'direct', 'group' (future)
  
  -- Last activity tracking
  last_message_id UUID DEFAULT NULL, -- Will reference messages_v2(id)
  last_message_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Status management
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Constraints
  CONSTRAINT conversations_v2_different_users CHECK (user1_id != user2_id),
  CONSTRAINT conversations_v2_user_order CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- Indexes for performance
CREATE INDEX idx_conversations_v2_user1 ON conversations_v2(user1_id);
CREATE INDEX idx_conversations_v2_user2 ON conversations_v2(user2_id);
CREATE INDEX idx_conversations_v2_last_message ON conversations_v2(last_message_at DESC);
CREATE INDEX idx_conversations_v2_active ON conversations_v2(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_conversations_v2_participants ON conversations_v2(user1_id, user2_id);
```

### 2. messages_v2 Table
```sql
CREATE TABLE messages_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relationship
  conversation_id UUID NOT NULL REFERENCES conversations_v2(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users_v2(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL DEFAULT 'text', -- 'text', 'system', 'notification'
  
  -- Attachments (JSON for now, could be separate table later)
  attachments JSONB DEFAULT NULL,
  
  -- Message status
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Threading (for future replies)
  reply_to_id UUID DEFAULT NULL REFERENCES messages_v2(id) ON DELETE SET NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Constraints
  CONSTRAINT messages_v2_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT messages_v2_valid_type CHECK (message_type IN ('text', 'system', 'notification'))
);

-- Indexes for performance
CREATE INDEX idx_messages_v2_conversation ON messages_v2(conversation_id, created_at DESC);
CREATE INDEX idx_messages_v2_sender ON messages_v2(sender_id);
CREATE INDEX idx_messages_v2_reply_to ON messages_v2(reply_to_id);
CREATE INDEX idx_messages_v2_active ON messages_v2(deleted_at) WHERE deleted_at IS NULL;

-- Full text search index
CREATE INDEX idx_messages_v2_content_search ON messages_v2 USING gin(to_tsvector('english', content));
```

### 3. message_read_status_v2 Table
```sql
CREATE TABLE message_read_status_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relationship
  message_id UUID NOT NULL REFERENCES messages_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_v2(id) ON DELETE CASCADE,
  
  -- Read status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(message_id, user_id),
  CONSTRAINT message_read_status_v2_read_consistency 
    CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false AND read_at IS NULL))
);

-- Indexes for performance
CREATE INDEX idx_message_read_status_v2_user ON message_read_status_v2(user_id, is_read);
CREATE INDEX idx_message_read_status_v2_message ON message_read_status_v2(message_id);
CREATE INDEX idx_message_read_status_v2_unread ON message_read_status_v2(user_id, is_read) WHERE is_read = false;
```

### 4. Update conversations_v2 with foreign key
```sql
-- Add foreign key constraint after messages_v2 table is created
ALTER TABLE conversations_v2 
ADD CONSTRAINT conversations_v2_last_message_fkey 
FOREIGN KEY (last_message_id) REFERENCES messages_v2(id) ON DELETE SET NULL;
```

### 5. Triggers for Automation
```sql
-- Update conversations_v2.updated_at on any change
CREATE OR REPLACE FUNCTION update_conversations_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_v2_updated_at
  BEFORE UPDATE ON conversations_v2
  FOR EACH ROW EXECUTE FUNCTION update_conversations_v2_updated_at();

-- Update messages_v2.updated_at on any change
CREATE OR REPLACE FUNCTION update_messages_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_v2_updated_at
  BEFORE UPDATE ON messages_v2
  FOR EACH ROW EXECUTE FUNCTION update_messages_v2_updated_at();

-- Auto-update conversation last_message info when message is created
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations_v2 
  SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_v2_update_conversation
  AFTER INSERT ON messages_v2
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Auto-create read status entries for conversation participants
CREATE OR REPLACE FUNCTION create_message_read_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert read status for the recipient (not the sender)
  INSERT INTO message_read_status_v2 (message_id, user_id, is_read, created_at)
  SELECT 
    NEW.id,
    CASE 
      WHEN c.user1_id = NEW.sender_id THEN c.user2_id
      ELSE c.user1_id
    END,
    false,
    NOW()
  FROM conversations_v2 c
  WHERE c.id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_v2_create_read_status
  AFTER INSERT ON messages_v2
  FOR EACH ROW EXECUTE FUNCTION create_message_read_status();
```

### 6. Row Level Security (RLS) Policies
```sql
-- Enable RLS on all tables
ALTER TABLE conversations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status_v2 ENABLE ROW LEVEL SECURITY;

-- conversations_v2 policies
CREATE POLICY "Users can view their own conversations"
  ON conversations_v2 FOR SELECT
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON conversations_v2 FOR INSERT
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can update their own conversations"
  ON conversations_v2 FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- messages_v2 policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages_v2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations_v2 c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON messages_v2 FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations_v2 c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages_v2 FOR UPDATE
  USING (sender_id = auth.uid());

-- message_read_status_v2 policies
CREATE POLICY "Users can view their own read status"
  ON message_read_status_v2 FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own read status"
  ON message_read_status_v2 FOR UPDATE
  USING (user_id = auth.uid());
```

### 7. Helper Functions
```sql
-- Get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation_v2(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_ordered_user1_id UUID;
  v_ordered_user2_id UUID;
BEGIN
  -- Ensure consistent user ordering
  IF p_user1_id < p_user2_id THEN
    v_ordered_user1_id := p_user1_id;
    v_ordered_user2_id := p_user2_id;
  ELSE
    v_ordered_user1_id := p_user2_id;
    v_ordered_user2_id := p_user1_id;
  END IF;
  
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations_v2
  WHERE user1_id = v_ordered_user1_id
    AND user2_id = v_ordered_user2_id
    AND deleted_at IS NULL;
  
  -- Create if not exists
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations_v2 (user1_id, user2_id)
    VALUES (v_ordered_user1_id, v_ordered_user2_id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- Get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count_v2(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM message_read_status_v2 mrs
    INNER JOIN messages_v2 m ON m.id = mrs.message_id
    WHERE mrs.user_id = p_user_id
      AND mrs.is_read = false
      AND m.deleted_at IS NULL
  );
END;
$$;

-- Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read_v2(
  p_user_id UUID,
  p_conversation_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE message_read_status_v2
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  FROM messages_v2 m
  WHERE message_read_status_v2.message_id = m.id
    AND message_read_status_v2.user_id = p_user_id
    AND m.conversation_id = p_conversation_id
    AND message_read_status_v2.is_read = false
    AND m.deleted_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;
```

## Performance Optimization Strategy

### 1. Database Indexes
- **Conversations**: `user1_id`, `user2_id`, `last_message_at DESC`
- **Messages**: `conversation_id + created_at DESC`, `sender_id`
- **Read Status**: `user_id + is_read`, unread messages only

### 2. Query Optimization
- Use proper JOINs instead of N+1 queries
- Implement conversation-level unread counts
- Use database functions for complex operations
- Implement proper pagination

### 3. Unread Count Strategy
**Recommendation: Database-based calculation**
- More accurate than frontend counting
- Handles concurrent access properly
- Can be cached at conversation level
- Use database function `get_unread_message_count_v2()`

### 4. Real-time Optimization
- Subscribe to specific conversation tables
- Use Supabase realtime filters
- Minimize subscription scope
- Implement proper connection management

## Hook Implementation Strategy

### 1. New Hook Structure
```typescript
// Core hooks
useConversationsV2() // List of conversations with last message info
useConversationMessagesV2(conversationId) // Messages for specific conversation
useUnreadCountV2() // Total unread count across all conversations

// Action hooks
useSendMessageV2() // Send new message
useMarkAsReadV2() // Mark messages as read
useCreateConversationV2() // Start new conversation

// Utility hooks
useMessageSearch() // Search across messages
useConversationDetails() // Get conversation metadata
```

### 2. Real-time Implementation
- Table-specific subscriptions
- Optimistic updates with rollback
- Proper error handling
- Connection state management

## Implementation Phases

### Phase 1: Database Schema (Priority 1)
1. Create migration file with new tables
2. Implement helper functions
3. Set up RLS policies
4. Create necessary indexes

### Phase 2: Core Hooks (Priority 1)
1. Replace useMessagesV2.ts with new implementation
2. Implement conversation list functionality
3. Add message sending capabilities
4. Real-time subscriptions

### Phase 3: UI Integration (Priority 2)
1. Update message components to use new hooks
2. Implement unread count display
3. Add conversation management UI
4. Test real-time functionality

### Phase 4: Optimization (Priority 3)
1. Performance testing and optimization
2. Advanced features (search, attachments)
3. Analytics and monitoring
4. Documentation updates

## Migration Strategy

### 1. Data Migration
- No existing message data to migrate (current implementation is broken)
- Clean start with new schema
- Remove old messaging logic from interactions_v2

### 2. Deployment Plan
1. Deploy database schema changes
2. Deploy new hooks implementation
3. Update UI components
4. Remove old messaging code
5. Update documentation

## Expected Performance Improvements

### Before (Current Implementation)
- Multiple N+1 queries for user lookups
- JSON filtering in database
- Complex conversation logic in application
- No proper indexing for messages
- Poor scalability

### After (New Implementation)
- Single optimized queries with proper JOINs
- Dedicated indexes for fast lookups
- Database-level conversation management
- Proper unread count calculation
- Real-time subscriptions with minimal overhead
- 90%+ performance improvement expected

## Security Considerations

### 1. Row Level Security
- Users can only access their own conversations
- Message visibility tied to conversation participation
- Proper sender verification for message creation

### 2. Input Validation
- Message content validation
- File attachment limits and validation
- Rate limiting for message sending

### 3. Privacy
- Soft delete for message history
- Proper data cleanup procedures
- GDPR compliance considerations

## Testing Strategy

### 1. Unit Tests
- Hook functionality testing
- Database function testing
- Schema constraint validation

### 2. Integration Tests
- End-to-end message flow testing
- Real-time subscription testing
- Performance benchmarking

### 3. User Acceptance Testing
- Message sending/receiving flows
- Unread count accuracy
- Real-time notification testing

## Success Metrics

### 1. Performance Metrics
- Message load time: < 500ms
- Conversation list load: < 300ms
- Real-time message delivery: < 1s
- Unread count calculation: < 100ms

### 2. User Experience Metrics
- Message delivery success rate: > 99%
- Real-time notification accuracy: > 99%
- UI responsiveness improvements
- User satisfaction scores

## Conclusion

This implementation plan provides:
1. **Proper database schema** with dedicated messaging tables
2. **Optimal performance** through proper indexing and queries
3. **Real-time capabilities** with Supabase subscriptions
4. **Scalable architecture** that can grow with the platform
5. **Security-first design** with RLS and input validation

The new system will replace the flawed interactions_v2-based messaging with a proper, performant, and scalable solution that follows V2 schema patterns and provides excellent user experience.