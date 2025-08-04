import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    // 환경 변수 체크
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing',
      NODE_ENV: process.env.NODE_ENV,
    }

    // Supabase 연결 테스트
    let dbConnectionStatus = '❌ Failed'
    let dbError = null
    let tableCount = 0

    try {
      // 간단한 쿼리로 연결 테스트
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (error) {
        dbError = error.message
      } else {
        dbConnectionStatus = '✅ Connected'
        
        // 테이블 목록 가져오기 (추가 테스트)
        const { data: tables } = await supabase
          .from('posts')
          .select('id')
          .limit(1)
        
        if (tables !== null) {
          tableCount++
        }
      }
    } catch (e) {
      dbError = e instanceof Error ? e.message : 'Unknown error'
    }

    // URL 파싱 테스트
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const urlParts = supabaseUrl.split('.')
    const projectId = urlParts[0]?.replace('https://', '') || 'Unknown'

    return NextResponse.json({
      status: 'Environment Variable Check',
      timestamp: new Date().toISOString(),
      environment: {
        ...envCheck,
        supabaseProjectId: projectId,
      },
      database: {
        connectionStatus: dbConnectionStatus,
        error: dbError,
        testQuery: tableCount > 0 ? '✅ Queries working' : '❌ Queries failing',
      },
      deployment: {
        platform: process.env.VERCEL ? 'Vercel' : 'Local',
        region: process.env.VERCEL_REGION || 'Unknown',
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Test endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}