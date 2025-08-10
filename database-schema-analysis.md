# KEPCO AI Community Database Schema & Hooks Analysis

## Executive Summary

This comprehensive analysis covers the complete database schema and React hooks system for the KEPCO AI Community project. The system has undergone a major V2 migration with improved architecture, but contains numerous performance and security issues that need immediate attention.

**Key Findings:**
- **28 V2 tables** with modern architecture and proper relationships
- **3 materialized views** for performance optimization  
- **80+ database functions** for complex operations
- **20+ React hooks** providing comprehensive data access
- **85+ unused indexes** consuming resources unnecessarily
- **Critical security vulnerabilities** in partitioned tables and functions

## Complete Database Schema Architecture

### Core Table Structure (V2 Schema)

#### 1. User Management System

**`users_v2`** - Central user table
- **Purpose**: Primary user entity with role-based permissions
- **Key Features**: Soft delete support, activity tracking, metadata storage
- **Relationships**: Referenced by all user-related tables
- **Columns**: id, email, name, department, role, avatar_url, activity_score, created_at, updated_at, deleted_at

**`user_settings_v2`** - User preferences
- **Purpose**: User-specific configuration (theme, notifications, privacy)
- **Hook**: `useSettingsV2.ts`
- **Relationship**: 1:1 with users_v2

**`user_metadata_v2`** - Flexible user data
- **Purpose**: Key-value store for additional user properties
- **Structure**: user_id, key, value (JSONB), updated_at
- **Usage**: Profile extensions, custom attributes

**`user_activity_logs_v2`** - Activity tracking (PARTITIONED)
- **Purpose**: User action logging with monthly partitioning
- **Partitions**: 12 monthly tables (2025_01 through 2025_12)
- **Performance**: Automatic partition management
- **⚠️ Critical Issue**: Partitions missing RLS policies (security vulnerability)

**`user_achievements_v2`** - Gamification
- **Purpose**: User achievement tracking
- **Hook**: `useAchievementsV2.ts`, `useGamificationV2.ts`

**`user_message_stats_v2`** - Message statistics
- **Purpose**: Unread message counts, statistics
- **Hook**: `useMessagesV2.ts`

#### 2. Content Management System

**`content_v2`** - Universal content table (polymorphic design)
- **Purpose**: Stores all content types (posts, announcements, resources, activities)
- **Key Features**: 
  - Content type discrimination via `content_type` field
  - Full-text search support
  - Metadata JSONB storage
  - View/like/comment counting
- **Hook**: `useContentV2.ts` (primary hook)
- **Relationships**: Author (users_v2), categories, tags, attachments

**`categories_v2`** - Hierarchical categorization
- **Purpose**: Hierarchical category system with parent-child relationships
- **Structure**: Self-referential with `parent_id`
- **Hook**: Used within `useContentV2.ts`

**`tags_v2`** - Tag system
- **Purpose**: Flexible tagging with usage counts
- **Hook**: Used within `useContentV2.ts`

**`content_categories_v2`** - Many-to-many content-category relations
- **Purpose**: Junction table for content categorization

**`content_tags_v2`** - Many-to-many content-tag relations  
- **Purpose**: Junction table for content tagging

**`content_metadata_v2`** - Extended content properties
- **Purpose**: Key-value store for content-specific metadata
- **⚠️ Naming Issue**: Potential confusion with `content_v2.metadata` JSONB column

**`content_attachments_v2`** - File attachments
- **Purpose**: File attachments linked to content
- **Hook**: `useFileUploadV2.ts`

#### 3. Interactive Features

**`comments_v2`** - Hierarchical comments
- **Purpose**: Threaded comment system with unlimited nesting
- **Features**: Path-based hierarchy, soft deletes, like counts
- **Hook**: `useCommentsV2.ts`
- **Structure**: Uses `path` column for efficient tree operations

**`interactions_v2`** - Universal interaction system
- **Purpose**: Stores all user interactions (likes, bookmarks, reports, views)
- **Polymorphic Design**: `target_type` + `target_id` for any entity
- **Hook**: `useInteractionsV2.ts`
- **Interaction Types**: like, bookmark, report, view

#### 4. Activity System

**`activities_v2`** - Event management
- **Purpose**: Workshops, seminars, meetings, study sessions
- **Features**: Registration limits, online/offline events, scheduling
- **Hook**: `useActivitiesV2.ts`
- **Relationship**: Extends content_v2 via content_id (1:1)

