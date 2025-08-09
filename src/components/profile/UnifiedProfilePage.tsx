'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  MapPin,
  Calendar,
  Mail,
  Phone,
  Award,
  Activity,
  BookOpen,
  MessageSquare,
  Users,
  ArrowLeft,
  Edit,
  Shield,
  TrendingUp,
  Clock,
  Target,
  Eye,
  Heart,
  Trophy,
  Settings,
  Bell,
  Camera
} from 'lucide-react'
import { useAuth } from '@/providers'
import { toast } from 'sonner'

// V2 Hooks
import { useUserProfileComplete, useUpdateProfileV2 } from '@/hooks/features/useProfileV2'
import { useUploadAvatar } from '@/hooks/features/useProfileV2'
import { useGamificationV2, useAchievementsV2, useUserRank } from '@/hooks/features'

// Configs
import { getRoleConfig } from '@/lib/roles'
import { getSkillLevelConfig } from '@/lib/skills'
import { getActivityLevelInfo, calculateLevelProgress } from '@/lib/activityLevels'
import { getAIToolConfig } from '@/lib/aiTools'
import { ACHIEVEMENTS, TIER_COLORS, TIER_ICONS } from '@/lib/achievements'

// Profile Edit Dialog
import ProfileEditDialog from './ProfileEditDialog'

interface UnifiedProfilePageProps {
  userId?: string
}

