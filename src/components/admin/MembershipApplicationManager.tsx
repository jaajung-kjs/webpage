'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Calendar,
  Filter,
  Search,
  ChevronDown,
  Eye,
  Check,
  X
} from 'lucide-react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { 
  useMembershipApplications, 
  useUpdateMembershipApplication, 
  useSupabaseMutation 
} from '@/hooks/useSupabase'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

import { Tables } from '@/lib/database.types'

// DB 타입을 그대로 사용하고, JOIN된 데이터만 확장
type MembershipApplication = Tables<'membership_applications'> & {
  user: Pick<Tables<'users'>, 'id' | 'email' | 'name' | 'department' | 'avatar_url'>
  reviewer?: {
    name: string
  } | null
}

const interests = [
  { id: 'chatgpt', label: 'ChatGPT 활용' },
  { id: 'claude', label: 'Claude 활용' },
  { id: 'automation', label: '업무 자동화' },
  { id: 'data-analysis', label: '데이터 분석' },
  { id: 'content-creation', label: '콘텐츠 생성' },
  { id: 'coding', label: '코딩 도우미' },
  { id: 'research', label: '연구 및 리서치' },
  { id: 'education', label: '교육 및 학습' },
  { id: 'other', label: '기타' }
]

const experienceLevels: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
  expert: '전문가'
}

