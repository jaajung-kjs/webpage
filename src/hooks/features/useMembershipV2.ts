/**
 * useMembershipV2 - V2 스키마 기반 멤버십 신청 관리 Hook
 * 
 * 주요 개선사항:
 * - membership_applications_v2 테이블 사용
 * - 실시간 신청 상태 업데이트
 * - 관리자/운영진 승인 워크플로우
 * - Optimistic Updates
 * - 신청 상태별 필터링
 * - 통계 및 대시보드 지원
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers'
import { supabaseClient } from '@/lib/core/connection-core'
import { useCallback, useEffect } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { 
  MembershipApplicationV2, 
  MembershipApplicationV2Insert, 
  MembershipApplicationV2Update,
  UserV2 
} from '@/hooks/types/v2-types'


// 멤버십 신청 상태
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

// 확장된 멤버십 신청 타입 (관계 포함)
export interface MembershipApplicationWithUser extends MembershipApplicationV2 {
  user: Pick<UserV2, 'id' | 'email' | 'name' | 'department' | 'avatar_url' | 'created_at'>
  reviewer?: Pick<UserV2, 'id' | 'name' | 'avatar_url'>
}

// 신청 필터
export interface ApplicationFilter {
  status?: ApplicationStatus
  dateFrom?: string
  dateTo?: string
  department?: string
  reviewerId?: string
}

// 멤버십 통계
export interface MembershipStats {
  total: number
  pending: number
  approved: number
  rejected: number
  averageProcessingDays: number
  byDepartment: Record<string, number>
  byMonth: Array<{
    month: string
    applications: number
    approved: number
    rejected: number
  }>
}

// 신청서 데이터
export interface ApplicationFormData {
  motivation: string
  experience?: string
  goals?: string
}

export function useMembershipV2() {
  const supabase = supabaseClient
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 실시간 멤버십 신청 구독 (관리자/운영진용)
  useEffect(() => {
    if (!user?.id) return

    let channel: RealtimeChannel | null = null

    // 사용자 권한 확인 후 구독 설정
    const setupRealtimeSubscription = async () => {
      const { data: userData } = await supabase
        .from('users_v2')
        .select('role')
        .eq('id', user.id)
        .single()

      // 운영진 이상만 실시간 구독
      if (userData?.role && ['vice-leader', 'leader', 'admin'].includes(userData.role)) {
        channel = supabase
          .channel('membership_applications_v2')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'membership_applications_v2'
            },
            (payload) => {
              // 멤버십 신청 목록 무효화
              queryClient.invalidateQueries({ queryKey: ['membership-applications-v2'] })
              queryClient.invalidateQueries({ queryKey: ['membership-stats-v2'] })
              
              if (payload.eventType === 'INSERT') {
                // 새 신청 알림 (선택적)
                console.log('New membership application received')
              }
            }
          )
          .subscribe()
      }
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [user?.id]) // supabase, queryClient 제거

  // 현재 사용자의 멤버십 신청 상태 조회
  const useMyApplication = () => {
    return useQuery({
      queryKey: ['my-membership-application-v2', user?.id],
      queryFn: async () => {
        if (!user?.id) return null

        const { data, error } = await supabase
          .from('membership_applications_v2')
          .select(`
            *,
            reviewer:users_v2!reviewer_id(id, name, avatar_url)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        return data as (MembershipApplicationV2 & { reviewer?: Pick<UserV2, 'id' | 'name' | 'avatar_url'> }) | null
      },
      enabled: !!user?.id,
      staleTime: 1 * 60 * 1000, // 1분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 멤버십 신청 목록 조회 (관리자용, 무한 스크롤)
  const useApplications = (filter: ApplicationFilter = {}, pageSize = 20) => {
    return useInfiniteQuery({
      queryKey: ['membership-applications-v2', filter],
      queryFn: async ({ pageParam = 0 }) => {
        let query = supabase
          .from('membership_applications_v2')
          .select(`
            *,
            user:users_v2!user_id(id, email, name, department, avatar_url, created_at),
            reviewer:users_v2!reviewer_id(id, name, avatar_url)
          `, { count: 'exact' })
          .range(pageParam, pageParam + pageSize - 1)
          .order('created_at', { ascending: false })

        // 필터 적용
        if (filter.status) query = query.eq('status', filter.status)
        if (filter.dateFrom) query = query.gte('created_at', filter.dateFrom)
        if (filter.dateTo) query = query.lte('created_at', filter.dateTo)
        if (filter.reviewerId) query = query.eq('reviewer_id', filter.reviewerId)

        const { data, error, count } = await query

        if (error) throw error

        // 부서별 필터링 (클라이언트 사이드)
        let applications = data || []
        if (filter.department) {
          applications = applications.filter(
            (app: any) => app.user?.department === filter.department
          )
        }

        return {
          applications: applications as MembershipApplicationWithUser[],
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      initialPageParam: 0,
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 멤버십 통계 조회 (관리자용)
  const useMembershipStats = () => {
    return useQuery({
      queryKey: ['membership-stats-v2'],
      queryFn: async () => {
        // 기본 통계
        const { data: applications, error } = await supabase
          .from('membership_applications_v2')
          .select(`
            status,
            created_at,
            reviewed_at,
            user:users_v2!user_id(department)
          `)

        if (error) throw error

        const stats: MembershipStats = {
          total: applications?.length || 0,
          pending: applications?.filter(app => app.status === 'pending').length || 0,
          approved: applications?.filter(app => app.status === 'approved').length || 0,
          rejected: applications?.filter(app => app.status === 'rejected').length || 0,
          averageProcessingDays: 0,
          byDepartment: {},
          byMonth: []
        }

        if (applications?.length) {
          // 평균 처리 일수 계산
          const processedApps = applications.filter(app => app.reviewed_at)
          if (processedApps.length > 0) {
            const totalDays = processedApps.reduce((sum, app) => {
              const created = new Date(app.created_at)
              const reviewed = new Date(app.reviewed_at!)
              const diffDays = Math.ceil((reviewed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
              return sum + diffDays
            }, 0)
            stats.averageProcessingDays = Math.round(totalDays / processedApps.length)
          }

          // 부서별 통계
          applications.forEach(app => {
            const dept = (app.user as any)?.department || '미지정'
            stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1
          })

          // 월별 통계 (최근 12개월)
          const monthlyStats = new Map<string, { applications: number, approved: number, rejected: number }>()
          applications.forEach(app => {
            const month = new Date(app.created_at).toISOString().substring(0, 7) // YYYY-MM
            const current = monthlyStats.get(month) || { applications: 0, approved: 0, rejected: 0 }
            current.applications += 1
            if (app.status === 'approved') current.approved += 1
            if (app.status === 'rejected') current.rejected += 1
            monthlyStats.set(month, current)
          })

          stats.byMonth = Array.from(monthlyStats.entries())
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => b.month.localeCompare(a.month))
            .slice(0, 12)
        }

        return stats
      },
      staleTime: 2 * 60 * 1000, // 2분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 멤버십 신청 생성
  const submitApplication = useMutation({
    mutationFn: async (formData: ApplicationFormData) => {
      if (!user?.id) throw new Error('User not authenticated')

      // 기존 신청 확인
      const { data: existing } = await supabase
        .from('membership_applications_v2')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (existing) {
        throw new Error('이미 대기 중인 신청이 있습니다.')
      }

      const { data, error } = await supabase
        .from('membership_applications_v2')
        .insert({
          user_id: user.id,
          application_reason: formData.motivation, // motivation을 application_reason으로 사용
          motivation: formData.motivation,
          experience: formData.experience,
          goals: formData.goals,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      // 사용자 역할을 pending으로 변경
      await supabase
        .from('users_v2')
        .update({ role: 'pending' })
        .eq('id', user.id)

      return data
    },
    onSuccess: (data) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['my-membership-application-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-v2', user?.id] }) // 역할 업데이트
      queryClient.invalidateQueries({ queryKey: ['membership-applications-v2'] })
      queryClient.invalidateQueries({ queryKey: ['membership-stats-v2'] })
    }
  })

  // 신청 처리 (승인/거절) - RPC 함수 사용
  const processApplication = useMutation({
    mutationFn: async ({
      applicationId,
      action,
      comment
    }: {
      applicationId: string
      action: 'approve' | 'reject'
      comment?: string
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .rpc('process_membership_application_v2', {
          p_application_id: applicationId,
          p_reviewer_id: user.id,
          p_action: action,
          p_comment: comment
        })

      if (error) throw error
      return data
    },
    onMutate: async ({ applicationId, action, comment }) => {
      // Optimistic Update
      const queryKey = ['membership-applications-v2']
      await queryClient.cancelQueries({ queryKey })
      
      const previousData = queryClient.getQueryData<{ pages: any[] }>(queryKey)
      
      if (previousData) {
        const newStatus = action === 'approve' ? 'approved' : 'rejected'
        const now = new Date().toISOString()
        
        queryClient.setQueryData<{ pages: any[] }>(queryKey, {
          ...previousData,
          pages: previousData.pages.map(page => ({
            ...page,
            applications: page.applications.map((app: MembershipApplicationWithUser) =>
              app.id === applicationId
                ? {
                    ...app,
                    status: newStatus,
                    reviewed_at: now,
                    reviewer_id: user?.id,
                    review_comment: comment || null,
                    reviewer: {
                      id: user?.id || '',
                      name: 'Processing...', // 실제 이름은 서버에서 업데이트
                      avatar_url: null
                    }
                  }
                : app
            )
          }))
        })
      }

      return { previousData, applicationId }
    },
    onError: (err, variables, context) => {
      // 롤백
      if (context?.previousData) {
        queryClient.setQueryData(['membership-applications-v2'], context.previousData)
      }
    },
    onSuccess: (data) => {
      // 모든 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['membership-applications-v2'] })
      queryClient.invalidateQueries({ queryKey: ['membership-stats-v2'] })
      queryClient.invalidateQueries({ queryKey: ['members-v2'] }) // 회원 목록 업데이트
      
      // 처리된 사용자의 정보도 무효화
      const processedApplication = data as any
      if (processedApplication?.user_id) {
        queryClient.invalidateQueries({ queryKey: ['user-v2', processedApplication.user_id] })
      }
    }
  })

  // 신청 수정 (대기 중인 신청만)
  const updateApplication = useMutation({
    mutationFn: async ({
      applicationId,
      updates
    }: {
      applicationId: string
      updates: Partial<ApplicationFormData>
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('membership_applications_v2')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .eq('user_id', user.id)
        .eq('status', 'pending') // 대기 중인 신청만 수정 가능
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-membership-application-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['membership-applications-v2'] })
    }
  })

  // 신청 취소 (대기 중인 신청만)
  const cancelApplication = useMutation({
    mutationFn: async (applicationId: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('membership_applications_v2')
        .delete()
        .eq('id', applicationId)
        .eq('user_id', user.id)
        .eq('status', 'pending')

      if (error) throw error

      // 사용자 역할을 guest로 복원
      await supabase
        .from('users_v2')
        .update({ role: 'guest' })
        .eq('id', user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-membership-application-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['membership-applications-v2'] })
      queryClient.invalidateQueries({ queryKey: ['membership-stats-v2'] })
    }
  })

  // 대량 처리 (여러 신청을 한 번에 승인/거절)
  const processBulkApplications = useMutation({
    mutationFn: async ({
      applicationIds,
      action,
      comment
    }: {
      applicationIds: string[]
      action: 'approve' | 'reject'
      comment?: string
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      // 각 신청을 순차적으로 처리
      const results = []
      for (const applicationId of applicationIds) {
        const { data, error } = await supabase
          .rpc('process_membership_application_v2', {
            p_application_id: applicationId,
            p_reviewer_id: user.id,
            p_action: action,
            p_comment: comment
          })

        if (error) throw error
        results.push(data)
      }

      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-applications-v2'] })
      queryClient.invalidateQueries({ queryKey: ['membership-stats-v2'] })
      queryClient.invalidateQueries({ queryKey: ['members-v2'] })
    }
  })

  return {
    // Query Hooks
    useMyApplication,
    useApplications,
    useMembershipStats,

    // Mutations
    submitApplication: submitApplication.mutate,
    submitApplicationAsync: submitApplication.mutateAsync,
    processApplication: processApplication.mutate,
    processApplicationAsync: processApplication.mutateAsync,
    updateApplication: updateApplication.mutate,
    updateApplicationAsync: updateApplication.mutateAsync,
    cancelApplication: cancelApplication.mutate,
    cancelApplicationAsync: cancelApplication.mutateAsync,
    processBulkApplications: processBulkApplications.mutate,
    processBulkApplicationsAsync: processBulkApplications.mutateAsync,

    // 상태
    isSubmitting: submitApplication.isPending,
    isProcessing: processApplication.isPending,
    isUpdating: updateApplication.isPending,
    isCancelling: cancelApplication.isPending,
    isProcessingBulk: processBulkApplications.isPending,
  }
}

// 신청 상태별 설정
export const APPLICATION_STATUS_CONFIG = {
  pending: {
    label: '대기중',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: '⏳',
    description: '관리자의 승인을 기다리고 있습니다.'
  },
  approved: {
    label: '승인됨',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: '✅',
    description: '멤버십이 승인되었습니다.'
  },
  rejected: {
    label: '거절됨',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: '❌',
    description: '멤버십 신청이 거절되었습니다.'
  }
} as const

// 부서별 색상 설정 (시각화용)
export const DEPARTMENT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-red-500'
] as const