export default function UnifiedProfilePage({ userId }: UnifiedProfilePageProps) {
  const router = useRouter()
  const { user, profile: currentUserProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('activity')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  // 현재 사용자의 프로필인지 확인
  const targetUserId = userId || user?.id
  const isOwnProfile = !userId || userId === user?.id
  
  // V2 통합 Hook 사용
  const { 
    data: profileData, 
    isLoading: loading, 
    refetch
  } = useUserProfileComplete(targetUserId, true, 10, true)
  
  const updateProfileMutation = useUpdateProfileV2()
  const uploadAvatarMutation = useUploadAvatar()
  
  // 게임화 V2 시스템
  const {
    userStats,
    userGameData,
    currentLevel,
    currentActivityLevel,
    currentScore,
    levelProgress,
    totalAchievements,
    recentAchievements,
    isLoading: isGamificationLoading
  } = useGamificationV2(targetUserId)
  
  const {
    earnedAchievements,
    totalEarned,
    totalPoints,
    tierCounts,
    isLoading: isAchievementsLoading
  } = useAchievementsV2(targetUserId)
  
  const userRank = useUserRank(targetUserId)
  
  // 프로필 데이터 추출
  const profile = profileData?.profile
  const stats = profileData?.stats
  const recentActivities = profileData?.recent_activities || []
  const achievementProgress = profileData?.achievements || []
  
  // V2에서는 메타데이터가 직접 필드로 저장됨
  const metadata = useMemo(() => {
    return {
      skill_level: profile?.skill_level || 'beginner',
      ai_expertise: [], // V2에서는 아직 미구현
      phone: null, // V2에서는 아직 미구현
      location: null, // V2에서는 아직 미구현
      job_position: null // V2에서는 아직 미구현
    }
  }, [profile])
  
  // 완료된 업적 - V2 시스템 사용
  const completedAchievements = useMemo(() => {
    return earnedAchievements || []
  }, [earnedAchievements])
  
  // 권한 체크
  const hasPermission = useMemo(() => {
    if (!user) return false
    if (isOwnProfile) return true
    const isMember = currentUserProfile && ['member', 'vice-leader', 'leader', 'admin'].includes(currentUserProfile.role)
    return isMember || false
  }, [user, isOwnProfile, currentUserProfile])
  
  // 아바타 업로드 핸들러
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    try {
      setUploadingAvatar(true)
      const avatarUrl = await uploadAvatarMutation.mutateAsync(file)
      
      await updateProfileMutation.mutateAsync({
        avatar_url: avatarUrl
      })
      
      toast.success('프로필 사진이 업데이트되었습니다.')
      refetch()
    } catch (error) {
      console.error('Avatar upload failed:', error)
      toast.error('프로필 사진 업로드에 실패했습니다.')
    } finally {
      setUploadingAvatar(false)
      event.target.value = ''
    }
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '정보 없음'
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return '방금 전'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`
    
    return formatDate(dateString)
  }
  
  // Loading state
  if (loading || isGamificationLoading || isAchievementsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-24 bg-muted rounded mb-8" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-24 w-24 bg-muted rounded-full" />
                  <div className="h-6 w-32 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Not found
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">프로필을 찾을 수 없습니다</h2>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
        </div>
      </div>
    )
  }
  
  // Permission check
  if (!hasPermission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">접근 권한이 없습니다</CardTitle>
            <CardDescription>
              {user ? '동아리 회원만 다른 회원의 프로필을 볼 수 있습니다.' : '로그인이 필요한 페이지입니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentUserProfile?.role === 'guest' && (
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
            
            {currentUserProfile?.role === 'pending' && (
              <>
                <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
                  <Users className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    현재 회원님의 가입 신청이 <strong>검토 중</strong>입니다.
                    운영진의 승인을 기다려주세요.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  홈으로 돌아가기
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const activityLevel = getActivityLevelInfo(profile?.activity_score || 0)
  const activityProgress = calculateLevelProgress(profile?.activity_score || 0)
  const roleConfig = getRoleConfig(profile?.role || 'member')
  const skillConfig = getSkillLevelConfig(metadata.skill_level)
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Button onClick={() => router.back()} variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          돌아가기
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card - 왼쪽 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-1"
        >
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Avatar & Basic Info */}
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || ''} />
                      <AvatarFallback className="text-2xl">
                        {profile?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                      <>
                        <label htmlFor="avatar-upload" className="absolute bottom-0 right-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 rounded-full p-0 shadow-lg"
                            disabled={uploadingAvatar}
                            asChild
                          >
                            <span className="cursor-pointer">
                              {uploadingAvatar ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Camera className="h-4 w-4" />
                              )}
                            </span>
                          </Button>
                        </label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-bold">{profile?.name || '익명'}</h2>
                  <p className="text-sm text-muted-foreground">
                    {profile?.department || '미상'} {metadata.job_position && `· ${metadata.job_position}`}
                  </p>
                  
                  <div className="flex items-center justify-center flex-wrap gap-2 mt-3">
                    {roleConfig && (
                      <Badge variant="secondary" className={roleConfig.color}>
                        <roleConfig.icon className="h-3 w-3 mr-1" />
                        {roleConfig.label}
                      </Badge>
                    )}
                    
                    {/* V2 스킬 레벨 */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                            <Trophy className="h-3 w-3 mr-1" />
                            {currentLevel === 'beginner' ? '초급' : 
                             currentLevel === 'intermediate' ? '중급' :
                             currentLevel === 'advanced' ? '고급' : '전문가'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold">스킬 레벨</p>
                          <p className="text-xs">현재 점수: {currentScore}점</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* V2 활동 레벨 */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                            <Activity className="h-3 w-3 mr-1" />
                            {currentActivityLevel === 'beginner' ? '신입' :
                             currentActivityLevel === 'active' ? '활발' :
                             currentActivityLevel === 'enthusiast' ? '열정' : '리더'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold">활동 레벨</p>
                          <p className="text-xs">참여도 기반</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* 순위 표시 */}
                    {userRank && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              #{userRank.rank}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">전체 순위</p>
                            <p className="text-xs">월간 기준</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  
                  {/* Activity Score V2 */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">활동 점수</span>
                      <span className="text-sm font-bold">{currentScore}점</span>
                    </div>
                    {levelProgress && (
                      <>
                        <Progress value={levelProgress.progress} className="h-2" />
                        <p className="text-xs mt-1 text-muted-foreground">
                          {levelProgress.nextLevelPoints > 0 ? 
                            `다음 레벨까지 ${levelProgress.nextLevelPoints}점 필요` :
                            '최고 레벨 달성!'
                          }
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    {profile?.bio || 'AI 학습동아리 회원입니다.'}
                  </p>
                </div>

                {/* AI Expertise & Skills */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-medium mb-2">AI 전문분야</h3>
                    <div className="flex flex-wrap gap-1">
                      {metadata.ai_expertise.length > 0 ? (
                        <>
                          {metadata.ai_expertise.slice(0, 2).map((expertise: string) => {
                            const toolConfig = getAIToolConfig(expertise)
                            const Icon = toolConfig?.icon
                            return (
                              <Badge key={expertise} variant="outline" className="text-xs">
                                {Icon && <Icon className={`h-3 w-3 mr-1 ${toolConfig.color || ''}`} />}
                                {toolConfig?.label || expertise}
                              </Badge>
                            )
                          })}
                          {metadata.ai_expertise.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{metadata.ai_expertise.length - 2}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">미등록</span>
                      )}
                    </div>
                  </div>
                  
                  {skillConfig && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">스킬 레벨</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className={skillConfig.color}>
                              <skillConfig.icon className="h-3 w-3 mr-1" />
                              {skillConfig.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">AI 스킬 레벨</p>
                            <p className="text-xs">{skillConfig.description}</p>
                            <p className="text-xs mt-1">활동 점수 {skillConfig.minScore}점 이상</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>

                {/* Achievements V2 */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">획득 업적</h3>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>{totalEarned}개</span>
                      <span>·</span>
                      <span>{totalPoints}점</span>
                    </div>
                  </div>
                  
                  {/* 티어별 통계 */}
                  {tierCounts && (tierCounts.bronze + tierCounts.silver + tierCounts.gold + tierCounts.platinum > 0) && (
                    <div className="flex items-center justify-center space-x-2 mb-3 text-xs">
                      {tierCounts.platinum > 0 && (
                        <Badge variant="outline" className="px-1 py-0 text-xs">
                          💎 {tierCounts.platinum}
                        </Badge>
                      )}
                      {tierCounts.gold > 0 && (
                        <Badge variant="outline" className="px-1 py-0 text-xs">
                          🥇 {tierCounts.gold}
                        </Badge>
                      )}
                      {tierCounts.silver > 0 && (
                        <Badge variant="outline" className="px-1 py-0 text-xs">
                          🥈 {tierCounts.silver}
                        </Badge>
                      )}
                      {tierCounts.bronze > 0 && (
                        <Badge variant="outline" className="px-1 py-0 text-xs">
                          🥉 {tierCounts.bronze}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {completedAchievements.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1">
                        {completedAchievements.slice(0, 6).map((achievement) => (
                          <TooltipProvider key={achievement.name}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="secondary" 
                                  className={`justify-center cursor-help text-xs ${TIER_COLORS[achievement.tier]}`}
                                >
                                  <span className="mr-1">{achievement.icon}</span>
                                  <span className="truncate">{achievement.name}</span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <p className="font-semibold">{achievement.name}</p>
                                  <p className="text-muted-foreground">{achievement.description}</p>
                                  <p className="mt-1">
                                    {TIER_ICONS[achievement.tier]} {achievement.tier} • {achievement.points}점
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                      {completedAchievements.length > 6 && (
                        <div className="text-xs text-center text-muted-foreground">
                          +{completedAchievements.length - 6}개 더 보기
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">아직 획득한 업적이 없습니다</p>
                  )}
                </div>

                {/* Contact Info */}
                <div className="border-t pt-4 space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{profile?.email || ''}</span>
                  </div>
                  {metadata.phone && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{metadata.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{metadata.location || '강원도 춘천시'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(profile?.created_at || null)} 가입</span>
                  </div>
                  {isOwnProfile && profile?.last_login_at && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>마지막 로그인: {formatRelativeTime(profile.last_login_at)}</span>
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                {isOwnProfile && (
                  <Button 
                    className="w-full kepco-gradient"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    프로필 편집
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content - 오른쪽 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">활동 내역</TabsTrigger>
              <TabsTrigger value="stats">통계</TabsTrigger>
              {isOwnProfile && <TabsTrigger value="settings">설정</TabsTrigger>}
            </TabsList>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>최근 활동</CardTitle>
                  <CardDescription>최근 활동 내역입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivities.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivities.map((activity: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3 border-b pb-4 last:border-b-0">
                          <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                              <Activity className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatRelativeTime(activity.date)}
                            </p>
                            <div className="mt-2 flex space-x-4 text-xs text-muted-foreground">
                              {activity.engagement?.views > 0 && (
                                <span className="flex items-center">
                                  <Eye className="mr-1 h-3 w-3" />
                                  {activity.engagement.views}
                                </span>
                              )}
                              {activity.engagement?.likes > 0 && (
                                <span className="flex items-center">
                                  <Heart className="mr-1 h-3 w-3" />
                                  {activity.engagement.likes}
                                </span>
                              )}
                              {activity.engagement?.comments > 0 && (
                                <span className="flex items-center">
                                  <MessageSquare className="mr-1 h-3 w-3" />
                                  {activity.engagement.comments}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">아직 활동 내역이 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="space-y-6">
              {/* 게시글 통계 */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">게시글 통계</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">총 게시글</span>
                        <span className="font-semibold">{stats?.total_content_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">총 댓글</span>
                        <span className="font-semibold">{stats?.comments_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">받은 좋아요</span>
                        <span className="font-semibold">{stats?.total_likes_received || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">총 조회수</span>
                        <span className="font-semibold">{(stats?.total_views || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">참여 통계</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">참여 활동</span>
                        <span className="font-semibold">{stats?.activities_joined || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">공유 자료</span>
                        <span className="font-semibold">{stats?.resources_count || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">활동 점수</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{profile?.activity_score || 0}</span>
                          <Badge variant="secondary" className={`${activityLevel.color} text-xs`}>
                            <activityLevel.icon className="h-3 w-3 mr-0.5" />
                            {activityLevel.level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 업적 진행률 */}
              {achievementProgress.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="h-5 w-5" />
                      <span>업적 진행률</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 완료된 업적 통계 */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {achievementProgress.filter(a => a.is_completed).length}
                          </div>
                          <div className="text-xs text-muted-foreground">완료된 업적</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {achievementProgress
                              .filter(a => a.is_completed)
                              .reduce((sum, a) => sum + a.points, 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">획득 포인트</div>
                        </div>
                      </div>
                      
                      {/* 카테고리별 진행률 */}
                      {[
                        { type: 'posts', label: '콘텐츠 작성', icon: '📝' },
                        { type: 'activities', label: '활동 참여', icon: '🎭' },
                        { type: 'likes', label: '인기도', icon: '❤️' },
                        { type: 'days', label: '가입 기간', icon: '📅' }
                      ].map(category => {
                        const categoryAchievements = achievementProgress.filter(
                          (a: any) => a.requirement_type === category.type
                        )
                        const completedCount = categoryAchievements.filter((a: any) => a.is_completed).length
                        const totalCount = categoryAchievements.length
                        const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
                        
                        return (
                          <div key={category.type}>
                            <div className="flex justify-between text-sm">
                              <span>
                                {category.icon} {category.label}
                              </span>
                              <span className="text-muted-foreground">
                                {completedCount}/{totalCount} 완료
                              </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                              <div 
                                className="h-full bg-gradient-to-r from-kepco-blue-400 to-kepco-blue-600 transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 콘텐츠 작성 현황 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>콘텐츠 작성 현황</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {stats?.posts_count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">게시글</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {stats?.cases_count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">사례</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {stats?.announcements_count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">공지사항</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {stats?.resources_count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">자료</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab - 내 프로필만 */}
            {isOwnProfile && (
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="h-5 w-5" />
                      <span>계정 설정</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">이메일 알림</h4>
                        <p className="text-sm text-muted-foreground">새 댓글, 좋아요 알림 받기</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Bell className="mr-2 h-4 w-4" />
                        설정
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">개인정보 보호</h4>
                        <p className="text-sm text-muted-foreground">프로필 공개 범위 설정</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Shield className="mr-2 h-4 w-4" />
                        설정
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </div>

      {/* Profile Edit Dialog */}
      {isOwnProfile && profile && (
        <ProfileEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={profile}
          metadata={metadata}
          onSuccess={() => {
            refetch()
            toast.success('프로필이 업데이트되었습니다.')
          }}
        />
      )}
    </div>
  )
}