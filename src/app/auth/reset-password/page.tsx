/**
 * Password Reset Page
 * 
 * 이메일 링크를 통해 접근하는 비밀번호 재설정 페이지
 * URL 쿼리 파라미터에서 토큰을 받아 새 비밀번호 설정 처리
 */

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseClient } from '@/lib/core/connection-core'
import { NewPasswordModal } from '@/components/auth/NewPasswordModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

type ResetState = 'loading' | 'valid' | 'invalid' | 'expired' | 'completed'

function PasswordResetContent() {
  const [resetState, setResetState] = useState<ResetState>('loading')
  const [showNewPasswordModal, setShowNewPasswordModal] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // 전체 URL 로깅 (디버깅용)
        console.log('Full URL:', window.location.href)
        console.log('Hash:', window.location.hash)
        console.log('Search:', window.location.search)
        
        // 먼저 현재 세션 확인 - 이미 /auth/callback에서 인증되었을 수 있음
        const { data: currentSession, error: sessionCheckError } = await supabaseClient().auth.getSession()
        
        if (!sessionCheckError && currentSession.session) {
          console.log('✅ Already authenticated session found, showing password change modal')
          setResetState('valid')
          setShowNewPasswordModal(true)
          return
        }
        
        // URL 파라미터 확인 (query parameters와 hash fragments 모두 확인)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        
        // 비밀번호 재설정의 두 가지 방식:
        // 1. 기존 방식: access_token, refresh_token, type 사용
        // 2. 새로운 방식: code 파라미터 사용
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token')
        const type = hashParams.get('type') || searchParams.get('type')
        const error = hashParams.get('error') || searchParams.get('error')
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')
        
        // Supabase 새로운 방식: code parameter 또는 PKCE token 사용
        const code = hashParams.get('code') || searchParams.get('code')
        const token = hashParams.get('token') || searchParams.get('token')

        console.log('Password reset parameters:', { 
          accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : null,
          refreshToken: refreshToken ? `${refreshToken.substring(0, 10)}...` : null,
          code: code ? `${code.substring(0, 10)}...` : null,
          token: token ? `${token.substring(0, 10)}...` : null,
          type,
          error,
          errorDescription
        })

        // 에러가 있는 경우 처리
        if (error) {
          console.error('URL contains error:', error, errorDescription)
          if (error === 'access_denied') {
            setResetState('invalid')
          } else {
            setResetState('expired')
          }
          return
        }

        // PKCE 방식: token 파라미터가 있는 경우 처리 (우선순위 높음)
        if (token && type === 'recovery') {
          console.log('Using PKCE token-based password reset flow')
          try {
            // 🔒 보안: 기존 세션이 있다면 먼저 로그아웃
            const { data: existingSession } = await supabaseClient().auth.getSession()
            if (existingSession.session) {
              console.log('Clearing existing session for security')
              await supabaseClient().auth.signOut()
            }
            
            // PKCE token으로 세션 교환 시도
            const { data, error: tokenError } = await supabaseClient().auth.verifyOtp({
              token_hash: token,
              type: 'recovery'
            })
            
            if (tokenError) {
              console.error('PKCE token verification error:', tokenError)
              if (tokenError.message.includes('expired') || tokenError.message.includes('invalid')) {
                setResetState('expired')
              } else {
                setResetState('invalid')
              }
              // 🔒 보안: 에러 시 세션 완전히 제거
              await supabaseClient().auth.signOut()
              return
            }
            
            console.log('🔍 PKCE token verification result:', {
              hasSession: !!data.session,
              hasUser: !!data.user,
              sessionId: data.session?.access_token?.substring(0, 10) + '...',
              userId: data.user?.id,
              userEmail: data.user?.email
            })
            
            if (data.session && data.user) {
              console.log('✅ PKCE token verification successful, session established for password reset ONLY')
              setResetState('valid')
              setShowNewPasswordModal(true)
              return
            } else {
              console.error('❌ PKCE token verification returned no session or user:', {
                session: data.session,
                user: data.user
              })
              setResetState('invalid')
              // 🔒 보안: 실패 시 세션 완전히 제거
              await supabaseClient().auth.signOut()
              return
            }
          } catch (tokenError) {
            console.error('PKCE token processing error:', tokenError)
            setResetState('invalid')
            // 🔒 보안: 예외 발생 시 세션 완전히 제거
            await supabaseClient().auth.signOut()
            return
          }
        }

        // 새로운 방식: code 파라미터가 있는 경우 처리
        if (code) {
          console.log('Using new code-based password reset flow')
          try {
            // 🔒 보안: 기존 세션이 있다면 먼저 로그아웃
            const { data: existingSession } = await supabaseClient().auth.getSession()
            if (existingSession.session) {
              console.log('Clearing existing session for security')
              await supabaseClient().auth.signOut()
            }
            
            // exchangeCodeForSession을 사용하여 code를 세션으로 교환
            const { data, error: exchangeError } = await supabaseClient().auth.exchangeCodeForSession(code)
            
            if (exchangeError) {
              console.error('Code exchange error:', exchangeError)
              if (exchangeError.message.includes('expired')) {
                setResetState('expired')
              } else {
                setResetState('invalid')
              }
              // 🔒 보안: 에러 시 세션 완전히 제거
              await supabaseClient().auth.signOut()
              return
            }
            
            console.log('🔍 Code exchange result:', {
              hasSession: !!data.session,
              hasUser: !!data.user,
              sessionId: data.session?.access_token?.substring(0, 10) + '...',
              userId: data.user?.id,
              userEmail: data.user?.email
            })
            
            if (data.session && data.user) {
              console.log('✅ Code exchange successful, session established for password reset ONLY')
              setResetState('valid')
              setShowNewPasswordModal(true)
              return
            } else {
              console.error('❌ Code exchange returned no session or user:', {
                session: data.session,
                user: data.user
              })
              setResetState('invalid')
              // 🔒 보안: 실패 시 세션 완전히 제거
              await supabaseClient().auth.signOut()
              return
            }
          } catch (codeError) {
            console.error('Code processing error:', codeError)
            setResetState('invalid')
            // 🔒 보안: 예외 발생 시 세션 완전히 제거
            await supabaseClient().auth.signOut()
            return
          }
        }

        // Supabase는 hash fragment로 토큰을 전달함
        // #access_token=...&refresh_token=...&type=recovery 형태
        if (!accessToken && !refreshToken && !type && !error && !code && !token) {
          console.log('No parameters found - checking if waiting for hash fragment')
          // hash fragment가 로드되기를 기다림
          setTimeout(() => {
            const retryHashParams = new URLSearchParams(window.location.hash.substring(1))
            const retryAccessToken = retryHashParams.get('access_token')
            const retryType = retryHashParams.get('type')
            
            if (!retryAccessToken || retryType !== 'recovery') {
              console.log('Still no valid parameters after retry')
              setResetState('invalid')
            }
          }, 100)
          return
        }

        // 기존 방식: access_token과 refresh_token 사용
        if (type !== 'recovery' && !code && !token) {
          console.warn('Invalid type parameter:', type)
          setResetState('invalid')
          return
        }

        if (!accessToken || !refreshToken) {
          if (!code && !token) {
            console.warn('Missing tokens and no code/token:', { 
              accessToken: !!accessToken, 
              refreshToken: !!refreshToken, 
              code: !!code,
              token: !!token
            })
            setResetState('invalid')
            return
          }
        }

        // 기존 방식: Supabase 세션 설정 (code나 token이 없을 때만 실행)
        if (!code && !token && accessToken && refreshToken) {
          const { data, error: sessionError } = await supabaseClient().auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            if (sessionError.message.includes('expired') || sessionError.message.includes('invalid')) {
              setResetState('expired')
            } else {
              setResetState('invalid')
            }
            return
          }

          if (data.session && data.user) {
            setResetState('valid')
            setShowNewPasswordModal(true)
          } else {
            setResetState('invalid')
          }
        }

      } catch (error) {
        console.error('Password reset error:', error)
        setResetState('invalid')
      }
    }

    handlePasswordReset()
  }, [searchParams])

  const handleComplete = async () => {
    console.log('Password reset complete callback triggered')
    setResetState('completed')
    setShowNewPasswordModal(false)
    
    // 비밀번호 변경 후 Supabase가 자동으로 로그인시킴
    // 세션을 유지하고 바로 홈으로 이동
    console.log('Password changed successfully, user is already logged in with new password')
    
    toast.success('비밀번호가 성공적으로 변경되었습니다!')
    
    // 바로 홈으로 이동 (이미 로그인되어 있으므로)
    setTimeout(() => {
      router.push('/')
    }, 1000)
  }

  const handleRetryReset = async () => {
    // 🔒 보안: 페이지 이동 전 세션 완전히 제거
    console.log('Clearing any existing session before retry')
    await supabaseClient().auth.signOut()
    router.push('/')
  }

  if (resetState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">인증 확인 중</h3>
            <p className="text-muted-foreground text-center">
              비밀번호 재설정 링크를 확인하고 있습니다...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (resetState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-lg">잘못된 링크</CardTitle>
            <CardDescription>
              비밀번호 재설정 링크가 잘못되었거나 손상되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>가능한 원인:</strong></p>
              <p>• 링크를 직접 입력하여 접근한 경우</p>
              <p>• 링크가 복사 과정에서 손상된 경우</p>
              <p>• 이메일 클라이언트에서 링크가 변형된 경우</p>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2 mt-4">
              <p><strong>해결 방법:</strong></p>
              <p>• 이메일에서 링크를 다시 클릭해보세요</p>
              <p>• 링크를 전체 선택하여 복사 후 붙여넣기</p>
              <p>• 새로운 재설정 링크를 요청해주세요</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  // 🔒 보안: 새 재설정 요청 전 세션 완전히 제거
                  console.log('Clearing any existing session before redirect')
                  await supabaseClient().auth.signOut()
                  // 홈페이지로 이동 (새 창 아님)
                  router.push('/')
                }}
                variant="outline"
                className="flex-1"
              >
                새 재설정 요청
              </Button>
              <Button
                onClick={async () => {
                  // 🔒 보안: 홈으로 가기 전 세션 완전히 제거
                  console.log('Clearing any existing session before going home')
                  await supabaseClient().auth.signOut()
                  router.push('/')
                }}
                className="flex-1 kepco-gradient"
              >
                홈페이지로
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (resetState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-lg">링크 만료</CardTitle>
            <CardDescription>
              비밀번호 재설정 링크가 만료되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• 비밀번호 재설정 링크는 1시간 동안 유효합니다</p>
              <p>• 새로운 재설정 링크를 요청해주세요</p>
            </div>
            
            <Button
              onClick={handleRetryReset}
              className="w-full kepco-gradient"
            >
              홈페이지로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (resetState === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">변경 완료</CardTitle>
            <CardDescription>
              비밀번호가 성공적으로 변경되었습니다.<br />
              새 비밀번호로 로그인해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground mb-4">
              잠시 후 홈페이지로 이동합니다...
            </div>
            <Button
              onClick={async () => {
                // 🔒 보안: 홈으로 가기 전 세션 상태 확인 (이미 signOut 되었어야 함)
                console.log('Ensuring no session exists before going home')
                await supabaseClient().auth.signOut()
                router.push('/')
              }}
              className="w-full kepco-gradient"
            >
              홈페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">비밀번호 재설정</CardTitle>
          <CardDescription>
            새로운 비밀번호를 설정해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowNewPasswordModal(true)}
            className="w-full kepco-gradient"
          >
            비밀번호 변경하기
          </Button>
        </CardContent>
      </Card>

      {/* New Password Modal */}
      <NewPasswordModal 
        open={showNewPasswordModal}
        onOpenChange={setShowNewPasswordModal}
        onComplete={handleComplete}
      />
    </div>
  )
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">로딩 중</h3>
            <p className="text-muted-foreground text-center">잠시만 기다려주세요...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <PasswordResetContent />
    </Suspense>
  )
}