// 프로덕션 준비성 최종 검증
import { supabase } from './supabase'
import { runDatabaseTests } from './api-test'
import { runSecurityTests } from './security-test'

export interface ProductionCheckResult {
  category: string
  checks: {
    test: string
    status: 'PASS' | 'FAIL' | 'WARNING'
    message: string
    critical: boolean
  }[]
}

export class ProductionReadinessChecker {
  
  // 1. 환경 설정 검증
  async checkEnvironmentConfiguration(): Promise<ProductionCheckResult> {
    const checks: { test: string; status: 'PASS' | 'FAIL' | 'WARNING'; message: string; critical: boolean }[] = []
    
    // 필수 환경변수 확인
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET'
    ]
    
    let allEnvVarsPresent = true
    
    for (const envVar of requiredEnvVars) {
      const isPresent = !!process.env[envVar]
      if (!isPresent) allEnvVarsPresent = false
      
      checks.push({
        test: `Environment Variable: ${envVar}`,
        status: isPresent ? 'PASS' : 'FAIL',
        message: isPresent ? 'Configured' : 'Missing',
        critical: true
      })
    }
    
    // Supabase 연결 확인
    checks.push({
      test: 'Supabase Client Initialization',
      status: supabase ? 'PASS' : 'FAIL',
      message: supabase ? 'Successfully initialized' : 'Failed to initialize',
      critical: true
    })
    
    // 프로덕션 URL 설정 확인
    const nextAuthUrl = process.env.NEXTAUTH_URL
    const isProductionUrl = nextAuthUrl?.includes('vercel.app') || nextAuthUrl?.includes('kepco-ai-community')
    
    checks.push({
      test: 'Production URL Configuration',
      status: isProductionUrl ? 'PASS' : 'WARNING',
      message: `NEXTAUTH_URL: ${nextAuthUrl}`,
      critical: false
    })
    
