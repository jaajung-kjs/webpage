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
      activities: {
        Row: {
          content_id: string
          created_at: string
          current_participants: number
          duration_minutes: number | null
          id: string
          instructor_id: string | null
          location: string | null
          max_participants: number | null
          scheduled_at: string
          status: Database["public"]["Enums"]["activity_status"]
          updated_at: string
        }
        Insert: {
          content_id: string
          created_at?: string
          current_participants?: number
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          location?: string | null
          max_participants?: number | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
        }
        Update: {
          content_id?: string
          created_at?: string
          current_participants?: number
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          location?: string | null
          max_participants?: number | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_participants: {
        Row: {
          activity_id: string
          id: string
          registered_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          id?: string
          registered_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          id?: string
          registered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      application_history: {
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
            foreignKeyName: "application_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "membership_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          comment: string
          content_id: string
          created_at: string
          id: string
          like_count: number
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          comment: string
          content_id: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          comment?: string
          content_id?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments_with_author"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          author_id: string
          category: string | null
          comment_count: number
          content: string
          created_at: string
          excerpt: string | null
          id: string
          like_count: number
          metadata: Json
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          category?: string | null
          comment_count?: number
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          like_count?: number
          metadata?: Json
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          category?: string | null
          comment_count?: number
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          like_count?: number
          metadata?: Json
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          comment_id: string | null
          content_id: string | null
          created_at: string
          id: string
          metadata: Json
          type: Database["public"]["Enums"]["interaction_type"]
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          type: Database["public"]["Enums"]["interaction_type"]
          user_id: string
        }
        Update: {
          comment_id?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          type?: Database["public"]["Enums"]["interaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
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
            foreignKeyName: "media_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_applications: {
        Row: {
          application_reason: string
          created_at: string
          experience_level: string
          id: string
          interests: string[]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_reason: string
          created_at?: string
          experience_level?: string
          id?: string
          interests?: string[]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_reason?: string
          created_at?: string
          experience_level?: string
          id?: string
          interests?: string[]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_types: {
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
      reports: {
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
            foreignKeyName: "reports_report_type_id_fkey"
            columns: ["report_type_id"]
            isOneToOne: false
            referencedRelation: "report_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
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
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          activity_score: number
          avatar_url: string | null
          bio: string
          created_at: string
          department: string
          email: string
          id: string
          last_seen_at: string | null
          metadata: Json
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          activity_score?: number
          avatar_url?: string | null
          bio?: string
          created_at?: string
          department?: string
          email: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          activity_score?: number
          avatar_url?: string | null
          bio?: string
          created_at?: string
          department?: string
          email?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      activities_with_details: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          content_id: string | null
          created_at: string | null
          current_participants: number | null
          duration_minutes: number | null
          id: string | null
          instructor_avatar: string | null
          instructor_id: string | null
          instructor_name: string | null
          location: string | null
          max_participants: number | null
          participant_count: number | null
          participant_ids: string[] | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["activity_status"] | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments_with_author: {
        Row: {
          author_avatar: string | null
          author_department: string | null
          author_email: string | null
          author_id: string | null
          author_name: string | null
          author_role: Database["public"]["Enums"]["user_role"] | null
          comment: string | null
          content_id: string | null
          created_at: string | null
          id: string | null
          like_count: number | null
          parent_id: string | null
          reply_count: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments_with_author"
            referencedColumns: ["id"]
          },
        ]
      }
      content_with_author: {
        Row: {
          author_avatar: string | null
          author_department: string | null
          author_email: string | null
          author_id: string | null
          author_name: string | null
          author_role: Database["public"]["Enums"]["user_role"] | null
          category: string | null
          comment_count: number | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string | null
          like_count: number | null
          metadata: Json | null
          status: Database["public"]["Enums"]["content_status"] | null
          tags: string[] | null
          title: string | null
          type: Database["public"]["Enums"]["content_type"] | null
          updated_at: string | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "members_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      members_with_stats: {
        Row: {
          activity_score: number | null
          avatar_url: string | null
          bio: string | null
          comment_count: number | null
          created_at: string | null
          department: string | null
          email: string | null
          id: string | null
          last_seen_at: string | null
          metadata: Json | null
          name: string | null
          post_count: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          activity_count: number | null
          activity_score: number | null
          avatar_url: string | null
          bio: string | null
          case_count: number | null
          comment_count: number | null
          created_at: string | null
          department: string | null
          email: string | null
          id: string | null
          last_seen_at: string | null
          like_count: number | null
          metadata: Json | null
          name: string | null
          post_count: number | null
          resource_count: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          view_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_activity_score: {
        Args: { user_id: string }
        Returns: number
      }
      can_change_user_role: {
        Args: {
          manager_id: string
          target_user_id: string
          new_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      can_manage_user: {
        Args: { manager_id: string; target_user_id: string }
        Returns: boolean
      }
      check_duplicate_report: {
        Args: {
          p_reporter_id: string
          p_target_type: string
          p_target_id: string
        }
        Returns: boolean
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
      get_admin_report_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_assignable_roles: {
        Args: { manager_id: string }
        Returns: Database["public"]["Enums"]["user_role"][]
      }
      get_homepage_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_reports_with_pagination: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: Json
      }
      get_user_activity_logs: {
        Args: { target_user_id: string; limit_count?: number }
        Returns: Json
      }
      get_user_content_stats: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_user_role: {
        Args: { user_id?: string }
        Returns: string
      }
      get_user_stats: {
        Args: { user_id_param: string }
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
      has_permission: {
        Args: { user_id: string; permission_name: string }
        Returns: boolean
      }
      increment_comment_likes: {
        Args: { comment_id: string }
        Returns: undefined
      }
      increment_downloads: {
        Args: { resource_id: string }
        Returns: undefined
      }
      increment_view_count: {
        Args: { content_id: string; content_type: string }
        Returns: undefined
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
      search_content: {
        Args: {
          search_query: string
          content_types?: Database["public"]["Enums"]["content_type"][]
          limit_count?: number
        }
        Returns: {
          id: string
          type: Database["public"]["Enums"]["content_type"]
          title: string
          excerpt: string
          author_name: string
          created_at: string
          rank: number
        }[]
      }
      update_report_status: {
        Args: {
          p_report_id: string
          p_status: string
          p_resolution_notes?: string
        }
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
    }
    Enums: {
      activity_category:
        | "workshop"
        | "seminar"
        | "study"
        | "discussion"
        | "meeting"
      activity_status: "upcoming" | "ongoing" | "completed" | "cancelled"
      announcement_category: "notice" | "event" | "meeting" | "announcement"
      announcement_priority: "high" | "medium" | "low"
      community_category:
        | "tips"
        | "review"
        | "help"
        | "discussion"
        | "question"
        | "chat"
      content_status: "draft" | "published" | "archived"
      content_type: "post" | "case" | "announcement" | "resource" | "activity"
      interaction_type: "like" | "bookmark" | "view" | "report" | "comment_like"
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
      user_role:
        | "admin"
        | "moderator"
        | "member"
        | "leader"
        | "vice-leader"
        | "guest"
        | "pending"
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
      activity_status: ["upcoming", "ongoing", "completed", "cancelled"],
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
      content_status: ["draft", "published", "archived"],
      content_type: ["post", "case", "announcement", "resource", "activity"],
      interaction_type: ["like", "bookmark", "view", "report", "comment_like"],
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
      user_role: [
        "admin",
        "moderator",
        "member",
        "leader",
        "vice-leader",
        "guest",
        "pending",
      ],
    },
  },
} as const
