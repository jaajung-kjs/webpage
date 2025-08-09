export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activities_v2: {
        Row: {
          content_id: string
          created_at: string
          end_date: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          is_online: boolean
          location: string | null
          location_detail: string | null
          max_participants: number | null
          online_url: string | null
          registration_deadline: string | null
          requirements: string | null
          updated_at: string
        }
        Insert: {
          content_id: string
          created_at?: string
          end_date?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          event_type: string
          id?: string
          is_online?: boolean
          location?: string | null
          location_detail?: string | null
          max_participants?: number | null
          online_url?: string | null
          registration_deadline?: string | null
          requirements?: string | null
          updated_at?: string
        }
        Update: {
          content_id?: string
          created_at?: string
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          is_online?: boolean
          location?: string | null
          location_detail?: string | null
          max_participants?: number | null
          online_url?: string | null
          registration_deadline?: string | null
          requirements?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_participants_v2: {
        Row: {
          activity_id: string
          attendance_confirmed_at: string | null
          attended: boolean
          created_at: string
          feedback: string | null
          id: string
          rating: number | null
          registration_note: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          attendance_confirmed_at?: string | null
          attended?: boolean
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          registration_note?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          attendance_confirmed_at?: string | null
          attended?: boolean
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          registration_note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_v2_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_v2: {
        Row: {
          action: string
          created_at: string
          id: number
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_v2_y2025m01: {
        Row: {
          action: string
          created_at: string
          id: number
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs_v2_y2025m02: {
        Row: {
          action: string
          created_at: string
          id: number
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories_v2: {
        Row: {
          category_type: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          category_type: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          category_type?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_v2_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      comments_v2: {
        Row: {
          author_id: string
          comment_text: string
          content_id: string
          created_at: string
          deleted_at: string | null
          depth: number
          id: string
          parent_id: string | null
          path: unknown | null
          updated_at: string
        }
        Insert: {
          author_id: string
          comment_text: string
          content_id: string
          created_at?: string
          deleted_at?: string | null
          depth?: number
          id?: string
          parent_id?: string | null
          path?: unknown | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          comment_text?: string
          content_id?: string
          created_at?: string
          deleted_at?: string | null
          depth?: number
          id?: string
          parent_id?: string | null
          path?: unknown | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_v2_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      content_categories_v2: {
        Row: {
          category_id: string
          content_id: string
        }
        Insert: {
          category_id: string
          content_id: string
        }
        Update: {
          category_id?: string
          content_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_v2_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_categories_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_categories_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_categories_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_categories_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      content_metadata_v2: {
        Row: {
          content_id: string
          key: string
          value: Json
        }
        Insert: {
          content_id: string
          key: string
          value: Json
        }
        Update: {
          content_id?: string
          key?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_metadata_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metadata_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metadata_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metadata_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tags_v2: {
        Row: {
          content_id: string
          tag_id: string
        }
        Insert: {
          content_id: string
          tag_id: string
        }
        Update: {
          content_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tags_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tags_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tags_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tags_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tags_v2_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      content_v2: {
        Row: {
          author_id: string
          comment_count: number
          content: string
          content_type: string
          created_at: string
          deleted_at: string | null
          id: string
          is_pinned: boolean
          like_count: number
          published_at: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          comment_count?: number
          content: string
          content_type: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean
          like_count?: number
          published_at?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          comment_count?: number
          content?: string
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean
          like_count?: number
          published_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations_v2: {
        Row: {
          conversation_type: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          last_message_at: string | null
          last_message_id: string | null
          title: string | null
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          conversation_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          last_message_at?: string | null
          last_message_id?: string | null
          title?: string | null
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          conversation_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          last_message_at?: string | null
          last_message_id?: string | null
          title?: string | null
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_v2_last_message_fkey"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "messages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_v2_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_v2_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions_v2: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          metadata: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          metadata?: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          metadata?: Json | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_applications_v2: {
        Row: {
          created_at: string
          experience: string | null
          goals: string | null
          id: string
          motivation: string
          review_comment: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          experience?: string | null
          goals?: string | null
          id?: string
          motivation: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          experience?: string | null
          goals?: string | null
          id?: string
          motivation?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_applications_v2_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_status_v2: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_id: string
          read_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id: string
          read_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id?: string
          read_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_status_v2_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_status_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_v2: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean
          message_type: string
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          message_type?: string
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          message_type?: string
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_v2_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_v2_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_v2_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_v2: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      tags_v2: {
        Row: {
          id: string
          name: string
          slug: string
          usage_count: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          usage_count?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          usage_count?: number
        }
        Relationships: []
      }
      user_achievements_v2: {
        Row: {
          achievement_id: string
          achievement_tier: string | null
          earned_at: string
          id: string
          metadata: Json | null
          points_earned: number
          user_id: string
        }
        Insert: {
          achievement_id: string
          achievement_tier?: string | null
          earned_at?: string
          id?: string
          metadata?: Json | null
          points_earned?: number
          user_id: string
        }
        Update: {
          achievement_id?: string
          achievement_tier?: string | null
          earned_at?: string
          id?: string
          metadata?: Json | null
          points_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs_v2: {
        Row: {
          action_type: string
          created_at: string
          id: number
          metadata: Json | null
          points_earned: number
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: number
          metadata?: Json | null
          points_earned?: number
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: number
          metadata?: Json | null
          points_earned?: number
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs_v2_2025_01: {
        Row: {
          action_type: string
          created_at: string
          id: number
          metadata: Json | null
          points_earned: number
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: number
          metadata?: Json | null
          points_earned?: number
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: number
          metadata?: Json | null
          points_earned?: number
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs_v2_2025_02: {
        Row: {
          action_type: string
          created_at: string
          id: number
          metadata: Json | null
          points_earned: number
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: number
          metadata?: Json | null
          points_earned?: number
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: number
          metadata?: Json | null
          points_earned?: number
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_metadata_v2: {
        Row: {
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_metadata_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      users_v2: {
        Row: {
          activity_level: string
          activity_score: number
          avatar_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string
          email_verified_at: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          name: string
          role: string
          skill_level: string
          updated_at: string
        }
        Insert: {
          activity_level?: string
          activity_score?: number
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email: string
          email_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          name: string
          role?: string
          skill_level?: string
          updated_at?: string
        }
        Update: {
          activity_level?: string
          activity_score?: number
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string
          email_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          name?: string
          role?: string
          skill_level?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_connections: {
        Row: {
          application_name: string | null
          client_addr: unknown | null
          pid: number | null
          query: string | null
          query_start: string | null
          state: string | null
          state_change: string | null
          usename: unknown | null
        }
        Relationships: []
      }
      cases: {
        Row: {
          author_id: string | null
          category: string | null
          company: string | null
          created_at: string | null
          description: string | null
          id: string | null
          industry: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string | null
          category: string | null
          comment_count: number | null
          content: string | null
          created_at: string | null
          id: string | null
          is_pinned: boolean | null
          is_published: boolean | null
          like_count: number | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      db_performance_stats: {
        Row: {
          dead_ratio: number | null
          dead_rows: number | null
          last_analyze: string | null
          last_autoanalyze: string | null
          last_autovacuum: string | null
          last_vacuum: string | null
          live_rows: number | null
          schemaname: unknown | null
          tablename: unknown | null
        }
        Relationships: []
      }
      index_usage_stats: {
        Row: {
          index_scans: number | null
          index_size: string | null
          indexname: unknown | null
          schemaname: unknown | null
          tablename: unknown | null
          tuples_fetched: number | null
          tuples_read: number | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          author_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          file_type: string | null
          file_url: string | null
          id: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      slow_queries: {
        Row: {
          calls: number | null
          max_exec_time: number | null
          mean_exec_time: number | null
          query: string | null
          stddev_exec_time: number | null
          total_exec_time: number | null
        }
        Relationships: []
      }
      table_sizes: {
        Row: {
          indexes_size: string | null
          table_size: string | null
          tablename: unknown | null
          total_size: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      _ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      calculate_user_activity_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      can_access_content: {
        Args: { user_id: string; content_id: string }
        Returns: boolean
      }
      cancel_activity_registration_v2: {
        Args: { p_activity_id: string; p_user_id: string }
        Returns: Json
      }
      check_and_grant_achievements: {
        Args: { p_user_id: string }
        Returns: Json
      }
      confirm_activity_attendance_v2: {
        Args: { p_activity_id: string; p_user_id: string; p_attended?: boolean }
        Returns: Json
      }
      create_comment_v2: {
        Args: {
          p_content_id: string
          p_author_id: string
          p_comment_text: string
          p_parent_id?: string
        }
        Returns: Json
      }
      create_monthly_partition_for_activity_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_notification_v2: {
        Args: {
          p_user_id: string
          p_type: string
          p_title: string
          p_message?: string
          p_data?: Json
        }
        Returns: string
      }
      get_activity_stats_v2: {
        Args: { p_activity_id: string }
        Returns: Json
      }
      get_comment_children_count_v2: {
        Args: { p_comment_id: string }
        Returns: number
      }
      get_comment_thread: {
        Args: { root_comment_id: string }
        Returns: {
          id: string
          content_id: string
          parent_id: string
          author_id: string
          comment_text: string
          depth: number
          path: unknown
          created_at: string
        }[]
      }
      get_comment_tree_v2: {
        Args: { p_content_id: string; p_max_depth?: number }
        Returns: {
          id: string
          parent_id: string
          author_id: string
          author_name: string
          author_avatar: string
          comment_text: string
          depth: number
          path: string
          like_count: number
          created_at: string
          updated_at: string
        }[]
      }
      get_content_stats_v2: {
        Args: { p_content_id: string }
        Returns: Json
      }
      get_dashboard_stats_v2: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_or_create_conversation_v2: {
        Args: { p_user1_id: string; p_user2_id: string }
        Returns: string
      }
      get_trending_content_v2: {
        Args: { p_content_type?: string; p_days?: number; p_limit?: number }
        Returns: {
          id: string
          title: string
          content_type: string
          author_id: string
          score: number
          view_count: number
          like_count: number
          comment_count: number
          created_at: string
        }[]
      }
      get_unread_count_per_conversation_v2: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      get_unread_message_count_v2: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_unread_notification_count_v2: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_upcoming_activities_v2: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_user_activity_history_v2: {
        Args: { p_user_id: string; p_include_past?: boolean }
        Returns: Json
      }
      get_user_interactions_v2: {
        Args: {
          p_user_id: string
          p_target_type?: string
          p_interaction_type?: string
        }
        Returns: Json
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_stats_v2: {
        Args: { p_user_id: string }
        Returns: Json
      }
      grant_achievement: {
        Args: {
          p_user_id: string
          p_achievement_id: string
          p_points?: number
          p_metadata?: Json
        }
        Returns: boolean
      }
      hash_ltree: {
        Args: { "": unknown }
        Returns: number
      }
      increment_activity_score_v2: {
        Args: { p_user_id: string; p_points?: number }
        Returns: Json
      }
      increment_view_count_v2: {
        Args: { p_content_id: string; p_user_id?: string }
        Returns: boolean
      }
      lca: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      log_activity_v2: {
        Args: {
          p_user_id: string
          p_action: string
          p_table_name: string
          p_record_id?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      log_user_activity: {
        Args: {
          p_user_id: string
          p_action_type: string
          p_target_type?: string
          p_target_id?: string
          p_points?: number
          p_metadata?: Json
        }
        Returns: undefined
      }
      lquery_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      ltree_gist_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree2text: {
        Args: { "": unknown }
        Returns: string
      }
      ltxtq_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_send: {
        Args: { "": unknown }
        Returns: string
      }
      mark_messages_as_read_v2: {
        Args: { p_user_id: string; p_conversation_id: string }
        Returns: number
      }
      mark_notifications_read_v2: {
        Args: { p_user_id: string; p_notification_ids?: string[] }
        Returns: number
      }
      mark_specific_messages_as_read_v2: {
        Args: { p_user_id: string; p_message_ids: string[] }
        Returns: number
      }
      nlevel: {
        Args: { "": unknown }
        Returns: number
      }
      process_membership_application_v2: {
        Args: {
          p_application_id: string
          p_reviewer_id: string
          p_action: string
          p_comment?: string
        }
        Returns: Json
      }
      register_for_activity_v2: {
        Args: { p_activity_id: string; p_user_id: string; p_note?: string }
        Returns: Json
      }
      search_content_v2: {
        Args: {
          p_query: string
          p_content_type?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          content_type: string
          title: string
          summary: string
          author_name: string
          relevance: number
          created_at: string
        }[]
      }
      search_messages_v2: {
        Args: {
          p_user_id: string
          p_query: string
          p_conversation_id?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          message_id: string
          conversation_id: string
          sender_id: string
          sender_name: string
          content: string
          created_at: string
          rank: number
        }[]
      }
      text2ltree: {
        Args: { "": string }
        Returns: unknown
      }
      toggle_interaction_v2: {
        Args: {
          p_user_id: string
          p_target_type: string
          p_target_id: string
          p_interaction_type: string
        }
        Returns: Json
      }
      update_user_levels: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_user_metadata: {
        Args: { p_user_id: string; p_key: string; p_value: Json }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
