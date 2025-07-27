import { supabaseSimple } from './supabase-simple'
import { Database } from './database.types'

// Type definitions
type Case = Database['public']['Tables']['cases']['Row']
type CaseInsert = Database['public']['Tables']['cases']['Insert']
type Profile = Database['public']['Tables']['profiles']['Row']
type Comment = Database['public']['Tables']['comments']['Row']
type CommentInsert = Database['public']['Tables']['comments']['Insert']
type CommunityPost = Database['public']['Tables']['community_posts']['Row']
type Resource = Database['public']['Tables']['resources']['Row']
type Activity = Database['public']['Tables']['activities']['Row']
type Announcement = Database['public']['Tables']['announcements']['Row']

export interface CaseWithAuthor extends Case {
  profiles: Profile | null
}

export interface CommentWithAuthor extends Comment {
  profiles: Profile | null
}

export interface CommunityPostWithAuthor extends CommunityPost {
  profiles: Profile | null
}

export interface ResourceWithAuthor extends Resource {
  profiles: Profile | null
}

export interface ActivityWithInstructor extends Activity {
  profiles: Profile | null
}

export interface AnnouncementWithAuthor extends Announcement {
  profiles: Profile | null
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

// Cases API
export const casesApi = {
  // Get all cases with filters
  async getCases(filters?: {
    category?: string
    search?: string
    limit?: number
  }): Promise<ApiResponse<CaseWithAuthor[]>> {
    try {
      let query = supabaseSimple
        .from('cases')
        .select(`
          *,
          profiles:author_id (
            id,
            name,
            avatar_url,
            role,
            department
          )
        `)

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
      }

      query = query.order('created_at', { ascending: false })
        .limit(filters?.limit || 50)

      const { data, error } = await query

      if (error) throw error

      return { data: data || [], success: true }
    } catch (error) {
      console.error('Error fetching cases:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch cases',
        success: false 
      }
    }
  },

  // Get single case by ID
  async getCaseById(id: string): Promise<ApiResponse<CaseWithAuthor>> {
    try {
      const { data, error } = await supabaseSimple
        .from('cases')
        .select(`
          *,
          profiles:author_id (
            id,
            name,
            avatar_url,
            role,
            department
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error fetching case:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch case',
        success: false 
      }
    }
  },

  // Create new case
  async createCase(caseData: CaseInsert): Promise<ApiResponse<Case>> {
    try {
      const { data, error } = await supabaseSimple
        .from('cases')
        .insert(caseData)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error creating case:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to create case',
        success: false 
      }
    }
  },

  // Update case
  async updateCase(id: string, updates: Partial<CaseInsert>): Promise<ApiResponse<Case>> {
    try {
      const { data, error } = await supabaseSimple
        .from('cases')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error updating case:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to update case',
        success: false 
      }
    }
  },

  // Delete case
  async deleteCase(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabaseSimple
        .from('cases')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting case:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to delete case',
        success: false 
      }
    }
  },

  // Increment view count
  async incrementViews(id: string): Promise<ApiResponse<void>> {
    try {
      // Note: View increment disabled for MVP
      // const { error } = await supabaseSimple
      //   .from('cases')
      //   .update({ views: supabaseSimple.raw('views + 1') })
      //   .eq('id', id)

      // if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error incrementing views:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to increment views',
        success: false 
      }
    }
  },

  // Like/unlike case
  async toggleCaseLike(caseId: string, userId: string): Promise<ApiResponse<{ liked: boolean; likes_count: number }>> {
    try {
      // Check if already liked
      const { data: existingLike, error: checkError } = await supabaseSimple
        .from('case_likes')
        .select('id')
        .eq('case_id', caseId)
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError
      }

      if (existingLike) {
        // Unlike
        const { error: deleteError } = await supabaseSimple
          .from('case_likes')
          .delete()
          .eq('case_id', caseId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError

        // Get updated count
        const { count, error: countError } = await supabaseSimple
          .from('case_likes')
          .select('*', { count: 'exact', head: true })
          .eq('case_id', caseId)

        if (countError) throw countError

        return { data: { liked: false, likes_count: count || 0 }, success: true }
      } else {
        // Like
        const { error: insertError } = await supabaseSimple
          .from('case_likes')
          .insert({ case_id: caseId, user_id: userId })

        if (insertError) throw insertError

        // Get updated count
        const { count, error: countError } = await supabaseSimple
          .from('case_likes')
          .select('*', { count: 'exact', head: true })
          .eq('case_id', caseId)

        if (countError) throw countError

        return { data: { liked: true, likes_count: count || 0 }, success: true }
      }
    } catch (error) {
      console.error('Error toggling case like:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to toggle case like',
        success: false 
      }
    }
  },

  // Check if user liked case
  async checkCaseLike(caseId: string, userId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabaseSimple
        .from('case_likes')
        .select('id')
        .eq('case_id', caseId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return { data: !!data, success: true }
    } catch (error) {
      console.error('Error checking case like:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to check case like',
        success: false 
      }
    }
  }
}

// Comments API
export const commentsApi = {
  // Get comments for a case
  async getComments(caseId: string): Promise<ApiResponse<CommentWithAuthor[]>> {
    try {
      const { data, error } = await supabaseSimple
        .from('comments')
        .select(`
          *,
          profiles:author_id (
            id,
            name,
            avatar_url,
            role,
            department
          )
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return { data: data || [], success: true }
    } catch (error) {
      console.error('Error fetching comments:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch comments',
        success: false 
      }
    }
  },

  // Create new comment
  async createComment(commentData: CommentInsert): Promise<ApiResponse<Comment>> {
    try {
      const { data, error } = await supabaseSimple
        .from('comments')
        .insert(commentData)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error creating comment:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to create comment',
        success: false 
      }
    }
  },

