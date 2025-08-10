'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
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
  Camera,
  FileText,
  UserCheck,
  ThumbsUp
} from 'lucide-react'
import { useAuth } from '@/providers'
import { toast } from 'sonner'

// V2 Hooks
import { useUserProfileComplete, useUpdateProfileV2 } from '@/hooks/features/useProfileV2'
import { useUploadAvatar } from '@/hooks/features/useProfileV2'
import { useGamificationV2, useUserRank } from '@/hooks/features'

// Configs
import { getRoleConfig } from '@/lib/roles'
import { getSkillLevelConfig } from '@/lib/skills'
import { getActivityLevelInfo, calculateLevelProgress } from '@/lib/activityLevels'
import { getAIToolConfig } from '@/lib/aiTools'

// Profile Edit Dialog
import ProfileEditDialog from './ProfileEditDialog'

// Shared Components
import UserLevelBadges from '@/components/shared/UserLevelBadges'

interface UnifiedProfilePageProps {
  userId?: string
}

export default function UnifiedProfilePage({ userId }: UnifiedProfilePageProps) {
  const router = useRouter()
  const { user, profile: currentUserProfile } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('activity')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showAllAchievements, setShowAllAchievements] = useState(false)
  
  // 현재 사용자의 프로필인지 확인
  const targetUserId = userId || user?.id
  const isOwnProfile = !userId || userId === user?.id
  
  // V2 통합 Hook 사용 - 최근활동을 8개로 제한
  const { 
    data: profileData, 
    isLoading: loading, 
    refetch
  } = useUserProfileComplete(targetUserId, true, 8, true)
  
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
    isLoading: isGamificationLoading
  } = useGamificationV2(targetUserId)
  
  
  const userRank = useUserRank(targetUserId)
  
  
  // 프로필 데이터 추출
  const profile = profileData?.profile
  const stats = profileData?.stats
  const recentActivities = profileData?.recent_activities || []
  
  // V2에서는 메타데이터가 직접 필드로 저장됨
  const metadata = useMemo(() => {
    // stats나 profile의 metadata 필드에서 실제 데이터 가져오기
    const dbMetadata = profile?.metadata || (userStats && typeof userStats === 'object' && 'metadata' in userStats ? userStats.metadata : {}) || {}
    const metadata = typeof dbMetadata === 'object' && dbMetadata !== null ? dbMetadata as any : {}
    return {
      skill_level: profile?.skill_level || 'beginner',
      ai_expertise: metadata.ai_expertise || [],
      phone: metadata.phone || null,
      location: metadata.location || null,
      job_position: metadata.job_position || null
    }
  }, [profile, userStats])
  
  
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
  
  // 활동 타입별 아이콘 결정 함수
  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'post':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'comment': 
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case 'activity':
        return <UserCheck className="h-4 w-4 text-purple-600" />
      case 'like':
        return <ThumbsUp className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-blue-600" />
    }
  }
  
  // 활동 타입별 배경색 결정 함수
  const getActivityIconBg = (type: string) => {
    switch(type) {
      case 'post':
        return 'bg-blue-100'
      case 'comment': 
        return 'bg-green-100'
      case 'activity':
        return 'bg-purple-100'
      case 'like':
        return 'bg-red-100'
      default:
        return 'bg-blue-100'
    }
  }
  
  // Loading state
  if (loading || isGamificationLoading) {
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
  
  // userStats 안전한 접근을 위한 헬퍼
  const getUserStat = (key: string): any => {
    return userStats && typeof userStats === 'object' && key in userStats ? (userStats as any)[key] : null
  }

  const userActivityScore = getUserStat('activity_score') || profile?.activity_score || 0
  const activityLevel = getActivityLevelInfo(userActivityScore)
  const activityProgress = calculateLevelProgress(userActivityScore)
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
                    
                    {/* V2 레벨 뱃지 시스템 - 개별 뱃지들로 분리해서 회원목록과 동일하게 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 스킬 레벨 뱃지 */}
                      <UserLevelBadges 
                        userId={targetUserId} 
                        variant="minimal" 
                        size="sm" 
                        showOnlySkill={true}
                        className="flex-shrink-0"
                      />
                      
                      {/* 활동 레벨 뱃지 */}
                      <UserLevelBadges 
                        userId={targetUserId} 
                        variant="minimal" 
                        size="sm" 
                        showOnlyActivity={true}
                        className="flex-shrink-0"
                      />
                      
                      {/* 랭킹 뱃지 */}
                      <UserLevelBadges 
                        userId={targetUserId} 
                        variant="minimal" 
                        size="sm" 
                        showOnlyRank={true}
                        className="flex-shrink-0"
                      />
                    </div>
                  </div>
                  
                  {/* Activity Score V2 */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">활동 점수</span>
                      <span className="text-sm font-bold">{getUserStat('activity_score') || profile?.activity_score || 0}점</span>
                    </div>
                    {getUserStat('level_progress') && (
                      <>
                        <Progress value={getUserStat('level_progress')?.progress_percentage || 0} className="h-2" />
                        <p className="text-xs mt-1 text-muted-foreground">
                          {getUserStat('level_progress')?.points_to_next > 0 ? 
                            `다음 레벨까지 ${getUserStat('level_progress')?.points_to_next}점 필요` :
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
                    <span>{metadata.location || '위치 미설정'}</span>
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
            <TabsList className="flex w-full h-auto items-center justify-between rounded-md bg-muted p-0.5 text-muted-foreground overflow-x-auto">
              <TabsTrigger 
                value="activity" 
                className="flex-1 px-2.5 py-2 text-sm font-medium touch-manipulation min-h-[32px] flex items-center justify-center whitespace-nowrap"
              >
                활동 내역
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                className="flex-1 px-2.5 py-2 text-sm font-medium touch-manipulation min-h-[32px] flex items-center justify-center whitespace-nowrap"
              >
                통계
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger 
                  value="settings" 
                  className="flex-1 px-2.5 py-2 text-sm font-medium touch-manipulation min-h-[32px] flex items-center justify-center whitespace-nowrap"
                >
                  설정
                </TabsTrigger>
              )}
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
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getActivityIconBg(activity.type || activity.activity_type || 'default')}`}>
                              {getActivityIcon(activity.type || activity.activity_type || 'default')}
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
                        <span className="text-sm text-muted-foreground">총 콘텐츠</span>
                        <span className="font-semibold">{getUserStat('total_content_count') || (stats && typeof stats === 'object' && 'content_created_count' in stats ? stats.content_created_count as number : 0) || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">총 댓글</span>
                        <span className="font-semibold">{getUserStat('comments_count') || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">받은 좋아요</span>
                        <span className="font-semibold">{getUserStat('total_likes_received') || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">총 조회수</span>
                        <span className="font-semibold">{getUserStat('total_views') || 0}</span>
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
                        <span className="font-semibold">{getUserStat('activities_joined') || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">공유 자료</span>
                        <span className="font-semibold">{getUserStat('resources_count') || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">활동 점수</span>
                        <span className="font-semibold">{getUserStat('activity_score') || profile?.activity_score || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>


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
                        {getUserStat('total_content_count') || (stats && typeof stats === 'object' && 'content_created_count' in stats ? stats.content_created_count as number : 0) || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">총 콘텐츠</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {getUserStat('cases_count') || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">사례</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {getUserStat('announcements_count') || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">공지사항</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {getUserStat('resources_count') || 0}
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
            // 프로필 데이터 리패치
            refetch()
            
            // UserLevelBadges 관련 데이터도 리패치 - 모든 관련 쿼리 무효화
            queryClient.invalidateQueries({ queryKey: ['user-level-info', targetUserId] })
            queryClient.invalidateQueries({ queryKey: ['user-v2', targetUserId] })
            queryClient.invalidateQueries({ queryKey: ['user-stats-v2', targetUserId] })
            queryClient.invalidateQueries({ queryKey: ['user-game-data-v2', targetUserId] })
            queryClient.invalidateQueries({ queryKey: ['user-simple-rank-v2', targetUserId] })
            
            toast.success('프로필이 업데이트되었습니다.')
          }}
        />
      )}
    </div>
  )
}