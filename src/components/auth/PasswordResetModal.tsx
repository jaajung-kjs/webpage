/**
 * PasswordResetModal Component
 * 
 * 비밀번호 재설정 모달 - Supabase 이메일 인증 시스템 활용
 * 
 * 기능:
 * 1. 이메일 입력 단계
 * 2. 재설정 이메일 전송
 * 3. 성공 메시지 표시
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { supabaseClient } from '@/lib/core/connection-core'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const passwordResetSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
})

interface PasswordResetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ResetStep = 'input' | 'success'

export function PasswordResetModal({ open, onOpenChange }: PasswordResetModalProps) {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<ResetStep>('input')
  const [emailSent, setEmailSent] = useState('')

  const form = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof passwordResetSchema>) => {
    setLoading(true)
    try {
      // 리다이렉트 URL 로깅
      const redirectUrl = `${window.location.origin}/auth/reset-password`
      console.log('Password reset redirect URL:', redirectUrl)
      
      // Supabase에서 비밀번호 재설정 이메일 전송
      const { error } = await supabaseClient.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: redirectUrl
        }
      )

      if (error) {
        console.error('Password reset error:', error)
        
        // 사용자 친화적인 에러 메시지 처리
        let errorMessage = '비밀번호 재설정 중 오류가 발생했습니다.'
        
        if (error.message) {
          if (error.message.includes('User not found') || 
              error.message.includes('No user found')) {
            errorMessage = '등록되지 않은 이메일 주소입니다.'
          } else if (error.message.includes('too many requests')) {
            errorMessage = '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.'
          } else if (error.message.includes('rate limit')) {
            errorMessage = '잠시 후 다시 시도해주세요.'
          }
        }
        
        toast.error('재설정 실패', {
          description: errorMessage,
          duration: 4000
        })
        return
      }

      // 성공
      setEmailSent(values.email)
      setCurrentStep('success')
      form.reset()
      
      toast.success('이메일 전송 완료', {
        description: '새로운 재설정 링크가 전송되었습니다. 이전 링크는 무효화되었습니다.',
        duration: 5000
      })
      
    } catch (error) {
      console.error('Password reset exception:', error)
      toast.error('비밀번호 재설정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // 모달이 완전히 닫힌 후 상태 초기화
    setTimeout(() => {
      setCurrentStep('input')
      setEmailSent('')
      form.reset()
    }, 200)
  }

  const handleBackToInput = () => {
    setCurrentStep('input')
    setEmailSent('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 'success' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToInput}
                className="p-1 h-6 w-6 mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Mail className="h-5 w-5" />
            비밀번호 재설정
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'input' 
              ? '등록된 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.'
              : '이메일을 확인해주세요.'
            }
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'input' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@kepco.co.kr"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1 kepco-gradient"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  재설정 링크 전송
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">이메일을 확인해주세요</CardTitle>
              <CardDescription>
                <strong>{emailSent}</strong>로<br />
                비밀번호 재설정 링크가 전송되었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• 이메일함을 확인하세요 (스팸함도 확인해주세요)</p>
                <p>• 링크는 1시간 동안 유효합니다</p>
                <p>• <strong>이전에 받은 재설정 링크는 무효화되었습니다</strong></p>
                <p>• 이메일이 오지 않으면 다시 시도해주세요</p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBackToInput}
                  className="flex-1"
                >
                  다시 전송
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1 kepco-gradient"
                >
                  확인
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook for managing password reset modal state
 */
export function usePasswordResetModal() {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return {
    isOpen,
    openModal,
    closeModal,
    modalProps: {
      open: isOpen,
      onOpenChange: setIsOpen,
    }
  }
}