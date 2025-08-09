/**
 * Profile Management Hooks
 * 
 * 사용자 프로필 조회 및 관리를 위한 TanStack Query 기반 hooks
 * 
 * 구조:
 * 1. useUserProfile - 기본 프로필 정보 (users 테이블)
 * 2. useUserStats - 통계 정보 (get_user_with_stats RPC)
 * 3. useUserContentStats - 콘텐츠별 통계 (get_user_content_stats RPC)
 * 4. useUserActivities - 최근 활동 (get_user_activity_logs RPC)
 * 5. useUpdateProfile - 프로필 업데이트
 * 6. useUploadAvatar - 아바타 업로드
 * 
 * @see PROFILE_SYSTEM.md 자세한 시스템 문서 참조
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { Tables, TablesUpdate } from '@/lib/database.types'
import { useAuth } from '@/providers'
import { toast } from 'sonner'

/**
 * 사용자 프로필 조회 Hook
 * 
 * users 테이블에서 기본 프로필 정보 조회
 * - name, email, department, role, avatar_url, bio, activity_score
 * - metadata (phone, job_position, location, skill_level, ai_expertise, achievements)
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
 * 
 * get_user_with_stats RPC 함수 사용
 * - posts_count, comments_count, likes_received 직접 반환
 * - ProfilePage/ProfileDetailPage와 필드명 일치
 */
export function useUserStats(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  return useQuery<any, Error>({
    queryKey: ['user-stats', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required')
      
      // get_user_with_stats RPC 사용 - 필드명이 이미 일치
      const { data, error } = await supabaseClient
        .rpc('get_user_with_stats', { target_user_id: targetUserId })
      
      if (error) {
        console.error('Error fetching user stats:', error)
        // Fallback: user_stats 뷰 직접 조회
        const { data: viewData, error: viewError } = await supabaseClient
          .from('user_stats')
          .select('*')
          .eq('id', targetUserId)
          .single()
        
        if (viewError) throw viewError
        return viewData
      }
      
      // 데이터가 배열로 반환되므로 첫 번째 요소 사용
      return data?.[0] || {
        posts_count: 0,
        comments_count: 0,
        likes_received: 0,
        activity_score: 0
      }
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 사용자 컨텐츠 통계 조회 Hook
 * 
 * get_user_content_stats RPC 함수 사용
 * - 콘텐츠 타입별 통계 (posts, cases, announcements, resources)
 * - 필요 시 활성화하여 사용
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
 * 
 * get_user_activity_logs RPC 함수 사용
 * - 구조화된 활동 로그 반환
 * - engagement 정보 포함
 */
export function useUserActivities(userId?: string, limit: number = 10) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  
  return useQuery<any[], Error>({
    queryKey: ['user-activities', targetUserId, limit],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required')
      
      // get_user_activity_logs RPC 사용
      const { data, error } = await supabaseClient
        .rpc('get_user_activity_logs', { 
          target_user_id: targetUserId,
          limit_count: limit 
        })
      
      if (error) {
        console.error('Error fetching user activities:', error)
        // Fallback: 기존 방식으로 content와 comments 직접 조회
        const { data: posts } = await supabaseClient
          .from('content')
          .select('id, title, content_type, created_at, view_count, like_count, comment_count')
          .eq('author_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        const { data: comments } = await supabaseClient
          .from('comments')
          .select(`
            id, comment, created_at,
            content:content_id (id, title, content_type, view_count, like_count, comment_count)
          `)
          .eq('author_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        // 활동 데이터 통합
        const activities = [
          ...(posts || []).map((post: any) => ({
            activity_type: 'post_created',
            activity_data: {
              id: post.id,
              title: post.title,
              content_type: post.content_type,
              engagement: {
                views: post.view_count || 0,
                likes: post.like_count || 0,
                comments: post.comment_count || 0
              }
            },
            created_at: post.created_at
          })),
          ...(comments || []).map((comment: any) => ({
            activity_type: 'comment_created',
            activity_data: {
              id: comment.id,
              title: comment.content?.title || comment.comment.substring(0, 50) + '...',
              content_type: comment.content?.content_type || 'post',
              engagement: {
                views: comment.content?.view_count || 0,
                likes: comment.content?.like_count || 0,
                comments: comment.content?.comment_count || 0
              }
            },
            created_at: comment.created_at
          }))
        ].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, limit)
        
        return activities
      }
      
      // RPC 결과 처리
      if (!data || !Array.isArray(data)) return []
      
      // 활동 로그 형식 정규화
      return data.map((log: any) => ({
        activity_type: log.activity_type || 'unknown',
        activity_data: {
          id: log.id,
          title: log.title || log.metadata?.title || '',
          content_type: log.target_type || 'post',
          engagement: {
            views: log.metadata?.views || 0,
            likes: log.metadata?.likes || 0,
            comments: log.metadata?.comments || 0
          }
        },
        created_at: log.created_at
      }))
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