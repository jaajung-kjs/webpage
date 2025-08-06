'use client'

import { useState, useEffect } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/providers'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
// import { logger } from '@/lib/logger'
import EmailVerificationModal from './EmailVerificationModal'

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
})

const signupSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  confirmPassword: z.string().min(6, '비밀번호 확인을 입력해주세요'),
  department: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: string
}

export default function LoginDialog({ open, onOpenChange, defaultTab = 'login' }: LoginDialogProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [emailForVerification, setEmailForVerification] = useState('')
  const { signIn, signUp, user } = useAuth()
  const router = useRouter()

  // Update activeTab when defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      department: '전력관리처',
    },
  })

  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true)
    try {
      const { error } = await signIn(values.email, values.password)
      
      if (error) {
        // 이메일 인증 관련 에러 체크 먼저 (로그 출력 전에)
        const isEmailNotConfirmed = error.message && (
          error.message.includes('Email not confirmed') ||
          error.message.includes('email_not_confirmed') ||
          error.message.includes('not confirmed')
        ) && error.status === 400
        
        if (isEmailNotConfirmed) {
          // 이메일 저장하고 모달 표시 (에러 로그와 토스트 없이)
          setEmailForVerification(values.email)
          setShowEmailVerificationModal(true)
          onOpenChange(false)
          return
        }

        // 개발 환경에서만 에러 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.warn('Login error:', error.message)
        }
        
        let errorMessage = '로그인 중 오류가 발생했습니다.'
        
        if (error.message) {
          if (error.message.includes('Invalid login credentials') || 
              error.message.includes('invalid_credentials')) {
            errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
          } else if (error.message.includes('Too many requests')) {
            errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
          } else if (error.message.includes('Network')) {
            errorMessage = '네트워크 연결을 확인해주세요.'
          }
        }
        
        toast.error('로그인 실패', {
          description: errorMessage,
          duration: 4000
        })
        return
      }

      // 로그인 성공
      toast.success('로그인되었습니다.')
      onOpenChange(false)
      loginForm.reset()
    } catch (error) {
      // 개발 환경에서만 에러 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.warn('Login exception:', error)
      }
      toast.error('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const onSignup = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true)
    try {
      const { error } = await signUp(
        values.email,
        values.password,
        {
          name: values.name,
          department: values.department
        }
      )
      
      if (error) {
        // 개발 환경에서만 에러 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.warn('Signup error:', error.message)
        }
        
        let signupErrorMessage = '회원가입 중 오류가 발생했습니다.'
        let shouldSwitchToLogin = false
        let shouldShowResendEmail = false
        
        if (error.message) {
          if (error.message.includes('User already exists') || error.code === 'user_already_exists') {
            signupErrorMessage = '이미 가입된 회원입니다. 로그인해주세요.'
            shouldSwitchToLogin = true
          } else if (error.message.includes('Email not verified') || error.code === 'email_not_verified') {
            signupErrorMessage = '이미 회원가입한 이메일입니다. 이메일 인증을 확인해주세요.'
            shouldShowResendEmail = true
            setEmailForVerification(values.email)
          } else if (error.message.includes('User already registered')) {
            signupErrorMessage = '이미 회원가입한 이메일입니다. 이메일 인증을 확인해주세요.'
            shouldShowResendEmail = true
            setEmailForVerification(values.email)
          } else if (error.message.includes('Email address') && error.message.includes('is invalid')) {
            // Supabase returns this message for duplicate emails
            signupErrorMessage = '이미 회원가입한 이메일입니다. 이메일 인증을 확인해주세요.'
            shouldShowResendEmail = true
            setEmailForVerification(values.email)
          } else if (error.message.includes('Password should be at least')) {
            signupErrorMessage = '비밀번호는 6자 이상이어야 합니다.'
          } else if (error.message.includes('Invalid email')) {
            signupErrorMessage = '올바른 이메일 주소를 입력해주세요.'
          } else if (error.message.includes('weak_password')) {
            signupErrorMessage = '더 강한 비밀번호를 입력해주세요. 문자와 숫자를 조합해주세요.'
          }
        }
        
        toast.error('회원가입 실패', {
          description: signupErrorMessage,
          duration: 4000
        })
        
        // Switch to login tab if user already exists
        if (shouldSwitchToLogin) {
          setActiveTab('login')
          // Optionally, pre-fill the email in login form
          loginForm.setValue('email', values.email)
        }
        
        // Show email verification modal if needed
        if (shouldShowResendEmail) {
          setShowEmailVerificationModal(true)
        }
        
        return
      }

      // Show success message about email verification
      toast.success('회원가입 완료!', {
        description: '이메일을 확인하여 계정을 인증해주세요.',
        duration: 5000
      })
      onOpenChange(false)
      signupForm.reset()
      setActiveTab('login')
    } catch (error) {
      console.error('Signup error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>KEPCO AI 학습동아리</DialogTitle>
          <DialogDescription>
            계정에 로그인하거나 새 계정을 만드세요
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full h-auto items-center justify-between rounded-md bg-muted p-0.5 text-muted-foreground">
            <TabsTrigger
              value="login"
              className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
            >
              로그인
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
            >
              회원가입
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
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
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full kepco-gradient"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  로그인
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                <FormField
                  control={signupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름</FormLabel>
                      <FormControl>
                        <Input placeholder="홍길동" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
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
                <FormField
                  control={signupForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>부서</FormLabel>
                      <FormControl>
                        <Input placeholder="전력관리처" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full kepco-gradient"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  회원가입
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      {/* Email Verification Modal */}
      <EmailVerificationModal 
        open={showEmailVerificationModal}
        onOpenChange={setShowEmailVerificationModal}
        email={emailForVerification}
      />
    </Dialog>
  )
}