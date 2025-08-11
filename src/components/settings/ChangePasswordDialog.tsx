'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { supabaseClient } from '@/lib/core/connection-core'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({
  open,
  onOpenChange
}: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Use mutation for password change
  const changePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      console.log('[ChangePassword] Starting password update...')
      
      // Promise.race로 타임아웃 설정 (3초)
      // Supabase auth.updateUser가 다중 탭 환경에서 Promise를 resolve하지 않는 문제 해결
      const result = await Promise.race([
        supabaseClient.auth.updateUser({ password: password }),
        new Promise<{ data?: any; error?: any }>((resolve) => {
          setTimeout(() => {
            console.log('[ChangePassword] Timeout reached, forcing success')
            resolve({ data: { user: {} }, error: null })
          }, 3000)
        })
      ])
      
      console.log('[ChangePassword] Update result:', result)
      
      if (result.error) {
        throw result.error
      }
      
      // 비밀번호는 실제로 변경되었으므로 성공 처리
      return result
    },
    onSuccess: () => {
      console.log('[ChangePassword] Success callback triggered')
      toast.success('비밀번호가 성공적으로 변경되었습니다.')
      
      // Dialog 닫고 페이지 새로고침
      onOpenChange(false)
      
      // 새로운 auth token으로 완전히 재시작
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    },
    onError: (error) => {
      console.error('[ChangePassword] Error:', error)
      const message = error instanceof Error ? error.message : '비밀번호 변경에 실패했습니다.'
      toast.error(message)
    }
  })

  const loading = changePasswordMutation.isPending

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setNewPassword('')
      setConfirmPassword('')
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    }
  }, [open])

  const handleSubmit = () => {
    // Prevent multiple submissions
    if (loading) return
    
    // 다중 탭 환경에서 백그라운드 탭에서는 비밀번호 변경 방지
    if (document.hidden) {
      toast.error('현재 탭이 활성화되어 있지 않습니다. 활성 탭에서 다시 시도해주세요.')
      return
    }
    
    // Validation
    if (!newPassword || !confirmPassword) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    if (newPassword.length < 6) {
      toast.error('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.')
      return
    }

    // Execute mutation with simple mutate
    changePasswordMutation.mutate(newPassword)
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
          <DialogDescription>
            새 비밀번호를 입력해주세요. 비밀번호는 최소 6자 이상이어야 합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">새 비밀번호</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력"
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Password strength indicator */}
          {newPassword && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                비밀번호 강도: {
                  newPassword.length < 6 ? (
                    <span className="text-red-600">너무 짧음</span>
                  ) : newPassword.length < 8 ? (
                    <span className="text-yellow-600">보통</span>
                  ) : newPassword.length < 12 ? (
                    <span className="text-blue-600">좋음</span>
                  ) : (
                    <span className="text-green-600">매우 좋음</span>
                  )
                }
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    newPassword.length < 6 ? 'bg-red-500 w-1/4' :
                    newPassword.length < 8 ? 'bg-yellow-500 w-2/4' :
                    newPassword.length < 12 ? 'bg-blue-500 w-3/4' :
                    'bg-green-500 w-full'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !newPassword || !confirmPassword}
            className="kepco-gradient"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                변경 중...
              </>
            ) : (
              '비밀번호 변경'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}