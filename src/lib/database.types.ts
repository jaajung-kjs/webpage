export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          department: string | null
          job_position: string | null
          role: 'leader' | 'vice-leader' | 'admin' | 'member'
          avatar_url: string | null
          location: string | null
          skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          bio: string | null
          activity_score: number
          ai_expertise: string[]
          achievements: string[]
          join_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          phone?: string | null
          department?: string | null
          job_position?: string | null
          role?: 'leader' | 'vice-leader' | 'admin' | 'member'
          avatar_url?: string | null
          location?: string | null
          skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          bio?: string | null
          activity_score?: number
          ai_expertise?: string[]
          achievements?: string[]
          join_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          department?: string | null
          job_position?: string | null
          role?: 'leader' | 'vice-leader' | 'admin' | 'member'
          avatar_url?: string | null
          location?: string | null
          skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          bio?: string | null
          activity_score?: number
          ai_expertise?: string[]
          achievements?: string[]
          join_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      cases: {
        Row: {
          id: string
          title: string
          content: string
          category: 'productivity' | 'creativity' | 'development' | 'analysis' | 'other'
          subcategory: 'automation' | 'documentation' | 'coding' | 'design' | 'research' | 'communication' | null
          author_id: string
          views: number
          likes_count: number
          comments_count: number
          tags: string[]
          tools: string[]
          difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          time_required: string | null
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: 'productivity' | 'creativity' | 'development' | 'analysis' | 'other'
          subcategory?: 'automation' | 'documentation' | 'coding' | 'design' | 'research' | 'communication' | null
          author_id: string
          views?: number
          likes_count?: number
          comments_count?: number
          tags?: string[]
          tools?: string[]
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          time_required?: string | null
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: 'productivity' | 'creativity' | 'development' | 'analysis' | 'other'
          subcategory?: 'automation' | 'documentation' | 'coding' | 'design' | 'research' | 'communication' | null
          author_id?: string
          views?: number
          likes_count?: number
          comments_count?: number
          tags?: string[]
          tools?: string[]
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          time_required?: string | null
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          title: string
          description: string
          category: 'tutorial' | 'workshop' | 'template' | 'reference' | 'guideline'
          type: 'guide' | 'presentation' | 'video' | 'document' | 'spreadsheet' | 'template'
          url: string | null
          file_path: string | null
          downloads: number
          tags: string[]
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: 'tutorial' | 'workshop' | 'template' | 'reference' | 'guideline'
          type: 'guide' | 'presentation' | 'video' | 'document' | 'spreadsheet' | 'template'
          url?: string | null
          file_path?: string | null
          downloads?: number
          tags?: string[]
          author_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: 'tutorial' | 'workshop' | 'template' | 'reference' | 'guideline'
          type?: 'guide' | 'presentation' | 'video' | 'document' | 'spreadsheet' | 'template'
          url?: string | null
          file_path?: string | null
          downloads?: number
          tags?: string[]
          author_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          title: string
          description: string
          category: 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting'
          status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
          date: string
          time: string
          duration: number | null
          location: string | null
          max_participants: number | null
          current_participants: number
          instructor_id: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting'
          status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
          date: string
          time: string
          duration?: number | null
          location?: string | null
          max_participants?: number | null
          current_participants?: number
          instructor_id?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting'
          status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
          date?: string
          time?: string
          duration?: number | null
          location?: string | null
          max_participants?: number | null
          current_participants?: number
          instructor_id?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      activity_participants: {
        Row: {
          id: string
          activity_id: string
          user_id: string
          registered_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          user_id: string
          registered_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          user_id?: string
          registered_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          category: 'notice' | 'event' | 'meeting' | 'announcement'
          priority: 'high' | 'medium' | 'low'
          is_pinned: boolean
          author_id: string
          views: number
          comments_count: number
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: 'notice' | 'event' | 'meeting' | 'announcement'
          priority?: 'high' | 'medium' | 'low'
          is_pinned?: boolean
          author_id: string
          views?: number
          comments_count?: number
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: 'notice' | 'event' | 'meeting' | 'announcement'
          priority?: 'high' | 'medium' | 'low'
          is_pinned?: boolean
          author_id?: string
          views?: number
          comments_count?: number
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      community_posts: {
        Row: {
          id: string
          title: string
          content: string
          category: 'tips' | 'review' | 'help' | 'discussion' | 'question' | 'chat'
          author_id: string
          views: number
          likes_count: number
          comments_count: number
          is_pinned: boolean
          has_image: boolean
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: 'tips' | 'review' | 'help' | 'discussion' | 'question' | 'chat'
          author_id: string
          views?: number
          likes_count?: number
          comments_count?: number
          is_pinned?: boolean
          has_image?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: 'tips' | 'review' | 'help' | 'discussion' | 'question' | 'chat'
          author_id?: string
          views?: number
          likes_count?: number
          comments_count?: number
          is_pinned?: boolean
          has_image?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          content: string
          author_id: string
          parent_id: string | null
          case_id: string | null
          announcement_id: string | null
          community_post_id: string | null
          likes_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          author_id: string
          parent_id?: string | null
          case_id?: string | null
          announcement_id?: string | null
          community_post_id?: string | null
          likes_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          author_id?: string
          parent_id?: string | null
          case_id?: string | null
          announcement_id?: string | null
          community_post_id?: string | null
          likes_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          case_id: string | null
          community_post_id: string | null
          comment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          case_id?: string | null
          community_post_id?: string | null
          comment_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          case_id?: string | null
          community_post_id?: string | null
          comment_id?: string | null
          created_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          case_id: string | null
          resource_id: string | null
          community_post_id: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          case_id?: string | null
          resource_id?: string | null
          community_post_id?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          case_id?: string | null
          resource_id?: string | null
          community_post_id?: string | null
          uploaded_by?: string
          created_at?: string
        }
      }
      user_stats: {
        Row: {
          user_id: string
          total_posts: number
          total_comments: number
          total_likes_received: number
          total_views: number
          activities_joined: number
          resources_shared: number
          updated_at: string
        }
        Insert: {
          user_id: string
          total_posts?: number
          total_comments?: number
          total_likes_received?: number
          total_views?: number
          activities_joined?: number
          resources_shared?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          total_posts?: number
          total_comments?: number
          total_likes_received?: number
          total_views?: number
          activities_joined?: number
          resources_shared?: number
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_view_count: {
        Args: {
          content_type: string
          content_id: string
        }
        Returns: undefined
      }
      calculate_activity_score: {
        Args: {
          user_id: string
        }
        Returns: number
      }
      update_user_stats: {
        Args: {
          target_user_id: string
        }
        Returns: undefined
      }
      get_user_with_stats: {
        Args: {
          target_user_id: string
        }
        Returns: {
          id: string
          name: string
          email: string
          phone: string | null
          department: string | null
          job_position: string | null
          role: 'leader' | 'vice-leader' | 'admin' | 'member'
          avatar_url: string | null
          location: string | null
          skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          bio: string | null
          activity_score: number
          ai_expertise: string[]
          achievements: string[]
          join_date: string
          total_posts: number
          total_comments: number
          total_likes_received: number
          total_views: number
          activities_joined: number
          resources_shared: number
        }[]
      }
    }
    Enums: {
      user_role: 'leader' | 'vice-leader' | 'admin' | 'member'
      skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
      post_category: 'productivity' | 'creativity' | 'development' | 'analysis' | 'other'
      post_subcategory: 'automation' | 'documentation' | 'coding' | 'design' | 'research' | 'communication'
      activity_category: 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting'
      activity_status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
      announcement_category: 'notice' | 'event' | 'meeting' | 'announcement'
      announcement_priority: 'high' | 'medium' | 'low'
      community_category: 'tips' | 'review' | 'help' | 'discussion' | 'question' | 'chat'
      resource_category: 'tutorial' | 'workshop' | 'template' | 'reference' | 'guideline'
      resource_type: 'guide' | 'presentation' | 'video' | 'document' | 'spreadsheet' | 'template'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}