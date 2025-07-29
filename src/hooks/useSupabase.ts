/**
 * Enhanced Supabase Hooks with Caching
 * 
 * Generic hooks for common Supabase operations with caching support
 * Provides type-safe wrappers around Supabase queries with performance optimization
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, Tables, Views, TablesInsert, TablesUpdate, handleSupabaseError, Database } from '@/lib/supabase/client'
import type { PostgrestError } from '@supabase/supabase-js'
import { HybridCache, createCacheKey, optimisticUpdate } from '@/lib/utils/cache'

type TableName = keyof Database['public']['Tables']
type ViewName = keyof Database['public']['Views']
type TableOrViewName = TableName | ViewName

// Generic hook response type
interface UseSupabaseResult<T> {
  data: T | null
  error: PostgrestError | null
  loading: boolean
  refetch: () => Promise<void>
}

// Cache configuration
interface CacheOptions {
  enabled?: boolean
  ttl?: number // Time to live in milliseconds
  key?: string
}

// Enhanced hook for fetching with cache support
export function useSupabaseQuery<T>(
  table: TableOrViewName,
  query: (q: any) => any,
  deps: any[] = [],
  cacheOptions: CacheOptions = { enabled: true, ttl: 300000 } // 5 minutes default
): UseSupabaseResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<PostgrestError | null>(null)
  const [loading, setLoading] = useState(true)

  // Generate cache key
  const cacheKey = cacheOptions.key || createCacheKey('supabase', table, ...deps)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Check cache first
      if (cacheOptions.enabled) {
        const cachedData = HybridCache.get<T>(cacheKey)
        if (cachedData !== null) {
          setData(cachedData)
          setLoading(false)
          
          // Still fetch fresh data in background
          const baseQuery = supabase.from(table as any)
          const finalQuery = query(baseQuery)
          const { data: freshData, error } = await finalQuery
          
          if (!error && freshData) {
            setData(freshData)
            HybridCache.set(cacheKey, freshData, cacheOptions.ttl)
          }
          
          return
        }
      }

      // Fetch from Supabase
      const baseQuery = supabase.from(table as any)
      const finalQuery = query(baseQuery)
      const { data, error } = await finalQuery
      
      if (error) throw error
      
      setData(data)
      
      // Cache the result
      if (cacheOptions.enabled && data) {
        HybridCache.set(cacheKey, data, cacheOptions.ttl)
      }
    } catch (err: any) {
      setError(err)
      console.error(`Error fetching from ${table}:`, err)
    } finally {
      setLoading(false)
    }
  }, [table, cacheKey, cacheOptions.enabled, cacheOptions.ttl, ...deps])

  // Invalidate cache when component unmounts
  useEffect(() => {
    fetchData()
    
    // Subscribe to realtime changes if applicable
    if (table === 'content' || table === 'comments' || table === 'users') {
      const subscription = supabase
        .channel(`${table}_changes`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: table as string },
          () => {
            // Invalidate cache and refetch
            HybridCache.invalidate(cacheKey)
            fetchData()
          }
        )
        .subscribe()
      
      return () => {
        subscription.unsubscribe()
      }
    }
  }, [fetchData, table, cacheKey])

  const refetch = useCallback(async () => {
    // Invalidate cache before refetching
    if (cacheOptions.enabled) {
      HybridCache.invalidate(cacheKey)
    }
    await fetchData()
  }, [fetchData, cacheOptions.enabled, cacheKey])

  return { data, error, loading, refetch }
}

// Hook for content queries with caching
export function useContent(id: string) {
  const queryFn = useMemo(() => (q: any) => q.select('*').eq('id', id).single(), [id])
  
  return useSupabaseQuery<Views<'content_with_author'>>(
    'content_with_author',
    queryFn,
    [id],
    { enabled: true, ttl: 600000 } // 10 minutes cache
  )
}

// Hook for content list with filters and caching
interface ContentFilters {
  type?: string
  category?: string
  status?: string
  limit?: number
  offset?: number
}

export function useContentList(filters: ContentFilters = {}) {
  const queryFn = useMemo(() => (q: any) => {
    let query = q.select('*')
    
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.status) query = query.eq('status', filters.status)
    
    query = query.order('created_at', { ascending: false })
    
    if (filters.limit) query = query.limit(filters.limit)
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    
    return query
  }, [filters.type, filters.category, filters.status, filters.limit, filters.offset])
  
  return useSupabaseQuery<Views<'content_with_author'>[]>(
    'content_with_author',
    queryFn,
    [JSON.stringify(filters)],
    { enabled: true, ttl: 300000 } // 5 minutes cache
  )
}

// Hook for comments with caching
export function useComments(contentId: string) {
  const queryFn = useMemo(() => (q: any) => q
    .select('*')
    .eq('content_id', contentId)
    .order('created_at', { ascending: true }), [contentId])
  
  return useSupabaseQuery<Views<'comments_with_author'>[]>(
    'comments_with_author',
    queryFn,
    [contentId],
    { enabled: true, ttl: 300000 } // 5 minutes cache
  )
}

// Hook for user profile with longer cache
export function useUserProfile(userId: string) {
  const queryFn = useMemo(() => (q: any) => q.select('*').eq('id', userId).single(), [userId])
  
  return useSupabaseQuery<Tables<'users'>>(
    'users',
    queryFn,
    [userId],
    { enabled: true, ttl: 1800000 } // 30 minutes cache
  )
}

// Hook for activities with caching
export function useActivities(filters: { status?: string; limit?: number } = {}) {
  const queryFn = useMemo(() => (q: any) => {
    let query = q.select('*')
    
    if (filters.status) query = query.eq('status', filters.status)
    
    query = query.order('scheduled_at', { ascending: true })
    
    if (filters.limit) query = query.limit(filters.limit)
    
    return query
  }, [filters.status, filters.limit])
  
  return useSupabaseQuery<Views<'activities_with_details'>[]>(
    'activities_with_details',
    queryFn,
    [JSON.stringify(filters)],
    { enabled: true, ttl: 600000 } // 10 minutes cache
  )
}

// Hook for membership applications with short cache
export function useMembershipApplications(status?: string) {
  const queryFn = useMemo(() => (q: any) => {
    let query = q.select(`
      *,
      user:users!membership_applications_user_id_fkey (
        id,
        email,
        name,
        department,
        avatar_url
      ),
      reviewer:users!membership_applications_reviewed_by_fkey (
        name
      )
    `)
    
    if (status) query = query.eq('status', status)
    
    return query.order('created_at', { ascending: false })
  }, [status])
  
  return useSupabaseQuery<any[]>(
    'membership_applications',
    queryFn,
    [status],
    { enabled: true, ttl: 60000 } // 1 minute cache (frequently changing data)
  )
}

// Hook for user's own membership application
export function useMyMembershipApplication(userId: string | undefined) {
  const queryFn = useMemo(() => (q: any) => userId ? q.select('*').eq('user_id', userId).single() : q.select('*').limit(0), [userId])
  
  return useSupabaseQuery<Tables<'membership_applications'>>(
    'membership_applications',
    queryFn,
    [userId],
    { enabled: !!userId, ttl: 300000 } // 5 minutes cache
  )
}

// Enhanced mutation hook with optimistic updates
export function useSupabaseMutation<T = any>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const mutate = useCallback(async (
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
    optimisticOptions?: {
      cacheKey?: string
      optimisticData?: T | ((prev: T) => T)
      invalidateKeys?: string[]
    }
  ): Promise<{ data: T | null; error: PostgrestError | null }> => {
    setLoading(true)
    setError(null)
    
    try {
      // Optimistic update if cache key provided
      if (optimisticOptions?.cacheKey && optimisticOptions?.optimisticData) {
        const result = await optimisticUpdate(
          optimisticOptions.cacheKey,
          optimisticOptions.optimisticData,
          operation,
          {
            onError: (err) => {
              console.error('Optimistic update failed:', err)
            }
          }
        )
        
        // Invalidate related caches
        if (optimisticOptions.invalidateKeys) {
          optimisticOptions.invalidateKeys.forEach(key => {
            HybridCache.invalidate(key)
          })
        }
        
        return result
      }
      
      // Regular mutation without optimistic update
      const result = await operation()
      
      if (result.error) {
        setError(result.error)
        console.error('Mutation error:', result.error)
      }
      
      // Invalidate related caches after successful mutation
      if (!result.error && optimisticOptions?.invalidateKeys) {
        optimisticOptions.invalidateKeys.forEach(key => {
          HybridCache.invalidate(key)
        })
      }
      
      return result
    } catch (err: any) {
      const error: PostgrestError = { 
        message: err.message, 
        details: err.details || '', 
        hint: err.hint || '', 
        code: err.code || '',
        name: err.name || 'PostgrestError'
      }
      setError(error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }, [])

  return { mutate, loading, error }
}

// Enhanced create content with cache invalidation
export function useCreateContent() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'content'>>()
  
  const createContent = useCallback(async (content: TablesInsert<'content'>) => {
    return mutate(async () => 
      await supabase
        .from('content')
        .insert(content)
        .select()
        .single(),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'content_with_author'),
          createCacheKey('supabase', 'content')
        ]
      }
    )
  }, [mutate])
  
  return { createContent, loading, error }
}

// Enhanced update content
export function useUpdateContent() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'content'>>()
  
  const updateContent = useCallback(async (id: string, updates: TablesUpdate<'content'>) => {
    return mutate(async () => 
      await supabase
        .from('content')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'content_with_author', id),
          createCacheKey('supabase', 'content', id),
          createCacheKey('supabase', 'content_with_author')
        ]
      }
    )
  }, [mutate])
  
  return { updateContent, loading, error }
}

// Enhanced delete content
export function useDeleteContent() {
  const { mutate, loading, error } = useSupabaseMutation()
  
  const deleteContent = useCallback(async (id: string) => {
    return mutate(async () => 
      await supabase
        .from('content')
        .delete()
        .eq('id', id),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'content_with_author', id),
          createCacheKey('supabase', 'content', id),
          createCacheKey('supabase', 'content_with_author')
        ]
      }
    )
  }, [mutate])
  
  return { deleteContent, loading, error }
}

// Enhanced toggle like with optimistic update
export function useToggleLike() {
  const { mutate, loading } = useSupabaseMutation()
  
  const toggleLike = useCallback(async (userId: string, contentId: string) => {
    // Check if already liked
    const { data: existing } = await supabase
      .from('interactions')
      .select('id')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('type', 'like')
      .single()
    
    if (existing) {
      // Unlike
      return mutate(async () =>
        await supabase
          .from('interactions')
          .delete()
          .eq('id', existing.id),
        {
          invalidateKeys: [
            createCacheKey('supabase', 'content_with_author', contentId)
          ]
        }
      )
    } else {
      // Like
      return mutate(async () =>
        await supabase
          .from('interactions')
          .insert({
            user_id: userId,
            content_id: contentId,
            type: 'like'
          }),
        {
          invalidateKeys: [
            createCacheKey('supabase', 'content_with_author', contentId)
          ]
        }
      )
    }
  }, [mutate])
  
  return { toggleLike, loading }
}

// Hook for checking if user has liked content with caching
export function useIsLiked(userId: string | undefined, contentId: string) {
  const [isLiked, setIsLiked] = useState(false)
  const cacheKey = createCacheKey('like', userId || '', contentId)
  
  useEffect(() => {
    if (!userId || !contentId) {
      setIsLiked(false)
      return
    }
    
    // Check cache first
    const cached = HybridCache.get<boolean>(cacheKey)
    if (cached !== null) {
      setIsLiked(cached)
      return
    }
    
    supabase
      .from('interactions')
      .select('id')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('type', 'like')
      .single()
      .then(({ data }) => {
        const liked = !!data
        setIsLiked(liked)
        HybridCache.set(cacheKey, liked, 300000) // 5 minutes cache
      })
  }, [userId, contentId, cacheKey])
  
  return isLiked
}

// Enhanced create comment with cache invalidation
export function useCreateComment() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'comments'>>()
  
  const createComment = useCallback(async (comment: TablesInsert<'comments'>) => {
    return mutate(async () => 
      await supabase
        .from('comments')
        .insert(comment)
        .select()
        .single(),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'comments_with_author', comment.content_id)
        ]
      }
    )
  }, [mutate])
  
  return { createComment, loading, error }
}

// Enhanced update comment
export function useUpdateComment() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'comments'>>()
  
  const updateComment = useCallback(async (id: string, updates: TablesUpdate<'comments'>, contentId: string) => {
    return mutate(async () => 
      await supabase
        .from('comments')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'comments_with_author', contentId)
        ]
      }
    )
  }, [mutate])
  
  return { updateComment, loading, error }
}

// Enhanced delete comment
export function useDeleteComment() {
  const { mutate, loading, error } = useSupabaseMutation()
  
  const deleteComment = useCallback(async (id: string, contentId: string) => {
    return mutate(async () => 
      await supabase
        .from('comments')
        .delete()
        .eq('id', id),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'comments_with_author', contentId)
        ]
      }
    )
  }, [mutate])
  
  return { deleteComment, loading, error }
}

// Enhanced toggle comment like
export function useToggleCommentLike() {
  const { mutate, loading } = useSupabaseMutation()
  
  const toggleCommentLike = useCallback(async (userId: string, commentId: string, contentId: string) => {
    // Check if already liked
    const { data: existing } = await supabase
      .from('interactions')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .eq('type', 'like')
      .single()
    
    if (existing) {
      // Unlike
      return mutate(async () => {
        return await supabase
          .from('interactions')
          .delete()
          .eq('id', existing.id)
      }, {
        invalidateKeys: [
          createCacheKey('supabase', 'comments_with_author', contentId)
        ]
      })
    } else {
      // Like
      return mutate(async () => {
        return await supabase
          .from('interactions')
          .insert({
            user_id: userId,
            comment_id: commentId,
            type: 'like'
          })
      }, {
        invalidateKeys: [
          createCacheKey('supabase', 'comments_with_author', contentId)
        ]
      })
    }
  }, [mutate])
  
  return { toggleCommentLike, loading }
}

// Additional hooks for other operations
export function useUpdateProfile() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'users'>>()
  
  const updateProfile = useCallback(async (userId: string, updates: TablesUpdate<'users'>) => {
    return mutate(async () => 
      await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single(),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'users', userId)
        ]
      }
    )
  }, [mutate])
  
  return { updateProfile, loading, error }
}

export function useMembershipApplication(applicationId: string) {
  const queryFn = useMemo(() => (q: any) => q.select('*').eq('id', applicationId).single(), [applicationId])
  
  return useSupabaseQuery<Tables<'membership_applications'>>(
    'membership_applications',
    queryFn,
    [applicationId],
    { enabled: true, ttl: 60000 } // 1 minute cache
  )
}

export function useCreateMembershipApplication() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'membership_applications'>>()
  
  const createApplication = useCallback(async (application: TablesInsert<'membership_applications'>) => {
    return mutate(async () => 
      await supabase
        .from('membership_applications')
        .insert(application)
        .select()
        .single(),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'membership_applications')
        ]
      }
    )
  }, [mutate])
  
  return { createApplication, loading, error }
}

export function useUpdateMembershipApplication() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'membership_applications'>>()
  
  const updateApplication = useCallback(async (id: string, updates: TablesUpdate<'membership_applications'>) => {
    return mutate(async () => 
      await supabase
        .from('membership_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'membership_applications', id),
          createCacheKey('supabase', 'membership_applications')
        ]
      }
    )
  }, [mutate])
  
  return { updateApplication, loading, error }
}

export function useReports(filters?: { status?: string }) {
  const queryFn = useMemo(() => (q: any) => {
    let query = q.select('*')
    
    if (filters?.status) query = query.eq('status', filters.status)
    
    return query.order('created_at', { ascending: false })
  }, [filters?.status])
  
  return useSupabaseQuery<Tables<'reports'>[]>(
    'reports',
    queryFn,
    [JSON.stringify(filters)],
    { enabled: true, ttl: 60000 } // 1 minute cache
  )
}

export function useCreateReport() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'reports'>>()
  
  const createReport = useCallback(async (report: TablesInsert<'reports'>) => {
    return mutate(async () => 
      await supabase
        .from('reports')
        .insert(report)
        .select()
        .single()
    )
  }, [mutate])
  
  return { createReport, loading, error }
}

export function useInteraction(userId: string, contentId?: string, commentId?: string) {
  const queryFn = useMemo(() => (q: any) => {
    let query = q.select('*').eq('user_id', userId)
    
    if (contentId) query = query.eq('content_id', contentId)
    if (commentId) query = query.eq('comment_id', commentId)
    
    return query.single()
  }, [userId, contentId, commentId])
  
  return useSupabaseQuery<Tables<'interactions'>>(
    'interactions',
    queryFn,
    [userId, contentId, commentId],
    { enabled: true, ttl: 300000 } // 5 minutes cache
  )
}

export function useCreateInteraction() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'interactions'>>()
  
  const createInteraction = useCallback(async (interaction: TablesInsert<'interactions'>) => {
    return mutate(async () => 
      await supabase
        .from('interactions')
        .insert(interaction)
        .select()
        .single()
    )
  }, [mutate])
  
  return { createInteraction, loading, error }
}

export function useDeleteInteraction() {
  const { mutate, loading, error } = useSupabaseMutation()
  
  const deleteInteraction = useCallback(async (id: string) => {
    return mutate(async () => 
      await supabase
        .from('interactions')
        .delete()
        .eq('id', id)
    )
  }, [mutate])
  
  return { deleteInteraction, loading, error }
}

export function useResources(filters?: { category?: string; limit?: number }) {
  const queryFn = useMemo(() => (q: any) => {
    let query = q.select('*').eq('type', 'resource').eq('status', 'published')
    
    if (filters?.category) query = query.eq('category', filters.category)
    
    query = query.order('created_at', { ascending: false })
    
    if (filters?.limit) query = query.limit(filters.limit)
    
    return query
  }, [filters?.category, filters?.limit])
  
  return useSupabaseQuery<Views<'content_with_author'>[]>(
    'content_with_author',
    queryFn,
    [JSON.stringify(filters)],
    { enabled: true, ttl: 600000 } // 10 minutes cache
  )
}

export function useResource(id: string) {
  const queryFn = useMemo(() => (q: any) => q.select('*').eq('id', id).eq('type', 'resource').single(), [id])
  
  return useSupabaseQuery<Views<'content_with_author'>>(
    'content_with_author',
    queryFn,
    [id],
    { enabled: true, ttl: 600000 } // 10 minutes cache
  )
}

export function useCreateResource() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'content'>>()
  
  const createResource = useCallback(async (resource: Omit<TablesInsert<'content'>, 'type'>) => {
    return mutate(async () => 
      await supabase
        .from('content')
        .insert({ ...resource, type: 'resource' })
        .select()
        .single(),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'content_with_author')
        ]
      }
    )
  }, [mutate])
  
  return { createResource, loading, error }
}

export function useUpdateResource() {
  const { mutate, loading, error } = useSupabaseMutation<Tables<'content'>>()
  
  const updateResource = useCallback(async (id: string, updates: TablesUpdate<'content'>) => {
    return mutate(async () => 
      await supabase
        .from('content')
        .update(updates)
        .eq('id', id)
        .eq('type', 'resource')
        .select()
        .single(),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'content_with_author', id),
          createCacheKey('supabase', 'content_with_author')
        ]
      }
    )
  }, [mutate])
  
  return { updateResource, loading, error }
}

export function useDeleteResource() {
  const { mutate, loading, error } = useSupabaseMutation()
  
  const deleteResource = useCallback(async (id: string) => {
    return mutate(async () => 
      await supabase
        .from('content')
        .delete()
        .eq('id', id)
        .eq('type', 'resource'),
      {
        invalidateKeys: [
          createCacheKey('supabase', 'content_with_author', id),
          createCacheKey('supabase', 'content_with_author')
        ]
      }
    )
  }, [mutate])
  
  return { deleteResource, loading, error }
}

