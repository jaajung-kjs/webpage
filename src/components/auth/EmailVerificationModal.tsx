'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface EmailVerificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email?: string
}

export default function EmailVerificationModal({ 
  open, 
  onOpenChange, 
  email 
}: EmailVerificationModalProps) {
  const { resendEmailConfirmation } = useAuth()
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleResendEmail = async () => {
    if (!email) return

    setIsResending(true)
    try {
      const { error } = await resendEmailConfirmation(email)
      
      if (error) {
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
      toast.error('오류 발생', {
        description: '예상치 못한 오류가 발생했습니다.',
        duration: 4000
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-yellow-100 p-3">
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            이메일 인증이 필요합니다
          </DialogTitle>
          <DialogDescription className="text-center">
            로그인하려면 먼저 이메일을 인증해주세요.
            {email && (
              <>
                <br />
                <span className="font-medium text-primary">{email}</span>으로 
                발송된 인증 이메일을 확인해주세요.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {resendSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {email && (
              <Button 
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full kepco-gradient"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    재발송 중...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    인증 이메일 재발송
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <h4 className="text-sm font-medium mb-2">이메일이 보이지 않나요?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 스팸/정크 메일함을 확인해보세요</li>
              <li>• 이메일 주소가 올바른지 확인해보세요</li>
              <li>• 몇 분 정도 기다린 후 다시 확인해보세요</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}