export default function MembershipApplicationManager() {
  const { user, profile } = useOptimizedAuth()
  
  // Use Supabase hooks for data fetching
  const { data: applications = [], loading, refetch } = useMembershipApplications()
  const { updateApplication, loading: updateLoading } = useUpdateMembershipApplication()
  const { mutate: updateUserRole, loading: roleLoading } = useSupabaseMutation()
  
  const [filteredApplications, setFilteredApplications] = useState<MembershipApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<MembershipApplication | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected' | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  
  const processing = updateLoading || roleLoading
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter applications when dependencies change
  useEffect(() => {
    if (!applications) return
    
    let filtered = [...applications]
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter)
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(app => 
        app.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.user?.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    }
    
    setFilteredApplications(filtered)
  }, [applications, statusFilter, searchQuery])
  
  const handleReview = async () => {
    if (!selectedApplication || !reviewDecision || !user) return
    
    try {
      // Update membership application
      const result = await updateApplication(selectedApplication.id, {
        status: reviewDecision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null
      })
      
      if (result.error) {
        throw result.error
      }
      
      // If approved, update user role to 'member'
      if (reviewDecision === 'approved') {
        const roleResult = await updateUserRole(async () =>
          await supabase
            .from('users')
            .update({ role: 'member' })
            .eq('id', selectedApplication.user_id)
        )
        
        if (roleResult.error) {
          throw roleResult.error
        }
      }
      
      toast.success(
        reviewDecision === 'approved' 
          ? '가입 신청을 승인했습니다.' 
          : '가입 신청을 거절했습니다.'
      )
      
      // Refetch data to get updated state
      await refetch()
      
      setReviewDialogOpen(false)
      setSelectedApplication(null)
      setReviewDecision(null)
      setReviewNotes('')
    } catch (error: any) {
      console.error('Error reviewing application:', error)
      toast.error(error.message || '신청 처리에 실패했습니다.')
    }
  }
  
  const openReviewDialog = (application: MembershipApplication, decision: 'approved' | 'rejected') => {
    setSelectedApplication(application)
    setReviewDecision(decision)
    setReviewDialogOpen(true)
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">대기 중</Badge>
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">승인됨</Badge>
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">거절됨</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }
  
  const stats = {
    total: applications?.length || 0,
    pending: applications?.filter(app => app.status === 'pending').length || 0,
    approved: applications?.filter(app => app.status === 'approved').length || 0,
    rejected: applications?.filter(app => app.status === 'rejected').length || 0,
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 신청</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기 중</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인됨</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">거절됨</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Applications Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>가입 신청 관리</CardTitle>
              <CardDescription>동아리 가입 신청을 검토하고 승인/거절할 수 있습니다.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 이메일, 부서로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Status Tabs */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
              <TabsList className="flex w-full h-auto items-center justify-between rounded-md bg-muted p-0.5 text-muted-foreground">
                <TabsTrigger
                  value="all"
                  className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
                >
                  전체
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
                >
                  대기 중
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
                >
                  승인됨
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                  className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
                >
                  거절됨
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>신청자</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>관심 분야</TableHead>
                  <TableHead>경험 수준</TableHead>
                  <TableHead>신청일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' 
                        ? '검색 결과가 없습니다.' 
                        : '가입 신청이 없습니다.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={application.user.avatar_url || undefined} />
                            <AvatarFallback>
                              {application.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{application.user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {application.user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{application.user.department || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {application.interests?.slice(0, 2).map(interest => (
                            <Badge key={interest} variant="outline" className="text-xs">
                              {interests.find(i => i.id === interest)?.label || interest}
                            </Badge>
                          ))}
                          {application.interests && application.interests.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{application.interests.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {application.experience_level 
                          ? experienceLevels[application.experience_level] 
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {application.created_at ? format(new Date(application.created_at), 'yyyy.MM.dd', { locale: ko }) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(application.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedApplication(application)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {application.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => openReviewDialog(application, 'approved')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => openReviewDialog(application, 'rejected')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Application Detail Dialog */}
      {selectedApplication && !reviewDialogOpen && (
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">가입 신청서</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedApplication.created_at || Date.now()), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}에 제출됨
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Applicant Info Card */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={selectedApplication.user.avatar_url || undefined} />
                        <AvatarFallback className="text-lg">
                          {selectedApplication.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">{selectedApplication.user.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedApplication.user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedApplication.user.department || '부서 미지정'}
                        </p>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(selectedApplication.status)}
                    </div>
                  </div>
                </CardHeader>
              </Card>
              
              {/* Application Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">신청 내용</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 가입 동기 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">가입 동기</Label>
                    </div>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedApplication.application_reason}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* 관심 분야 */}
                  {selectedApplication.interests && selectedApplication.interests.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">관심 분야</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedApplication.interests.map(interest => (
                          <Badge key={interest} variant="secondary" className="text-sm">
                            {interests.find(i => i.id === interest)?.label || interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 경험 수준 */}
                  {selectedApplication.experience_level && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">AI 도구 경험</Label>
                      <Badge variant="outline" className="font-medium">
                        {experienceLevels[selectedApplication.experience_level]}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
              {/* 검토 정보 */}
              {selectedApplication.reviewed_at && (
                <Card className="border-blue-200 dark:border-blue-900">
                  <CardHeader>
                    <CardTitle className="text-base">검토 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">검토자</span>
                      <span className="font-medium">{selectedApplication.reviewer?.name || '알 수 없음'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">검토 일시</span>
                      <span>{format(new Date(selectedApplication.reviewed_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</span>
                    </div>
                    {selectedApplication.review_notes && (
                      <div className="pt-2">
                        <Label className="text-sm text-muted-foreground">검토 메모</Label>
                        <Card className="mt-2 bg-muted/50">
                          <CardContent className="pt-3">
                            <p className="text-sm">{selectedApplication.review_notes}</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {selectedApplication.status === 'pending' ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedApplication(null)}
                    className="sm:mr-auto"
                  >
                    닫기
                  </Button>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => openReviewDialog(selectedApplication, 'rejected')}
                      className="flex-1 sm:flex-initial"
                    >
                      <X className="mr-2 h-4 w-4" />
                      거절
                    </Button>
                    <Button
                      className="kepco-gradient flex-1 sm:flex-initial"
                      onClick={() => openReviewDialog(selectedApplication, 'approved')}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      승인
                    </Button>
                  </div>
                </>
              ) : (
                <Button variant="outline" onClick={() => setSelectedApplication(null)}>
                  닫기
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Review Confirmation Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDecision === 'approved' ? '가입 승인' : '가입 거절'}
            </DialogTitle>
            <DialogDescription>
              {selectedApplication?.user.name}님의 가입 신청을{' '}
              {reviewDecision === 'approved' ? '승인' : '거절'}하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="review-notes">
                {reviewDecision === 'approved' ? '승인 메모 (선택)' : '거절 사유'}
              </Label>
              <Textarea
                id="review-notes"
                placeholder={
                  reviewDecision === 'approved' 
                    ? '승인 관련 메모를 남기실 수 있습니다...' 
                    : '거절 사유를 입력해주세요...'
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            {reviewDecision === 'rejected' && !reviewNotes && (
              <Alert>
                <AlertDescription>
                  거절 시에는 사유를 반드시 입력해주세요.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false)
                setReviewDecision(null)
                setReviewNotes('')
              }}
              disabled={processing}
            >
              취소
            </Button>
            <Button
              className={reviewDecision === 'approved' ? 'kepco-gradient' : ''}
              variant={reviewDecision === 'rejected' ? 'destructive' : 'default'}
              onClick={handleReview}
              disabled={processing || (reviewDecision === 'rejected' && !reviewNotes)}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewDecision === 'approved' ? '승인' : '거절'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}