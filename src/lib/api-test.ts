// API 연동 및 권한 검증 테스트
import { supabase } from './supabase'
import { 
  membersApi, 
  announcementsApi, 
  activitiesApi, 
  resourcesApi 
} from './api'
import { 
  canManageMembers, 
  canCreateAnnouncements, 
  getRoleLevel 
} from './permissions'

export interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'ERROR'
  message: string
  details?: any
}

export class APITester {
  private results: TestResult[] = []

  // 기본 연결 테스트
  async testSupabaseConnection(): Promise<TestResult> {
    try {
      if (!supabase) {
        return {
          test: 'Supabase Connection',
          status: 'FAIL',
          message: 'Supabase client not initialized'
        }
      }

      // 간단한 쿼리로 연결 테스트
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      if (error) {
        return {
          test: 'Supabase Connection',
          status: 'FAIL',
          message: error.message,
          details: error
        }
      }

      return {
        test: 'Supabase Connection',
        status: 'PASS',
        message: 'Successfully connected to Supabase'
      }
    } catch (error: any) {
      return {
        test: 'Supabase Connection',
        status: 'ERROR',
        message: error.message,
        details: error
      }
    }
  }

  // 권한 시스템 테스트
  async testPermissionSystem(): Promise<TestResult[]> {
    const results: TestResult[] = []

    try {
      // 모의 사용자 데이터 (AuthUser 타입에 맞게)
      const mockMember = { 
        id: '1', 
        email: 'member@test.com', 
        emailConfirmed: true, 
        profile: { id: '1', email: 'member@test.com', name: 'Member', department: '부서', role: 'member' as const, expertise_areas: [], created_at: '', updated_at: '', last_active: '' }
      }
      const mockAdmin = { 
        id: '2', 
        email: 'admin@test.com', 
        emailConfirmed: true, 
        profile: { id: '2', email: 'admin@test.com', name: 'Admin', department: '부서', role: 'admin' as const, expertise_areas: [], created_at: '', updated_at: '', last_active: '' }
      }
      const mockViceLeader = { 
        id: '3', 
        email: 'vice@test.com', 
        emailConfirmed: true, 
        profile: { id: '3', email: 'vice@test.com', name: 'Vice Leader', department: '부서', role: 'vice-leader' as const, expertise_areas: [], created_at: '', updated_at: '', last_active: '' }
      }
      const mockLeader = { 
        id: '4', 
        email: 'leader@test.com', 
        emailConfirmed: true, 
        profile: { id: '4', email: 'leader@test.com', name: 'Leader', department: '부서', role: 'leader' as const, expertise_areas: [], created_at: '', updated_at: '', last_active: '' }
      }

      // 역할 수준 테스트
      results.push({
        test: 'Role Level Hierarchy',
        status: getRoleLevel(mockMember) === 1 &&
                getRoleLevel(mockAdmin) === 2 &&
                getRoleLevel(mockViceLeader) === 3 &&
                getRoleLevel(mockLeader) === 4 ? 'PASS' : 'FAIL',
        message: 'Role hierarchy levels working correctly'
      })

      // 관리자 권한 테스트
      const memberCanManage = canManageMembers(mockMember)
      const adminCanManage = canManageMembers(mockAdmin)
      
      results.push({
        test: 'Member Management Permissions',
        status: !memberCanManage && adminCanManage ? 'PASS' : 'FAIL',
        message: `Member: ${memberCanManage}, Admin: ${adminCanManage}`
      })

      // 공지사항 작성 권한 테스트
      const memberCanAnnounce = canCreateAnnouncements(mockMember)
      const adminCanAnnounce = canCreateAnnouncements(mockAdmin)
      
      results.push({
        test: 'Announcement Creation Permissions',
        status: !memberCanAnnounce && adminCanAnnounce ? 'PASS' : 'FAIL',
        message: `Member: ${memberCanAnnounce}, Admin: ${adminCanAnnounce}`
      })

    } catch (error: any) {
      results.push({
        test: 'Permission System',
        status: 'ERROR',
        message: error.message,
        details: error
      })
    }

    return results
  }

