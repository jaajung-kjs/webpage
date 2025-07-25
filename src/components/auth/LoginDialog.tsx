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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
}

export default function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [emailForVerification, setEmailForVerification] = useState('')
  const { signIn, signUp, user } = useAuth()
  const router = useRouter()

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
      console.log('🔍 Attempting login for:', values.email)
      const { error } = await signIn(values.email, values.password)
      
      console.log('🔍 Login result:', { error: error?.message, hasError: !!error })
      
      if (error) {
        console.log('❌ Login error details:', {
          message: error.message,
          name: error.name,
          status: error.status,
          __isAuthError: error.__isAuthError
        })
        
        // 이메일 인증 관련 에러 체크 (더 간단하게)
        const isEmailNotConfirmed = error.message && (
          error.message.includes('Email not confirmed') ||
          error.message.includes('email_not_confirmed') ||
          error.message.includes('not confirmed') ||
          error.name === 'AuthApiError'
        )
        
        if (isEmailNotConfirmed) {
          console.log('✅ EMAIL VERIFICATION REQUIRED - showing modal')
          
          // 이메일 저장하고 모달 표시
          setEmailForVerification(values.email)
          setShowEmailVerificationModal(true)
          onOpenChange(false)
          return
        }
        
        // 기타 로그인 오류
        console.error('❌ Other login error:', error)
        toast.error('로그인 실패', {
          description: error.message || '로그인 중 오류가 발생했습니다.',
          duration: 4000
        })
        return
      }

      console.log('✅ Login successful')
      onOpenChange(false)
      loginForm.reset()
    } catch (error) {
      console.error('❌ Catch block login error:', error)
      alert('로그인 중 예외 발생: ' + error)
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
        values.name,
        values.department
      )
      
      if (error) {
        console.error('Signup error:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details
        })
        
        toast.error('회원가입 실패', {
          description: error.message,
          duration: 4000
        })
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
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