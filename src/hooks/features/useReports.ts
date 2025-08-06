/**
 * Reports Management Hooks
 * 
 * 신고 기능을 위한 TanStack Query 기반 hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useAuth } from '@/providers'
import { toast } from 'sonner'

// 신고 데이터 타입 (관련 정보 포함)
export interface ReportWithDetails extends Tables<'reports'> {
  reporter: {
    id: string
    name: string
    email: string
  }
  reported_user?: {
    id: string
    name: string
    email: string
  }
  content?: {
    id: string
    title: string
    content_type: string
  } | null
  comment?: {
    id: string
    comment: string
  } | null
}

/**
 * 신고 목록 조회 Hook (관리자용)
 */
export function useReports(options?: {
  status?: 'pending' | 'resolved' | 'dismissed'
  targetType?: 'content' | 'comment' | 'user'
  limit?: number
  offset?: number
}) {
  const { user, profile } = useAuth()
  
  return useQuery<ReportWithDetails[], Error>({
    queryKey: ['reports', options],
    queryFn: async () => {
      // 권한 체크
      if (!user || !['admin', 'leader', 'vice-leader'].includes(profile?.role || '')) {
        throw new Error('권한이 없습니다.')
      }
      
      let query = supabaseClient
        .from('reports')
        .select(`
          *,
          reporter:reporter_id (
            id,
            name,
            email
          ),
          content:content_id (
            id,
            title
          ),
          comment:comment_id (
            id,
            comment
          )
        `)
      
      // 상태 필터링
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      
      // 타겟 타입 필터링
      if (options?.targetType) {
        query = query.eq('target_type', options.targetType)
      }
      
      // 페이지네이션
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }
      
      // 최신순 정렬
      query = query.order('created_at', { ascending: false })
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Map data to include content_type and handle type safety
      const mappedData = (data || []).map((report: any) => ({
        ...report,
        content: report.content ? {
          ...report.content,
          content_type: 'post' // Default to post for now
        } : null
      }))
      
      // 콘텐츠/댓글 정보 및 신고된 사용자 정보 추가 조회
      const reportsWithDetails = await Promise.all(mappedData.map(async (report) => {
        let content = null
        let comment = null
        let reported_user = null
        
        if (report.target_type === 'content' && report.target_id) {
          const { data: contentData } = await supabaseClient
            .from('content')
            .select('id, title, author_id')
            .eq('id', report.target_id)
            .single()
          content = contentData ? { id: contentData.id, title: contentData.title, content_type: 'post' } : null
          
          // 콘텐츠 작성자 정보 가져오기
          if (contentData?.author_id) {
            const { data: userData } = await supabaseClient
              .from('users')
              .select('id, name, email')
              .eq('id', contentData.author_id)
              .single()
            reported_user = userData
          }
        } else if (report.target_type === 'comment' && report.target_id) {
          const { data: commentData } = await supabaseClient
            .from('comments')
            .select('id, comment, author_id')
            .eq('id', report.target_id)
            .single()
          comment = commentData ? { id: commentData.id, comment: commentData.comment } : null
          
          // 댓글 작성자 정보 가져오기
          if (commentData?.author_id) {
            const { data: userData } = await supabaseClient
              .from('users')
              .select('id, name, email')
              .eq('id', commentData.author_id)
              .single()
            reported_user = userData
          }
        } else if (report.target_type === 'user' && report.target_id) {
          // 사용자 직접 신고의 경우
          const { data: userData } = await supabaseClient
            .from('users')
            .select('id, name, email')
            .eq('id', report.target_id)
            .single()
          reported_user = userData
        }
        
        return {
          ...report,
          reporter: (report as any).reporter,
          reported_user,
          content,
          comment
        }
      }))
      
      return reportsWithDetails
    },
    enabled: !!user && ['admin', 'leader', 'vice-leader'].includes(profile?.role || ''),
    staleTime: 2 * 60 * 1000, // 2분
  })
}

/**
 * 신고 생성 Hook
 */