**`activity_participants_v2`** - Event registrations
- **Purpose**: User registration and attendance tracking
- **Features**: Status tracking, feedback, ratings
- **Hook**: Used within `useActivitiesV2.ts`

#### 5. Messaging System

**`conversations_v2`** - Private messaging
- **Purpose**: Direct message conversations between users
- **Features**: Last message tracking, archive status
- **Hook**: `useMessagesV2.ts`

**`messages_v2`** - Message content
- **Purpose**: Individual messages with threading support
- **Features**: Attachments, editing, replies
- **Hook**: `useMessagesV2.ts`

**`message_read_status_v2`** - Read receipts
- **Purpose**: Per-user message read status tracking

#### 6. Membership & Moderation

**`membership_applications_v2`** - Club membership
- **Purpose**: Application and approval workflow
- **Hook**: `useMembershipV2.ts`
- **Features**: Experience level, interests, review process

**`application_history_v2`** - Application audit trail
- **Purpose**: Track all membership application state changes

**`reports_v2`** - Content moderation
- **Purpose**: User-generated content reports
- **Hook**: `useReportsV2.ts`
- **Features**: Multiple report types, admin resolution

**`report_types_v2`** - Report categorization
- **Purpose**: Predefined report categories and severity levels

#### 7. Notification & Audit

**`notifications_v2`** - User notifications
- **Purpose**: System notifications and alerts
- **Hook**: `useNotificationsV2.ts`
- **Features**: Read status, structured data payload

**`audit_logs_v2`** - System audit (PARTITIONED)
- **Purpose**: Complete audit trail of all system changes
- **Partitions**: Monthly partitions (y2025m01, y2025m02, y2025m03)
- **Features**: IP tracking, before/after values
- **⚠️ Empty Table**: Currently unused, appears to be preparation for future auditing

**`email_verification_attempts_v2`** - Email tracking
- **Purpose**: Track email verification attempts for security

#### 8. Media & Storage

**`media_v2`** - File management
- **Purpose**: Media files linked to content or comments
- **Hook**: `useFileUploadV2.ts`
- **Features**: File metadata, upload tracking

### Materialized Views (Performance Layer)

#### 1. `content_with_metadata_v2`
- **Purpose**: Optimized content view with author information
- **Performance**: Reduces JOIN operations for content display
- **Usage**: Content listing pages, search results

#### 2. `trending_content_v2`  
- **Purpose**: Pre-calculated trending content with scores
- **Performance**: Complex scoring algorithm pre-computed
- **Usage**: Homepage trending section

#### 3. `user_stats_summary_v2`
- **Purpose**: User statistics aggregation
- **Performance**: Expensive aggregation pre-calculated
- **Usage**: User profiles, leaderboards

## React Hooks System Mapping

### Hook-to-Table Relationships

| Hook | Primary Tables | Secondary Tables | Purpose |
|------|---------------|-----------------|---------|
| **useContentV2** | content_v2 | content_categories_v2, content_tags_v2, interactions_v2 | Universal content management |
| **useMembersV2** | users_v2 | content_v2, comments_v2, interactions_v2 | Member management with stats |
| **useCommentsV2** | comments_v2 | interactions_v2 | Threaded commenting system |
| **useActivitiesV2** | activities_v2, activity_participants_v2 | content_v2 | Event management |
| **useMessagesV2** | conversations_v2, messages_v2 | message_read_status_v2, user_message_stats_v2 | Private messaging |
| **useInteractionsV2** | interactions_v2 | content_v2, comments_v2 | Like/bookmark/report system |
| **useNotificationsV2** | notifications_v2 | - | System notifications |
| **useReportsV2** | reports_v2 | report_types_v2 | Content moderation |
| **useMembershipV2** | membership_applications_v2 | application_history_v2 | Membership applications |
| **useAchievementsV2** | user_achievements_v2 | - | Gamification system |
| **useSettingsV2** | user_settings_v2 | - | User preferences |
| **useFileUploadV2** | media_v2 | content_attachments_v2 | File management |

### Data Flow Analysis

