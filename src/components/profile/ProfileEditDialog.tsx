'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { X } from 'lucide-react'

// V2 Hooks
import { useUpdateProfileV2 } from '@/hooks/features/useProfileV2'

// Configs
import { AI_TOOLS } from '@/lib/aiTools'
import { SKILL_LEVELS } from '@/lib/skills'

interface ProfileEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: any
  metadata: {
    skill_level: string
    ai_expertise: string[]
    phone: string | null
    location: string | null
    job_position: string | null
  }
  onSuccess?: () => void
}

export default function ProfileEditDialog({
  open,
  onOpenChange,
  profile,
  metadata,
  onSuccess
}: ProfileEditDialogProps) {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    job_position: '',
    phone: '',
    location: '',
    bio: '',
    skill_level: 'beginner',
    ai_expertise: [] as string[]
  })
  
  const [selectedExpertise, setSelectedExpertise] = useState<string>('')
  const [saving, setSaving] = useState(false)
  
  const updateProfileMutation = useUpdateProfileV2()
  
  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && profile) {
      setFormData({
        name: profile.name || '',
        department: profile.department || '',
        job_position: metadata.job_position || '',
        phone: metadata.phone || '',
        location: metadata.location || '강원도 춘천시',
        bio: profile.bio || '',
        skill_level: metadata.skill_level || 'beginner',
        ai_expertise: metadata.ai_expertise || []
      })
    }
  }, [open, profile, metadata])
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleAddExpertise = () => {
    if (!selectedExpertise) return
    
    if (formData.ai_expertise.includes(selectedExpertise)) {
      toast.error('이미 추가된 전문분야입니다.')
      return
    }
    
    if (formData.ai_expertise.length >= 5) {
      toast.error('AI 전문분야는 최대 5개까지 선택 가능합니다.')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      ai_expertise: [...prev.ai_expertise, selectedExpertise]
    }))
    setSelectedExpertise('')
  }
  
  const handleRemoveExpertise = (expertise: string) => {
    setFormData(prev => ({
      ...prev,
      ai_expertise: prev.ai_expertise.filter(e => e !== expertise)
    }))
  }
  
  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요.')
      return
    }
    
    if (!formData.department.trim()) {
      toast.error('부서를 입력해주세요.')
      return
    }
    
    try {
      setSaving(true)
      
      // Prepare metadata
      const updatedMetadata = {
        ...(profile.metadata || {}),
        skill_level: formData.skill_level,
        ai_expertise: formData.ai_expertise,
        phone: formData.phone || null,
        location: formData.location || null,
        job_position: formData.job_position || null
      }
      
      // Update profile - V2 테이블에서 사용 가능한 필드만 업데이트
      await updateProfileMutation.mutateAsync({
        name: formData.name,
        department: formData.department,
        bio: formData.bio || null,
        skill_level: updatedMetadata.skill_level || 'beginner'
      })
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Profile update failed:', error)
      toast.error('프로필 업데이트에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>프로필 편집</DialogTitle>
          <DialogDescription>
            프로필 정보를 수정하세요. 변경사항은 즉시 반영됩니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">기본 정보</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">부서 *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="정보기획처"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_position">직급</Label>
                <Input
                  id="job_position"
                  value={formData.job_position}
                  onChange={(e) => handleInputChange('job_position', e.target.value)}
                  placeholder="과장"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">지역</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="강원도 춘천시"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="010-1234-5678"
              />
            </div>
          </div>
          
          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">소개글</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="자기소개를 작성해주세요..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              최대 200자까지 작성 가능합니다. ({formData.bio.length}/200)
            </p>
          </div>
          
          {/* Skill Level */}
          <div className="space-y-2">
            <Label htmlFor="skill_level">AI 스킬 레벨</Label>
            <Select
              value={formData.skill_level}
              onValueChange={(value) => handleInputChange('skill_level', value)}
            >
              <SelectTrigger id="skill_level">
                <SelectValue placeholder="스킬 레벨 선택" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SKILL_LEVELS).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center">
                      <config.icon className="h-4 w-4 mr-2" />
                      {config.label} - {config.description}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* AI Expertise */}
          <div className="space-y-2">
            <Label>AI 전문분야 (최대 5개)</Label>
            <div className="flex gap-2">
              <Select
                value={selectedExpertise}
                onValueChange={setSelectedExpertise}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="AI 도구 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AI_TOOLS).filter(([value]) => !formData.ai_expertise.includes(value))
                    .map(([value, tool]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center">
                          <tool.icon className={`h-4 w-4 mr-2 ${tool.color || ''}`} />
                          {tool.label}
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleAddExpertise}
                disabled={!selectedExpertise || formData.ai_expertise.length >= 5}
              >
                추가
              </Button>
            </div>
            
            {formData.ai_expertise.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.ai_expertise.map(expertise => {
                  const tool = AI_TOOLS[expertise]
                  if (!tool) return null
                  
                  return (
                    <Badge
                      key={expertise}
                      variant="secondary"
                      className="pl-2 pr-1 py-1"
                    >
                      <tool.icon className={`h-3 w-3 mr-1 ${tool.color}`} />
                      {tool.label}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                        onClick={() => handleRemoveExpertise(expertise)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )
                })}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              선택된 전문분야: {formData.ai_expertise.length}/5
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="kepco-gradient"
          >
            {saving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}