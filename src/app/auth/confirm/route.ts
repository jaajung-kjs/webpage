import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Supabase가 자동으로 처리하므로 메인 페이지로 리다이렉트
  const redirectUrl = new URL('/', request.url)
  
  // 에러가 있으면 쿼리 파라미터에 추가
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  
  if (error) {
    redirectUrl.searchParams.set('error', error)
    if (error_description) {
      redirectUrl.searchParams.set('error_description', error_description)
    }
  }
  
  return NextResponse.redirect(redirectUrl)
}