  // Delete comment
  async deleteComment(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabaseSimple
        .from('comments')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting comment:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to delete comment',
        success: false 
      }
    }
  },

  // Like/unlike comment
  async toggleCommentLike(commentId: string, userId: string): Promise<ApiResponse<{ liked: boolean; likes_count: number }>> {
    try {
      // Check if already liked
      const { data: existingLike, error: checkError } = await supabaseSimple
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError
      }

      if (existingLike) {
        // Unlike
        const { error: deleteError } = await supabaseSimple
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError

        // Get updated count
        const { count, error: countError } = await supabaseSimple
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', commentId)

        if (countError) throw countError

        return { data: { liked: false, likes_count: count || 0 }, success: true }
      } else {
        // Like
        const { error: insertError } = await supabaseSimple
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: userId })

        if (insertError) throw insertError

        // Get updated count
        const { count, error: countError } = await supabaseSimple
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', commentId)

        if (countError) throw countError

        return { data: { liked: true, likes_count: count || 0 }, success: true }
      }
    } catch (error) {
      console.error('Error toggling comment like:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to toggle comment like',
        success: false 
      }
    }
  }
}

// Profiles API
export const profilesApi = {
  // Get all profiles (members list)
  async getProfiles(): Promise<ApiResponse<Profile[]>> {
    try {
      const { data, error } = await supabaseSimple
        .from('profiles')
        .select('*')
        .order('activity_score', { ascending: false })

      if (error) throw error

      return { data: data || [], success: true }
    } catch (error) {
      console.error('Error fetching profiles:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch profiles',
        success: false 
      }
    }
  },

  // Get profile by ID
  async getProfile(id: string): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await supabaseSimple
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error fetching profile:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
        success: false 
      }
    }
  },

  // Update profile
  async updateProfile(id: string, updates: Partial<Profile>): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await supabaseSimple
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to update profile',
        success: false 
      }
    }
  },

  // Ensure profile exists (create if not exists)
  async ensureProfile(userId: string, email: string): Promise<ApiResponse<Profile>> {
    try {
      // First try to get existing profile
      const existingProfile = await this.getProfile(userId)
      if (existingProfile.success && existingProfile.data) {
        return existingProfile
      }

      // If no profile exists, create a new one
      const newProfile = {
        id: userId,
        name: email.split('@')[0],
        email: email,
        phone: '010-0000-0000',
        department: '미지정',
        job_position: '미지정',
        role: 'member' as const,
        avatar_url: '/avatars/default.jpg',
        location: '미지정',
        bio: '안녕하세요! AI 학습동아리에서 함께 성장하고 있습니다.',
        ai_expertise: ['ChatGPT'],
        skill_level: 'beginner' as const,
        achievements: [],
        activity_score: 0
      }

      const { data, error } = await supabaseSimple
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error ensuring profile:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to ensure profile',
        success: false 
      }
    }
  },

  // Get user stats
  async getUserStats(userId: string): Promise<ApiResponse<{
    totalPosts: number
    totalComments: number
    totalLikes: number
    totalViews: number
    activitiesJoined: number
    resourcesShared: number
  }>> {
    try {
      // Get posts count
      const { count: postsCount, error: postsError } = await supabaseSimple
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)

      if (postsError) throw postsError

      // Get comments count
      const { count: commentsCount, error: commentsError } = await supabaseSimple
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)

      if (commentsError) throw commentsError

      // Get total likes received on posts
      const { data: userPosts, error: userPostsError } = await supabaseSimple
        .from('cases')
        .select('likes_count, views')
        .eq('author_id', userId)

      if (userPostsError) throw userPostsError

      const totalLikes = userPosts?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0

      // Get total views on posts
      const totalViews = userPosts?.reduce((sum, post) => sum + (post.views || 0), 0) || 0

      // Get community posts count (for resources shared)
      const { count: resourcesCount, error: resourcesError } = await supabaseSimple
        .from('community_posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)

      if (resourcesError) throw resourcesError

      // For activities joined, we'll return a default value for now
      // TODO: Implement activity participation tracking
      const activitiesJoined = 0

      return {
        data: {
          totalPosts: postsCount || 0,
          totalComments: commentsCount || 0,
          totalLikes,
          totalViews,
          activitiesJoined,
          resourcesShared: resourcesCount || 0
        },
        success: true
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch user stats',
        success: false 
      }
    }
  },

  // Get user's recent activity from activity_history table
  async getUserActivity(userId: string, limit: number = 10): Promise<ApiResponse<{
    type: 'post' | 'comment' | 'activity' | 'resource'
    title: string
    date: string
    engagement: {
      likes: number
      comments: number
      views: number
    }
  }[]>> {
    try {
      // Get activity history from the new table
      const { data: activityHistory, error: historyError } = await supabaseSimple
        .from('activity_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (historyError) throw historyError

      const activities: any[] = []

      // For each activity, fetch engagement data
      for (const activity of activityHistory || []) {
        let engagement = { likes: 0, comments: 0, views: 0 }

        if (activity.activity_type === 'post' && activity.activity_id) {
          const { data: post } = await supabaseSimple
            .from('cases')
            .select('likes_count, comments_count, views')
            .eq('id', activity.activity_id)
            .single()
          
          if (post) {
            engagement = {
              likes: post.likes_count || 0,
              comments: post.comments_count || 0,
              views: post.views || 0
            }
          }
        } else if (activity.activity_type === 'comment' && activity.activity_id) {
          const { data: comment } = await supabaseSimple
            .from('comments')
            .select('likes_count')
            .eq('id', activity.activity_id)
            .single()
          
          if (comment) {
            engagement.likes = comment.likes_count || 0
          }
        }

        activities.push({
          type: activity.activity_type as any,
          title: activity.activity_title,
          date: activity.created_at,
          engagement
        })
      }

      return {
        data: activities,
        success: true
      }
    } catch (error) {
      console.error('Error fetching user activity:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch user activity',
        success: false 
      }
    }
  },

  // Get user achievements
  async getUserAchievements(userId: string): Promise<ApiResponse<{
    id: string
    achievement_type: string
    achievement_name: string
    achievement_description: string | null
    earned_at: string
  }[]>> {
    try {
      const { data, error } = await supabaseSimple
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })

      if (error) throw error

      return { data: data || [], success: true }
    } catch (error) {
      console.error('Error fetching user achievements:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch user achievements',
        success: false 
      }
    }
  },

  // Get user badges
  async getUserBadges(userId: string): Promise<ApiResponse<{
    id: string
    badge_type: string
    badge_name: string
    badge_level: string
    earned_at: string
  }[]>> {
    try {
      const { data, error } = await supabaseSimple
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })

      if (error) throw error

      return { data: data || [], success: true }
    } catch (error) {
      console.error('Error fetching user badges:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch user badges',
        success: false 
      }
    }
  }
}

