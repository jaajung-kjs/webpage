'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Info, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  FileText,
  Users,
  BookOpen,
  Target
} from 'lucide-react'
import { useAuth, useProfile } from '@/contexts/AuthContext'
import { supabase, Tables, TablesInsert } from '@/lib/supabase/client'
import { toast } from 'sonner'

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

const experienceLevels = [
  { value: 'beginner', label: '초급 (AI 도구를 처음 접함)' },
  { value: 'intermediate', label: '중급 (가끔 사용해봄)' },
  { value: 'advanced', label: '고급 (자주 사용함)' },
  { value: 'expert', label: '전문가 (매일 활용함)' }
]

export default function MembershipApplicationPage() {
  const { user } = useAuth()
  const profile = useProfile()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [application, setApplication] = useState<Tables<'membership_applications'> | null>(null)
  
  // Form state
  const [applicationReason, setApplicationReason] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [experienceLevel, setExperienceLevel] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  useEffect(() => {
    checkApplicationStatus()
  }, [user, profile])
  
  const checkApplicationStatus = async () => {
    if (!user) {
      router.push('/')
      return
    }
    
    // Wait for profile to load
    if (!profile) {
      return
    }
    
    // Check if user is already a member
    if (profile.role && ['member', 'admin', 'leader', 'vice-leader'].includes(profile.role)) {
      toast.info('이미 동아리 회원입니다.')
      router.push('/profile')
      return
    }
    
    // Check if user is not a guest
    if (profile.role !== 'guest') {
      toast.error('가입 신청 권한이 없습니다.')
      router.push('/')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('membership_applications')
        .select('*')
        .eq('user_id', user.id)
        .single()
        
      if (data) {
        setApplication(data)
      }
    } catch (error) {
      console.error('Error checking application status:', error)
    } finally {
      setChecking(false)
    }
  }
  
  const handleSubmit = async () => {
    if (!user) return
    
    // Validation
    if (applicationReason.length < 100) {
      toast.error('가입 동기를 최소 100자 이상 작성해주세요.')
      return
    }
    
    if (selectedInterests.length === 0) {
      toast.error('관심 분야를 하나 이상 선택해주세요.')
      return
    }
    
    if (!experienceLevel) {
      toast.error('AI 도구 사용 경험을 선택해주세요.')
      return
    }
    
    if (!agreedToTerms) {
      toast.error('개인정보 수집 및 이용에 동의해주세요.')
      return
    }
    
    setLoading(true)
    
    try {
      const applicationData: TablesInsert<'membership_applications'> = {
        user_id: user.id,
        application_reason: applicationReason,
        interests: selectedInterests,
        experience_level: experienceLevel,
        status: 'pending'
      }
      
      const { data, error } = await supabase
        .from('membership_applications')
        .insert(applicationData)
        .select()
        .single()
      
      if (error) throw error
      
      if (data) {
        toast.success('가입 신청이 완료되었습니다.')
        setApplication(data)
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      toast.error(error instanceof Error ? error.message : '가입 신청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    )
  }
  
  if (checking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }
  
  // Show application status if already applied
  if (application) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {application.status === 'pending' && (
                <>
                  <Clock className="h-5 w-5 text-yellow-600" />
                  가입 신청 대기 중
                </>
              )}
              {application.status === 'approved' && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  가입 승인 완료
                </>
              )}
              {application.status === 'rejected' && (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  가입 신청 거절됨
                </>
              )}
            </CardTitle>
            <CardDescription>
              신청일: {new Date(application.created_at).toLocaleDateString('ko-KR')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {application.status === 'pending' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  가입 신청이 접수되었습니다. 운영진이 검토 후 승인 여부를 결정합니다.
                  보통 1-3일 내에 처리됩니다.
                </AlertDescription>
              </Alert>
            )}
            
            {application.status === 'approved' && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  축하합니다! 가입이 승인되었습니다. 이제 모든 기능을 이용하실 수 있습니다.
                </AlertDescription>
              </Alert>
            )}
            
            {application.status === 'rejected' && (
              <>
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    죄송합니다. 가입 신청이 거절되었습니다.
                  </AlertDescription>
                </Alert>
                {application.review_notes && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm font-medium mb-1">거절 사유:</p>
                    <p className="text-sm text-muted-foreground">{application.review_notes}</p>
                  </div>
                )}
              </>
            )}
            
            <Separator />
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">가입 동기</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {application.application_reason}
                </p>
              </div>
              
              {application.interests && application.interests.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">관심 분야</p>
                  <div className="flex flex-wrap gap-2">
                    {application.interests.map((interest: string) => (
                      <Badge key={interest} variant="secondary">
                        {interests.find(i => i.id === interest)?.label || interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {application.experience_level && (
                <div>
                  <p className="text-sm font-medium mb-1">경험 수준</p>
                  <p className="text-sm text-muted-foreground">
                    {experienceLevels.find(e => e.value === application.experience_level)?.label}
                  </p>
                </div>
              )}
            </div>
            
            <div className="pt-4">
              <Button onClick={() => router.push('/')} className="w-full">
                홈으로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Show application form
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              KEPCO AI 학습동아리 가입 신청
            </CardTitle>
            <CardDescription>
              동아리 가입을 위해 아래 정보를 작성해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Application Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                가입 동기 (필수, 최소 100자)
              </Label>
              <Textarea
                id="reason"
                placeholder="AI 학습동아리에 가입하고자 하는 이유와 목표를 자세히 작성해주세요."
                value={applicationReason}
                onChange={(e) => setApplicationReason(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {applicationReason.length} / 100자 이상
              </p>
            </div>
            
            {/* Interests */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                관심 분야 (1개 이상 선택)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {interests.map(interest => (
                  <div key={interest.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={interest.id}
                      checked={selectedInterests.includes(interest.id)}
                      onCheckedChange={() => toggleInterest(interest.id)}
                    />
                    <Label
                      htmlFor={interest.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {interest.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Experience Level */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                AI 도구 사용 경험
              </Label>
              <RadioGroup value={experienceLevel} onValueChange={setExperienceLevel}>
                {experienceLevels.map(level => (
                  <div key={level.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={level.value} id={level.value} />
                    <Label htmlFor={level.value} className="font-normal cursor-pointer">
                      {level.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <Separator />
            
            {/* Terms Agreement */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                  개인정보 수집 및 이용에 동의합니다.
                  <span className="block text-xs text-muted-foreground mt-1">
                    가입 신청을 위해 이름, 이메일, 부서 정보가 수집되며,
                    동아리 운영 목적으로만 사용됩니다.
                  </span>
                </Label>
              </div>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                가입 신청 후 운영진의 승인이 필요합니다. 
                승인 완료 시 모든 동아리 기능을 이용하실 수 있습니다.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 kepco-gradient"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                가입 신청
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}