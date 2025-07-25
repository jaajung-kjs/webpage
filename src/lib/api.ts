import { supabase } from './supabase'
import { Database } from './database.types'

type Tables = Database['public']['Tables']

// Helper function to ensure supabase is available
function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase client not available')
  }
  return supabase
}

// Cases API
export const casesApi = {
  // Get all cases with author info
  async getAll(filters?: {
    category?: string
    search?: string
    sortBy?: 'latest' | 'popular' | 'views'
    limit?: number
    offset?: number
  }) {
    let query = getSupabase()
      .from('cases')
      .select(`
        *,
        profiles:author_id (
          id,
          name,
          avatar_url,
          role,
          department
        ),
        attachments (
          id,
          name,
          file_path,
          file_size,
          mime_type
        )
      `)

    // Apply filters
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
    }

    // Apply sorting
    switch (filters?.sortBy) {
      case 'popular':
        query = query.order('likes_count', { ascending: false })
        break
      case 'views':
        query = query.order('views', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    return query
  },

  // Get single case with full details
  async getById(id: string) {
    const { data, error } = await getSupabase()
      .from('cases')
      .select(`
        *,
        profiles:author_id (
          id,
          name,
          avatar_url,
          role,
          department
        ),
        attachments (
          id,
          name,
          file_path,
          file_size,
          mime_type
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create new case
  async create(caseData: Tables['cases']['Insert']) {
    const { data, error } = await getSupabase()
      .from('cases')
      .insert(caseData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update case
  async update(id: string, updates: Tables['cases']['Update']) {
    const { data, error } = await getSupabase()
      .from('cases')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete case
  async delete(id: string) {
    const { error } = await getSupabase()
      .from('cases')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Increment view count
  async incrementViews(id: string) {
    const { error } = await getSupabase().rpc('increment_view_count', {
      content_type: 'case',
      content_id: id
    })

    if (error) throw error
  }
}

// Community Posts API  
export const communityApi = {
  // Get all community posts
  async getAll(filters?: {
    category?: string
    search?: string
    sortBy?: 'latest' | 'popular' | 'views' | 'comments'
    limit?: number
    offset?: number
  }) {
    let query = getSupabase()
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

    // Apply filters
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
    }

    // Apply sorting - pinned posts first
    switch (filters?.sortBy) {
      case 'popular':
        query = query.order('is_pinned', { ascending: false })
                   .order('likes_count', { ascending: false })
        break
      case 'views':
        query = query.order('is_pinned', { ascending: false })
                   .order('views', { ascending: false })
        break
      case 'comments':
        query = query.order('is_pinned', { ascending: false })
                   .order('comments_count', { ascending: false })
        break
      default:
        query = query.order('is_pinned', { ascending: false })
                   .order('created_at', { ascending: false })
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    return query
  },

  // Get single community post
  async getById(id: string) {
    const { data, error } = await getSupabase()
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
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create new community post
  async create(postData: Tables['community_posts']['Insert']) {
    const { data, error } = await getSupabase()
      .from('community_posts')
      .insert(postData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update community post
  async update(id: string, updates: Tables['community_posts']['Update']) {
    const { data, error } = await getSupabase()
      .from('community_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete community post
  async delete(id: string) {
    const { error } = await getSupabase()
      .from('community_posts')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Increment view count
  async incrementViews(id: string) {
    const { error } = await getSupabase().rpc('increment_view_count', {
      content_type: 'community_post',
      content_id: id
    })

    if (error) throw error
  }
}

// Comments API
export const commentsApi = {
  // Get comments for a specific content
  async getForContent(contentType: 'case' | 'announcement' | 'community_post', contentId: string) {
    const column = contentType === 'case' ? 'case_id' : 
                   contentType === 'announcement' ? 'announcement_id' : 
                   'community_post_id'

    const { data, error } = await getSupabase()
      .from('comments')
      .select(`
        *,
        profiles:author_id (
          id,
          name,
          avatar_url,
          role,
          department
        ),
        replies:comments!parent_id (
          *,
          profiles:author_id (
            id,
            name,
            avatar_url,
            role
          )
        )
      `)
      .eq(column, contentId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  // Create new comment
  async create(commentData: Tables['comments']['Insert']) {
    const { data, error } = await getSupabase()
      .from('comments')
      .insert(commentData)
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
      .single()

    if (error) throw error
    return data
  },

  // Update comment
  async update(id: string, updates: Tables['comments']['Update']) {
    const { data, error } = await getSupabase()
      .from('comments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete comment
  async delete(id: string) {
    const { error } = await getSupabase()
      .from('comments')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Likes API
export const likesApi = {
  // Toggle like for content
  async toggle(contentType: 'case' | 'community_post' | 'comment', contentId: string, userId: string) {
    const column = contentType === 'case' ? 'case_id' : 
                   contentType === 'community_post' ? 'community_post_id' : 
                   'comment_id'

    // Check if already liked
    const { data: existingLike } = await getSupabase()
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq(column, contentId)
      .single()

    if (existingLike) {
      // Unlike
      const { error } = await getSupabase()
        .from('likes')
        .delete()
        .eq('id', existingLike.id)

      if (error) throw error
      return { liked: false }
    } else {
      // Like
      const likeData = {
        user_id: userId,
        [column]: contentId
      } as Tables['likes']['Insert']

      const { error } = await getSupabase()
        .from('likes')
        .insert(likeData)

      if (error) throw error
      return { liked: true }
    }
  },

  // Check if user has liked content
  async checkLike(contentType: 'case' | 'community_post' | 'comment', contentId: string, userId: string) {
    const column = contentType === 'case' ? 'case_id' : 
                   contentType === 'community_post' ? 'community_post_id' : 
                   'comment_id'

    const { data, error } = await getSupabase()
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq(column, contentId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  }
}

// Resources API
export const resourcesApi = {
  // Get all resources
  async getAll(filters?: {
    category?: string
    search?: string
    limit?: number
    offset?: number
  }) {
    let query = getSupabase()
      .from('resources')
      .select(`
        *,
        profiles:author_id (
          id,
          name,
          avatar_url,
          role
        )
      `)

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    query = query.order('created_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    return query
  },

  // Create new resource
  async create(resourceData: Tables['resources']['Insert']) {
    const { data, error } = await getSupabase()
      .from('resources')
      .insert(resourceData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update download count
  async incrementDownloads(id: string) {
    const { error } = await getSupabase().rpc('increment_downloads', {
      resource_id: id
    })

    if (error) throw error
  }
}

// Activities API
export const activitiesApi = {
  // Get all activities
  async getAll(filters?: {
    category?: string
    status?: string
    search?: string
    limit?: number
    offset?: number
  }) {
    let query = getSupabase()
      .from('activities')
      .select(`
        *,
        instructor:instructor_id (
          id,
          name,
          avatar_url,
          role
        )
      `)

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
    }

    query = query.order('date', { ascending: true })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    return query
  },

  // Join activity
  async join(activityId: string, userId: string) {
    const { data, error } = await getSupabase()
      .from('activity_participants')
      .insert({ activity_id: activityId, user_id: userId })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Leave activity
  async leave(activityId: string, userId: string) {
    const { error } = await getSupabase()
      .from('activity_participants')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId)

    if (error) throw error
  },

  // Check if user has joined activity
  async checkParticipation(activityId: string, userId: string) {
    const { data, error } = await getSupabase()
      .from('activity_participants')
      .select('id')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  }
}

// Announcements API
export const announcementsApi = {
  // Get all announcements
  async getAll(filters?: {
    category?: string
    priority?: string
    search?: string
    limit?: number
    offset?: number
  }) {
    let query = getSupabase()
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

    // Sort by pinned first, then by date
    query = query.order('is_pinned', { ascending: false })
                 .order('created_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    return query
  },

  // Increment view count
  async incrementViews(id: string) {
    const { error } = await getSupabase().rpc('increment_view_count', {
      content_type: 'announcement',
      content_id: id
    })

    if (error) throw error
  }
}

// Members API
export const membersApi = {
  // Get all members
  async getAll(filters?: {
    role?: string
    skillLevel?: string
    search?: string
    limit?: number
    offset?: number
  }) {
    let query = getSupabase()
      .from('profiles')
      .select(`
        *,
        user_stats (
          total_posts,
          total_comments,
          total_likes_received,
          total_views,
          activities_joined,
          resources_shared
        )
      `)

    if (filters?.role && filters.role !== 'all') {
      query = query.eq('role', filters.role)
    }

    if (filters?.skillLevel && filters.skillLevel !== 'all') {
      query = query.eq('skill_level', filters.skillLevel)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,department.ilike.%${filters.search}%,job_position.ilike.%${filters.search}%`)
    }

    query = query.order('activity_score', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    return query
  },

  // Get user profile with stats
  async getUserWithStats(userId: string) {
    const { data, error } = await getSupabase()
      .rpc('get_user_with_stats', { target_user_id: userId })

    if (error) throw error
    return data[0]
  },

  // Update user profile
  async updateProfile(userId: string, updates: Tables['profiles']['Update']) {
    const { data, error } = await getSupabase()
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    // Update user stats
    await getSupabase().rpc('update_user_stats', { target_user_id: userId })

    return data
  }
}

// Real-time subscriptions
export const subscriptions = {
  // Subscribe to likes changes
  subscribeToLikes(contentType: 'case' | 'community_post' | 'comment', contentId: string, callback: (payload: any) => void) {
    const column = contentType === 'case' ? 'case_id' : 
                   contentType === 'community_post' ? 'community_post_id' : 
                   'comment_id'

    return getSupabase()
      .channel(`likes-${contentType}-${contentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
        filter: `${column}=eq.${contentId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to comments changes
  subscribeToComments(contentType: 'case' | 'announcement' | 'community_post', contentId: string, callback: (payload: any) => void) {
    const column = contentType === 'case' ? 'case_id' : 
                   contentType === 'announcement' ? 'announcement_id' : 
                   'community_post_id'

    return getSupabase()
      .channel(`comments-${contentType}-${contentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `${column}=eq.${contentId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to activity participants changes
  subscribeToActivityParticipants(activityId: string, callback: (payload: any) => void) {
    return getSupabase()
      .channel(`activity-participants-${activityId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activity_participants',
        filter: `activity_id=eq.${activityId}`
      }, callback)
      .subscribe()
  }
}