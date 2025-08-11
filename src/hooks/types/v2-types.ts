/**
 * V2 Type System - Centralized Database Type Exports
 * 
 * This file provides centralized type exports from database.types.ts for V2 schema tables.
 * All V2 hooks should import types from this file to ensure consistency.
 * 
 * DO NOT define custom interfaces here - only re-export database types.
 */

import type { Tables, TablesInsert, TablesUpdate, Database } from '@/lib/database.types'

// =============================================================================
// V2 TABLE TYPES
// =============================================================================

// User Management
export type UserV2 = Tables<'users_v2'>
export type UserV2Insert = TablesInsert<'users_v2'>
export type UserV2Update = TablesUpdate<'users_v2'>

// Content System  
export type ContentV2 = Tables<'content_v2'>
export type ContentV2Insert = TablesInsert<'content_v2'>
export type ContentV2Update = TablesUpdate<'content_v2'>

// Comments System
export type CommentV2 = Tables<'comments_v2'>
export type CommentV2Insert = TablesInsert<'comments_v2'>
export type CommentV2Update = TablesUpdate<'comments_v2'>

// Interactions System
export type InteractionV2 = Tables<'interactions_v2'>
export type InteractionV2Insert = TablesInsert<'interactions_v2'>
export type InteractionV2Update = TablesUpdate<'interactions_v2'>

// Activities System
export type ActivityV2 = Tables<'activities_v2'>
export type ActivityV2Insert = TablesInsert<'activities_v2'>
export type ActivityV2Update = TablesUpdate<'activities_v2'>

export type ActivityParticipantV2 = Tables<'activity_participants_v2'>
export type ActivityParticipantV2Insert = TablesInsert<'activity_participants_v2'>
export type ActivityParticipantV2Update = TablesUpdate<'activity_participants_v2'>

// Notifications System
export type NotificationV2 = Tables<'notifications_v2'>
export type NotificationV2Insert = TablesInsert<'notifications_v2'>
export type NotificationV2Update = TablesUpdate<'notifications_v2'>

// Membership System
export type MembershipApplicationV2 = Tables<'membership_applications_v2'>
export type MembershipApplicationV2Insert = TablesInsert<'membership_applications_v2'>
export type MembershipApplicationV2Update = TablesUpdate<'membership_applications_v2'>

// Categories & Tags
export type CategoryV2 = Tables<'categories_v2'>
export type CategoryV2Insert = TablesInsert<'categories_v2'>
export type CategoryV2Update = TablesUpdate<'categories_v2'>

export type TagV2 = Tables<'tags_v2'>
export type TagV2Insert = TablesInsert<'tags_v2'>
export type TagV2Update = TablesUpdate<'tags_v2'>

// Relationship Tables
// content_categories_v2 테이블 제거됨 - content_v2.category 필드 사용
// export type ContentCategoryV2 = Tables<'content_categories_v2'>
// export type ContentCategoryV2Insert = TablesInsert<'content_categories_v2'>

export type ContentTagV2 = Tables<'content_tags_v2'>
export type ContentTagV2Insert = TablesInsert<'content_tags_v2'>

// Metadata (view types)
export type ContentMetadataV2 = Database['public']['Views']['content_with_metadata_v2']['Row']
// Note: Views don't support Insert/Update operations directly

// Logging & Audit
export type UserActivityLogV2 = Tables<'user_activity_logs_v2'>
export type UserActivityLogV2Insert = TablesInsert<'user_activity_logs_v2'>

export type AuditLogV2 = Tables<'audit_logs_v2'>
export type AuditLogV2Insert = TablesInsert<'audit_logs_v2'>

// =============================================================================
// ENUM TYPES - Database enums are empty, so we define them here
// These should match the actual database enums when they are added
// =============================================================================

export type UserRole = 'guest' | 'pending' | 'member' | 'vice-leader' | 'leader' | 'admin'
export type ContentType = 'community' | 'resource' | 'case' | 'notice' | 'news' | 'activity' | 'announcement' | 'rpa'
export type InteractionType = 'like' | 'bookmark' | 'follow' | 'report' | 'view'
export type NotificationType = 'comment' | 'like' | 'mention' | 'activity' | 'system'
export type MembershipStatus = 'pending' | 'approved' | 'rejected'
export type ActivityEventType = 'workshop' | 'seminar' | 'meeting' | 'lecture' | 'study' | 'hackathon' | 'conference' | 'social' | 'regular' | 'dinner' | 'other'
export type ParticipantStatus = 'registered' | 'confirmed' | 'waitlisted' | 'cancelled'

// =============================================================================
// COMMON COMPOSITE TYPES FOR V2 HOOKS
// =============================================================================

// Content with relationships
export type ContentV2WithRelations = ContentV2 & {
  author: Pick<UserV2, 'id' | 'email' | 'name' | 'department' | 'avatar_url'>
  categories?: CategoryV2[]
  tags?: TagV2[]
  interactions_summary?: {
    like_count: number
    bookmark_count: number
    view_count: number
    comment_count: number
  }
}

// Comment with user info
export type CommentV2WithUser = CommentV2 & {
  author: Pick<UserV2, 'id' | 'name' | 'avatar_url' | 'role'>
}

// Activity with content info
export type ActivityV2WithContent = ActivityV2 & {
  content: Pick<ContentV2, 'id' | 'title' | 'summary' | 'author_id'>
  participant_count: number
  is_registered: boolean
}

// Membership application with user info  
export type MembershipApplicationV2WithUser = MembershipApplicationV2 & {
  user: Pick<UserV2, 'id' | 'email' | 'name' | 'department' | 'avatar_url'>
  reviewer?: Pick<UserV2, 'name'>
}

// Notification with metadata
export type NotificationV2WithMetadata = NotificationV2 & {
  metadata?: Record<string, any>
}

// =============================================================================
// RPC PARAMETER TYPES
// =============================================================================

// For RPC functions that need specific parameter types
export interface CreateCommentV2Params {
  content_id: string
  content: string
  parent_path?: string
}

export interface ToggleInteractionV2Params {
  content_id: string
  interaction_type: InteractionType
}

export interface RegisterForActivityV2Params {
  activity_id: string
}

export interface ProcessMembershipApplicationV2Params {
  application_id: string
  action: 'approve' | 'reject'
  review_notes?: string
}

export interface SearchContentV2Params {
  query: string
  content_types?: ContentType[]
  category_ids?: string[]
  tag_ids?: string[]
  limit?: number
  offset?: number
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type V2TableName = 
  | 'users_v2'
  | 'content_v2' 
  | 'comments_v2'
  | 'interactions_v2'
  | 'activities_v2'
  | 'activity_participants_v2'
  | 'notifications_v2'
  | 'membership_applications_v2'
  | 'categories_v2'
  | 'tags_v2'
  | 'content_tags_v2'
  | 'content_metadata_v2'
  | 'user_activity_logs_v2'
  | 'audit_logs_v2'