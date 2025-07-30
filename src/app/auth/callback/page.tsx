'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (!supabase) {
          setStatus('error')
          setMessage('인증 서비스에 연결할 수 없습니다.')
          return
        }
        
        // URL 파라미터 확인
        const urlParams = new URLSearchParams(window.location.search)
        const type = urlParams.get('type')
        const accessToken = urlParams.get('access_token')
        const refreshToken = urlParams.get('refresh_token')
        
        // 이메일 인증 토큰이 있는 경우
        if (type === 'email' && accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            console.error('Session set error:', error)
            setStatus('error')
            setMessage('이메일 인증 처리 중 오류가 발생했습니다: ' + error.message)
            return
          }
          
          if (data.user && data.user.email_confirmed_at) {
            // 이메일 인증이 완료되었으므로 public.users에 프로필 생성
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email!,
                name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
                department: data.user.user_metadata?.department || '미지정',
                role: 'guest'
              })
              
            if (profileError && profileError.code !== '23505') { // 23505 = duplicate key error
              console.error('Profile creation error:', profileError)
              // 프로필 생성 실패해도 인증은 성공이므로 계속 진행
            }
            
            setStatus('success')
            setMessage('이메일 인증이 완료되었습니다! 환영합니다.')
            
            toast.success('이메일 인증 성공!', {
              description: '계정이 성공적으로 인증되었습니다.',
              duration: 3000
            })
            
            // 3초 후 홈페이지로 리다이렉트
            setTimeout(() => {
              router.push('/')
            }, 3000)
            return
          }
        }
        
        // 일반 세션 확인
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setStatus('error')
          setMessage('인증 중 오류가 발생했습니다: ' + error.message)
          return
        }

        if (data.session) {
          setStatus('success')
          setMessage('인증이 완료되었습니다! 환영합니다.')
          
          toast.success('인증 성공!', {
            description: '성공적으로 로그인되었습니다.',
            duration: 3000
          })
          
          // 3초 후 홈페이지로 리다이렉트
          setTimeout(() => {
            router.push('/')
          }, 3000)
        } else {
          setStatus('error')
          setMessage('인증 정보를 찾을 수 없습니다. 다시 시도해주세요.')
        }
      } catch (err) {
        console.error('Callback error:', err)
        setStatus('error')
        setMessage('예상치 못한 오류가 발생했습니다.')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && '이메일 인증 처리 중...'}
            {status === 'success' && '인증 완료!'}
            {status === 'error' && '인증 실패'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        
        {(status === 'success' || status === 'error') && (
          <CardContent className="text-center">
            <Button 
              onClick={() => router.push('/')}
              className="kepco-gradient"
            >
              홈으로 이동
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}