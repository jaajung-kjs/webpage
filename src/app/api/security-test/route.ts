// 보안 테스트 API 엔드포인트
import { NextRequest, NextResponse } from 'next/server'
import { runSecurityTests } from '@/lib/security-test'

export async function GET(request: NextRequest) {
  try {
    console.log('🔒 Starting KEPCO AI Community Security Tests...')
    
    const results = await runSecurityTests()
    
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      warnings: results.filter(r => r.status === 'WARNING').length,
      errors: results.filter(r => r.status === 'ERROR').length
    }
    
    const criticalIssues = results.filter(r => r.severity === 'CRITICAL' && (r.status === 'FAIL' || r.status === 'ERROR'))
    const highIssues = results.filter(r => r.severity === 'HIGH' && (r.status === 'FAIL' || r.status === 'ERROR'))
    
    // 보안 점수 계산
    const maxScore = summary.total * 10
    const deductions = (summary.failed + summary.errors) * 10 + summary.warnings * 2.5
    const securityScore = Math.max(0, Math.round(((maxScore - deductions) / maxScore) * 100))
    
    const isSecure = criticalIssues.length === 0 && highIssues.length === 0
    
    return NextResponse.json({
      success: isSecure,
      securityScore: `${securityScore}%`,
      summary,
      criticalIssues: criticalIssues.length,
      highIssues: highIssues.length,
      results,
      message: isSecure 
        ? `🔒 Security tests passed! Score: ${securityScore}%`
        : `⚠️ Security issues found. Critical: ${criticalIssues.length}, High: ${highIssues.length}`
    })
    
  } catch (error: any) {
    console.error('❌ Security test execution failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Security test execution failed'
    }, { status: 500 })
  }
}