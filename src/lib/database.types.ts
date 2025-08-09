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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activities_v2: {
        Row: {
          content_id: string
          created_at: string
          current_participants: number
          duration_minutes: number | null
          end_date: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          instructor_id: string | null
          is_online: boolean
          location: string | null
          location_detail: string | null
          max_participants: number | null
          online_url: string | null
          registration_deadline: string | null
          requirements: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content_id: string
          created_at?: string
          current_participants?: number
          duration_minutes?: number | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          event_type: string
          id?: string
          instructor_id?: string | null
          is_online?: boolean
          location?: string | null
          location_detail?: string | null
          max_participants?: number | null
          online_url?: string | null
          registration_deadline?: string | null
          requirements?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          created_at?: string
          current_participants?: number
          duration_minutes?: number | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          instructor_id?: string | null
          is_online?: boolean
          location?: string | null
          location_detail?: string | null
          max_participants?: number | null
          online_url?: string | null
          registration_deadline?: string | null
          requirements?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "content_with_metadata_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "trending_content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_v2_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_v2_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
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
          registered_at: string
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
          registered_at?: string
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
          registered_at?: string
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
            referencedRelation: "user_stats_summary_v2"
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
      application_history_v2: {
        Row: {
          action: string
          actor_id: string
          application_id: string
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          action: string
          actor_id: string
          application_id: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          application_id?: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_history_v2_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_v2_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_v2_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "membership_applications_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_v2: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
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
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
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
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
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
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs_v2_y2025m03: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
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
          like_count: number
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
          like_count?: number
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
          like_count?: number
          parent_id?: string | null
          path?: unknown | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_metadata_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "trending_content_v2"
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
      content_attachments_v2: {
        Row: {
          attachment_type: string
          content_id: string
          created_at: string
          display_order: number
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
        }
        Insert: {
          attachment_type?: string
          content_id: string
          created_at?: string
          display_order?: number
          file_name: string
          file_size?: number
          file_type?: string
          file_url: string
          id?: string
        }
        Update: {
          attachment_type?: string
          content_id?: string
          created_at?: string
          display_order?: number
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_attachments_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_attachments_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_metadata_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_attachments_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "trending_content_v2"
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
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_categories_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_metadata_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_categories_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "trending_content_v2"
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
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metadata_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_metadata_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metadata_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "trending_content_v2"
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
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tags_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_metadata_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tags_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "trending_content_v2"
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
          category: string | null
          comment_count: number
          content: string
          content_type: string
          created_at: string
          deleted_at: string | null
          id: string
          is_pinned: boolean
          like_count: number
          metadata: Json
          published_at: string | null
          status: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          category?: string | null
          comment_count?: number
          content: string
          content_type: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean
          like_count?: number
          metadata?: Json
          published_at?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          category?: string | null
          comment_count?: number
          content?: string
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean
          like_count?: number
          metadata?: Json
          published_at?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
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
          last_activity_at: string
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
          last_activity_at?: string
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
          last_activity_at?: string
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
            referencedRelation: "user_stats_summary_v2"
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
            referencedRelation: "user_stats_summary_v2"
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
      email_verification_attempts_v2: {
        Row: {
          attempt_type: string
          created_at: string
          email: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          attempt_type: string
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Relationships: []
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
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      media_v2: {
        Row: {
          comment_id: string | null
          content_id: string | null
          created_at: string
          file_path: string
          file_size: number | null
          filename: string
          id: string
          mime_type: string | null
          uploaded_by: string
        }
        Insert: {
          comment_id?: string | null
          content_id?: string | null
          created_at?: string
          file_path: string
          file_size?: number | null
          filename: string
          id?: string
          mime_type?: string | null
          uploaded_by: string
        }
        Update: {
          comment_id?: string | null
          content_id?: string | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          filename?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_v2_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_metadata_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_v2_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "trending_content_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_v2_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_v2_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_applications_v2: {
        Row: {
          application_reason: string
          created_at: string
          experience: string | null
          experience_level: string
          goals: string | null
          id: string
          interests: string[]
          motivation: string | null
          review_comment: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_reason: string
          created_at?: string
          experience?: string | null
          experience_level?: string
          goals?: string | null
          id?: string
          interests?: string[]
          motivation?: string | null
          review_comment?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_reason?: string
          created_at?: string
          experience?: string | null
          experience_level?: string
          goals?: string | null
          id?: string
          interests?: string[]
          motivation?: string | null
          review_comment?: string | null
          review_notes?: string | null
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
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
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
            isOneToOne: true
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
            referencedRelation: "user_stats_summary_v2"
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
          is_read: boolean
          message_type: string
          read_at: string | null
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
          is_read?: boolean
          message_type?: string
          read_at?: string | null
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
          is_read?: boolean
          message_type?: string
          read_at?: string | null
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
            referencedRelation: "user_stats_summary_v2"
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
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      report_types_v2: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          severity: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          severity?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports_v2: {
        Row: {
          created_at: string
          description: string | null
          id: string
          parent_content_id: string | null
          reason: string
          report_type_id: string
          reporter_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          parent_content_id?: string | null
          reason: string
          report_type_id: string
          reporter_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          parent_content_id?: string | null
          reason?: string
          report_type_id?: string
          reporter_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_v2_report_type_id_fkey"
            columns: ["report_type_id"]
            isOneToOne: false
            referencedRelation: "report_types_v2"
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
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
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
      user_message_stats_v2: {
        Row: {
          last_checked_at: string
          received_count: number
          sent_count: number
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_checked_at?: string
          received_count?: number
          sent_count?: number
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_checked_at?: string
          received_count?: number
          sent_count?: number
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_message_stats_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_message_stats_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_metadata_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings_v2: {
        Row: {
          community_updates: boolean
          created_at: string
          email_notifications: boolean
          id: string
          language: string
          metadata: Json
          profile_public: boolean
          push_notifications: boolean
          show_email: boolean
          show_phone: boolean
          theme: string
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          community_updates?: boolean
          created_at?: string
          email_notifications?: boolean
          id?: string
          language?: string
          metadata?: Json
          profile_public?: boolean
          push_notifications?: boolean
          show_email?: boolean
          show_phone?: boolean
          theme?: string
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          community_updates?: boolean
          created_at?: string
          email_notifications?: boolean
          id?: string
          language?: string
          metadata?: Json
          profile_public?: boolean
          push_notifications?: boolean
          show_email?: boolean
          show_phone?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
          bio: string
          created_at: string
          deleted_at: string | null
          department: string
          email: string
          email_verified_at: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          last_seen_at: string | null
          metadata: Json
          name: string
          role: string
          skill_level: string
          updated_at: string
        }
        Insert: {
          activity_level?: string
          activity_score?: number
          avatar_url?: string | null
          bio?: string
          created_at?: string
          deleted_at?: string | null
          department?: string
          email: string
          email_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          last_seen_at?: string | null
          metadata?: Json
          name: string
          role?: string
          skill_level?: string
          updated_at?: string
        }
        Update: {
          activity_level?: string
          activity_score?: number
          avatar_url?: string | null
          bio?: string
          created_at?: string
          deleted_at?: string | null
          department?: string
          email?: string
          email_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          last_seen_at?: string | null
          metadata?: Json
          name?: string
          role?: string
          skill_level?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      content_with_metadata_v2: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_name: string | null
          category: string | null
          comment_count: number | null
          content: string | null
          content_type: string | null
          created_at: string | null
          deleted_at: string | null
          id: string | null
          is_pinned: boolean | null
          like_count: number | null
          metadata: Json | null
          published_at: string | null
          status: string | null
          summary: string | null
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
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_content_v2: {
        Row: {
          author_id: string | null
          author_name: string | null
          comment_count: number | null
          content_type: string | null
          created_at: string | null
          id: string | null
          like_count: number | null
          title: string | null
          trending_score: number | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_v2_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats_summary_v2: {
        Row: {
          activity_score: number | null
          comments_count: number | null
          created_at: string | null
          email: string | null
          id: string | null
          last_seen_at: string | null
          likes_received: number | null
          name: string | null
          posts_count: number | null
          role: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_activity_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_user_activity_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_user_level_v2: {
        Args: { p_user_id: string }
        Returns: number
      }
      can_access_content: {
        Args: { user_id: string; content_id: string }
        Returns: boolean
      }
      can_manage_user: {
        Args: { manager_id: string; target_user_id: string }
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
      check_duplicate_report: {
        Args: {
          p_reporter_id: string
          p_target_type: string
          p_target_id: string
        }
        Returns: boolean
      }
      check_user_achievements: {
        Args: { p_user_id: string }
        Returns: Json
      }
      cleanup_unverified_accounts: {
        Args: { age_hours?: number }
        Returns: number
      }
      confirm_activity_attendance_v2: {
        Args: { p_activity_id: string; p_user_id: string; p_attended?: boolean }
        Returns: Json
      }
      create_audit_log_v2: {
        Args: {
          p_user_id: string
          p_action: string
          p_table_name: string
          p_record_id?: string
          p_old_values?: Json
          p_new_values?: Json
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
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
      create_report: {
        Args: {
          p_target_type: string
          p_target_id: string
          p_report_type_id: string
          p_reason: string
          p_description?: string
        }
        Returns: string
      }
      decrement_comment_likes: {
        Args: { comment_id: string }
        Returns: undefined
      }
      get_activity_stats_v2: {
        Args: { p_activity_id: string }
        Returns: Json
      }
      get_admin_report_dashboard: {
        Args: Record<PropertyKey, never>
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
      get_content_with_relations_v2: {
        Args: { p_content_id: string; p_user_id?: string }
        Returns: Json
      }
      get_dashboard_stats_v2: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_homepage_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_message_inbox: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          other_user_id: string
          other_user_name: string
          other_user_avatar: string
          last_message: string
          last_message_time: string
          is_last_message_read: boolean
          unread_count: number
        }[]
      }
      get_or_create_conversation_v2: {
        Args: { p_user1_id: string; p_user2_id: string }
        Returns: string
      }
      get_reports_with_pagination: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      get_trending_content_v2: {
        Args: { p_limit?: number; p_days?: number; p_content_type?: string }
        Returns: Json
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
      get_user_activity_logs: {
        Args: { target_user_id: string; limit_count?: number }
        Returns: Json
      }
      get_user_comprehensive_stats: {
        Args: { p_user_id: string }
        Returns: {
          total_posts: number
          total_comments: number
          total_likes_given: number
          total_likes_received: number
          total_views: number
          most_active_category: string
          join_date: string
          last_active: string
          activity_score: number
        }[]
      }
      get_user_content_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_interaction_stats_v2: {
        Args: { p_user_id: string }
        Returns: {
          like_received_count: number
          bookmark_count: number
          view_count: number
        }[]
      }
      get_user_interactions_v2: {
        Args: {
          p_user_id: string
          p_target_type?: string
          p_interaction_type?: string
        }
        Returns: Json
      }
      get_user_profile_complete_v2: {
        Args:
          | { p_user_id: string }
          | {
              target_user_id: string
              include_activities?: boolean
              activities_limit?: number
              include_achievements?: boolean
            }
        Returns: Json
      }
      get_user_role_v2: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_stats_v2: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_with_stats: {
        Args: { target_user_id: string }
        Returns: {
          id: string
          email: string
          name: string
          department: string
          role: string
          avatar_url: string
          activity_score: number
          posts_count: number
          comments_count: number
          likes_received: number
        }[]
      }
      get_users_interaction_stats_v2: {
        Args: Record<PropertyKey, never> | { p_user_ids: string[] }
        Returns: {
          user_id: string
          like_received_count: number
          bookmark_count: number
          view_count: number
        }[]
      }
      get_users_simple_stats: {
        Args: Record<PropertyKey, never> | { p_user_ids: string[] }
        Returns: {
          total_users: number
          active_users: number
          member_users: number
          pending_users: number
          guest_users: number
        }[]
      }
      grant_achievement: {
        Args: {
          p_user_id: string
          p_achievement_id: string
          p_points?: number
          p_metadata?: Json
        }
        Returns: Json
      }
      has_permission: {
        Args: { user_id: string; permission_name: string }
        Returns: boolean
      }
      increment_activity_score_v2: {
        Args: { p_user_id: string; p_action_type: string; p_points?: number }
        Returns: undefined
      }
      increment_comment_likes: {
        Args: { comment_id: string }
        Returns: undefined
      }
      increment_downloads: {
        Args: { resource_id: string }
        Returns: undefined
      }
      increment_view_count_v2: {
        Args: { p_content_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_admin_or_leader: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_admin_role: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_member: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_member_or_above: {
        Args: { user_id?: string }
        Returns: boolean
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
      mark_conversation_messages_as_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: number
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
      send_message: {
        Args: { p_sender_id: string; p_recipient_id: string; p_message: string }
        Returns: Json
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
      update_activity_score: {
        Args: { user_id: string }
        Returns: undefined
      }
      update_last_seen_at: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_my_last_seen_at: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_report_status: {
        Args: {
          p_report_id: string
          p_status: string
          p_resolution_notes?: string
        }
        Returns: undefined
      }
      update_user_achievements_v2: {
        Args: { p_user_id: string }
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
      update_user_stats: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      upload_file_to_storage: {
        Args: {
          p_bucket_name: string
          p_file_path: string
          p_file_data: string
          p_content_type?: string
        }
        Returns: string
      }
      upsert_content_metadata_v2: {
        Args: { p_content_id: string; p_key: string; p_value: Json }
        Returns: undefined
      }
    }
    Enums: {
      activity_category:
        | "workshop"
        | "seminar"
        | "study"
        | "discussion"
        | "meeting"
      announcement_category: "notice" | "event" | "meeting" | "announcement"
      announcement_priority: "high" | "medium" | "low"
      community_category:
        | "tips"
        | "review"
        | "help"
        | "discussion"
        | "question"
        | "chat"
      notification_type:
        | "like"
        | "comment"
        | "mention"
        | "follow"
        | "activity"
        | "announcement"
        | "system"
      post_category:
        | "productivity"
        | "creativity"
        | "development"
        | "analysis"
        | "other"
      post_subcategory:
        | "automation"
        | "documentation"
        | "coding"
        | "design"
        | "research"
        | "communication"
      resource_category:
        | "tutorial"
        | "workshop"
        | "template"
        | "reference"
        | "guideline"
      resource_type:
        | "guide"
        | "presentation"
        | "video"
        | "document"
        | "spreadsheet"
        | "template"
      severity_level: "low" | "medium" | "high" | "critical"
      skill_level: "beginner" | "intermediate" | "advanced" | "expert"
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
    Enums: {
      activity_category: [
        "workshop",
        "seminar",
        "study",
        "discussion",
        "meeting",
      ],
      announcement_category: ["notice", "event", "meeting", "announcement"],
      announcement_priority: ["high", "medium", "low"],
      community_category: [
        "tips",
        "review",
        "help",
        "discussion",
        "question",
        "chat",
      ],
      notification_type: [
        "like",
        "comment",
        "mention",
        "follow",
        "activity",
        "announcement",
        "system",
      ],
      post_category: [
        "productivity",
        "creativity",
        "development",
        "analysis",
        "other",
      ],
      post_subcategory: [
        "automation",
        "documentation",
        "coding",
        "design",
        "research",
        "communication",
      ],
      resource_category: [
        "tutorial",
        "workshop",
        "template",
        "reference",
        "guideline",
      ],
      resource_type: [
        "guide",
        "presentation",
        "video",
        "document",
        "spreadsheet",
        "template",
      ],
      severity_level: ["low", "medium", "high", "critical"],
      skill_level: ["beginner", "intermediate", "advanced", "expert"],
    },
  },
} as const
