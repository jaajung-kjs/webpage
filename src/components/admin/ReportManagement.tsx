'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  FileText,
  MessageSquare,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Tables } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

type Report = Tables<'reports'> & {
  reporter?: {
    id: string
    name: string
    email: string
  }
  reviewer?: {
    id: string
    name: string
  }
  parent_content_id?: string | null
}

const statusConfig = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  reviewing: { label: '검토중', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  resolved: { label: '처리완료', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  dismissed: { label: '기각', color: 'bg-gray-100 text-gray-800', icon: XCircle }
}

const targetTypeLabels = {
  content: '게시글',
  comment: '댓글',
  user: '사용자'
}

export default function ReportManagement() {
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewing' | 'resolved' | 'dismissed'>('all')
  
  // Dialog state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'reviewing' | 'resolved' | 'dismissed'>('resolved')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [operationLoading, setOperationLoading] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    filterReports()
  }, [activeTab, reports])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (reportsError) throw reportsError
      
      // Fetch user data separately
      const userIds = new Set<string>()
      reportsData?.forEach(report => {
        if (report.reporter_id) userIds.add(report.reporter_id)
        if (report.reviewed_by) userIds.add(report.reviewed_by)
      })
      
      let usersMap: Record<string, any> = {}
      if (userIds.size > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', Array.from(userIds))
        
        if (!usersError && users) {
          users.forEach(user => {
            usersMap[user.id] = user
          })
        }
      }
      
      // Combine data
      const reportsWithUsers = (reportsData || []).map(report => ({
        ...report,
        reporter: report.reporter_id ? usersMap[report.reporter_id] : undefined,
        reviewer: report.reviewed_by ? { id: usersMap[report.reviewed_by]?.id, name: usersMap[report.reviewed_by]?.name } : undefined
      }))
      
      setReports(reportsWithUsers)
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('신고 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const filterReports = () => {
    if (activeTab === 'all') {
      setFilteredReports(reports)
    } else {
      setFilteredReports(reports.filter(report => report.status === activeTab))
    }
  }

  const handleAction = (report: Report, action: 'reviewing' | 'resolved' | 'dismissed') => {
    setSelectedReport(report)
    setActionType(action)
    setResolutionNotes('')
    setActionDialogOpen(true)
  }

  const confirmAction = async () => {
    if (!selectedReport || !user) return

    try {
      setOperationLoading(true)
      const { error } = await supabase
        .from('reports')
        .update({
          status: actionType,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          resolution_notes: resolutionNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id)
      
      if (error) throw error
      
      toast.success(`신고를 ${statusConfig[actionType].label} 처리했습니다.`)
      setActionDialogOpen(false)
      setSelectedReport(null)
      fetchReports()
    } catch (error: any) {
      console.error('Error updating report:', error)
      toast.error(error.message || '신고 처리에 실패했습니다.')
    } finally {
      setOperationLoading(false)
    }
  }

  const getReportTypeName = (typeId: string) => {
    // 하드코딩된 타입들 (API에서 가져온 것과 동일)
    const types: Record<string, string> = {
      '1': '스팸',
      '2': '욕설/비방',
      '3': '음란물',
      '4': '저작권 침해',
      '5': '개인정보 노출',
      '6': '거짓 정보',
      '7': '기타'
    }
    return types[typeId] || '기타'
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
  }

  const getStatusIcon = (status: string) => {
    const Icon = statusConfig[status as keyof typeof statusConfig]?.icon || Clock
    return Icon
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>신고 관리</CardTitle>
          <CardDescription>
            사용자들이 신고한 내용을 검토하고 처리할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{reports.length}</div>
                <div className="text-sm text-muted-foreground">총 신고</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {reports.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">대기중</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {reports.filter(r => r.status === 'reviewing').length}
                </div>
                <div className="text-sm text-muted-foreground">검토중</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {reports.filter(r => r.status === 'resolved').length}
                </div>
                <div className="text-sm text-muted-foreground">처리완료</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="pending">대기중</TabsTrigger>
              <TabsTrigger value="reviewing">검토중</TabsTrigger>
              <TabsTrigger value="resolved">처리완료</TabsTrigger>
              <TabsTrigger value="dismissed">기각</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>신고일시</TableHead>
                      <TableHead>신고자</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>신고유형</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>처리자</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          로딩 중...
                        </TableCell>
                      </TableRow>
                    ) : filteredReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          신고가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReports.map((report) => {
                        const StatusIcon = getStatusIcon(report.status)
                        return (
                          <TableRow key={report.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(report.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {report.reporter?.name || '익명'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {report.reporter?.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {targetTypeLabels[report.target_type as keyof typeof targetTypeLabels] || report.target_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {getReportTypeName(report.report_type_id)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {report.reason}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={`${statusConfig[report.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'} flex items-center gap-1 w-fit`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig[report.status as keyof typeof statusConfig]?.label || report.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {report.reviewer ? (
                                <div className="text-sm">
                                  <div>{report.reviewer.name}</div>
                                  {report.reviewed_at && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(report.reviewed_at)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Navigate to the reported content
                                    const targetType = report.target_type
                                    const targetId = report.target_id
                                    
                                    if (!targetId) {
                                      toast.error('대상 정보를 찾을 수 없습니다.')
                                      return
                                    }
                                    
                                    let url = ''
                                    switch (targetType) {
                                      case 'content':
                                        // Determine content type based on target_id prefix or additional data
                                        url = `/community/${targetId}` // Default to community post
                                        break
                                      case 'comment':
                                        // Navigate to the parent content with comment highlight
                                        if (report.parent_content_id) {
                                          url = `/community/${report.parent_content_id}#comment-${targetId}`
                                        } else {
                                          toast.error('댓글이 속한 게시글 정보를 찾을 수 없습니다.')
                                          return
                                        }
                                        break
                                      case 'user':
                                        url = `/members?userId=${targetId}`
                                        break
                                      default:
                                        toast.error('알 수 없는 대상 유형입니다.')
                                        return
                                    }
                                    
                                    if (url) {
                                      window.open(url, '_blank')
                                    }
                                  }}
                                  title="신고 대상 보기"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                {report.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAction(report, 'reviewing')}
                                    >
                                      검토 시작
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleAction(report, 'resolved')}
                                    >
                                      처리
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAction(report, 'dismissed')}
                                    >
                                      기각
                                    </Button>
                                  </>
                                )}
                                {report.status === 'reviewing' && (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleAction(report, 'resolved')}
                                    >
                                      처리 완료
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAction(report, 'dismissed')}
                                    >
                                      기각
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              신고 {statusConfig[actionType].label} 처리
            </AlertDialogTitle>
            <AlertDialogDescription>
              이 신고를 {statusConfig[actionType].label} 처리하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>처리 사유 (선택사항)</Label>
              <Textarea
                placeholder="처리 사유를 입력하세요..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </div>
            
            {selectedReport && (
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div>
                  <span className="font-medium">신고 유형:</span> {getReportTypeName(selectedReport.report_type_id)}
                </div>
                <div>
                  <span className="font-medium">신고 사유:</span> {selectedReport.reason}
                </div>
                {selectedReport.description && (
                  <div>
                    <span className="font-medium">상세 설명:</span> {selectedReport.description}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationLoading}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={operationLoading}
            >
              {operationLoading ? '처리 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}