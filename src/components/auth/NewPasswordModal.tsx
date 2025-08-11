/**
 * NewPasswordModal Component
 * 
 * 새 비밀번호 설정 모달 - 이메일 링크 클릭 후 사용
 * 
 * 기능:
 * 1. 새 비밀번호 입력
 * 2. 비밀번호 확인
 * 3. 강도 체크
 * 4. 재설정 완료
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { supabaseClient } from '@/lib/core/connection-core'
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const newPasswordSchema = z.object({
  password: z.string()
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

interface NewPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

type ResetStep = 'input' | 'success'

// 비밀번호 강도 체크 함수 (간소화)
function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  // 단순히 길이만 체크
  if (password.length < 6) return { score: 0, label: '너무 짧음', color: 'text-red-500' }
  if (password.length < 8) return { score: 50, label: '사용 가능', color: 'text-yellow-500' }
  if (password.length < 12) return { score: 75, label: '안전', color: 'text-blue-500' }
  return { score: 100, label: '매우 안전', color: 'text-green-500' }
}

export function NewPasswordModal({ open, onOpenChange, onComplete }: NewPasswordModalProps) {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<ResetStep>('input')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const form = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const password = form.watch('password')
  const passwordStrength = password ? getPasswordStrength(password) : null

  const onSubmit = async (values: z.infer<typeof newPasswordSchema>) => {
    console.log('Starting password update...')
    setLoading(true)
    try {
      // Supabase에서 비밀번호 업데이트
      const { data, error } = await supabaseClient.auth.updateUser({
        password: values.password
      })

      console.log('Password update response:', { data, error })

      if (error) {
        console.error('Password update error:', error)
        
        let errorMessage = '비밀번호 변경 중 오류가 발생했습니다.'
        
        if (error.message) {
          if (error.message.includes('same as the old password')) {
            errorMessage = '현재 비밀번호와 같은 비밀번호는 사용할 수 없습니다.'
          } else if (error.message.includes('Password should be at least')) {
            errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.'
          } else if (error.message.includes('weak_password')) {
            errorMessage = '더 강한 비밀번호를 사용해주세요.'
          } else if (error.message.includes('session_not_found') || 
                     error.message.includes('invalid_token')) {
            errorMessage = '인증 토큰이 만료되었습니다. 비밀번호 재설정을 다시 시도해주세요.'
          }
        }
        
        toast.error('비밀번호 변경 실패', {
          description: errorMessage,
          duration: 4000
        })
        setLoading(false)
        return
      }

      // 성공 - 실제로 성공했으므로 success 화면 표시
      console.log('Password update successful!')
      setCurrentStep('success')
      form.reset()
      
      toast.success('비밀번호 변경 완료', {
        description: '새 비밀번호로 로그인할 수 있습니다.',
        duration: 5000
      })
      
      // 성공 후 로딩 상태 해제
      setLoading(false)
      
      // 2초 후 자동으로 완료 처리
      setTimeout(() => {
        handleComplete()
      }, 2000)
      
    } catch (error) {
      console.error('Password update exception:', error)
      toast.error('비밀번호 변경 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // 모달이 완전히 닫힌 후 상태 초기화
    setTimeout(() => {
      setCurrentStep('input')
      form.reset()
      setShowPassword(false)
      setShowConfirmPassword(false)
    }, 200)
  }

  const handleComplete = () => {
    handleClose()
    onComplete?.()
    // 로그인 페이지로 리다이렉트하거나 홈페이지로 이동
    router.push('/')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            새 비밀번호 설정
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'input' 
              ? '안전한 새 비밀번호를 설정해주세요.'
              : '비밀번호가 성공적으로 변경되었습니다.'
            }
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'input' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>새 비밀번호</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="새 비밀번호를 입력하세요"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    
                    {/* 비밀번호 강도 표시 */}
                    {password && passwordStrength && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>비밀번호 강도</span>
                          <span className={cn("font-medium", passwordStrength.color)}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <Progress 
                          value={passwordStrength.score} 
                          className="h-2"
                        />
                      </div>
                    )}
                    
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호 확인</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="비밀번호를 다시 입력하세요"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 비밀번호 요구사항 (간소화) */}
              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", {
                    "bg-green-500": password && password.length >= 6,
                    "bg-muted-foreground": !password || password.length < 6
                  })} />
                  최소 6자 이상 입력해주세요
                </p>
              </div>
              
              <Button
                type="submit"
                className="w-full kepco-gradient"
                disabled={loading || !password || password.length < 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                비밀번호 변경
              </Button>
            </form>
          </Form>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">비밀번호 변경 완료</CardTitle>
              <CardDescription>
                비밀번호가 성공적으로 변경되었습니다.<br />
                새 비밀번호로 로그인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleComplete}
                className="w-full kepco-gradient"
              >
                확인
              </Button>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}