/**
 * useAuditLogsV2 - V2 스키마 기반 시스템 감사 로그 관리 Hook
 * 
 * 주요 기능:
 * - audit_logs_v2 테이블 기반 (월별 파티셔닝 지원)
 * - 관리자 전용 액세스 제어
 * - 포괄적인 필터링 (사용자, 액션, 테이블, 날짜범위)
 * - 고급 검색 및 분석
 * - 감사 통계 및 리포트
 * - 데이터 보안 및 규정 준수
 * - 대량 데이터 처리 최적화
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import type { Database } from '@/lib/database.types'
import { useAuth } from '@/providers'

type Tables = Database['public']['Tables']
type AuditLogV2 = Tables['audit_logs_v2']['Row']
type UserV2 = Tables['users_v2']['Row']

// 감사 로그 확장 타입 (관계 포함)
export interface AuditLogWithRelations extends AuditLogV2 {
  user?: Pick<UserV2, 'id' | 'name' | 'email' | 'department' | 'avatar_url' | 'role'>
}

// 감사 로그 필터
export interface AuditLogFilter {
  userId?: string
  action?: string
  tableName?: string
  dateFrom?: string
  dateTo?: string
  ipAddress?: string
  userAgent?: string
  recordId?: string
}

// 감사 로그 통계
export interface AuditStats {
  total_logs: number
  unique_users: number
  unique_actions: number
  unique_tables: number
  date_range: {
    start: string
    end: string
  }
  by_action: Record<string, number>
  by_table: Record<string, number>
  by_user: { user_id: string; name: string; count: number }[]
  by_hour: number[] // 24시간 배열
  by_day_of_week: number[] // 7일 배열 (0=일요일)
}

// 감사 트레일
export interface AuditTrail {
  record_id: string
  table_name: string
  chronological_logs: AuditLogWithRelations[]
  summary: {
    created_by: string
    created_at: string
    last_modified_by: string
    last_modified_at: string
    modification_count: number
    unique_editors: number
  }
}

// 위험 분석 결과
export interface SecurityAlert {
  level: 'low' | 'medium' | 'high' | 'critical'
  type: 'suspicious_activity' | 'mass_deletion' | 'privilege_escalation' | 'unusual_access' | 'data_breach'
  user_id?: string
  description: string
  affected_records: string[]
  timestamp: string
  recommendations: string[]
}

export function useAuditLogsV2() {
  const { user, profile } = useAuth()
  // Admin and moderation checks based on profile role
  const isAdmin = profile?.role === 'admin'
  const canModerate = profile?.role && ['admin', 'leader', 'vice-leader'].includes(profile.role)
  const queryClient = useQueryClient()

  // 권한 체크 헬퍼
  const hasAuditAccess = () => isAdmin || canModerate

  // 감사 로그 목록 조회 (무한 스크롤, 관리자 전용)
  const useAuditLogs = (filter: AuditLogFilter = {}, pageSize = 100) => {
    return useInfiniteQuery({
      queryKey: ['audit-logs-v2', filter],
      queryFn: async ({ pageParam = 0 }) => {
        if (!hasAuditAccess()) {
          throw new Error('Insufficient permissions to access audit logs')
        }

        let query = supabaseClient()
        .from('audit_logs_v2')
          .select(`
            *,
            user:users_v2!user_id(id, name, email, department, avatar_url, role)
          `, { count: 'exact' })
          .range(pageParam, pageParam + pageSize - 1)
          .order('created_at', { ascending: false })

        // 필터 적용
        if (filter.userId) query = query.eq('user_id', filter.userId)
        if (filter.action) query = query.eq('action', filter.action)
        if (filter.tableName) query = query.eq('table_name', filter.tableName)
        if (filter.recordId) query = query.eq('record_id', filter.recordId)
        if (filter.ipAddress) query = query.eq('ip_address', filter.ipAddress)
        if (filter.userAgent) query = query.ilike('user_agent', `%${filter.userAgent}%`)
        if (filter.dateFrom) query = query.gte('created_at', filter.dateFrom)
        if (filter.dateTo) query = query.lte('created_at', filter.dateTo)

        const { data, error, count } = await query

        if (error) throw error

        return {
          logs: (data || []) as AuditLogWithRelations[],
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage: any) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      enabled: Boolean(hasAuditAccess()),
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
      initialPageParam: 0
    })
  }

  // 특정 레코드의 감사 트레일 조회 (관리자 전용)
  const useAuditTrail = (tableName: string, recordId: string) => {
    return useQuery({
      queryKey: ['audit-trail-v2', tableName, recordId],
      queryFn: async () => {
        if (!hasAuditAccess()) {
          throw new Error('Insufficient permissions to access audit trail')
        }

        const { data, error } = await supabaseClient()
        .from('audit_logs_v2')
          .select(`
            *,
            user:users_v2!user_id(id, name, email, department, avatar_url, role)
          `)
          .eq('table_name', tableName)
          .eq('record_id', recordId)
          .order('created_at', { ascending: true })

        if (error) throw error

        const logs = (data || []) as AuditLogWithRelations[]

        if (logs.length === 0) {
          return null
        }

        // 요약 정보 계산
        const firstLog = logs[0]
        const lastLog = logs[logs.length - 1]
        const uniqueEditors = new Set(logs.map(log => log.user_id).filter(Boolean)).size

        const summary = {
          created_by: firstLog.user?.name || 'Unknown',
          created_at: firstLog.created_at,
          last_modified_by: lastLog.user?.name || 'Unknown',
          last_modified_at: lastLog.created_at,
          modification_count: logs.length,
          unique_editors: uniqueEditors
        }

        const auditTrail: AuditTrail = {
          record_id: recordId,
          table_name: tableName,
          chronological_logs: logs,
          summary
        }

        return auditTrail
      },
      enabled: Boolean(hasAuditAccess() && tableName && recordId),
      staleTime: 2 * 60 * 1000, // 2분
      gcTime: 10 * 60 * 1000, // 10분
    })
  }

  // 감사 로그 통계 조회 (관리자 전용)
  const useAuditStats = (filter: AuditLogFilter = {}) => {
    return useQuery({
      queryKey: ['audit-stats-v2', filter],
      queryFn: async () => {
        if (!hasAuditAccess()) {
          throw new Error('Insufficient permissions to access audit statistics')
        }

        let query = supabaseClient()
        .from('audit_logs_v2')
          .select(`
            action,
            table_name,
            user_id,
            created_at,
            user:users_v2!user_id(id, name)
          `)

        // 필터 적용
        if (filter.userId) query = query.eq('user_id', filter.userId)
        if (filter.action) query = query.eq('action', filter.action)
        if (filter.tableName) query = query.eq('table_name', filter.tableName)
        if (filter.dateFrom) query = query.gte('created_at', filter.dateFrom)
        if (filter.dateTo) query = query.lte('created_at', filter.dateTo)

        const { data, error } = await query

        if (error) throw error

        const logs = data || []

        const stats: AuditStats = {
          total_logs: logs.length,
          unique_users: new Set(logs.map(log => log.user_id).filter(Boolean)).size,
          unique_actions: new Set(logs.map(log => log.action)).size,
          unique_tables: new Set(logs.map(log => log.table_name)).size,
          date_range: {
            start: logs.length > 0 ? logs[logs.length - 1].created_at : '',
            end: logs.length > 0 ? logs[0].created_at : ''
          },
          by_action: {},
          by_table: {},
          by_user: [],
          by_hour: new Array(24).fill(0),
          by_day_of_week: new Array(7).fill(0)
        }

        // 액션별 통계
        logs.forEach(log => {
          stats.by_action[log.action] = (stats.by_action[log.action] || 0) + 1
        })

        // 테이블별 통계
        logs.forEach(log => {
          stats.by_table[log.table_name] = (stats.by_table[log.table_name] || 0) + 1
        })

        // 사용자별 통계
        const userCounts = new Map<string, { name: string; count: number }>()
        logs.forEach(log => {
          if (log.user_id && log.user) {
            const existing = userCounts.get(log.user_id)
            if (existing) {
              existing.count += 1
            } else {
              userCounts.set(log.user_id, {
                name: log.user.name || 'Unknown',
                count: 1
              })
            }
          }
        })
        
        stats.by_user = Array.from(userCounts.entries())
          .map(([user_id, { name, count }]) => ({ user_id, name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10) // 상위 10명

        // 시간대별 통계
        logs.forEach(log => {
          const hour = new Date(log.created_at).getHours()
          stats.by_hour[hour] += 1
        })

        // 요일별 통계
        logs.forEach(log => {
          const dayOfWeek = new Date(log.created_at).getDay()
          stats.by_day_of_week[dayOfWeek] += 1
        })

        return stats
      },
      enabled: Boolean(hasAuditAccess()),
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
    })
  }

  // 보안 알림 및 의심스러운 활동 감지 (관리자 전용)
  const useSecurityAlerts = (hoursBack = 24) => {
    return useQuery({
      queryKey: ['security-alerts-v2', hoursBack],
      queryFn: async () => {
        if (!hasAuditAccess()) {
          throw new Error('Insufficient permissions to access security alerts')
        }

        const cutoffTime = new Date()
        cutoffTime.setHours(cutoffTime.getHours() - hoursBack)

        const { data, error } = await supabaseClient()
        .from('audit_logs_v2')
          .select(`
            *,
            user:users_v2!user_id(id, name, email, role)
          `)
          .gte('created_at', cutoffTime.toISOString())
          .order('created_at', { ascending: false })

        if (error) throw error

        const logs = (data || []) as AuditLogWithRelations[]
        const alerts: SecurityAlert[] = []

        // 1. 대량 삭제 감지
        const deletionsByUser = new Map<string, string[]>()
        logs.forEach(log => {
          if (log.action.toLowerCase().includes('delete') && log.user_id) {
            const existing = deletionsByUser.get(log.user_id) || []
            existing.push(log.record_id || '')
            deletionsByUser.set(log.user_id, existing)
          }
        })

        deletionsByUser.forEach((records, userId) => {
          if (records.length > 10) { // 임계치: 1시간에 10개 이상 삭제
            const user = logs.find(log => log.user_id === userId)?.user
            alerts.push({
              level: 'high',
              type: 'mass_deletion',
              user_id: userId,
              description: `${user?.name || 'Unknown user'}가 ${hoursBack}시간 내에 ${records.length}개의 레코드를 삭제했습니다.`,
              affected_records: records.filter(Boolean),
              timestamp: new Date().toISOString(),
              recommendations: [
                '삭제된 데이터의 중요도를 확인하세요',
                '사용자의 의도를 확인하세요',
                '필요시 데이터 복구를 고려하세요'
              ]
            })
          }
        })

        // 2. 비정상적인 접근 패턴 감지
        const accessByUser = new Map<string, { count: number; ips: Set<string> }>()
        logs.forEach(log => {
          if (log.user_id && log.ip_address) {
            const existing = accessByUser.get(log.user_id) || { count: 0, ips: new Set() }
            existing.count += 1
            existing.ips.add(log.ip_address as string)
            accessByUser.set(log.user_id, existing)
          }
        })

        accessByUser.forEach((access, userId) => {
          // 여러 IP에서 동시 접근
          if (access.ips.size > 3) {
            const user = logs.find(log => log.user_id === userId)?.user
            alerts.push({
              level: 'medium',
              type: 'unusual_access',
              user_id: userId,
              description: `${user?.name || 'Unknown user'}가 ${access.ips.size}개의 서로 다른 IP 주소에서 접근했습니다.`,
              affected_records: [],
              timestamp: new Date().toISOString(),
              recommendations: [
                '계정 보안을 확인하세요',
                '비인가된 접근인지 확인하세요',
                '필요시 비밀번호 재설정을 요구하세요'
              ]
            })
          }

          // 과도한 활동량
          if (access.count > 100) {
            const user = logs.find(log => log.user_id === userId)?.user
            alerts.push({
              level: 'medium',
              type: 'suspicious_activity',
              user_id: userId,
              description: `${user?.name || 'Unknown user'}가 ${hoursBack}시간 내에 ${access.count}번의 활동을 했습니다.`,
              affected_records: [],
              timestamp: new Date().toISOString(),
              recommendations: [
                '자동화된 스크립트 사용 여부를 확인하세요',
                '사용자의 정상적인 업무 패턴인지 검토하세요'
              ]
            })
          }
        })

        // 3. 권한 상승 감지
        const privilegeChanges = logs.filter(log => 
          log.table_name === 'users_v2' && 
          log.action.toLowerCase().includes('update') &&
          log.new_values &&
          (log.new_values as any).role
        )

        privilegeChanges.forEach(log => {
          const oldRole = (log.old_values as any)?.role
          const newRole = (log.new_values as any)?.role
          
          if (oldRole !== newRole && ['admin', 'leader', 'vice-leader'].includes(newRole)) {
            alerts.push({
              level: 'critical',
              type: 'privilege_escalation',
              user_id: log.user_id || undefined,
              description: `사용자 권한이 ${oldRole}에서 ${newRole}로 변경되었습니다.`,
              affected_records: [log.record_id || ''],
              timestamp: log.created_at,
              recommendations: [
                '권한 변경이 승인된 것인지 확인하세요',
                '권한 변경 로그를 상세히 검토하세요',
                '필요시 권한을 원래대로 복구하세요'
              ]
            })
          }
        })

        // 알림 우선순위별 정렬
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return alerts.sort((a, b) => 
          priorityOrder[b.level] - priorityOrder[a.level] ||
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      },
      enabled: Boolean(hasAuditAccess()),
      staleTime: 1 * 60 * 1000, // 1분 (보안 알림은 빠르게 업데이트)
      gcTime: 2 * 60 * 1000, // 2분
    })
  }

  // 규정 준수 리포트 생성 (관리자 전용)
  const useComplianceReport = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['compliance-report-v2', startDate, endDate],
      queryFn: async () => {
        if (!hasAuditAccess()) {
          throw new Error('Insufficient permissions to generate compliance report')
        }

        const { data, error } = await supabaseClient()
        .from('audit_logs_v2')
          .select(`
            *,
            user:users_v2!user_id(id, name, email, department, role)
          `)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: true })

        if (error) throw error

        const logs = (data || []) as AuditLogWithRelations[]

        const report = {
          period: { start: startDate, end: endDate },
          total_activities: logs.length,
          unique_users: new Set(logs.map(log => log.user_id).filter(Boolean)).size,
          data_integrity: {
            create_operations: logs.filter(log => log.action.toLowerCase().includes('create')).length,
            update_operations: logs.filter(log => log.action.toLowerCase().includes('update')).length,
            delete_operations: logs.filter(log => log.action.toLowerCase().includes('delete')).length,
          },
          access_patterns: {
            by_hour: new Array(24).fill(0),
            by_department: {} as Record<string, number>,
            peak_usage_hour: 0,
            off_hours_activity: 0 // 오전 2시~6시 활동
          },
          security_events: {
            failed_auth_attempts: logs.filter(log => log.action.includes('failed_login')).length,
            privilege_escalations: logs.filter(log => 
              log.table_name === 'users_v2' && 
              log.action.includes('update') &&
              (log.new_values as any)?.role !== (log.old_values as any)?.role
            ).length,
            mass_deletions: [] as { user: string; count: number }[]
          },
          data_retention: {
            oldest_log: logs.length > 0 ? logs[0].created_at : null,
            newest_log: logs.length > 0 ? logs[logs.length - 1].created_at : null,
            retention_compliance: true // 실제로는 정책에 따라 계산
          }
        }

        // 시간대별 활동
        logs.forEach(log => {
          const hour = new Date(log.created_at).getHours()
          report.access_patterns.by_hour[hour] += 1
          
          if (hour >= 2 && hour <= 6) {
            report.access_patterns.off_hours_activity += 1
          }
        })

        // 최대 사용 시간대
        report.access_patterns.peak_usage_hour = report.access_patterns.by_hour
          .indexOf(Math.max(...report.access_patterns.by_hour))

        // 부서별 활동
        logs.forEach(log => {
          if (log.user?.department) {
            report.access_patterns.by_department[log.user.department] = 
              (report.access_patterns.by_department[log.user.department] || 0) + 1
          }
        })

        // 대량 삭제 검사
        const deletionsByUser = new Map<string, number>()
        logs.forEach(log => {
          if (log.action.toLowerCase().includes('delete') && log.user_id) {
            deletionsByUser.set(log.user_id, (deletionsByUser.get(log.user_id) || 0) + 1)
          }
        })

        deletionsByUser.forEach((count, userId) => {
          if (count > 5) { // 임계치
            const user = logs.find(log => log.user_id === userId)?.user
            report.security_events.mass_deletions.push({
              user: user?.name || 'Unknown',
              count
            })
          }
        })

        return report
      },
      enabled: Boolean(hasAuditAccess() && startDate && endDate),
      staleTime: 10 * 60 * 1000, // 10분
      gcTime: 30 * 60 * 1000, // 30분
    })
  }

  return {
    // Query Hooks
    useAuditLogs,
    useAuditTrail,
    useAuditStats,
    useSecurityAlerts,
    useComplianceReport,

    // 권한 체크
    hasAuditAccess,
  }
}

// 감사 로그 액션 분류
export const AUDIT_ACTION_CATEGORIES = {
  CREATE: ['create', 'insert', 'add', 'register', 'signup'],
  READ: ['select', 'view', 'read', 'fetch', 'get'],
  UPDATE: ['update', 'modify', 'edit', 'change', 'patch'],
  DELETE: ['delete', 'remove', 'destroy', 'purge'],
  AUTH: ['login', 'logout', 'signin', 'signout', 'authenticate'],
  ADMIN: ['grant', 'revoke', 'promote', 'demote', 'suspend', 'activate'],
  SYSTEM: ['backup', 'restore', 'migration', 'maintenance', 'config']
} as const

// 보안 알림 레벨 설정
export const SECURITY_ALERT_CONFIG = {
  critical: {
    icon: '🚨',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    label: '심각'
  },
  high: {
    icon: '⚠️',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: '높음'
  },
  medium: {
    icon: '🔸',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: '보통'
  },
  low: {
    icon: 'ℹ️',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: '낮음'
  }
} as const