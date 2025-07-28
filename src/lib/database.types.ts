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
          created_at: string | null
          current_participants: number | null
          duration_minutes: number | null
          id: string
          instructor_id: string | null
          location: string | null
          max_participants: number | null
          scheduled_at: string
          status: Database["public"]["Enums"]["activity_status"] | null
          updated_at: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          current_participants?: number | null
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          location?: string | null
          max_participants?: number | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["activity_status"] | null
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          current_participants?: number | null
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          location?: string | null
          max_participants?: number | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["activity_status"] | null
          updated_at?: string | null
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
          registered_at: string | null
          user_id: string
        }
        Insert: {
          activity_id: string
          id?: string
          registered_at?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          id?: string
          registered_at?: string | null
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
      comments: {
        Row: {
          author_id: string
          comment: string
          content_id: string
          created_at: string | null
          id: string
          like_count: number | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          comment: string
          content_id: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          comment?: string
          content_id?: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
          comment_count: number | null
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          like_count: number | null
          metadata: Json | null
          status: Database["public"]["Enums"]["content_status"] | null
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          category?: string | null
          comment_count?: number | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          like_count?: number | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["content_status"] | null
          tags?: string[] | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category?: string | null
          comment_count?: number | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          like_count?: number | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["content_status"] | null
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
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
          created_at: string | null
          id: string
          metadata: Json | null
          type: Database["public"]["Enums"]["interaction_type"]
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          type: Database["public"]["Enums"]["interaction_type"]
          user_id: string
        }
        Update: {
          comment_id?: string | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
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
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: [
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
          community_updates: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          metadata: Json | null
          profile_public: boolean | null
          push_notifications: boolean | null
          show_email: boolean | null
          show_phone: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
          weekly_digest: boolean | null
        }
        Insert: {
          community_updates?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          metadata?: Json | null
          profile_public?: boolean | null
          push_notifications?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
          weekly_digest?: boolean | null
        }
        Update: {
          community_updates?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          metadata?: Json | null
          profile_public?: boolean | null
          push_notifications?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_digest?: boolean | null
        }
        Relationships: [
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
          activity_score: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          last_seen_at: string | null
          metadata: Json | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          activity_score?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          activity_score?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
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
          p_reportable_type: string
          p_reportable_id: string
          p_reporter_id?: string
        }
        Returns: boolean
      }
      create_report: {
        Args: {
          p_reportable_type: string
          p_reportable_id: string
          p_report_type_name: string
          p_title: string
          p_description?: string
          p_evidence_urls?: string[]
        }
        Returns: string
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
        Args: {
          p_status?: string
          p_priority?: string
          p_reportable_type?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          reportable_type: string
          reportable_id: string
          title: string
          status: string
          priority: string
          report_type_name: string
          reporter_name: string
          created_at: string
          total_count: number
        }[]
      }
      get_user_activity: {
        Args: { user_id_param: string }
        Returns: Json
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
      increment_downloads: {
        Args: { resource_id: string }
        Returns: undefined
      }
      increment_view_count: {
        Args:
          | { content_id: string; content_type: string }
          | { content_type: string; content_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      search_content: {
        Args:
          | {
              search_query: string
              content_types?: Database["public"]["Enums"]["content_type"][]
              limit_count?: number
            }
          | { search_term: string }
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
          p_new_status: string
          p_admin_notes?: string
          p_resolution_action?: string
        }
        Returns: boolean
      }
      update_user_stats: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      upload_file_to_storage: {
        Args: {
          bucket_name: string
          file_name: string
          file_data: string
          content_type?: string
        }
        Returns: Json
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
      interaction_type: "like" | "bookmark" | "view" | "report"
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
      user_role: "admin" | "moderator" | "member" | "leader" | "vice-leader"
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
      interaction_type: ["like", "bookmark", "view", "report"],
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
      user_role: ["admin", "moderator", "member", "leader", "vice-leader"],
    },
  },
} as const