// Community Posts API
export const communityApi = {
  // Get community posts
  async getPosts(filters?: {
    category?: string
    search?: string
    limit?: number
  }): Promise<ApiResponse<CommunityPostWithAuthor[]>> {
    try {
      let query = supabaseSimple
        .from('community_posts')
        .select(`
          *,
          profiles:author_id (
            id,
            name,
            avatar_url,
            role,
            department
          )
        `)

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return { data: data || [], success: true }
    } catch (error) {
      console.error('Error fetching community posts:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch community posts',
        success: false 
      }
    }
  }
}

// Resources API
export const resourcesApi = {
  // Get resources
  async getResources(filters?: {
    category?: string
    type?: string
    search?: string
    limit?: number
  }): Promise<ApiResponse<ResourceWithAuthor[]>> {
    try {
      let query = supabaseSimple
        .from('resources')
        .select(`
          *,
          profiles:author_id (
            id,
            name,
            avatar_url,
            role,
            department
          )
        `)

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return { data: data || [], success: true }
    } catch (error) {
      console.error('Error fetching resources:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch resources',
        success: false 
      }
    }
  },

  // Create resource
  async createResource(resourceData: {
    title: string
    description: string
    category: 'tutorial' | 'workshop' | 'template' | 'reference' | 'guideline'
    type: 'guide' | 'presentation' | 'video' | 'document' | 'spreadsheet' | 'template'
    url?: string | null
    file_path?: string | null
    author_id: string
    tags?: string[]
  }): Promise<ApiResponse<Resource>> {
    try {
      const { data, error } = await supabaseSimple
        .from('resources')
        .insert(resourceData)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error creating resource:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to create resource',
        success: false 
      }
    }
  },

  // Update resource
  async updateResource(id: string, updates: Partial<{
    title: string
    description: string
    category: 'tutorial' | 'workshop' | 'template' | 'reference' | 'guideline'
    type: 'guide' | 'presentation' | 'video' | 'document' | 'spreadsheet' | 'template'
    url: string | null
    file_path: string | null
    tags: string[]
  }>): Promise<ApiResponse<Resource>> {
    try {
      const { data, error } = await supabaseSimple
        .from('resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error updating resource:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to update resource',
        success: false 
      }
    }
  },

  // Delete resource
  async deleteResource(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabaseSimple
        .from('resources')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting resource:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to delete resource',
        success: false 
      }
    }
  }
}

