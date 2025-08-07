/**
 * Members Management Hooks
 * 
 * 회원 목록 조회 및 관리를 위한 TanStack Query 기반 hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { Tables } from '@/lib/database.types'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import type { UserMetadata } from '@/lib/types'

// 회원 데이터 타입 (통계 포함) - Tables<'users'>를 기반으로 하되 metadata 타입을 재정의
export interface MemberWithStats extends Omit<Tables<'users'>, 'metadata'> {
  metadata?: UserMetadata
  posts_count?: number
  comments_count?: number
  likes_received?: number
  content_count?: number | null
  comment_count?: number | null
  like_count?: number | null
  last_active?: string
  total_views?: number
  activities_joined?: number
  resources_shared?: number
}

/**
 * 회원 목록 조회 Hook
 */
export function useMembers(options?: {
  role?: 'admin' | 'moderator' | 'member' | 'leader' | 'vice-leader' | 'guest' | 'pending'
  sortBy?: 'name' | 'created_at' | 'last_active'
  order?: 'asc' | 'desc'
}) {
  return useQuery<MemberWithStats[], Error>({
    queryKey: ['members', options],
    queryFn: async () => {
      // members_with_stats 뷰 사용
      let query = supabaseClient
        .from('members_with_stats')
        .select('*')
      
      // 역할 필터링
      if (options?.role) {
        query = query.eq('role', options.role)
      }
      
      // 정렬
      const sortColumn = options?.sortBy || 'created_at'
      const sortOrder = options?.order || 'desc'
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })
      
      const { data, error } = await query
      
      if (error) throw error
      
      // 데이터 매핑 (뷰에서 이미 통계 포함)
      const members = (data || []).map(user => ({
        ...user,
        activity_score: user.activity_score || 0,
        posts_count: user.content_count || 0,
        comments_count: user.comment_count || 0,
        likes_received: user.like_count || 0,
        content_count: user.content_count || 0,
        comment_count: user.comment_count || 0,
        like_count: user.like_count || 0
      }) as MemberWithStats)
      
      return members
    },
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true,
  })
}

/**
 * 회원 역할 변경 Hook (옵티미스틱 업데이트 적용)
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient()
  const { user: currentUser, profile } = useAuth()
  
  return useMutation<
    Tables<'users'>, 
    Error, 
    { userId: string; newRole: 'admin' | 'moderator' | 'member' | 'leader' | 'vice-leader' | 'guest' | 'pending' },
    { previousMembers?: MemberWithStats[] }
  >({
    mutationFn: async ({ userId, newRole }) => {
      // 권한 체크
      if (!currentUser || !['admin', 'leader', 'vice-leader'].includes(profile?.role || '')) {
        throw new Error('권한이 없습니다.')
      }
      
      // 자기 자신의 역할은 변경 불가
      if (userId === currentUser.id) {
        throw new Error('자신의 역할은 변경할 수 없습니다.')
      }
      
      const { data, error } = await supabaseClient
        .from('users')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async ({ userId, newRole }) => {
      // 이전 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['members'] })
      
      // 이전 데이터 스냅샷
      const previousMembers = queryClient.getQueryData<MemberWithStats[]>(['members'])
      
      // 옵티미스틱 업데이트
      if (previousMembers) {
        queryClient.setQueryData<MemberWithStats[]>(['members'], (old) => {
          if (!old) return old
          return old.map(member => 
            member.id === userId 
              ? { ...member, role: newRole, updated_at: new Date().toISOString() }
              : member
          )
        })
      }
      
      return { previousMembers }
    },
    onError: (error, variables, context) => {
      // 에러 시 이전 데이터로 롤백
      if (context?.previousMembers) {
        queryClient.setQueryData(['members'], context.previousMembers)
      }
      console.error('Role update error:', error)
      toast.error(error.message || '역할 변경에 실패했습니다.')
    },
    onSuccess: (data, variables) => {
      const roleLabels: Record<string, string> = {
        'admin': '관리자',
        'leader': '동아리장',
        'vice-leader': '운영진',
        'member': '회원',
        'pending': '대기중',
        'guest': '게스트'
      }
      
      toast.success(`역할이 ${roleLabels[variables.newRole] || variables.newRole}로 변경되었습니다.`)
    },
    onSettled: (data, error, variables) => {
      // 최종적으로 캐시 동기화
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] })
    }
  })
}

/**
 * 회원 삭제 Hook
 */
export function useDeleteMember() {
  const queryClient = useQueryClient()
  const { user: currentUser, profile } = useAuth()
  
  return useMutation<void, Error, string>({
    mutationFn: async (userId) => {
      // 권한 체크
      if (!currentUser || profile?.role !== 'admin') {
        throw new Error('관리자만 회원을 삭제할 수 있습니다.')
      }
      
      // 자기 자신은 삭제 불가
      if (userId === currentUser.id) {
        throw new Error('자신은 삭제할 수 없습니다.')
      }
      
      // 사용자 삭제 (CASCADE로 관련 데이터도 삭제됨)
      const { error } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', userId)
      
      if (error) throw error
    },
    onSuccess: (_, userId) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.success('회원이 삭제되었습니다.')
    },
    onError: (error) => {
      console.error('Member delete error:', error)
      toast.error(error.message || '회원 삭제에 실패했습니다.')
    }
  })
}

/**
 * 회원 통계 조회 Hook
 */
export function useMemberStats() {
  return useQuery<{
    totalMembers: number
    activeMembers: number
    newMembersThisMonth: number
    roleDistribution: Record<string, number>
  }, Error>({
    queryKey: ['member-stats'],
    queryFn: async () => {
      // 전체 회원 수 조회
      const { count: totalMembers, error: countError } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true })
      
      if (countError) throw countError
      
      // 활성 회원 수 (최근 30일 이내 활동)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { count: activeMembers, error: activeError } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', thirtyDaysAgo.toISOString())
      
      if (activeError) throw activeError
      
      // 이번 달 신규 회원
      const thisMonthStart = new Date()
      thisMonthStart.setDate(1)
      thisMonthStart.setHours(0, 0, 0, 0)
      
      const { count: newMembersThisMonth, error: newError } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thisMonthStart.toISOString())
      
      if (newError) throw newError
      
      // 역할별 분포
      const { data: roleData, error: roleError } = await supabaseClient
        .from('users')
        .select('role')
      
      if (roleError) throw roleError
      
      const roleDistribution = (roleData || []).reduce((acc, user) => {
        const role = user.role || 'guest'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      return {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        newMembersThisMonth: newMembersThisMonth || 0,
        roleDistribution
      }
    },
    staleTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * 사용자 검색 Hook
 */
export function useSearchMembers(searchQuery: string) {
  return useQuery<MemberWithStats[], Error>({
    queryKey: ['members-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) {
        return []
      }
      
      const { data, error } = await supabaseClient
        .from('members_with_stats')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%`)
        .limit(20)
      
      if (error) throw error
      
      // 데이터 매핑 (뷰에서 이미 통계 포함)
      const members = (data || []).map(user => ({
        ...user,
        activity_score: user.activity_score || 0,
        posts_count: user.content_count || 0,
        comments_count: user.comment_count || 0,
        likes_received: user.like_count || 0,
        content_count: user.content_count || 0,
        comment_count: user.comment_count || 0,
        like_count: user.like_count || 0
      }) as MemberWithStats)
      
      return members
    },
    enabled: searchQuery.length >= 2,
    staleTime: 2 * 60 * 1000, // 2분
  })
}