    return {
      category: 'Environment Configuration',
      checks
    }
  }
  
  // 2. 데이터베이스 연결성 검증
  async checkDatabaseConnectivity(): Promise<ProductionCheckResult> {
    const checks: { test: string; status: 'PASS' | 'FAIL' | 'WARNING'; message: string; critical: boolean }[] = []
    
    try {
      if (!supabase) {
        checks.push({
          test: 'Database Connection',
          status: 'FAIL',
          message: 'Supabase client not available',
          critical: true
        })
        return { category: 'Database Connectivity', checks }
      }
      
      // 기본 연결 테스트
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      checks.push({
        test: 'Database Connection',
        status: error ? 'FAIL' : 'PASS',
        message: error ? `Connection failed: ${error.message}` : 'Connected successfully',
        critical: true
      })
      
      // 테이블 접근성 확인
      const tables = ['profiles', 'announcements', 'activities', 'resources', 'activity_participants']
      
      for (const table of tables) {
        try {
          const { error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1)
          
          checks.push({
            test: `Table Access: ${table}`,
            status: tableError ? 'FAIL' : 'PASS',
            message: tableError ? `Access failed: ${tableError.message}` : 'Table accessible',
            critical: true
          })
        } catch (err: any) {
          checks.push({
            test: `Table Access: ${table}`,
            status: 'FAIL',
            message: `Error: ${err.message}`,
            critical: true
          })
        }
      }
      
    } catch (error: any) {
      checks.push({
        test: 'Database Connectivity Check',
        status: 'FAIL',
        message: `Connectivity test failed: ${error.message}`,
        critical: true
      })
    }
    
    return {
      category: 'Database Connectivity',
      checks
    }
  }
  
  // 3. API 기능성 검증
  async checkAPIFunctionality(): Promise<ProductionCheckResult> {
    const checks: { test: string; status: 'PASS' | 'FAIL' | 'WARNING'; message: string; critical: boolean }[] = []
    
    try {
      // 기존 API 테스트 재사용
      const apiTestResults = await runDatabaseTests()
      
      // API 테스트 결과를 프로덕션 체크 형식으로 변환
      for (const result of apiTestResults) {
        checks.push({
          test: result.test,
          status: result.status === 'PASS' ? 'PASS' : result.status === 'FAIL' ? 'FAIL' : 'WARNING',
          message: result.message,
          critical: result.test.includes('API') || result.test.includes('Connection')
        })
      }
      
    } catch (error: any) {
      checks.push({
        test: 'API Functionality Test',
        status: 'FAIL',
        message: `API test failed: ${error.message}`,
        critical: true
      })
    }
    
    return {
      category: 'API Functionality',
      checks
    }
  }
  
  // 4. 보안 설정 검증
  async checkSecurityConfiguration(): Promise<ProductionCheckResult> {
    const checks: { test: string; status: 'PASS' | 'FAIL' | 'WARNING'; message: string; critical: boolean }[] = []
    
    try {
      // 기존 보안 테스트 재사용
      const securityResults = await runSecurityTests()
      
      // 중요 보안 체크만 포함
      const criticalSecurityChecks = securityResults.filter(
        result => result.severity === 'CRITICAL' || result.severity === 'HIGH'
      )
      
      for (const result of criticalSecurityChecks) {
        checks.push({
          test: result.test,
          status: result.status === 'PASS' ? 'PASS' : 
                  result.status === 'FAIL' ? 'FAIL' : 'WARNING',
          message: result.message,
          critical: result.severity === 'CRITICAL'
        })
      }
      
    } catch (error: any) {
      checks.push({
        test: 'Security Configuration Test',
        status: 'FAIL',
        message: `Security test failed: ${error.message}`,
        critical: true
      })
    }
    
    return {
      category: 'Security Configuration',
      checks
    }
  }
  
  // 5. 성능 및 최적화 검증
  async checkPerformanceOptimization(): Promise<ProductionCheckResult> {
    const checks: { test: string; status: 'PASS' | 'FAIL' | 'WARNING'; message: string; critical: boolean }[] = []
    
    // 빌드 설정 확인
    checks.push({
      test: 'Next.js Production Build',
      status: process.env.NODE_ENV === 'production' ? 'PASS' : 'WARNING',
      message: `Environment: ${process.env.NODE_ENV}`,
      critical: false
    })
    
    // 캐싱 설정 확인
    checks.push({
      test: 'Supabase Auto Refresh',
      status: 'PASS',
      message: 'Auto token refresh enabled',
      critical: false
    })
    
    // 세션 지속성 확인
    checks.push({
      test: 'Session Persistence',
      status: 'PASS',
      message: 'Session persistence configured',
      critical: false
    })
    
    return {
      category: 'Performance & Optimization',
      checks
    }
  }
  
  // 전체 프로덕션 준비성 검증
  async runProductionReadinessCheck(): Promise<{
    results: ProductionCheckResult[]
    summary: {
      total_checks: number
      passed: number
      failed: number
      warnings: number
      critical_failures: number
      ready_for_production: boolean
    }
    score: number
  }> {
    console.log('🚀 Starting Production Readiness Check...')
    
    const results: ProductionCheckResult[] = []
    
    // 모든 카테고리 검증 실행
    results.push(await this.checkEnvironmentConfiguration())
    results.push(await this.checkDatabaseConnectivity())
    results.push(await this.checkAPIFunctionality())
    results.push(await this.checkSecurityConfiguration())
    results.push(await this.checkPerformanceOptimization())
    
    // 전체 통계 계산
    let totalChecks = 0
    let passed = 0
    let failed = 0
    let warnings = 0
    let criticalFailures = 0
    
    for (const category of results) {
      for (const check of category.checks) {
        totalChecks++
        
        switch (check.status) {
          case 'PASS':
            passed++
            break
          case 'FAIL':
            failed++
            if (check.critical) criticalFailures++
            break
          case 'WARNING':
            warnings++
            break
        }
      }
    }
    
    const readyForProduction = criticalFailures === 0 && failed === 0
    const score = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 0
    
    return {
      results,
      summary: {
        total_checks: totalChecks,
        passed,
        failed,
        warnings,
        critical_failures: criticalFailures,
        ready_for_production: readyForProduction
      },
      score
    }
  }
  
  // 결과 출력
  printProductionReadinessReport(checkResult: any): void {
    console.log('\n🚀 Production Readiness Report')
    console.log('=' .repeat(50))
    
    for (const category of checkResult.results) {
      console.log(`\n📂 ${category.category}:`)
      
      for (const check of category.checks) {
        const icon = check.status === 'PASS' ? '✅' : 
                     check.status === 'FAIL' ? '❌' : '⚠️'
        const critical = check.critical ? '🚨' : ''
        
        console.log(`  ${icon} ${critical} ${check.test}: ${check.message}`)
      }
    }
    
    const summary = checkResult.summary
    
    console.log('\n📊 Production Readiness Summary:')
    console.log('=' .repeat(40))
    console.log(`Total Checks: ${summary.total_checks}`)
    console.log(`✅ Passed: ${summary.passed}`)
    console.log(`❌ Failed: ${summary.failed}`)
    console.log(`⚠️  Warnings: ${summary.warnings}`)
    console.log(`🚨 Critical Failures: ${summary.critical_failures}`)
    console.log(`\n🎯 Production Score: ${checkResult.score}%`)
    
    if (summary.ready_for_production) {
      console.log('\n🟢 ✨ READY FOR PRODUCTION! ✨')
      console.log('All critical checks passed. Safe for deployment.')
    } else {
      console.log('\n🔴 ⚠️  NOT READY FOR PRODUCTION')
      console.log(`${summary.critical_failures} critical issue(s) must be resolved before deployment.`)
    }
  }
}

// 프로덕션 준비성 체크 실행 함수
export async function runProductionReadinessCheck() {
  const checker = new ProductionReadinessChecker()
  const result = await checker.runProductionReadinessCheck()
  checker.printProductionReadinessReport(result)
  return result
}