// Activities API
export const activitiesApi = {
  // Get activities
  async getActivities(filters?: {
    category?: string
    status?: string
    search?: string
    limit?: number
  }): Promise<ApiResponse<ActivityWithInstructor[]>> {
    try {
      let query = supabaseSimple
        .from('activities')
        .select(`
          *,
          profiles:instructor_id (
            id,
            name,
            avatar_url,
            role,
            department
          )
        `)

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      query = query.order('date', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      return { data: data || [], success: true }
    } catch (error) {
      console.error('Error fetching activities:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch activities',
        success: false 
      }
    }
  },

  // Create activity
  async createActivity(activityData: {
    title: string
    description: string
    category: 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting'
    status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
    date: string
    time: string
    duration?: number | null
    location?: string | null
    max_participants?: number | null
    instructor_id?: string | null
    tags?: string[]
  }): Promise<ApiResponse<Activity>> {
    try {
      const { data, error } = await supabaseSimple
        .from('activities')
        .insert(activityData)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error creating activity:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to create activity',
        success: false 
      }
    }
  },

  // Update activity
  async updateActivity(id: string, updates: Partial<{
    title: string
    description: string
    category: 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting'
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
    date: string
    time: string
    duration: number | null
    location: string | null
    max_participants: number | null
    instructor_id: string | null
    tags: string[]
  }>): Promise<ApiResponse<Activity>> {
    try {
      const { data, error } = await supabaseSimple
        .from('activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error updating activity:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to update activity',
        success: false 
      }
    }
  },

  // Delete activity
  async deleteActivity(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabaseSimple
        .from('activities')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting activity:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to delete activity',
        success: false 
      }
    }
  }
}

