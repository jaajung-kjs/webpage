/**
 * useMembership - 회원가입 신청 관련 Hook들
 * 
 * 새로운 아키텍처를 활용한 회원가입 관리 기능 구현
 */

'use client'

import { useCallback } from 'react'
import { useAuth } from '@/providers'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

// 회원가입 신청 타입 (사용자 정보 포함)
interface MembershipApplicationWithUser extends Tables<'membership_applications'> {
  user: Pick<Tables<'users'>, 'id' | 'email' | 'name' | 'department' | 'avatar_url'>
  reviewer?: Pick<Tables<'users'>, 'name'>
}

/**
 * 회원가입 신청 목록 조회 Hook
 */
export function useMembershipApplications(status?: 'pending' | 'approved' | 'rejected') {
  return useQuery<MembershipApplicationWithUser[]>({
    queryKey: ['membership-applications', status],
    queryFn: async () => {
      let query = supabaseClient
        .from('membership_applications')
        .select(`
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
        .order('created_at', { ascending: false })
      
      if (status) {
        query = query.eq('status', status)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as MembershipApplicationWithUser[] || []
    },
    staleTime: 5 * 60 * 1000 // 5분
  })
}

/**
 * 나의 회원가입 신청 조회 Hook
 */
export function useMyMembershipApplication() {
  const { user } = useAuth()
  
  return useQuery<Tables<'membership_applications'> | null>({
    queryKey: ['membership-applications', 'my', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabaseClient
        .from('membership_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // 신청 내역 없음
        throw error
      }
      
      return data
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000 // 5분
  })
}

/**
 * 회원가입 신청 생성 Hook
 */
export function useCreateMembershipApplication() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<Tables<'membership_applications'>, Error, Omit<TablesInsert<'membership_applications'>, 'user_id' | 'status'>>(
    {
      mutationFn: async (application) => {
        const { data, error } = await supabaseClient
          .from('membership_applications')
          .insert({
            ...application,
            user_id: user!.id,
            status: 'pending'
          })
          .select()
          .single()
        
        if (error) throw error
        return data
      },
      
      onSuccess: () => {
        // 관련 쿼리 무효화
        queryClient.invalidateQueries({ 
          queryKey: ['membership-applications'] 
        })
        queryClient.invalidateQueries({ 
          queryKey: ['membership-applications', 'my', user?.id] 
        })
      }
    }
  )
}

/**
 * 회원가입 신청 상태 업데이트 Hook (관리자용)
 */
export function useUpdateMembershipApplication() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<Tables<'membership_applications'>, Error, { 
    applicationId: string
    status: 'approved' | 'rejected'
    reviewNote?: string
  }>(
    {
      mutationFn: async ({ applicationId, status, reviewNote }) => {
        // 먼저 신청 정보 조회
        const { data: application, error: fetchError } = await supabaseClient
          .from('membership_applications')
          .select('*')
          .eq('id', applicationId)
          .single()
        
        if (fetchError) throw fetchError
        
        // 신청 상태 업데이트
        const { data: updatedApplication, error: updateError } = await supabaseClient
          .from('membership_applications')
          .update({
            status,
            review_note: reviewNote,
            reviewed_by: user!.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', applicationId)
          .select()
          .single()
        
        if (updateError) throw updateError
        
        // 승인된 경우 사용자 역할 업데이트
        if (status === 'approved') {
          const { error: roleError } = await supabaseClient
            .from('users')
            .update({
              role: 'member',
              updated_at: new Date().toISOString()
            })
            .eq('id', application.user_id)
          
          if (roleError) throw roleError
        }
        
        // 거절된 경우 사용자 역할을 guest로 복귀
        if (status === 'rejected') {
          const { error: roleError } = await supabaseClient
            .from('users')
            .update({
              role: 'guest',
              updated_at: new Date().toISOString()
            })
            .eq('id', application.user_id)
          
          if (roleError) throw roleError
        }
        
        return updatedApplication
      },
      
      onSuccess: () => {
        // 관련 쿼리 무효화
        queryClient.invalidateQueries({ 
          queryKey: ['membership-applications'] 
        })
        queryClient.invalidateQueries({ 
          queryKey: ['users'] 
        })
      }
    }
  )
}

/**
 * 회원가입 신청 삭제 Hook
 */
export function useDeleteMembershipApplication() {
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, string>(
    {
      mutationFn: async (applicationId) => {
        const { error } = await supabaseClient
          .from('membership_applications')
          .delete()
          .eq('id', applicationId)
        
        if (error) throw error
      },
      
      onSuccess: () => {
        // 관련 쿼리 무효화
        queryClient.invalidateQueries({ 
          queryKey: ['membership-applications'] 
        })
      }
    }
  )
}

/**
 * 회원가입 통계 조회 Hook
 */
export function useMembershipStats() {
  return useQuery<{
    total: number
    pending: number
    approved: number
    rejected: number
    todayApplications: number
    thisWeekApplications: number
  }>({
    queryKey: ['membership-stats'],
    queryFn: async () => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      
      // 전체 통계
      const { data: applications, error } = await supabaseClient
        .from('membership_applications')
        .select('*')
      
      if (error) throw error
      
      const stats = {
        total: applications?.length || 0,
        pending: applications?.filter(a => a.status === 'pending').length || 0,
        approved: applications?.filter(a => a.status === 'approved').length || 0,
        rejected: applications?.filter(a => a.status === 'rejected').length || 0,
        todayApplications: applications?.filter(a => 
          new Date(a.created_at) >= today
        ).length || 0,
        thisWeekApplications: applications?.filter(a => 
          new Date(a.created_at) >= weekStart
        ).length || 0
      }
      
      return stats
    },
    staleTime: 5 * 60 * 1000 // 5분
  })
}