export function useCreateReport() {
  const queryClient = useQueryClient()
  const { user, isMember } = useAuth()
  
  return useMutation<Tables<'reports'>, Error, {
    targetType: 'content' | 'comment' | 'user'
    targetId: string
    reason: string
    description?: string
    parentContentId?: string
  }>({
    mutationFn: async ({ targetType, targetId, reason, description, parentContentId }) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      if (!isMember) throw new Error('동아리 회원만 신고할 수 있습니다.')
      
      // 중복 신고 체크
      const { data: existing } = await supabaseClient
        .from('reports')
        .select('id')
        .eq('reporter_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('status', 'pending')
        .maybeSingle()
      
      if (existing) {
        throw new Error('이미 신고한 항목입니다.')
      }
      
      // 신고 생성
      const { data, error } = await supabaseClient
        .from('reports')
        .insert({
          reporter_id: user.id,
          target_type: targetType,
          target_id: targetId,
          reason,
          description,
          parent_content_id: parentContentId,
          status: 'pending',
          report_type_id: '00000000-0000-0000-0000-000000000001' // 기본 신고 타입 ID
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('신고가 접수되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (error) => {
      console.error('Report creation error:', error)
      toast.error(error.message || '신고 접수에 실패했습니다.')
    }
  })
}

/**
 * 신고 처리 Hook (관리자용)
 */
export function useUpdateReport() {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()
  
  return useMutation<Tables<'reports'>, Error, {
    reportId: string
    status: 'resolved' | 'dismissed'
    adminNote?: string
    action?: string
  }>({
    mutationFn: async ({ reportId, status, adminNote, action }) => {
      // 권한 체크
      if (!user || !['admin', 'leader', 'vice-leader'].includes(profile?.role || '')) {
        throw new Error('권한이 없습니다.')
      }
      
      const { data, error } = await supabaseClient
        .from('reports')
        .update({
          status,
          admin_note: adminNote,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          action_taken: action
        })
        .eq('id', reportId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      const statusText = variables.status === 'resolved' ? '처리' : '기각'
      toast.success(`신고가 ${statusText}되었습니다.`)
      
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report-stats'] })
    },
    onError: (error) => {
      console.error('Report update error:', error)
      toast.error('신고 처리에 실패했습니다.')
    }
  })
}

/**
 * 신고 통계 조회 Hook (관리자용)
 */
export function useReportStats() {
  const { user, profile } = useAuth()
  
  return useQuery<{
    totalReports: number
    pendingReports: number
    resolvedReports: number
    dismissedReports: number
    byType: Record<string, number>
    byReason: Record<string, number>
    recentReports: ReportWithDetails[]
  }, Error>({
    queryKey: ['report-stats'],
    queryFn: async () => {
      // 권한 체크
      if (!user || !['admin', 'leader', 'vice-leader'].includes(profile?.role || '')) {
        return {
          totalReports: 0,
          pendingReports: 0,
          resolvedReports: 0,
          dismissedReports: 0,
          byType: {},
          byReason: {},
          recentReports: []
        }
      }
      
      // 전체 신고 수
      const { count: totalReports } = await supabaseClient
        .from('reports')
        .select('*', { count: 'exact', head: true })
      
      // 대기 중 신고
      const { count: pendingReports } = await supabaseClient
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      
      // 처리된 신고
      const { count: resolvedReports } = await supabaseClient
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved')
      
      // 기각된 신고
      const { count: dismissedReports } = await supabaseClient
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'dismissed')
      
      // 타입별 신고
      const { data: reports } = await supabaseClient
        .from('reports')
        .select('target_type, reason')
      
      const byType = (reports || []).reduce((acc, report) => {
        acc[report.target_type] = (acc[report.target_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const byReason = (reports || []).reduce((acc, report) => {
        acc[report.reason] = (acc[report.reason] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // 최근 신고 5개
      const { data: recentData } = await supabaseClient
        .from('reports')
        .select(`
          *,
          reporter:reporter_id (
            id,
            name,
            email
          ),
        `)
        .order('created_at', { ascending: false })
        .limit(5)
      
      const recentReports = (recentData || []).map((report: any) => ({
        ...report,
        reporter: report.reporter,
        reported_user: null // reported_user는 별도로 처리 필요
      })) as ReportWithDetails[]
      
      return {
        totalReports: totalReports || 0,
        pendingReports: pendingReports || 0,
        resolvedReports: resolvedReports || 0,
        dismissedReports: dismissedReports || 0,
        byType,
        byReason,
        recentReports
      }
    },
    enabled: !!user && ['admin', 'leader', 'vice-leader'].includes(profile?.role || ''),
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 내 신고 내역 조회 Hook
 */
export function useMyReports() {
  const { user } = useAuth()
  
  return useQuery<Tables<'reports'>[], Error>({
    queryKey: ['my-reports', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabaseClient
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
  })
}