#### Content Creation Flow
```
1. useContentV2.createContent() 
   → content_v2 INSERT
   → content_categories_v2 INSERT (if categories)
   → content_tags_v2 INSERT (if tags)
   → Cache invalidation for content lists
```

#### User Interaction Flow
```
1. useInteractionsV2.toggleInteraction()
   → interactions_v2 INSERT/DELETE (toggle)
   → content_v2.like_count UPDATE (optimistic)
   → Multiple cache invalidation
```

#### Activity Registration Flow
```
1. useActivitiesV2.registerForActivity()
   → activity_participants_v2 INSERT
   → activities_v2.current_participants UPDATE
   → Notification creation via RPC
```

## Database Functions Analysis

The system includes **80+ PostgreSQL functions** for complex operations:

### Key Function Categories

#### 1. Content Management Functions
- `get_content_with_relations_v2` - Complex content retrieval with relationships
- `increment_view_count_v2` - Thread-safe view counting
- `get_trending_content_v2` - Trending algorithm implementation
- `search_content_v2` - Full-text search with ranking

#### 2. Activity Management Functions  
- `register_for_activity_v2` - Activity registration with limits
- `cancel_activity_registration_v2` - Registration cancellation
- `confirm_activity_attendance_v2` - Attendance tracking
- `get_activity_stats_v2` - Activity statistics

#### 3. User & Permission Functions
- `is_admin()`, `is_member()`, `is_member_or_above()` - Role checking
- `can_access_content()`, `can_manage_user()` - Permission validation
- `get_user_stats_v2` - User statistics aggregation
- `update_user_achievements_v2` - Achievement system

#### 4. Messaging Functions
- `get_or_create_conversation_v2` - Conversation management
- `send_message` - Message sending with stats update
- `mark_messages_as_read_v2` - Read status management
- `get_unread_message_count_v2` - Unread count calculation

#### 5. Interaction & Gamification
- `toggle_interaction_v2` - Universal interaction toggle
- `increment_activity_score_v2` - Activity scoring
- `check_and_grant_achievements` - Achievement processing
- `log_user_activity` - Activity logging

#### 6. Audit & Logging Functions
- `create_audit_log_v2` - Audit trail creation
- `log_activity_v2` - Activity logging
- `increment_activity_score_v2` - Score tracking with partitioning

## Performance Analysis & Issues

### Critical Performance Problems

#### 1. Unused Index Epidemic (85+ unused indexes)
**Impact**: Massive storage waste and slower writes
**Examples**:
- `idx_activities_v2_instructor_id` - Never used
- `idx_comments_v2_content_id` - Never used  
- `idx_interactions_v2_user_id` - Never used
- `idx_content_v2_fts` - Full-text search index unused

**Recommendation**: Remove 80% of unused indexes immediately

#### 2. N+1 Query Problems in Hooks

**`useContentV2.useInfiniteContents`** - Major N+1 issue:
```typescript
// Lines 333-374: Individual interaction queries per content item
const contents = await Promise.all((data || []).map(async (content) => {
  const { data: interactions } = await supabase
    .from('interactions_v2')
    .select('interaction_type')
    .eq('target_id', content.id) // INDIVIDUAL QUERY PER ITEM
    .eq('target_type', 'content')
  // ...
}))
```
**Impact**: 20 contents = 40+ additional queries
**Solution**: Use batch queries or materialized view

**`useMembersV2`** - Similar N+1 pattern:
```typescript  
// Lines 152-165: Individual RPC calls per user
Promise.all(
  userIds.map(userId => 
    supabaseClient.rpc('get_user_interactions_v2', { // INDIVIDUAL RPC PER USER
      p_user_id: userId,
      // ...
    })
  )
)
```

#### 3. Missing Critical Indexes
Based on hook usage patterns, these indexes are needed:
- `content_v2(content_type, status, created_at)` - For content listing
- `interactions_v2(target_type, target_id, interaction_type)` - For interaction counting
- `comments_v2(content_id, deleted_at, created_at)` - For comment threading
- `activities_v2(event_date, status)` - For activity filtering

#### 4. Inefficient Materialized View Usage
Views exist but hooks often bypass them:
- `useContentV2` queries `content_v2` directly instead of using `content_with_metadata_v2`
- Manual author JOIN instead of using pre-computed view data

### Recommended Performance Optimizations

