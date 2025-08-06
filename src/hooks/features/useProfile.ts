/**
 * Profile Management Hooks
 * 
 * 사용자 프로필 조회 및 관리를 위한 TanStack Query 기반 hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { Tables, TablesUpdate } from '@/lib/database.types'
import { useAuth } from '@/providers'
import { toast } from 'sonner'

/**
 * 사용자 프로필 조회 Hook
 */
export function useUserProfile(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  return useQuery<Tables<'users'>, Error>({
    queryKey: ['profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required')
      
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
  })
}

/**
 * 사용자 통계 조회 Hook
 */
export function useUserStats(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  return useQuery<any, Error>({
    queryKey: ['user-stats', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required')
      
      // RPC 함수를 사용하여 통합 통계 조회
      const { data, error } = await supabaseClient
        .rpc('get_user_comprehensive_stats', { p_user_id: targetUserId })
      
      if (error) throw error
      
      // 데이터가 배열로 반환되므로 첫 번째 요소 사용
      return data?.[0] || {
        total_posts: 0,
        total_comments: 0,
        total_likes_received: 0,
        total_views: 0,
        recent_posts: [],
        recent_comments: []
      }
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 사용자 컨텐츠 통계 조회 Hook
 */
export function useUserContentStats(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  return useQuery<any, Error>({
    queryKey: ['user-content-stats', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required')
      
      const { data, error } = await supabaseClient
        .rpc('get_user_content_stats', { user_id_param: targetUserId })
      
      if (error) throw error
      return data || []
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 사용자 활동 내역 조회 Hook
 */
export function useUserActivities(userId?: string, limit: number = 10) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  return useQuery<any[], Error>({
    queryKey: ['user-activities', targetUserId, limit],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required')
      
      // 최근 게시글 조회
      const { data: posts, error: postsError } = await supabaseClient
        .from('content')
        .select(`
          id,
          title,
          content_type,
          created_at,
          view_count,
          like_count,
          comment_count
        `)
        .eq('author_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (postsError) throw postsError
      
      // 최근 댓글 조회
      const { data: comments, error: commentsError } = await supabaseClient
        .from('comments')
        .select(`
          id,
          comment,
          created_at,
          content:content_id (
            id,
            title,
            content_type
          )
        `)
        .eq('author_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (commentsError) throw commentsError
      
      // 활동 데이터 통합 및 정렬
      const activities = [
        ...(posts || []).map((post: any) => ({
          type: 'post' as const,
          activity_type: 'post_created',
          activity_data: post,
          created_at: post.created_at
        })),
        ...(comments || []).map((comment: any) => ({
          type: 'comment' as const,
          activity_type: 'comment_created',
          activity_data: comment,
          created_at: comment.created_at
        }))
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, limit)
      
      return activities
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2분
  })
}

/**
 * 프로필 업데이트 Hook
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation<Tables<'users'>, Error, TablesUpdate<'users'>>({
    mutationFn: async (updates) => {
      if (!user) throw new Error('User is not authenticated')
      
      const { data, error } = await supabaseClient
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // 캐시 업데이트
      queryClient.setQueryData(['profile', user?.id], data)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('프로필이 업데이트되었습니다.')
    },
    onError: (error) => {
      console.error('Profile update error:', error)
      toast.error('프로필 업데이트에 실패했습니다.')
    }
  })
}

/**
 * 프로필 이미지 업로드 Hook
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation<string, Error, File>({
    mutationFn: async (file) => {
      if (!user) throw new Error('User is not authenticated')
      
      // 파일 확장자 추출
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      // Storage에 업로드
      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true
        })
      
      if (uploadError) throw uploadError
      
      // Public URL 가져오기
      const { data: urlData } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      // 프로필 업데이트
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (updateError) throw updateError
      
      return urlData.publicUrl
    },
    onSuccess: (avatarUrl) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      toast.success('프로필 이미지가 업데이트되었습니다.')
    },
    onError: (error) => {
      console.error('Avatar upload error:', error)
      toast.error('프로필 이미지 업로드에 실패했습니다.')
    }
  })
}

/**
 * AI 도구 사용 설정 업데이트 Hook
 */
export function useUpdateAITools() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation<Tables<'users'>, Error, string[]>({
    mutationFn: async (aiTools) => {
      if (!user) throw new Error('User is not authenticated')
      
      const { data, error } = await supabaseClient
        .from('users')
        .update({
          ai_tools_used: aiTools,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', user?.id], data)
      toast.success('AI 도구 설정이 업데이트되었습니다.')
    },
    onError: (error) => {
      console.error('AI tools update error:', error)
      toast.error('AI 도구 설정 업데이트에 실패했습니다.')
    }
  })
}