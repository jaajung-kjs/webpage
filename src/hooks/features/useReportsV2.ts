/**
 * useReportsV2 - 신고 시스템 V2 Hook
 * 
 * 주요 기능:
 * - interactions_v2 테이블 기반 신고 시스템 (interaction_type='report')
 * - 실시간 신고 상태 업데이트
 * - 관리자용 신고 처리 기능
 * - 신고 통계 및 분석
 * - 신고 타입별 분류 및 필터링
 * - TanStack Query v5 패턴 적용
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useRealtimeQueryV2 } from '@/hooks/core/useRealtimeQueryV2'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import type { Tables, TablesInsert, Json } from '@/lib/database.types'

// 신고 메타데이터 타입
export interface ReportMetadata {
  reason: string
  description?: string
  category: 'spam' | 'harassment' | 'inappropriate' | 'copyright' | 'violence' | 'hate_speech' | 'misinformation' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  reportedAt: string
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated'
  adminNote?: string
  resolvedAt?: string
  resolvedBy?: string
  actionTaken?: string
  evidence?: Array<{
    type: 'screenshot' | 'link' | 'text'
    content: string
    description?: string
  }>
  reportType: 'content' | 'comment' | 'user' | 'activity'
  targetInfo?: {
    title?: string
    authorId?: string
    authorName?: string
    contentPreview?: string
  }
}

// 신고 상세 정보
export interface ReportV2WithDetails {
  report: Tables<'interactions_v2'> & {
    metadata: ReportMetadata
  }
  reporter: {
    id: string
    name: string
    email: string
    avatar_url: string | null
    role: string
  }
  reportedUser?: {
    id: string
    name: string
    email: string
    avatar_url: string | null
    role: string
  }
  targetContent?: {
    id: string
    title?: string
    content?: string
    content_type?: string
    created_at: string
  }
  admin?: {
    id: string
    name: string
    email: string
  }
}

// 신고 통계
export interface ReportStatsV2 {
  totalReports: number
  pendingReports: number
  underReviewReports: number
  resolvedReports: number
  dismissedReports: number
  escalatedReports: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  byTargetType: Record<string, number>
  byStatus: Record<string, number>
  recentReports: ReportV2WithDetails[]
  monthlyTrends: Array<{
    month: string
    total: number
    resolved: number
    dismissed: number
  }>
  topReportedUsers: Array<{
    userId: string
    userName: string
    reportCount: number
  }>
  responseTimeStats: {
    averageHours: number
    medianHours: number
    under24Hours: number
    over7Days: number
  }
}

// 신고 생성 파라미터
export interface CreateReportParams {
  targetId: string
  targetType: 'content' | 'comment' | 'user' | 'activity'
  reason: string
  description?: string
  category: ReportMetadata['category']
  severity?: ReportMetadata['severity']
  evidence?: ReportMetadata['evidence']
}

// 신고 업데이트 파라미터
export interface UpdateReportParams {
  reportId: string
  status: ReportMetadata['status']
  adminNote?: string
  actionTaken?: string
}

/**
 * 신고 목록 조회 Hook (관리자용)
 */
