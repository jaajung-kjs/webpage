import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // 이메일 인증 성공 시 메인 페이지로 리다이렉트 (도메인 포함)
      const redirectUrl = new URL('/', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 에러 발생 시 메인 페이지로 리다이렉트
  const redirectUrl = new URL('/', request.url)
  redirectUrl.searchParams.set('error', 'Unable to verify email')
  return NextResponse.redirect(redirectUrl)
}