  // API 기능 테스트
  async testAPIFunctionality(): Promise<TestResult[]> {
    const results: TestResult[] = []

    try {
      // Members API 테스트
      const membersResult = await membersApi.getAll({ limit: 1 })
      results.push({
        test: 'Members API - getAll',
        status: membersResult.error ? 'FAIL' : 'PASS',
        message: membersResult.error?.message || 'Successfully fetched members',
        details: membersResult.error
      })

      // Announcements API 테스트
      const announcementsResult = await announcementsApi.getAll({ limit: 1 })
      results.push({
        test: 'Announcements API - getAll',
        status: announcementsResult.error ? 'FAIL' : 'PASS',
        message: announcementsResult.error?.message || 'Successfully fetched announcements',
        details: announcementsResult.error
      })

      // Activities API 테스트
      const activitiesResult = await activitiesApi.getAll({ limit: 1 })
      results.push({
        test: 'Activities API - getAll',
        status: activitiesResult.error ? 'FAIL' : 'PASS',
        message: activitiesResult.error?.message || 'Successfully fetched activities',
        details: activitiesResult.error
      })

      // Resources API 테스트
      const resourcesResult = await resourcesApi.getAll({ limit: 1 })
      results.push({
        test: 'Resources API - getAll',
        status: resourcesResult.error ? 'FAIL' : 'PASS',
        message: resourcesResult.error?.message || 'Successfully fetched resources',
        details: resourcesResult.error
      })

    } catch (error: any) {
      results.push({
        test: 'API Functionality',
        status: 'ERROR',
        message: error.message,
        details: error
      })
    }

    return results
  }

  // 데이터베이스 스키마 검증
  async testDatabaseSchema(): Promise<TestResult[]> {
    const results: TestResult[] = []

    if (!supabase) {
      results.push({
        test: 'Database Schema',
        status: 'FAIL',
        message: 'Supabase client not available'
      })
      return results
    }

    const requiredTables = [
      'profiles',
      'announcements', 
      'activities',
      'resources',
      'activity_participants'
    ]

    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        results.push({
          test: `Table: ${table}`,
          status: error ? 'FAIL' : 'PASS',
          message: error?.message || `Table ${table} accessible`,
          details: error
        })
      } catch (error: any) {
        results.push({
          test: `Table: ${table}`,
          status: 'ERROR',
          message: error.message,
          details: error
        })
      }
    }

    return results
  }

  // 전체 테스트 실행
  async runAllTests(): Promise<TestResult[]> {
    const allResults: TestResult[] = []

    console.log('🔍 Starting API and Database Tests...')

    // 1. Supabase 연결 테스트
    const connectionResult = await this.testSupabaseConnection()
    allResults.push(connectionResult)

    if (connectionResult.status === 'PASS') {
      // 2. 데이터베이스 스키마 테스트
      const schemaResults = await this.testDatabaseSchema()
      allResults.push(...schemaResults)

      // 3. API 기능 테스트
      const apiResults = await this.testAPIFunctionality()
      allResults.push(...apiResults)
    }

    // 4. 권한 시스템 테스트 (Supabase 연결과 무관)
    const permissionResults = await this.testPermissionSystem()
    allResults.push(...permissionResults)

    this.results = allResults
    return allResults
  }

  // 테스트 결과 요약
  getTestSummary(): { passed: number; failed: number; errors: number; total: number } {
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const errors = this.results.filter(r => r.status === 'ERROR').length
    
    return {
      passed,
      failed,
      errors,
      total: this.results.length
    }
  }

  // 결과 출력
  printResults(): void {
    console.log('\n📋 Test Results:')
    console.log('================')
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : 
                   result.status === 'FAIL' ? '❌' : '⚠️'
      console.log(`${icon} ${result.test}: ${result.message}`)
      
      if (result.details && result.status !== 'PASS') {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
      }
    })

    const summary = this.getTestSummary()
    console.log('\n📊 Summary:')
    console.log(`   Total: ${summary.total}`)
    console.log(`   ✅ Passed: ${summary.passed}`)
    console.log(`   ❌ Failed: ${summary.failed}`)
    console.log(`   ⚠️  Errors: ${summary.errors}`)
    console.log(`   Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`)
  }
}

// 테스트 실행 함수
export async function runDatabaseTests(): Promise<TestResult[]> {
  const tester = new APITester()
  const results = await tester.runAllTests()
  tester.printResults()
  return results
}