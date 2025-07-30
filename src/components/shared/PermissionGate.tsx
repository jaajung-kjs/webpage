'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Users, Lock } from 'lucide-react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'

interface PermissionGateProps {
  children: React.ReactNode
  requiredRole?: string[]
  requireMember?: boolean
  requireAdmin?: boolean
  fallbackUrl?: string
  showMessage?: boolean
}

export default function PermissionGate({
  children,
  requiredRole,
  requireMember = false,
  requireAdmin = false,
  fallbackUrl = '/',
  showMessage = true
}: PermissionGateProps) {
  const { user, profile, loading } = useOptimizedAuth()
  const router = useRouter()
  
  // Check permissions
  const hasPermission = () => {
    if (!user) return false
    
    const userRole = profile?.role || 'guest'
    
    // Check specific required roles
    if (requiredRole && !requiredRole.includes(userRole)) {
      return false
    }
    
    // Check if member is required
    if (requireMember) {
      const memberRoles = ['member', 'vice-leader', 'leader', 'admin']
      if (!memberRoles.includes(userRole)) {
        return false
      }
    }
    
    // Check if admin is required  
    if (requireAdmin) {
      const adminRoles = ['vice-leader', 'leader', 'admin']
      if (!adminRoles.includes(userRole)) {
        return false
      }
    }
    
    return true
  }
  
  useEffect(() => {
    if (!loading && !hasPermission() && !showMessage) {
      router.push(fallbackUrl)
    }
  }, [user, loading])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (!hasPermission()) {
    if (!showMessage) {
      return null
    }
    
    const userRole = profile?.role || 'guest'
    
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">접근 권한이 없습니다</CardTitle>
            <CardDescription>
              이 페이지는 동아리 회원만 접근할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userRole === 'guest' && (
              <>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    현재 회원님은 <strong>게스트</strong> 상태입니다.
                    동아리의 모든 기능을 이용하시려면 가입 신청을 해주세요.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/')}
                    className="flex-1"
                  >
                    홈으로 돌아가기
                  </Button>
                  <Button
                    onClick={() => router.push('/membership/apply')}
                    className="flex-1 kepco-gradient"
                  >
                    동아리 가입 신청
                  </Button>
                </div>
              </>
            )}
            
            {userRole === 'pending' && (
              <>
                <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
                  <Users className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    현재 회원님의 가입 신청이 <strong>검토 중</strong>입니다.
                    운영진의 승인을 기다려주세요.
                  </AlertDescription>
                </Alert>
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/')}
                    className="w-full sm:w-auto"
                  >
                    홈으로 돌아가기
                  </Button>
                </div>
              </>
            )}
            
            {!user && (
              <>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    로그인이 필요한 페이지입니다. 먼저 로그인해주세요.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/')}
                    className="flex-1"
                  >
                    홈으로 돌아가기
                  </Button>
                  <Button
                    onClick={() => {
                      // Trigger login dialog
                      window.dispatchEvent(new CustomEvent('openLoginDialog', { 
                        detail: { tab: 'login' } 
                      }))
                    }}
                    className="flex-1 kepco-gradient"
                  >
                    로그인
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return <>{children}</>
}