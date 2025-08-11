'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { RPAProgram } from './RPAListPage'

interface RPACreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (program: RPAProgram) => void
  editingProgram?: RPAProgram | null
}

export default function RPACreateDialog({ open, onOpenChange, onCreated, editingProgram }: RPACreateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    icon: 'excel' | 'pdf' | 'data' | 'bot'
    path: string
    inputTypes: string
    outputTypes: string
  }>({
    title: '',
    description: '',
    icon: 'bot',
    path: '',
    inputTypes: '',
    outputTypes: ''
  })

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (editingProgram) {
      setFormData({
        title: editingProgram.title,
        description: editingProgram.description,
        icon: editingProgram.icon,
        path: editingProgram.path,
        inputTypes: editingProgram.inputTypes.join(', '),
        outputTypes: editingProgram.outputTypes.join(', ')
      })
    } else {
      // 새로 생성할 때는 폼 초기화
      setFormData({
        title: '',
        description: '',
        icon: 'bot',
        path: '',
        inputTypes: '',
        outputTypes: ''
      })
    }
  }, [editingProgram, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const program: RPAProgram = {
        id: editingProgram?.id || `rpa-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        icon: formData.icon,
        path: formData.path || `/rpa/programs/${formData.title.toLowerCase().replace(/\s+/g, '-')}`,
        inputTypes: formData.inputTypes.split(',').map(s => s.trim()).filter(s => s),
        outputTypes: formData.outputTypes.split(',').map(s => s.trim()).filter(s => s),
        isActive: true,
        createdAt: editingProgram?.createdAt || new Date().toISOString()
      }

      // 성공 알림
      if (editingProgram) {
        toast.success(`${program.title}이(가) 성공적으로 수정되었습니다.`)
      } else {
        toast.success(`${program.title}이(가) 성공적으로 추가되었습니다.`)
      }
      
      onCreated(program)
      
      // 폼 초기화
      setFormData({
        title: '',
        description: '',
        icon: 'bot',
        path: '',
        inputTypes: '',
        outputTypes: ''
      })
    } catch (error) {
      console.error('RPA 프로그램 추가 오류:', error)
      toast.error('RPA 프로그램 추가 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{editingProgram ? 'RPA 프로그램 수정' : '새 RPA 프로그램 추가'}</DialogTitle>
          <DialogDescription>
            {editingProgram 
              ? 'RPA 프로그램 정보를 수정합니다.'
              : '새로운 RPA 자동화 프로그램을 추가합니다. Admin만 이 기능을 사용할 수 있습니다.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                제목
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                설명
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                rows={3}
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="icon" className="text-right">
                아이콘
              </Label>
              <Select 
                value={formData.icon} 
                onValueChange={(value: any) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bot">봇 (기본)</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="data">데이터</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="path" className="text-right">
                경로
              </Label>
              <Input
                id="path"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="예: /rpa/programs/excel-compare"
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="inputTypes" className="text-right">
                입력 타입
              </Label>
              <Input
                id="inputTypes"
                value={formData.inputTypes}
                onChange={(e) => setFormData({ ...formData, inputTypes: e.target.value })}
                placeholder="쉼표로 구분 (예: Excel 파일, CSV 파일)"
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="outputTypes" className="text-right">
                출력 타입
              </Label>
              <Input
                id="outputTypes"
                value={formData.outputTypes}
                onChange={(e) => setFormData({ ...formData, outputTypes: e.target.value })}
                placeholder="쉼표로 구분 (예: 결과 파일, 리포트)"
                className="col-span-3"
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading} className="kepco-gradient">
              {loading ? (editingProgram ? '수정 중...' : '추가 중...') : (editingProgram ? '수정하기' : '추가하기')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}