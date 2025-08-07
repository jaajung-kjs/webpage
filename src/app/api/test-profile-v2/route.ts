import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 테스트용 API Route - Profile V2 시스템 검증
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 테스트용 사용자 ID (첫 번째 사용자 가져오기)
    const { data: firstUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()

    if (!firstUser) {
      return NextResponse.json({ 
        error: 'No users found',
        success: false 
      })
    }

    const testUserId = firstUser.id

    // V2 시스템 테스트 - public 스키마의 wrapper 함수 호출
    console.time('V2 Query')
    const { data: v2Data, error: v2Error } = await supabase
      .rpc('get_user_profile_complete_v2', {
        target_user_id: testUserId,
        include_activities: true,
        activities_limit: 10
      })
    console.timeEnd('V2 Query')

    // V1 시스템 테스트 - 기존 방식
    console.time('V1 Queries')
    
    // 1. 기본 프로필
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single()

    // 2. 통계 데이터
    const { data: stats } = await supabase
      .rpc('get_user_with_stats', { target_user_id: testUserId })

    // 3. 활동 로그
    const { data: activities } = await supabase
      .rpc('get_user_activity_logs', { 
        target_user_id: testUserId,
        limit_count: 10 
      })

    console.timeEnd('V1 Queries')

    // 결과 비교
    const comparison = {
      success: true,
      testUserId,
      v2: {
        data: v2Data,
        error: v2Error,
        hasData: !!v2Data,
        profile: v2Data?.profile ? 'Found' : 'Missing',
        stats: v2Data?.stats ? 'Found' : 'Missing',
        activities: v2Data?.recent_activities ? `${v2Data.recent_activities.length} items` : 'Missing'
      },
      v1: {
        profile: profile ? 'Found' : 'Missing',
        stats: stats ? `${stats.length} records` : 'Missing',
        activities: activities ? `${activities.length} items` : 'Missing'
      },
      dataConsistency: {
        name: v2Data?.profile?.name === profile?.name,
        email: v2Data?.profile?.email === profile?.email,
        statsMatch: v2Data?.stats?.posts_count === stats?.[0]?.posts_count
      }
    }

    return NextResponse.json(comparison)

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 })
  }
}