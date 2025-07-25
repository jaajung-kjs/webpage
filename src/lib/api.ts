import { supabase } from './supabase'
import { Database } from './database.types'

type Tables = Database['public']['Tables']

// Helper function to ensure supabase is available
function getSupabase() {
  if (!supabase) {
    console.error('Supabase client not available. Check environment variables:')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
    throw new Error('Supabase client not available. Please check your environment variables.')
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

  // Create new resource (admin only)
  async create(data: {
    title: string
    description: string
    url: string
    category: string
    type: string
    tags?: string[]
    author_id: string
  }) {
    try {
      // Verify admin permissions
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', data.author_id)
        .single()

      if (!adminProfile || !['admin', 'vice-leader', 'leader'].includes(adminProfile.role)) {
        throw new Error('Insufficient permissions')
      }

      const { data: resource, error } = await getSupabase()
        .from('resources')
        .insert({
          title: data.title,
          description: data.description,
          url: data.url,
          category: data.category,
          type: data.type,
          tags: data.tags || [],
          author_id: data.author_id,
          download_count: 0
        })
        .select()
        .single()

      return { data: resource, error: null }
    } catch (error: any) {
      console.error('Error creating resource:', error)
      return { data: null, error }
    }
  },

  // Update resource (admin only)
  async update(id: string, data: {
    title?: string
    description?: string
    url?: string
    category?: string
    type?: string
    tags?: string[]
  }) {
    try {
      const { data: resource, error } = await getSupabase()
        .from('resources')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      return { data: resource, error: null }
    } catch (error: any) {
      console.error('Error updating resource:', error)
      return { data: null, error }
    }
  },

  // Delete resource (admin only)
  async delete(id: string, adminId: string) {
    try {
      // Verify admin permissions
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single()

      if (!adminProfile || !['admin', 'vice-leader', 'leader'].includes(adminProfile.role)) {
        throw new Error('Insufficient permissions')
      }

      const { error } = await getSupabase()
        .from('resources')
        .delete()
        .eq('id', id)

      return { data: null, error: null }
    } catch (error: any) {
      console.error('Error deleting resource:', error)
      return { data: null, error }
    }
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
  },

  // Create new activity (admin only)
  async create(data: {
    title: string
    description: string
    date: string
    time: string
    duration: number
    location: string
    max_participants: number
    category: string
    status: string
    tags?: string[]
    instructor_id: string
  }) {
    try {
      // Verify admin permissions
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', data.instructor_id)
        .single()

      if (!adminProfile || !['admin', 'vice-leader', 'leader'].includes(adminProfile.role)) {
        throw new Error('Insufficient permissions')
      }

      const { data: activity, error } = await getSupabase()
        .from('activities')
        .insert({
          title: data.title,
          description: data.description,
          date: data.date,
          time: data.time,
          duration: data.duration,
          location: data.location,
          max_participants: data.max_participants,
          category: data.category,
          status: data.status,
          tags: data.tags || [],
          instructor_id: data.instructor_id,
          current_participants: 0
        })
        .select()
        .single()

      return { data: activity, error: null }
    } catch (error: any) {
      console.error('Error creating activity:', error)
      return { data: null, error }
    }
  },

  // Update activity (admin only)
  async update(id: string, data: {
    title?: string
    description?: string
    date?: string
    time?: string
    duration?: number
    location?: string
    max_participants?: number
    category?: string
    status?: string
    tags?: string[]
  }) {
    try {
      const { data: activity, error } = await getSupabase()
        .from('activities')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      return { data: activity, error: null }
    } catch (error: any) {
      console.error('Error updating activity:', error)
      return { data: null, error }
    }
  },

  // Delete activity (admin only)
  async delete(id: string, adminId: string) {
    try {
      // Verify admin permissions
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single()

      if (!adminProfile || !['admin', 'vice-leader', 'leader'].includes(adminProfile.role)) {
        throw new Error('Insufficient permissions')
      }

      // First, delete all participants
      await getSupabase()
        .from('activity_participants')
        .delete()
        .eq('activity_id', id)

      // Then delete the activity
      const { error } = await getSupabase()
        .from('activities')
        .delete()
        .eq('id', id)

      return { data: null, error: null }
    } catch (error: any) {
      console.error('Error deleting activity:', error)
      return { data: null, error }
    }
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
  },

  // Create new announcement (admin only)
  async create(data: {
    title: string
    content: string
    category: string
    priority: string
    is_pinned?: boolean
    tags?: string[]
    author_id: string
  }) {
    try {
      // Verify admin permissions
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', data.author_id)
        .single()

      if (!adminProfile || !['admin', 'vice-leader', 'leader'].includes(adminProfile.role)) {
        throw new Error('Insufficient permissions')
      }

      const { data: announcement, error } = await getSupabase()
        .from('announcements')
        .insert({
          title: data.title,
          content: data.content,
          category: data.category,
          priority: data.priority,
          is_pinned: data.is_pinned || false,
          tags: data.tags || [],
          author_id: data.author_id
        })
        .select()
        .single()

      return { data: announcement, error: null }
    } catch (error: any) {
      console.error('Error creating announcement:', error)
      return { data: null, error }
    }
  },

  // Update announcement (admin only)
  async update(id: string, data: {
    title?: string
    content?: string
    category?: string
    priority?: string
    is_pinned?: boolean
    tags?: string[]
  }) {
    try {
      const { data: announcement, error } = await getSupabase()
        .from('announcements')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      return { data: announcement, error: null }
    } catch (error: any) {
      console.error('Error updating announcement:', error)
      return { data: null, error }
    }
  },

  // Delete announcement (admin only)
  async delete(id: string, adminId: string) {
    try {
      // Verify admin permissions
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single()

      if (!adminProfile || !['admin', 'vice-leader', 'leader'].includes(adminProfile.role)) {
        throw new Error('Insufficient permissions')
      }

      const { error } = await getSupabase()
        .from('announcements')
        .delete()
        .eq('id', id)

      return { data: null, error: null }
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      return { data: null, error }
    }
  },

  // Toggle pin status (admin only)
  async togglePin(id: string, isPinned: boolean, adminId: string) {
    try {
      // Verify admin permissions
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single()

      if (!adminProfile || !['admin', 'vice-leader', 'leader'].includes(adminProfile.role)) {
        throw new Error('Insufficient permissions')
      }

      const { data: announcement, error } = await getSupabase()
        .from('announcements')
        .update({
          is_pinned: isPinned,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      return { data: announcement, error: null }
    } catch (error: any) {
      console.error('Error toggling pin status:', error)
      return { data: null, error }
    }
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

    // Execute the query and return the result
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching members:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
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
  },

  // Get member by ID
  async getById(id: string) {
    return getSupabase()
      .from('profiles')
      .select(`
        *,
        user_stats (*)
      `)
      .eq('id', id)
      .single()
  },

  // Remove member (admin only)
  async removeMember(memberId: string, adminId: string) {
    try {
      // First check if admin has permission
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single()

      if (!adminProfile || !['admin', 'vice-leader', 'leader'].includes(adminProfile.role)) {
        throw new Error('Insufficient permissions')
      }

      // Get member to be removed
      const { data: memberProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', memberId)
        .single()

      if (!memberProfile) {
        throw new Error('Member not found')
      }

      // Prevent removing higher hierarchy members
      const hierarchy = { member: 1, admin: 2, 'vice-leader': 3, leader: 4 }
      const adminLevel = hierarchy[adminProfile.role as keyof typeof hierarchy] || 0
      const memberLevel = hierarchy[memberProfile.role as keyof typeof hierarchy] || 0

      if (adminLevel <= memberLevel) {
        throw new Error('Cannot remove member with equal or higher role')
      }

      // Remove member by setting a special status
      const { data, error } = await getSupabase()
        .from('profiles')
        .update({ 
          role: 'removed',
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .select()

      if (error) throw error

      return { data, error: null }
    } catch (error: any) {
      console.error('Error removing member:', error)
      return { data: null, error }
    }
  },

  // Change member role (admin only)
  async changeMemberRole(memberId: string, newRole: string, adminId: string) {
    try {
      // First check if admin has permission
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single()

      if (!adminProfile || !['vice-leader', 'leader'].includes(adminProfile.role)) {
        throw new Error('Insufficient permissions to change roles')
      }

      // Get current member role
      const { data: memberProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', memberId)
        .single()

      if (!memberProfile) {
        throw new Error('Member not found')
      }

      // Check role hierarchy permissions
      const hierarchy = { member: 1, admin: 2, 'vice-leader': 3, leader: 4 }
      const adminLevel = hierarchy[adminProfile.role as keyof typeof hierarchy] || 0
      const memberLevel = hierarchy[memberProfile.role as keyof typeof hierarchy] || 0
      const newRoleLevel = hierarchy[newRole as keyof typeof hierarchy] || 0

      // Admin must have higher level than both current and new role
      if (adminLevel <= memberLevel || adminLevel <= newRoleLevel) {
        throw new Error('Cannot assign role equal to or higher than your own')
      }

      // Update member role
      const { data, error } = await getSupabase()
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .select()

      if (error) throw error

      return { data, error: null }
    } catch (error: any) {
      console.error('Error changing member role:', error)
      return { data: null, error }
    }
  },

  // Restore removed member (leader only)
  async restoreMember(memberId: string, newRole: string, adminId: string) {
    try {
      // Only leaders can restore members
      const { data: adminProfile } = await getSupabase()
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single()

      if (!adminProfile || adminProfile.role !== 'leader') {
        throw new Error('Only leaders can restore members')
      }

      const { data, error } = await getSupabase()
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .eq('role', 'removed')
        .select()

      if (error) throw error

      return { data, error: null }
    } catch (error: any) {
      console.error('Error restoring member:', error)
      return { data: null, error }
    }
  }
}

// Profiles API
export const profilesApi = {
  // Check if profiles table exists and create profile if needed
  async ensureProfile(userId: string, userEmail: string) {
    try {
      // Try to check if user has a profile
      const { data: existingProfile, error } = await getSupabase()
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await getSupabase()
          .from('profiles')
          .insert({
            id: userId,
            name: userEmail.split('@')[0],
            email: userEmail,
            role: 'member',
            skill_level: 'beginner',
            activity_score: 0,
            ai_expertise: [],
            achievements: [],
            join_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.warn('Could not create profile in profiles table:', createError)
          return false
        }

        return true
      } else if (error) {
        console.warn('Profiles table not accessible:', error)
        return false
      }

      return true
    } catch (error) {
      console.warn('Error ensuring profile:', error)
      return false
    }
  },
  // Get user profile by ID
  async getProfile(userId: string) {
    try {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.warn('Profiles table not accessible, using auth user data:', error)
        // Fallback to auth user data
        const { data: userData, error: userError } = await getSupabase().auth.getUser()
        
        if (userError || !userData.user) {
          throw new Error('Cannot get user data')
        }

        // Return default profile structure
        return {
          id: userData.user.id,
          name: userData.user.user_metadata?.name || userData.user.email?.split('@')[0] || '',
          email: userData.user.email || '',
          phone: userData.user.user_metadata?.phone || null,
          department: userData.user.user_metadata?.department || null,
          job_position: userData.user.user_metadata?.job_position || null,
          role: userData.user.user_metadata?.role || 'member',
          avatar_url: userData.user.user_metadata?.avatar_url || null,
          location: userData.user.user_metadata?.location || null,
          skill_level: userData.user.user_metadata?.skill_level || 'beginner',
          bio: userData.user.user_metadata?.bio || null,
          activity_score: userData.user.user_metadata?.activity_score || 0,
          ai_expertise: userData.user.user_metadata?.ai_expertise || [],
          achievements: userData.user.user_metadata?.achievements || [],
          join_date: userData.user.created_at,
          created_at: userData.user.created_at,
          updated_at: userData.user.updated_at
        }
      }

      return data
    } catch (error) {
      console.error('Error in getProfile:', error)
      throw error
    }
  },

  // Update user profile
  async updateProfile(userId: string, updates: {
    name?: string
    phone?: string
    bio?: string
    location?: string
    avatar_url?: string
    department?: string
    job_position?: string
    role?: string
    skill_level?: string
    ai_expertise?: string[]
    achievements?: string[]
    activity_score?: number
  }) {
    try {
      // First try to update profiles table
      const { data, error } = await getSupabase()
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.warn('Profiles table not accessible, updating user metadata:', error)
        
        // Fallback to updating user metadata
        const { data: currentUser } = await getSupabase().auth.getUser()
        
        if (!currentUser.user) {
          throw new Error('User not authenticated')
        }

        const currentMetadata = currentUser.user.user_metadata || {}
        const updatedMetadata = {
          ...currentMetadata,
          ...updates,
          updated_at: new Date().toISOString()
        }

        const { data: updateData, error: updateError } = await getSupabase().auth.updateUser({
          data: updatedMetadata
        })

        if (updateError) {
          console.error('Error updating user metadata:', updateError)
          throw updateError
        }

        // Return the updated data in profile format
        return {
          id: updateData.user.id,
          name: updatedMetadata.name || updateData.user.email?.split('@')[0] || '',
          email: updateData.user.email || '',
          phone: updatedMetadata.phone,
          department: updatedMetadata.department,
          job_position: updatedMetadata.job_position,
          role: updatedMetadata.role || 'member',
          avatar_url: updatedMetadata.avatar_url,
          location: updatedMetadata.location,
          skill_level: updatedMetadata.skill_level || 'beginner',
          bio: updatedMetadata.bio,
          activity_score: updatedMetadata.activity_score || 0,
          ai_expertise: updatedMetadata.ai_expertise || [],
          achievements: updatedMetadata.achievements || [],
          join_date: updateData.user.created_at,
          created_at: updateData.user.created_at,
          updated_at: updatedMetadata.updated_at
        }
      }

      return data
    } catch (error) {
      console.error('Error in updateProfile:', error)
      throw error
    }
  },

  // Get user activity stats
  async getUserStats(userId: string) {
    try {
      // Get posts count
      const { count: postsCount } = await getSupabase()
        .from('community_posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)

      // Get cases count
      const { count: casesCount } = await getSupabase()
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)

      // Get total likes received
      const { data: likesData } = await getSupabase()
        .from('likes')
        .select('community_post_id, case_id')
        .or(`community_post_id.in.(${await getUserPostIds(userId)}),case_id.in.(${await getUserCaseIds(userId)})`)

      // Get total comments made
      const { count: commentsCount } = await getSupabase()
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)

      // Get total views (sum from posts and cases)
      const { data: postsViews } = await getSupabase()
        .from('community_posts')
        .select('views')
        .eq('author_id', userId)

      const { data: casesViews } = await getSupabase()
        .from('cases')
        .select('views')
        .eq('author_id', userId)

      // Get activity participants count
      const { count: activitiesCount } = await getSupabase()
        .from('activity_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const totalViews = [
        ...(postsViews || []),
        ...(casesViews || [])
      ].reduce((sum, item) => sum + (item.views || 0), 0)

      return {
        totalPosts: (postsCount || 0) + (casesCount || 0),
        totalComments: commentsCount || 0,
        totalLikes: likesData?.length || 0,
        totalViews,
        activitiesJoined: activitiesCount || 0,
        resourcesShared: casesCount || 0
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return {
        totalPosts: 0,
        totalComments: 0,
        totalLikes: 0,
        totalViews: 0,
        activitiesJoined: 0,
        resourcesShared: 0
      }
    }
  },

  // Get user recent activity
  async getUserActivity(userId: string, limit = 10) {
    try {
      // Get recent posts
      const { data: posts } = await getSupabase()
        .from('community_posts')
        .select('id, title, created_at, views, likes_count, comments_count')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Get recent cases
      const { data: cases } = await getSupabase()
        .from('cases')
        .select('id, title, created_at, views, likes_count, comments_count')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Get recent comments
      const { data: comments } = await getSupabase()
        .from('comments')
        .select('id, content, created_at, community_post_id, case_id')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Combine and sort all activities
      const activities = [
        ...(posts || []).map(post => ({
          type: 'post' as const,
          title: post.title,
          date: post.created_at,
          engagement: {
            likes: post.likes_count || 0,
            comments: post.comments_count || 0,
            views: post.views || 0
          }
        })),
        ...(cases || []).map(caseItem => ({
          type: 'case' as const,
          title: caseItem.title,
          date: caseItem.created_at,
          engagement: {
            likes: caseItem.likes_count || 0,
            comments: caseItem.comments_count || 0,
            views: caseItem.views || 0
          }
        })),
        ...(comments || []).map(comment => ({
          type: 'comment' as const,
          title: comment.content.substring(0, 50) + '...',
          date: comment.created_at,
          engagement: {
            likes: 0,
            comments: 0,
            views: 0
          }
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit)

      return activities
    } catch (error) {
      console.error('Error fetching user activity:', error)
      return []
    }
  }
}

// Helper functions for getUserStats
async function getUserPostIds(userId: string): Promise<string> {
  const { data } = await getSupabase()
    .from('community_posts')
    .select('id')
    .eq('author_id', userId)
  
  return data?.map(p => p.id).join(',') || ''
}

async function getUserCaseIds(userId: string): Promise<string> {
  const { data } = await getSupabase()
    .from('cases')
    .select('id')
    .eq('author_id', userId)
  
  return data?.map(c => c.id).join(',') || ''
}

// Upload result type
interface UploadResult {
  path: string
  url: string
  method: 'storage' | 'base64'
}

// File Upload API
export const uploadApi = {
  // Create storage bucket if it doesn't exist
  async ensureStorageBucket() {
    try {
      const { data: buckets, error: listError } = await getSupabase().storage.listBuckets()
      
      if (listError) {
        console.warn('Cannot list buckets:', listError)
        return false
      }

      const bucketExists = buckets?.some(bucket => bucket.name === 'profile-images')
      
      if (!bucketExists) {
        const { error: createError } = await getSupabase().storage.createBucket('profile-images', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        })
        
        if (createError) {
          console.warn('Cannot create bucket:', createError)
          return false
        }
      }
      
      return true
    } catch (error) {
      console.warn('Storage bucket check failed:', error)
      return false
    }
  },

  // Upload profile avatar with fallback to base64 storage
  async uploadAvatar(file: File, userId: string): Promise<UploadResult> {
    try {
      // Check if storage is available
      const storageAvailable = await this.ensureStorageBucket()
      
      if (storageAvailable) {
        // Try Supabase Storage first
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        const { data, error } = await getSupabase().storage
          .from('profile-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          })

        if (!error && data) {
          // Get public URL
          const { data: { publicUrl } } = getSupabase().storage
            .from('profile-images')
            .getPublicUrl(filePath)

          return {
            path: data.path,
            url: publicUrl,
            method: 'storage'
          }
        } else {
          console.warn('Storage upload failed:', error)
        }
      }
      
      // Fallback to base64 encoding for user metadata
      return new Promise<UploadResult>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64Data = reader.result as string
          resolve({
            path: `base64-${userId}`,
            url: base64Data,
            method: 'base64'
          })
        }
        reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'))
        reader.readAsDataURL(file)
      })
      
    } catch (error) {
      console.error('Error uploading avatar:', error)
      throw new Error('파일 업로드에 실패했습니다. 파일 크기나 형식을 확인해주세요.')
    }
  },

  // Delete old avatar
  async deleteAvatar(path: string) {
    try {
      // Only delete from storage if it's a storage path
      if (path && !path.startsWith('base64-') && !path.startsWith('data:')) {
        const { error } = await getSupabase().storage
          .from('profile-images')
          .remove([path])

        if (error) {
          console.warn('Error deleting avatar from storage:', error)
        }
      }
    } catch (error) {
      console.warn('Error deleting avatar:', error)
      // Don't throw error for deletion failures
    }
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