export function useReportsV2(options?: {
  status?: ReportMetadata['status']
  category?: ReportMetadata['category']
  severity?: ReportMetadata['severity']
  targetType?: ReportMetadata['reportType']
  limit?: number
  offset?: number
}) {
  const { user } = useAuth()
  const isAdmin = ['admin', 'leader', 'vice-leader'].includes(user?.role || '')
  
  return useRealtimeQueryV2<ReportV2WithDetails[]>({
    queryKey: ['reports-v2', 'list', options],
    queryFn: async () => {
      if (!user || !isAdmin) {
        throw new Error('권한이 없습니다.')
      }
      
      let query = supabaseClient
        .from('interactions_v2')
        .select(`
          *,
          reporter:users_v2!interactions_v2_user_id_fkey (id, name, email, avatar_url, role)
        `)
        .eq('interaction_type', 'report')
      
      // 페이지네이션
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }
      
      query = query.order('created_at', { ascending: false })
      
      const { data: reports, error } = await query
      
      if (error) throw error
      if (!reports) return []
      
      // 메타데이터 기반 필터링 및 상세 정보 조회
      const detailedReports: ReportV2WithDetails[] = []
      
      for (const report of reports) {
        const metadata = report.metadata as unknown as ReportMetadata
        
        // 필터링 조건 확인
        if (options?.status && metadata.status !== options.status) continue
        if (options?.category && metadata.category !== options.category) continue
        if (options?.severity && metadata.severity !== options.severity) continue
        if (options?.targetType && metadata.reportType !== options.targetType) continue
        
        // 신고 대상 정보 조회
        let targetContent = null
        let reportedUser = null
        let admin = null
        
        try {
          if (report.target_type === 'content') {
            const { data: content } = await supabaseClient
              .from('content_v2')
              .select('id, title, summary, content, content_type, author_id, created_at')
              .eq('id', report.target_id)
              .single()
            
            if (content) {
              targetContent = {
                id: content.id,
                title: content.title,
                content: content.summary || content.content || '',
                content_type: content.content_type,
                created_at: content.created_at
              }
              
              // 콘텐츠 작성자 정보
              const { data: author } = await supabaseClient
                .from('users_v2')
                .select('id, name, email, avatar_url, role')
                .eq('id', content.author_id)
                .single()
              
              if (author) {
                reportedUser = author
              }
            }
          } else if (report.target_type === 'comment') {
            const { data: comment } = await supabaseClient
              .from('comments_v2')
              .select('id, comment_text, author_id, created_at')
              .eq('id', report.target_id)
              .single()
            
            if (comment) {
              targetContent = {
                id: comment.id,
                content: comment.comment_text,
                content_type: 'comment',
                created_at: comment.created_at
              }
              
              // 댓글 작성자 정보
              const { data: author } = await supabaseClient
                .from('users_v2')
                .select('id, name, email, avatar_url, role')
                .eq('id', comment.author_id)
                .single()
              
              if (author) {
                reportedUser = author
              }
            }
          } else if (report.target_type === 'user') {
            // 사용자 직접 신고
            const { data: reportedUserData } = await supabaseClient
              .from('users_v2')
              .select('id, name, email, avatar_url, role')
              .eq('id', report.target_id)
              .single()
            
            if (reportedUserData) {
              reportedUser = reportedUserData
            }
          } else if (report.target_type === 'activity') {
            const { data: activity } = await supabaseClient
              .from('activities_v2')
              .select(`
                id, event_type, event_date,
                content:content_v2!activities_v2_content_id_fkey (
                  title, author_id, created_at
                )
              `)
              .eq('id', report.target_id)
              .single()
            
            if (activity && activity.content) {
              targetContent = {
                id: activity.id,
                title: (activity.content as any)?.title,
                content_type: 'activity',
                created_at: activity.event_date
              }
              
              // 활동 주최자 정보
              if ((activity.content as any)?.author_id) {
                const { data: organizer } = await supabaseClient
                  .from('users_v2')
                  .select('id, name, email, avatar_url, role')
                  .eq('id', (activity.content as any).author_id)
                  .single()
                
                if (organizer) {
                  reportedUser = organizer
                }
              }
            }
          }
          
          // 처리한 관리자 정보 조회
          if (metadata.resolvedBy) {
            const { data: adminData } = await supabaseClient
              .from('users_v2')
              .select('id, name, email')
              .eq('id', metadata.resolvedBy)
              .single()
            
            if (adminData) {
              admin = adminData
            }
          }
          
          detailedReports.push({
            report: {
              ...report,
              metadata
            } as any,
            reporter: (report as any).reporter,
            reportedUser: reportedUser || undefined,
            targetContent: targetContent || undefined,
            admin: admin || undefined
          })
        } catch (err) {
          console.warn(`신고 상세 정보 조회 실패: ${report.id}`, err)
        }
      }
      
      return detailedReports
    },
    enabled: !!user && isAdmin,
    gcTime: 2 * 60 * 1000, // 2분
    staleTime: 30 * 1000, // 30초
    realtime: {
      enabled: isAdmin,
      table: 'interactions_v2',
      filter: 'interaction_type=eq.report'
    }
  })
}

