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
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 })
    }

    // Auth에서 사용자 삭제 (Service Role 권한으로)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError && !authError.message?.includes('User not found')) {
      console.error('Auth deletion error:', authError)
      return NextResponse.json({ 
        error: `Auth 사용자 삭제 실패: ${authError.message}`,
        details: authError
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Auth 사용자 삭제 완료'
    })
  } catch (error) {
    console.error('Delete auth user error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Auth 사용자 삭제 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}