// Announcements API
export const announcementsApi = {
  // Get announcements
  async getAnnouncements(filters?: {
    category?: string
    priority?: string
    search?: string
    limit?: number
  }): Promise<ApiResponse<AnnouncementWithAuthor[]>> {
    try {
      let query = supabaseSimple
        .from('announcements')
        .select(`
          *,
          profiles:author_id (
            id,
            name,
            avatar_url,
            role,
            department
          )
        `)

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }

      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      query = query.order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return { data: data || [], success: true }
    } catch (error) {
      console.error('Error fetching announcements:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch announcements',
        success: false 
      }
    }
  },

  // Create announcement
  async createAnnouncement(announcementData: {
    title: string
    content: string
    category: 'notice' | 'event' | 'meeting' | 'announcement'
    priority: 'high' | 'medium' | 'low'
    is_pinned: boolean
    author_id: string
    tags?: string[]
  }): Promise<ApiResponse<Announcement>> {
    try {
      const { data, error } = await supabaseSimple
        .from('announcements')
        .insert(announcementData)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error creating announcement:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to create announcement',
        success: false 
      }
    }
  },

  // Update announcement
  async updateAnnouncement(id: string, updates: Partial<{
    title: string
    content: string
    category: 'notice' | 'event' | 'meeting' | 'announcement'
    priority: 'high' | 'medium' | 'low'
    is_pinned: boolean
    tags: string[]
  }>): Promise<ApiResponse<Announcement>> {
    try {
      const { data, error } = await supabaseSimple
        .from('announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error updating announcement:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to update announcement',
        success: false 
      }
    }
  },

  // Delete announcement
  async deleteAnnouncement(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabaseSimple
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting announcement:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to delete announcement',
        success: false 
      }
    }
  },

  // Toggle pin status
  async togglePin(id: string, isPinned: boolean): Promise<ApiResponse<Announcement>> {
    try {
      const { data, error } = await supabaseSimple
        .from('announcements')
        .update({ is_pinned: isPinned })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return { data, success: true }
    } catch (error) {
      console.error('Error toggling pin status:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to toggle pin status',
        success: false 
      }
    }
  }
}

// Utility functions
export const utils = {
  // Format date to Korean format
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ko-KR')
  },

  // Get description from content (removes markdown)
  getDescription(content: string, maxLength: number = 150): string {
    const plainText = content.replace(/[#*`]/g, '').replace(/\n/g, ' ')
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...' 
      : plainText
  },

  // Validate required fields
  validateCase(caseData: Partial<CaseInsert>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!caseData.title?.trim()) errors.push('제목은 필수입니다')
    if (!caseData.content?.trim()) errors.push('내용은 필수입니다')
    if (!caseData.category) errors.push('카테고리는 필수입니다')
    if (!caseData.author_id) errors.push('작성자 정보가 필요합니다')

    return { valid: errors.length === 0, errors }
  }
}