'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react'
import { useAuthLegacy } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function VerifyEmailPage() {
  const router = useRouter()
  const { user, loading, signOut, resendEmailConfirmation } = useAuthLegacy()
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  // 이메일 인증 상태 확인
  useEffect(() => {
    if (user?.email_confirmed_at && !isVerified) {
      setIsVerified(true)
      toast.success('이메일 인증 완료!', {
        description: '홈페이지로 이동합니다.',
        duration: 3000
      })
      setTimeout(() => {
        router.push('/')
      }, 2000)
    }
  }, [user, router, isVerified])

  // 주기적으로 인증 상태 확인 (이메일 클릭 후 탭 전환 시를 위해)
  useEffect(() => {
    if (!user?.email_confirmed_at && user) {
      const interval = setInterval(async () => {
        try {
          // 사용자 정보를 다시 가져와서 확인
          const { supabase } = await import('@/lib/supabase/client')
          const { data: { user: updatedUser } } = await supabase.auth.getUser()
          

          if (updatedUser?.email_confirmed_at && !isVerified) {
            setIsVerified(true)
            clearInterval(interval)
          }
        } catch (error) {
          console.error('Error checking verification status:', error)
        }
      }, 3000) // 3초마다 확인
      
      return () => {
        clearInterval(interval)
      }
    }
  }, [user, isVerified])


  // 사용자가 없으면 홈으로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, router, loading])

  const handleResendEmail = async () => {
    if (!user?.email) return

    setIsResending(true)
    setResendError('')
    setResendSuccess(false)

    try {
      const { error } = await resendEmailConfirmation(user.email)
      
      if (error) {
        setResendError('인증 이메일 재발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
        toast.error('재발송 실패', {
          description: '인증 이메일 재발송에 실패했습니다.',
          duration: 4000
        })
      } else {
        setResendSuccess(true)
        toast.success('이메일 재발송 완료!', {
          description: '이메일을 확인해주세요.',
          duration: 4000
        })
      }
    } catch (error) {
      setResendError('예상치 못한 오류가 발생했습니다.')
      toast.error('오류 발생', {
        description: '예상치 못한 오류가 발생했습니다.',
        duration: 4000
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>잠시만 기다려주세요...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // 사용자가 없을 때 (로그인되지 않은 상태)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-blue-100 p-3">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              이메일 인증이 필요합니다
            </CardTitle>
            <CardDescription className="text-center">
              회원가입 후 발송된 이메일에서 인증 링크를 클릭해주세요.
              <br />
              <br />
              이메일을 확인하신 후 다시 로그인해주세요.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button 
              onClick={() => router.push('/')}
              className="w-full kepco-gradient"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Button>

            <div className="mt-6 rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium mb-2">이메일이 보이지 않나요?</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 스팸/정크 메일함을 확인해보세요</li>
                <li>• 이메일 주소가 올바른지 확인해보세요</li>
                <li>• 몇 분 정도 기다린 후 다시 확인해보세요</li>
                <li>• 문제가 지속되면 관리자에게 문의하세요</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-600">
              이메일 인증 완료!
            </CardTitle>
            <CardDescription className="text-center">
              이메일 인증이 성공적으로 완료되었습니다.
              <br />
              잠시 후 홈페이지로 이동합니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-blue-100 p-3">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            이메일 인증이 필요합니다
          </CardTitle>
          <CardDescription className="text-center">
            회원가입은 완료되었지만 이메일 인증이 아직 완료되지 않았습니다.
            <br />
            <span className="font-medium text-primary">{user?.email}</span>로 
            발송된 인증 이메일을 확인해주세요.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {resendSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.
              </AlertDescription>
            </Alert>
          )}
          
          {resendError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {resendError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full kepco-gradient"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  인증 이메일 재발송 중...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  인증 이메일 재발송
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              다른 계정으로 로그인
            </Button>
          </div>

          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <h4 className="text-sm font-medium mb-2">이메일이 보이지 않나요?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 스팸/정크 메일함을 확인해보세요</li>
              <li>• 이메일 주소가 올바른지 확인해보세요</li>
              <li>• 몇 분 정도 기다린 후 다시 확인해보세요</li>
              <li>• 문제가 지속되면 관리자에게 문의하세요</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}