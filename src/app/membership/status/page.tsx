'use client'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, CheckCircle, XCircle, User, ArrowLeft, Home } from 'lucide-react'
import { useAuth } from '@/providers'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Tables } from '@/lib/database.types'
import { useMembershipV2 } from '@/hooks/features/useMembershipV2'

export default function MembershipStatusPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { useMyApplication } = useMembershipV2()
  const { data: application, isLoading: loading } = useMyApplication()

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    // 이미 회원인 경우
    if (profile?.role && ['member', 'vice-leader', 'leader', 'admin'].includes(profile.role)) {
      router.push('/community')
      return
    }
  }, [user, profile, router])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <User className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '심사 중'
      case 'approved':
        return '승인됨'
      case 'rejected':
        return '거절됨'
      default:
        return '알 수 없음'
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending':
        return '관리자가 가입 신청을 검토하고 있습니다. 보통 1-2일 이내에 결과를 알려드립니다.'
      case 'approved':
        return '축하합니다! 가입이 승인되었습니다. 동아리 활동에 참여하실 수 있습니다.'
      case 'rejected':
        return '죄송합니다. 가입 신청이 거절되었습니다. 아래 사유를 확인해주세요.'
      default:
        return ''
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  const handleGoHome = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Navigation buttons */}
          <div className="flex gap-2 mb-6">
            <Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              뒤로가기
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              홈으로
            </Button>
          </div>
          
          <Card>
            <CardContent className="py-8">
              <div className="flex justify-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Navigation buttons */}
          <div className="flex gap-2 mb-6">
            <Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              뒤로가기
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              홈으로
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>가입 신청 내역 없음</CardTitle>
              <CardDescription>
                아직 동아리 가입 신청을 하지 않으셨습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/membership/apply')}>
                가입 신청하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </Button>
          <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            홈으로
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold">가입 신청 현황</h1>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(application.status)}
                {getStatusText(application.status)}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                신청일: {new Date(application.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <CardDescription>
              {getStatusDescription(application.status)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">신청 내용</h3>
              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">지원 동기:</div>
                  <div className="bg-muted/50 p-3 rounded-lg break-words whitespace-pre-wrap">
                    {application.motivation}
                  </div>
                </div>
                {application.experience && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground font-medium">경험:</div>
                    <div className="bg-muted/50 p-3 rounded-lg break-words whitespace-pre-wrap">
                      {application.experience}
                    </div>
                  </div>
                )}
                {application.goals && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground font-medium">목표:</div>
                    <div className="bg-muted/50 p-3 rounded-lg break-words whitespace-pre-wrap">
                      {application.goals}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {application.status === 'rejected' && application.review_comment && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-semibold">거절 사유:</div>
                    <div className="break-words whitespace-pre-wrap">
                      {application.review_comment}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {application.status === 'rejected' && (
              <div className="pt-4">
                <Button onClick={() => router.push('/membership/apply')}>
                  다시 신청하기
                </Button>
              </div>
            )}

            {application.status === 'approved' && (
              <div className="pt-4">
                <Button onClick={() => router.push('/community')} className="kepco-gradient">
                  커뮤니티 둘러보기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}