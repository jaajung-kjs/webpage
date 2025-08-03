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
import { supabase, Tables } from '@/lib/supabase/client'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'

type ReportType = Tables<'report_types'>
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postType: 'community' | 'case' | 'announcement' | 'comment'
  postId?: string
  commentId?: string
  title?: string
  targetType?: 'content' | 'comment'
  targetId?: string
  parentContentId?: string
}


export function ReportDialog({
  open,
  onOpenChange,
  postType,
  postId,
  commentId,
  title,
  targetType,
  targetId,
  parentContentId
}: ReportDialogProps) {
  const { user } = useOptimizedAuth()
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
      const { data, error } = await supabase
        .from('report_types')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
      
      if (error) {
        throw error
      }
      
      if (data) {
        setReportTypes(data)
      }
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
      const reportableId = targetId || commentId || postId
      const reportTargetType = targetType || (commentId ? 'comment' : 'content')
      
      if (!reportableId) return
      
      // Check if user has already reported this content
      const { data: existingReports, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .eq('target_id', reportableId)
        .eq('target_type', reportTargetType)
      
      if (!error && existingReports && existingReports.length > 0) {
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
      const reportableId = targetId || commentId || postId
      const reportTargetType = targetType || (commentId ? 'comment' : 'content')
      
      if (!reportableId) throw new Error('No content ID provided')
      
      const selectedReportType = reportTypes.find(type => type.id === selectedType)
      if (!selectedReportType) {
        throw new Error('선택한 신고 유형을 찾을 수 없습니다.')
      }
      
      const reportData: any = {
        target_type: reportTargetType,
        target_id: reportableId,
        report_type_id: selectedType,
        reason: selectedReportType.name,
        description: description.trim() || null,
        reporter_id: user.id
      }
      
      // Add parent_content_id for comment reports
      if (reportTargetType === 'comment' && parentContentId) {
        reportData.parent_content_id = parentContentId
      }
      
      const { error } = await supabase
        .from('reports')
        .insert(reportData)

      if (error) throw error

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
      <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
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
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{type.name}</span>
                          <span className={`text-xs ${getSeverityColor(type.severity)}`}>
                            ({getSeverityLabel(type.severity)})
                          </span>
                        </div>
                        {type.description && (
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        )}
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