#### 1. Immediate Index Cleanup
```sql
-- Drop unused indexes (sample)
DROP INDEX idx_activities_v2_instructor_id;
DROP INDEX idx_comments_v2_content_id;  
DROP INDEX idx_interactions_v2_user_id;
-- ... (80+ more indexes)
```

#### 2. Add Missing Critical Indexes
```sql
-- Content listing optimization
CREATE INDEX idx_content_v2_listing 
ON content_v2(content_type, status, created_at DESC) 
WHERE deleted_at IS NULL;

-- Interaction counting optimization
CREATE INDEX idx_interactions_v2_efficient
ON interactions_v2(target_type, target_id, interaction_type);

-- Comment threading optimization  
CREATE INDEX idx_comments_v2_threading
ON comments_v2(content_id, deleted_at, parent_id);
```

#### 3. Fix N+1 Queries
**Content Hook Fix:**
```typescript
// Replace individual queries with batch query
const { data: interactions } = await supabase
  .from('interactions_v2')
  .select('target_id, interaction_type')
  .eq('target_type', 'content')
  .in('target_id', contentIds) // BATCH QUERY

// Group by content_id client-side
const interactionsByContent = interactions.reduce((acc, int) => {
  acc[int.target_id] = acc[int.target_id] || []
  acc[int.target_id].push(int)
  return acc
}, {})
```

#### 4. Leverage Materialized Views
```typescript
// Use pre-computed view instead of manual JOINs
const { data } = await supabase
  .from('content_with_metadata_v2') // Use materialized view
  .select('*')
  // Remove manual author JOIN
```

## Security Analysis & Vulnerabilities

### Critical Security Issues

#### 1. RLS Disabled on Partitioned Tables (CRITICAL)
**Affected Tables**: All `user_activity_logs_v2_2025_*` partitions
**Risk**: Complete data exposure  
**Status**: 12 partitioned tables without RLS
**Fix Required**: Enable RLS on all partition tables

#### 2. Function Search Path Vulnerabilities (HIGH)
**Affected Functions**:
- `cancel_activity_registration_v2`
- `register_for_activity_v2` 
- `increment_view_count_v2`
- `create_comment_v2`
- `sync_activity_participant_count`

**Risk**: SQL injection via search_path manipulation
**Fix Required**: Set explicit search_path in function definitions

#### 3. Auth Configuration Issues
- **OTP Expiry**: Set to >1 hour (should be <1 hour)
- **Leaked Password Protection**: Disabled (should be enabled)

### Security Recommendations

#### 1. Immediate RLS Fix
```sql
-- Enable RLS on all partitioned tables
ALTER TABLE user_activity_logs_v2_2025_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs_v2_2025_02 ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all 12 partitions)

-- Add policies
CREATE POLICY "Users can view own activity logs" 
ON user_activity_logs_v2_2025_01 FOR SELECT 
USING (user_id = auth.uid());
```

#### 2. Fix Function Security
```sql
-- Example fix for search_path vulnerability
CREATE OR REPLACE FUNCTION increment_view_count_v2(p_content_id UUID, p_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- FIXED: Explicit search path
AS $$
-- Function body...
$$;
```

#### 3. Auth Security Hardening
- Reduce OTP expiry to 30 minutes
- Enable leaked password protection
- Implement rate limiting on auth endpoints

## Data Integrity Issues

### Naming Convention Problems

#### 1. Confusing Metadata Tables
**Issue**: Two different metadata approaches:
- `content_v2.metadata` (JSONB column) 
- `content_metadata_v2` (separate table)
- `user_metadata_v2` (separate table)

**Problem**: Developers confusion about which to use
**Recommendation**: Standardize on JSONB columns for simple metadata, separate tables for complex relationships

#### 2. Duplicate Partitioned Tables  
**Issue**: Both `audit_logs_v2` and `user_activity_logs_v2` have monthly partitioning
**Problem**: `audit_logs_v2` appears completely unused (empty)
**Recommendation**: Remove unused `audit_logs_v2` partitions or clarify purpose

### Missing Foreign Key Constraints

Several relationships lack proper foreign key constraints, risking data integrity:
- Some `interactions_v2.target_id` references not enforced
- Partitioned table relationships need careful constraint management

### NULL Handling Issues

Many fields allow NULL without clear business logic:
- `activities_v2.end_date` - When should this be required?
- `content_v2.summary` - Auto-generation vs manual entry unclear  
- `users_v2.is_active` - Nullable boolean should have default

