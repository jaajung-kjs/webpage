// 프로덕션 준비성 검증 API 엔드포인트
import { NextRequest, NextResponse } from 'next/server'
import { runProductionReadinessCheck } from '@/lib/production-readiness'

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting KEPCO AI Community Production Readiness Check...')
    
    const result = await runProductionReadinessCheck()
    
    return NextResponse.json({
      success: result.summary.ready_for_production,
      productionReady: result.summary.ready_for_production,
      score: `${result.score}%`,
      summary: result.summary,
      results: result.results,
      message: result.summary.ready_for_production 
        ? `✨ READY FOR PRODUCTION! Score: ${result.score}%`
        : `⚠️ Production issues found. ${result.summary.critical_failures} critical failures.`
    })
    
  } catch (error: any) {
    console.error('❌ Production readiness check failed:', error)
    
    return NextResponse.json({
      success: false,
      productionReady: false,
      error: error.message,
      message: 'Production readiness check failed'
    }, { status: 500 })
  }
}