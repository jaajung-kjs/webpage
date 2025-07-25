// API 테스트 엔드포인트
import { NextRequest, NextResponse } from 'next/server'
import { runDatabaseTests } from '@/lib/api-test'

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting KEPCO AI Community Database API Tests...')
    
    const results = await runDatabaseTests()
    
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      errors: results.filter(r => r.status === 'ERROR').length
    }
    
    const successRate = ((summary.passed / summary.total) * 100).toFixed(1)
    
    return NextResponse.json({
      success: summary.failed === 0 && summary.errors === 0,
      summary,
      successRate: `${successRate}%`,
      results,
      message: summary.failed === 0 && summary.errors === 0 
        ? '🎉 All tests passed! Database integration is working correctly.'
        : '⚠️ Some tests failed. Check the results for details.'
    })
    
  } catch (error: any) {
    console.error('❌ Test execution failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Test execution failed'
    }, { status: 500 })
  }
}