/**
 * 신고 생성 Hook
 */
export function useCreateReportV2() {
  const { user, isMember } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<Tables<'interactions_v2'>, Error, CreateReportParams>({
    mutationFn: async ({ targetId, targetType, reason, description, category, severity = 'medium', evidence }) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      if (!isMember) throw new Error('동아리 회원만 신고할 수 있습니다.')
      
      // 중복 신고 체크 (동일 사용자가 동일 대상을 24시간 내에 중복 신고 방지)
      const { data: existing } = await supabaseClient
        .from('interactions_v2')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('interaction_type', 'report')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()
      
      if (existing) {
        throw new Error('24시간 내에 동일한 항목을 중복 신고할 수 없습니다.')
      }
      
      // 신고 대상 정보 조회 (메타데이터에 추가)
      let targetInfo: ReportMetadata['targetInfo'] = {}
      
      try {
        if (targetType === 'content') {
          const { data: content } = await supabaseClient
            .from('content_v2')
            .select('title, author_id, summary, content, author:users_v2!content_v2_author_id_fkey (name)')
            .eq('id', targetId)
            .single()
          
          if (content) {
            targetInfo = {
              title: content.title,
              authorId: content.author_id,
              authorName: (content as any).author?.name,
              contentPreview: (content.summary || content.content)?.substring(0, 200)
            }
          }
        } else if (targetType === 'comment') {
          const { data: comment } = await supabaseClient
            .from('comments_v2')
            .select('comment_text, author_id, author:users_v2!comments_v2_author_id_fkey (name)')
            .eq('id', targetId)
            .single()
          
          if (comment) {
            targetInfo = {
              authorId: comment.author_id,
              authorName: (comment as any).author?.name,
              contentPreview: comment.comment_text.substring(0, 200)
            }
          }
        } else if (targetType === 'user') {
          const { data: userData } = await supabaseClient
            .from('users_v2')
            .select('name')
            .eq('id', targetId)
            .single()
          
          if (userData) {
            targetInfo = {
              authorId: targetId,
              authorName: userData.name
            }
          }
        }
      } catch (err) {
        console.warn('대상 정보 조회 실패:', err)
      }
      
      // 신고 메타데이터 생성
      const metadata: ReportMetadata = {
        reason,
        description,
        category,
        severity,
        reportedAt: new Date().toISOString(),
        status: 'pending',
        evidence,
        reportType: targetType,
        targetInfo
      }
      
      const reportData: TablesInsert<'interactions_v2'> = {
        user_id: user.id,
        target_id: targetId,
        target_type: targetType,
        interaction_type: 'report',
        metadata: metadata as unknown as Json
      }
      
      const { data, error } = await supabaseClient
        .from('interactions_v2')
        .insert(reportData)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('신고가 접수되었습니다. 검토 후 조치하겠습니다.')
      queryClient.invalidateQueries({ queryKey: ['reports-v2'] })
    },
    onError: (error) => {
      console.error('신고 접수 실패:', error)
      toast.error(error.message || '신고 접수에 실패했습니다.')
    }
  })
}

/**
 * 신고 처리 Hook (관리자용)
 */
