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
        // URL에서 토큰 확인
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const type = searchParams.get('type')

        if (type !== 'recovery') {
          setResetState('invalid')
          return
        }

        if (!accessToken || !refreshToken) {
          setResetState('invalid')
          return
        }

        // Supabase 세션 설정
        const { data, error } = await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (error) {
          console.error('Session error:', error)
          if (error.message.includes('expired') || error.message.includes('invalid')) {
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

      } catch (error) {
        console.error('Password reset error:', error)
        setResetState('invalid')
      }
    }

    handlePasswordReset()
  }, [searchParams])

  const handleComplete = () => {
    setResetState('completed')
    setShowNewPasswordModal(false)
    
    // 로그인 페이지로 리다이렉트
    toast.success('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.')
    
    setTimeout(() => {
      router.push('/')
    }, 2000)
  }

  const handleRetryReset = () => {
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
              <p>• 링크를 다시 확인해주세요</p>
              <p>• 이메일에서 링크를 복사하여 사용해보세요</p>
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
              onClick={() => router.push('/')}
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