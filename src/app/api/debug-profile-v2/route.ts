import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 디버깅용 API Route - Profile V2 문제 파악
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 게시글이 있는 사용자 찾기
    const { data: activeUser } = await supabase
      .from('content')
      .select('author_id')
      .not('author_id', 'is', null)
      .limit(1)
      .single()
    
    const testUserId = activeUser?.author_id || '02b51f7a-c2a4-413f-a2f6-4b408c2561b0'

    // 1. content 테이블의 type 필드 값 분포
    const { data: typeDistribution } = await supabase
      .from('content')
      .select('type')
      .limit(100)

    // type 값들의 고유값 추출
    const uniqueTypes = [...new Set(typeDistribution?.map(item => item.type) || [])]

    // 2. 테스트 사용자의 실제 게시글 확인
    const { data: userContent, error: contentError } = await supabase
      .from('content')
      .select('id, type, status, title, created_at')
      .eq('author_id', testUserId)
      .order('created_at', { ascending: false })

    // 3. 테스트 사용자의 metadata 확인
    const { data: userData } = await supabase
      .from('users')
      .select('id, name, metadata')
      .eq('id', testUserId)
      .single()

    // 4. Materialized View 데이터 직접 조회 (public 스키마 시도)
    const { data: mvData, error: mvError } = await supabase
      .from('user_complete_stats')
      .select('*')
      .eq('user_id', testUserId)
      .single()

    // 5. V1 통계 함수 호출
    const { data: v1Stats } = await supabase
      .rpc('get_user_with_stats', { target_user_id: testUserId })

    // 통계 계산
    const stats = {
      byType: userContent?.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byStatus: userContent?.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      total: userContent?.length || 0
    }

    return NextResponse.json({
      success: true,
      debug: {
        uniqueContentTypes: uniqueTypes,
        testUserId,
        userContent: {
          total: userContent?.length || 0,
          items: userContent?.slice(0, 5), // 첫 5개만
          stats
        },
        userData: {
          id: userData?.id,
          name: userData?.name,
          metadata: userData?.metadata,
          metadataKeys: userData?.metadata ? Object.keys(userData.metadata) : []
        },
        materializedView: mvData || mvError?.message || 'No data',
        v1Stats: v1Stats?.[0] || 'No data',
        comparison: {
          v1_posts_count: v1Stats?.[0]?.posts_count || 0,
          v2_posts_count: mvData?.posts_count || 0,
          actual_content_count: userContent?.length || 0
        }
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 })
  }
}