export function useUpdateReportV2() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = ['admin', 'leader', 'vice-leader'].includes(user?.role || '')
  
  return useMutation<void, Error, UpdateReportParams>({
    mutationFn: async ({ reportId, status, adminNote, actionTaken }) => {
      if (!user || !isAdmin) {
        throw new Error('권한이 없습니다.')
      }
      
      // 기존 신고 정보 조회
      const { data: report, error: fetchError } = await supabaseClient
        .from('interactions_v2')
        .select('metadata')
        .eq('id', reportId)
        .eq('interaction_type', 'report')
        .single()
      
      if (fetchError) throw fetchError
      
      const currentMetadata = report.metadata as unknown as ReportMetadata
      const updatedMetadata: ReportMetadata = {
        ...currentMetadata,
        status,
        adminNote,
        actionTaken,
        resolvedAt: ['resolved', 'dismissed', 'escalated'].includes(status) ? new Date().toISOString() : currentMetadata.resolvedAt,
        resolvedBy: ['resolved', 'dismissed', 'escalated'].includes(status) ? user.id : currentMetadata.resolvedBy
      }
      
      const { error } = await supabaseClient
        .from('interactions_v2')
        .update({ metadata: updatedMetadata as unknown as Json })
        .eq('id', reportId)
        .eq('interaction_type', 'report')
      
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      const statusText = {
        'pending': '대기 중으로 변경',
        'under_review': '검토 중으로 변경',
        'resolved': '처리 완료',
        'dismissed': '기각',
        'escalated': '상급자 검토 요청'
      }[status] || '상태 업데이트'
      
      toast.success(`신고가 ${statusText}되었습니다.`)
      queryClient.invalidateQueries({ queryKey: ['reports-v2'] })
    },
    onError: (error) => {
      console.error('신고 처리 실패:', error)
      toast.error('신고 처리에 실패했습니다.')
    }
  })
}

/**
 * 신고 통계 조회 Hook (관리자용)
 */
