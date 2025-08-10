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
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다'),
  confirmPassword: z.string().min(8, '비밀번호 확인을 입력해주세요'),
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

// 비밀번호 강도 체크 함수
function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  let feedback = []

  // 길이 체크
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 10

  // 문자 종류 체크
  if (/[a-z]/.test(password)) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/[0-9]/.test(password)) score += 15
  if (/[@$!%*?&]/.test(password)) score += 20

  // 보너스 점수
  if (password.length >= 16) score += 10

  if (score <= 30) return { score, label: '약함', color: 'text-red-500' }
  if (score <= 60) return { score, label: '보통', color: 'text-yellow-500' }
  if (score <= 80) return { score, label: '강함', color: 'text-blue-500' }
  return { score, label: '매우 강함', color: 'text-green-500' }
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
    setLoading(true)
    try {
      // Supabase에서 비밀번호 업데이트
      const { error } = await supabaseClient.auth.updateUser({
        password: values.password
      })

      if (error) {
        console.error('Password update error:', error)
        
        let errorMessage = '비밀번호 변경 중 오류가 발생했습니다.'
        
        if (error.message) {
          if (error.message.includes('same as the old password')) {
            errorMessage = '현재 비밀번호와 같은 비밀번호는 사용할 수 없습니다.'
          } else if (error.message.includes('Password should be at least')) {
            errorMessage = '비밀번호는 최소 8자 이상이어야 합니다.'
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
        return
      }

      // 성공
      setCurrentStep('success')
      form.reset()
      
      toast.success('비밀번호 변경 완료', {
        description: '새 비밀번호로 로그인할 수 있습니다.',
        duration: 5000
      })
      
    } catch (error) {
      console.error('Password update exception:', error)
      toast.error('비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
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

              {/* 비밀번호 요구사항 */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">비밀번호 요구사항:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className={cn("flex items-center gap-2", {
                      "text-green-600": password && password.length >= 8
                    })}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", {
                        "bg-green-500": password && password.length >= 8,
                        "bg-muted-foreground": !password || password.length < 8
                      })} />
                      최소 8자 이상
                    </li>
                    <li className={cn("flex items-center gap-2", {
                      "text-green-600": password && /[A-Z]/.test(password)
                    })}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", {
                        "bg-green-500": password && /[A-Z]/.test(password),
                        "bg-muted-foreground": !password || !/[A-Z]/.test(password)
                      })} />
                      대문자 포함
                    </li>
                    <li className={cn("flex items-center gap-2", {
                      "text-green-600": password && /[a-z]/.test(password)
                    })}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", {
                        "bg-green-500": password && /[a-z]/.test(password),
                        "bg-muted-foreground": !password || !/[a-z]/.test(password)
                      })} />
                      소문자 포함
                    </li>
                    <li className={cn("flex items-center gap-2", {
                      "text-green-600": password && /[0-9]/.test(password)
                    })}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", {
                        "bg-green-500": password && /[0-9]/.test(password),
                        "bg-muted-foreground": !password || !/[0-9]/.test(password)
                      })} />
                      숫자 포함
                    </li>
                    <li className={cn("flex items-center gap-2", {
                      "text-green-600": password && /[@$!%*?&]/.test(password)
                    })}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", {
                        "bg-green-500": password && /[@$!%*?&]/.test(password),
                        "bg-muted-foreground": !password || !/[@$!%*?&]/.test(password)
                      })} />
                      특수문자 포함 (@$!%*?&)
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Button
                type="submit"
                className="w-full kepco-gradient"
                disabled={loading || !passwordStrength || passwordStrength.score < 60}
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