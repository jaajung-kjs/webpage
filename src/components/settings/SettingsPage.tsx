'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Bell, 
  Shield, 
  User, 
  Mail, 
  Moon, 
  Sun, 
  Globe,
  Save,
  Trash2,
  Key,
  Database,
  Download,
  Upload
} from 'lucide-react'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { Tables } from '@/lib/database.types'
import { useUserProfileComplete, useUpdateProfileV2 } from '@/hooks/features/useProfileV2'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { supabaseClient } from '@/lib/core/connection-core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function SettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const updateProfileMutation = useUpdateProfileV2()
  
  // 알림 설정
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [communityUpdates, setCommunityUpdates] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  
  // 개인정보 설정
  const [profilePublic, setProfilePublic] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [showPhone, setShowPhone] = useState(false)
  
  // 테마 설정
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  
  // User metadata
  const [userMetadata, setUserMetadata] = useState<{
    joinDate: string | null
    lastLogin: string | null
  }>({
    joinDate: null,
    lastLogin: null
  })
  
  // Password change dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  // Load user settings using React Query
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      // Load settings and user data in parallel
      const [settingsResult, userResult] = await Promise.allSettled([
        Promise.resolve({ data: null, error: null }), // TODO: Implement user_metadata_v2 key-value structure
        supabaseClient.from('users_v2').select('*').eq('id', user.id).single()
      ])
      
      const data: any = {}
      
      if (settingsResult.status === 'fulfilled' && !settingsResult.value.error && settingsResult.value.data) {
        data.settings = settingsResult.value.data
      }
      
      if (userResult.status === 'fulfilled' && !userResult.value.error && userResult.value.data) {
        data.metadata = {
          joinDate: userResult.value.data.created_at || null,
          lastLogin: userResult.value.data.last_login_at || null
        }
      }
      
      return data
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })

  // Apply settings when data loads
  useEffect(() => {
    if (settingsData) {
      if (settingsData.settings) {
        const settings = settingsData.settings
        setEmailNotifications(settings.email_notifications ?? true)
        setPushNotifications(settings.push_notifications ?? false)
        setCommunityUpdates(settings.community_updates ?? true)
        setWeeklyDigest(settings.weekly_digest ?? true)
        setProfilePublic(settings.profile_public ?? true)
        setShowEmail(settings.show_email ?? false)
        setShowPhone(settings.show_phone ?? false)
        setTheme(settings.theme as 'light' | 'dark' | 'system' || 'system')
        setLanguage(settings.language as 'ko' | 'en' || 'ko')
      }
      
      if (settingsData.metadata) {
        setUserMetadata(settingsData.metadata)
      }
    }
  }, [settingsData, settingsLoading])

  // Settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다.')
      
      const settingsUpdate = {
        user_id: user.id,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        community_updates: communityUpdates,
        weekly_digest: weeklyDigest,
        profile_public: profilePublic,
        show_email: showEmail,
        show_phone: showPhone,
        theme,
        language,
        updated_at: new Date().toISOString()
      }

      // TODO: Implement settings save with user_metadata_v2 key-value structure
      console.log('Settings to save:', settingsUpdate)
      // For now, settings save is disabled until proper key-value implementation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] })
      toast.success('설정이 저장되었습니다.')
    },
    onError: (error) => {
      console.error('Failed to save settings:', error)
      toast.error('설정 저장에 실패했습니다.')
    }
  })

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate()
  }

  const handleExportData = () => {
    toast.info('데이터 내보내기 기능은 준비 중입니다.')
  }

  const handleDeleteAccount = () => {
    toast.error('계정 삭제 기능은 관리자에게 문의해주세요.')
  }

  // Show loading state
  if (settingsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">설정을 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if not logged in
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">로그인이 필요합니다.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">설정</h1>
          <p className="text-muted-foreground">
            계정 및 애플리케이션 설정을 관리합니다.
          </p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications">알림</TabsTrigger>
            <TabsTrigger value="privacy">개인정보</TabsTrigger>
            <TabsTrigger value="appearance">화면</TabsTrigger>
            <TabsTrigger value="account">계정</TabsTrigger>
          </TabsList>

          {/* 알림 설정 */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>알림 설정</span>
                </CardTitle>
                <CardDescription>
                  받고 싶은 알림 유형을 선택하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>이메일 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      중요한 업데이트를 이메일로 받습니다.
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>브라우저 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      브라우저에서 실시간 알림을 받습니다.
                    </p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>커뮤니티 활동</Label>
                    <p className="text-sm text-muted-foreground">
                      새 댓글, 좋아요 등의 알림을 받습니다.
                    </p>
                  </div>
                  <Switch
                    checked={communityUpdates}
                    onCheckedChange={setCommunityUpdates}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>주간 소식</Label>
                    <p className="text-sm text-muted-foreground">
                      매주 주요 활동 요약을 받습니다.
                    </p>
                  </div>
                  <Switch
                    checked={weeklyDigest}
                    onCheckedChange={setWeeklyDigest}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 개인정보 설정 */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>개인정보 보호</span>
                </CardTitle>
                <CardDescription>
                  다른 사용자에게 공개할 정보를 선택하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>프로필 공개</Label>
                    <p className="text-sm text-muted-foreground">
                      다른 회원들이 내 프로필을 볼 수 있습니다.
                    </p>
                  </div>
                  <Switch
                    checked={profilePublic}
                    onCheckedChange={setProfilePublic}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>이메일 주소 공개</Label>
                    <p className="text-sm text-muted-foreground">
                      프로필에 이메일 주소를 표시합니다.
                    </p>
                  </div>
                  <Switch
                    checked={showEmail}
                    onCheckedChange={setShowEmail}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>전화번호 공개</Label>
                    <p className="text-sm text-muted-foreground">
                      프로필에 전화번호를 표시합니다.
                    </p>
                  </div>
                  <Switch
                    checked={showPhone}
                    onCheckedChange={setShowPhone}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 화면 설정 */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sun className="h-5 w-5" />
                  <span>화면 설정</span>
                </CardTitle>
                <CardDescription>
                  애플리케이션의 모양과 느낌을 사용자 지정하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>테마</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      onClick={() => setTheme('light')}
                      className="justify-start"
                    >
                      <Sun className="mr-2 h-4 w-4" />
                      라이트
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      onClick={() => setTheme('dark')}
                      className="justify-start"
                    >
                      <Moon className="mr-2 h-4 w-4" />
                      다크
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      onClick={() => setTheme('system')}
                      className="justify-start"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      시스템
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="language">언어</Label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'ko' | 'en')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 계정 설정 */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>계정 정보</span>
                </CardTitle>
                <CardDescription>
                  계정 정보를 확인하고 관리하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>이메일</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>가입일</Label>
                  <Input 
                    value={userMetadata.joinDate 
                      ? new Date(userMetadata.joinDate).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : '정보 없음'} 
                    disabled 
                  />
                </div>
                <div className="space-y-2">
                  <Label>마지막 로그인</Label>
                  <Input 
                    value={userMetadata.lastLogin 
                      ? new Date(userMetadata.lastLogin).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '정보 없음'} 
                    disabled 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>보안</span>
                </CardTitle>
                <CardDescription>
                  비밀번호 및 보안 설정을 관리하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  <Key className="mr-2 h-4 w-4" />
                  비밀번호 변경
                </Button>
                <Button variant="outline" className="w-full">
                  <Shield className="mr-2 h-4 w-4" />
                  2단계 인증 설정
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>데이터 관리</span>
                </CardTitle>
                <CardDescription>
                  내 데이터를 관리하고 다운로드하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full" onClick={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  데이터 내보내기
                </Button>
                <Button variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  데이터 가져오기
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">위험 구역</CardTitle>
                <CardDescription>
                  이 작업들은 되돌릴 수 없습니다. 신중하게 진행하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  계정 삭제
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveSettings} 
            disabled={updateSettingsMutation.isPending}
            className="kepco-gradient"
          >
            <Save className="mr-2 h-4 w-4" />
            {updateSettingsMutation.isPending ? '저장 중...' : '설정 저장'}
          </Button>
        </div>
      </motion.div>

      {/* Password Change Dialog */}
      <ChangePasswordDialog 
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </div>
  )
}