'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import api from '@/lib/api.modern'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postType: 'community' | 'case' | 'announcement' | 'comment'
  postId?: string
  commentId?: string
  title?: string
}

interface ReportType {
  id: string
  name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export function ReportDialog({
  open,
  onOpenChange,
  postType,
  postId,
  commentId,
  title
}: ReportDialogProps) {
  const { user } = useAuth()
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [selectedType, setSelectedType] = useState<string>('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingTypes, setFetchingTypes] = useState(false)

  useEffect(() => {
    if (open) {
      fetchReportTypes()
      checkExistingReport()
    }
  }, [open])

  const fetchReportTypes = async () => {
    try {
      setFetchingTypes(true)
      // Report types are hardcoded for now
      const reportTypes: ReportType[] = [
        { id: 'spam', name: '스팸', description: '광고성 컨텐츠', severity: 'low' },
        { id: 'inappropriate', name: '부적절한 내용', description: '욕설, 비방, 혐오 표현 등', severity: 'high' },
        { id: 'false-info', name: '허위 정보', description: '잘못된 정보나 거짓 주장', severity: 'medium' },
        { id: 'copyright', name: '저작권 침해', description: '무단 도용 또는 표절', severity: 'critical' },
        { id: 'other', name: '기타', description: '기타 위반 사항', severity: 'medium' }
      ]
      setReportTypes(reportTypes)
    } catch (error) {
      console.error('Error fetching report types:', error)
      toast.error('신고 유형을 불러오는데 실패했습니다.')
    } finally {
      setFetchingTypes(false)
    }
  }

  const checkExistingReport = async () => {
    if (!user) return

    try {
      const reportableId = commentId || postId
      if (!reportableId) return
      
      // Check existing report using interactions API
      const response = await api.interactions.checkInteraction(
        user.id,
        reportableId,
        'report'
      )
      
      if (!response.success) throw new Error(response.error || 'Failed to check report')
      
      if (response.data === true) {
        toast.info('이미 신고한 내용입니다.')
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error checking existing report:', error)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    if (!selectedType) {
      toast.error('신고 유형을 선택해주세요.')
      return
    }

    try {
      setLoading(true)
      // Create report using the interactions API
      const contentId = commentId || postId
      if (!contentId) throw new Error('No content ID provided')
      
      const response = await api.interactions.toggleInteraction(
        user.id,
        contentId,
        'report',
        {
          report_type: selectedType,
          title: `${postType} 신고`,
          description: description.trim() || ''
        }
      )

      if (!response.success) throw new Error(response.error || 'Failed to create report')

      toast.success('신고가 접수되었습니다. 검토 후 조치하겠습니다.')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error creating report:', error)
      const message = error instanceof Error ? error.message : '신고 접수에 실패했습니다.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedType('')
    setDescription('')
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return '매우 심각'
      case 'high': return '심각'
      case 'medium': return '보통'
      case 'low': return '경미'
      default: return '알 수 없음'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>신고하기</DialogTitle>
          <DialogDescription>
            {title ? `"${title}"에 대한 신고` : `${postType === 'comment' ? '댓글' : '게시글'}에 대한 신고`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">신고 유형</label>
            {fetchingTypes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">신고 유형 로딩 중...</span>
              </div>
            ) : (
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="신고 유형을 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{type.name}</span>
                        <span className={`text-xs ml-2 ${getSeverityColor(type.severity)}`}>
                          ({getSeverityLabel(type.severity)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">상세 설명 (선택사항)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="신고 사유에 대한 추가 설명이 있으면 입력해주세요..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 허위 신고나 악의적인 신고는 제재를 받을 수 있습니다. 
              정확한 사유로 신고해주시기 바랍니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !selectedType || fetchingTypes}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                신고 접수 중...
              </>
            ) : (
              '신고하기'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}