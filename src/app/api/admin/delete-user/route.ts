import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service Role Client (관리자 권한)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {

    // 요청 본문에서 userId 가져오기
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 })
    }

    console.log('Deleting user:', userId)

    // 1. Public 테이블에서 사용자 관련 데이터 삭제 (CASCADE로 자동 삭제되지 않는 것들)
    // Note: Foreign Key가 ON DELETE CASCADE로 설정되어 있으면 자동 삭제됨
    
    // 2. users 테이블에서 사용자 삭제
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
    
    if (dbError) {
      console.error('Database deletion error:', dbError)
      // users 테이블 삭제 실패해도 Auth는 시도
    }

    // 3. Auth에서 사용자 삭제
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error('Auth deletion error:', authError)
      return NextResponse.json({ 
        error: `Auth 사용자 삭제 실패: ${authError.message}`,
        details: authError
      }, { status: 400 })
    }

    console.log('User deleted successfully:', userId)
    
    return NextResponse.json({ 
      success: true,
      message: '사용자가 완전히 삭제되었습니다.'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '사용자 삭제 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}