export function useReportStatsV2() {
  const { user } = useAuth()
  const isAdmin = ['admin', 'leader', 'vice-leader'].includes(user?.role || '')
  
  return useQuery<ReportStatsV2>({
    queryKey: ['reports-v2', 'stats'],
    queryFn: async () => {
      if (!user || !isAdmin) {
        return {
          totalReports: 0,
          pendingReports: 0,
          underReviewReports: 0,
          resolvedReports: 0,
          dismissedReports: 0,
          escalatedReports: 0,
          byCategory: {},
          bySeverity: {},
          byTargetType: {},
          byStatus: {},
          recentReports: [],
          monthlyTrends: [],
          topReportedUsers: [],
          responseTimeStats: {
            averageHours: 0,
            medianHours: 0,
            under24Hours: 0,
            over7Days: 0
          }
        }
      }
      
      // 전체 신고 조회
      const { data: reports, error } = await supabaseClient
        .from('interactions_v2')
        .select('*, metadata, created_at')
        .eq('interaction_type', 'report')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // 통계 계산
      const stats: ReportStatsV2 = {
        totalReports: reports?.length || 0,
        pendingReports: 0,
        underReviewReports: 0,
        resolvedReports: 0,
        dismissedReports: 0,
        escalatedReports: 0,
        byCategory: {},
        bySeverity: {},
        byTargetType: {},
        byStatus: {},
        recentReports: [],
        monthlyTrends: [],
        topReportedUsers: [],
        responseTimeStats: {
          averageHours: 0,
          medianHours: 0,
          under24Hours: 0,
          over7Days: 0
        }
      }
      
      const monthlyData: Record<string, { total: number; resolved: number; dismissed: number }> = {}
      const userReportCounts: Record<string, { count: number; name: string }> = {}
      const responseTimes: number[] = []
      
      reports?.forEach(report => {
        const metadata = report.metadata as unknown as ReportMetadata
        
        // 상태별 집계
        switch (metadata.status) {
          case 'pending':
            stats.pendingReports++
            break
          case 'under_review':
            stats.underReviewReports++
            break
          case 'resolved':
            stats.resolvedReports++
            break
          case 'dismissed':
            stats.dismissedReports++
            break
          case 'escalated':
            stats.escalatedReports++
            break
        }
        
        // 카테고리, 심각도, 타입별 집계
        stats.byCategory[metadata.category] = (stats.byCategory[metadata.category] || 0) + 1
        stats.bySeverity[metadata.severity] = (stats.bySeverity[metadata.severity] || 0) + 1
        stats.byTargetType[metadata.reportType] = (stats.byTargetType[metadata.reportType] || 0) + 1
        stats.byStatus[metadata.status] = (stats.byStatus[metadata.status] || 0) + 1
        
        // 월별 집계
        const month = new Date(report.created_at).toISOString().substring(0, 7)
        if (!monthlyData[month]) {
          monthlyData[month] = { total: 0, resolved: 0, dismissed: 0 }
        }
        monthlyData[month].total++
        if (metadata.status === 'resolved') monthlyData[month].resolved++
        if (metadata.status === 'dismissed') monthlyData[month].dismissed++
        
        // 신고당한 사용자 집계 (대상 정보에서)
        if (metadata.targetInfo?.authorId && metadata.targetInfo?.authorName) {
          const userId = metadata.targetInfo.authorId
          if (!userReportCounts[userId]) {
            userReportCounts[userId] = { count: 0, name: metadata.targetInfo.authorName }
          }
          userReportCounts[userId].count++
        }
        
        // 응답 시간 계산
        if (metadata.resolvedAt && metadata.reportedAt) {
          const reportTime = new Date(metadata.reportedAt).getTime()
          const resolveTime = new Date(metadata.resolvedAt).getTime()
          const hoursToResolve = (resolveTime - reportTime) / (1000 * 60 * 60)
          responseTimes.push(hoursToResolve)
        }
      })
      
      // 월별 트렌드 데이터 정렬
      stats.monthlyTrends = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data }))
      
      // 상위 신고당한 사용자 (최대 10명)
      stats.topReportedUsers = Object.entries(userReportCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
        .map(([userId, data]) => ({
          userId,
          userName: data.name,
          reportCount: data.count
        }))
      
      // 응답 시간 통계
      if (responseTimes.length > 0) {
        const sum = responseTimes.reduce((a, b) => a + b, 0)
        stats.responseTimeStats.averageHours = Math.round(sum / responseTimes.length)
        
        const sorted = responseTimes.sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        stats.responseTimeStats.medianHours = Math.round(
          sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
        )
        
        stats.responseTimeStats.under24Hours = responseTimes.filter(t => t <= 24).length
        stats.responseTimeStats.over7Days = responseTimes.filter(t => t > 24 * 7).length
      }
      
      return stats
    },
    enabled: !!user && isAdmin,
    gcTime: 5 * 60 * 1000, // 5분
    staleTime: 2 * 60 * 1000 // 2분
  })
}

/**
 * 내 신고 내역 조회 Hook
 */
export function useMyReportsV2() {
  const { user } = useAuth()
  
  return useQuery<ReportV2WithDetails[]>({
    queryKey: ['reports-v2', 'my-reports', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data: reports, error } = await supabaseClient
        .from('interactions_v2')
        .select('*')
        .eq('user_id', user.id)
        .eq('interaction_type', 'report')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      if (!reports) return []
      
      // 간단한 형태로 변환 (상세 정보는 필요시 추가 조회)
      const myReports: ReportV2WithDetails[] = reports.map(report => ({
        report: {
          ...report,
          metadata: report.metadata as unknown as ReportMetadata
        } as any,
        reporter: {
          id: user.id,
          name: user.email?.split('@')[0] || 'Unknown',
          email: user.email || '',
          avatar_url: null,
          role: 'member'
        }
      }))
      
      return myReports
    },
    enabled: !!user,
    gcTime: 5 * 60 * 1000, // 5분
    staleTime: 2 * 60 * 1000 // 2분
  })
}