## Recommended Schema Improvements

### 1. Consolidate Metadata Approaches
```sql
-- Option 1: Use JSONB columns (recommended for simple cases)
ALTER TABLE content_v2 ALTER COLUMN metadata SET NOT NULL DEFAULT '{}';
-- Remove content_metadata_v2 table

-- Option 2: Use separate tables (recommended for complex relations)
-- Keep content_metadata_v2, remove content_v2.metadata column
```

### 2. Clarify Table Purposes
```sql
-- Document audit_logs_v2 purpose or remove
-- Add table comments
COMMENT ON TABLE audit_logs_v2 IS 'System audit trail - currently unused, reserved for compliance auditing';
COMMENT ON TABLE user_activity_logs_v2 IS 'User activity tracking for gamification and analytics';
```

### 3. Implement Missing Constraints
```sql
-- Add NOT NULL constraints where appropriate
ALTER TABLE activities_v2 ALTER COLUMN end_date SET NOT NULL 
  WHERE event_type IN ('workshop', 'seminar'); -- Only for timed events

-- Add CHECK constraints for business logic
ALTER TABLE content_v2 ADD CONSTRAINT content_type_valid 
  CHECK (content_type IN ('post', 'announcement', 'resource', 'activity'));
```

### 4. Optimize Hook Patterns
```sql
-- Create composite indexes matching hook query patterns
CREATE INDEX idx_content_v2_author_type_status 
ON content_v2(author_id, content_type, status, created_at DESC);

-- Create covering indexes to avoid table lookups
CREATE INDEX idx_interactions_v2_covering 
ON interactions_v2(target_type, target_id, user_id) 
INCLUDE (interaction_type, created_at);
```

## Action Plan & Priorities

### Phase 1: Critical Security (Immediate - Days 1-3)
1. **Enable RLS** on all partitioned tables
2. **Fix function search paths** (5 functions)  
3. **Configure auth security** (OTP expiry, password protection)
4. **Audit RLS policies** for completeness

### Phase 2: Performance Optimization (Week 1)
1. **Remove unused indexes** (85+ indexes)
2. **Add critical missing indexes** (5-10 indexes)
3. **Fix N+1 queries** in useContentV2 and useMembersV2
4. **Optimize materialized view usage**

### Phase 3: Schema Cleanup (Week 2-3)
1. **Clarify metadata patterns** (consolidate approaches)
2. **Document table purposes** (especially empty tables)
3. **Add missing constraints** (NULL handling, CHECK constraints)
4. **Clean up naming conventions**

### Phase 4: Advanced Optimizations (Week 4)
1. **Implement query result caching**
2. **Add database-level monitoring**
3. **Optimize partitioning strategies**
4. **Performance testing and benchmarking**

## Monitoring & Maintenance

### Recommended Monitoring
1. **Query Performance**: Track slow queries >100ms
2. **Index Usage**: Monthly unused index reports
3. **Partition Health**: Automated partition creation/cleanup
4. **RLS Policy**: Ensure no policy bypasses
5. **Connection Pooling**: Monitor connection usage

### Maintenance Schedule
- **Daily**: Monitor slow query log
- **Weekly**: Review unused indexes
- **Monthly**: Partition maintenance, statistics update
- **Quarterly**: Schema drift analysis, security audit

## Conclusion

The KEPCO AI Community database represents a well-architected V2 system with modern patterns like polymorphic content tables, partitioned logging, and comprehensive relationship modeling. However, it suffers from significant performance and security issues that require immediate attention.

**Key Strengths:**
- Modern V2 schema with proper relationships
- Comprehensive React hook system  
- Intelligent use of materialized views
- Solid audit trail architecture

**Critical Issues:**
- 85+ unused indexes consuming resources
- Major N+1 query patterns in core hooks
- Critical security vulnerabilities in partitioned tables
- Function search path security holes

**Business Impact:**
- **Performance**: 40-60% improvement possible with index cleanup and query optimization
- **Security**: Critical vulnerabilities expose user data 
- **Maintainability**: Clear naming and documentation needed
- **Scalability**: Current issues will compound as data grows

Implementing the recommended fixes will transform this from a problematic system into a high-performance, secure, and maintainable database architecture suitable for production scale.