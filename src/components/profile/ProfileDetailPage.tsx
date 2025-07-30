'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MapPin,
  Calendar,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Award,
  Activity,
  BookOpen,
  MessageSquare,
  Users,
  ArrowLeft,
  Edit,
  Shield,
  Crown,
  UserCog,
  TrendingUp,
  Clock,
  CheckCircle,
  Target,
  Star,
  Megaphone,
  Eye,
  Heart
} from 'lucide-react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { toast } from 'sonner'
import { supabase, Tables, Views } from '@/lib/supabase/client'

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string | null
  department: string | null
  job_position: string | null
  role: string
  avatar_url: string | null
  location: string | null
  skill_level: string
  bio: string | null
  activity_score: number
  ai_expertise: string[]
  achievements: string[]
  join_date: string
  last_login: string | null
  updated_at: string
}

interface UserStats {
  totalPosts: number
  totalComments: number
  totalLikes: number
  totalViews: number
  activitiesJoined: number
  resourcesShared: number
}

// Activity related interfaces for better type safety
interface ActivityData {
  activity_type: string
  title: string
  created_at: string
  metadata?: {
    title?: string
    views?: number
    likes?: number
    comments?: number
    comment_preview?: string
    is_reply?: boolean
  }
  target_type?: string
}

interface UserActivityResponse {
  stats: {
    posts: number
    cases: number
    announcements: number
    resources: number
    comments: number
  }
  recent_activities: ActivityData[]
}


const roleLabels = {
  leader: '동아리장',
  'vice-leader': '부동아리장',
  admin: '운영진',
  member: '일반회원'
}

const skillLevels = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
  expert: '전문가'
}

const roleColors = {
  leader: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'vice-leader': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

const skillColors = {
  beginner: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  intermediate: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  advanced: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  expert: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
}

export default function ProfileDetailPage({ userId }: { userId: string }) {
  const router = useRouter()
  const { user, profile: userProfile } = useOptimizedAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [activityStats, setActivityStats] = useState<UserActivityResponse['stats'] | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    // Check permissions
    if (user) {
      const isOwnProfile = user.id === userId
      const isMember = userProfile && ['member', 'vice-leader', 'leader', 'admin'].includes(userProfile.role)
      setHasPermission(isOwnProfile || isMember || false)
    } else {
      setHasPermission(false)
    }
    
    fetchProfileData()
  }, [userId, user, userProfile])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // Fetch profile using direct query
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (userError) throw userError
      const metadata = (userData?.metadata || {}) as any
      
      // Transform profile data
      const profileData: ProfileData = {
        id: userData?.id || '',
        name: userData?.name || '익명',
        email: userData?.email || '',
        phone: metadata.phone || null,
        department: userData?.department || null,
        job_position: metadata.job_position || null,
        role: userData?.role || 'member',
        avatar_url: userData?.avatar_url || null,
        location: metadata.location || null,
        skill_level: metadata.skill_level || 'beginner',
        bio: userData?.bio || null,
        activity_score: userData?.activity_score || 0,
        ai_expertise: metadata.ai_expertise || [],
        achievements: metadata.achievements || [],
        join_date: userData?.created_at || new Date().toISOString(),
        last_login: userData?.last_seen_at || null,
        updated_at: userData?.updated_at || new Date().toISOString()
      }
      
      setProfile(profileData)
      
      // Fetch user stats
      try {
        const { data: userStatsData, error: statsError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (!statsError && userStatsData) {
          setStats({
            totalPosts: userStatsData.posts_count || 0,
            totalComments: userStatsData.comments_count || 0,
            totalLikes: userStatsData.likes_received || 0,
            totalViews: 0, // Not available in user_stats view
            activitiesJoined: 0, // Not available in user_stats view
            resourcesShared: 0 // Not available in user_stats view
          })
        } else {
          // Fallback to zeros
          setStats({
            totalPosts: 0,
            totalComments: 0,
            totalLikes: 0,
            totalViews: 0,
            activitiesJoined: 0,
            resourcesShared: 0
          })
        }
      } catch (error) {
        console.warn('Failed to fetch user stats:', error)
        // Fallback to zeros
        setStats({
          totalPosts: 0,
          totalComments: 0,
          totalLikes: 0,
          totalViews: 0,
          activitiesJoined: 0,
          resourcesShared: 0
        })
      }
      
      // Fetch recent activities and detailed stats using get_user_activity
      try {
        const { data: activityData, error: activityError } = await supabase
          .rpc('get_user_content_stats', { user_id_param: userId })
        
        if (!activityError && activityData) {
          // Type assertion for the returned data
          const typedData = activityData as unknown as UserActivityResponse
          
          // Set activity stats separately for better organization
          if (typedData.stats) {
            setActivityStats(typedData.stats)
            
            // Also update main stats with activity data
            setStats(prev => ({
              totalPosts: typedData.stats.posts || 0,
              totalComments: typedData.stats.comments || 0,
              totalLikes: prev?.totalLikes || 0,
              totalViews: prev?.totalViews || 0,
              activitiesJoined: prev?.activitiesJoined || 0,
              resourcesShared: typedData.stats.resources || 0
            }))
          }
          
          // Set recent activities
          if (typedData.recent_activities) {
            setRecentActivities(typedData.recent_activities)
          } else {
            setRecentActivities([])
          }
        } else {
          console.warn('Failed to fetch user activity:', activityError)
          setRecentActivities([])
        }
      } catch (error) {
        console.error('Error fetching user activity:', error)
        setRecentActivities([])
      }
      
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('프로필을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return Crown
      case 'vice-leader': return Shield  
      case 'admin': return UserCog
      default: return Users
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

  const getActivityLevel = (score: number) => {
    if (score >= 800) return { level: '매우 활발', color: 'text-green-600', progress: 100 }
    if (score >= 600) return { level: '활발', color: 'text-blue-600', progress: 75 }
    if (score >= 400) return { level: '보통', color: 'text-yellow-600', progress: 50 }
    return { level: '조용', color: 'text-gray-600', progress: 25 }
  }

  // Centralized activity configuration for better maintainability
  const activityConfig = {
    post_created: { icon: BookOpen, label: '게시글 작성', color: 'text-blue-600' },
    case_created: { icon: Briefcase, label: '사례 공유', color: 'text-green-600' },
    announcement_created: { icon: Megaphone, label: '공지사항 작성', color: 'text-red-600' },
    resource_shared: { icon: Award, label: '자료 공유', color: 'text-purple-600' },
    comment_created: { icon: MessageSquare, label: '댓글 작성', color: 'text-gray-600' },
  } as const

  const contentTypeIcons = {
    post: BookOpen,
    case: Briefcase,
    announcement: Megaphone,
    resource: Award,
  } as const

  const getActivityConfig = (activityType: string, targetType?: string) => {
    // First check activity type
    if (activityType in activityConfig) {
      return activityConfig[activityType as keyof typeof activityConfig]
    }
    
    // Fallback to content type
    const icon = (targetType && targetType in contentTypeIcons) 
      ? contentTypeIcons[targetType as keyof typeof contentTypeIcons]
      : Activity
      
    return { icon, label: '활동', color: 'text-gray-600' }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-24 bg-muted rounded mb-8" />
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-24 w-24 bg-muted rounded-full" />
                  <div className="h-6 w-32 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
            <div className="md:col-span-2 space-y-6">
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

  // Permission check - show limited info for non-members viewing other profiles
  if (!hasPermission && !loading) {
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
            {userProfile?.role === 'guest' && (
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
            
            {userProfile?.role === 'pending' && (
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

  const activityLevel = getActivityLevel(profile.activity_score)
  const isOwnProfile = user?.id === profile.id

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Button onClick={() => router.back()} variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          돌아가기
        </Button>
        {isOwnProfile && (
          <Button onClick={() => router.push('/profile')} size="sm" className="kepco-gradient">
            <Edit className="mr-2 h-4 w-4" />
            프로필 수정
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="md:col-span-1"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || ''} alt={profile.name} />
                  <AvatarFallback>
                    {profile.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  <p className="text-muted-foreground">
                    {profile.department || '미상'} {profile.job_position && `· ${profile.job_position}`}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={roleColors[profile.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'}
                  >
                    {(() => {
                      const Icon = getRoleIcon(profile.role)
                      return Icon ? <Icon className="h-3 w-3 mr-1" /> : null
                    })()}
                    {roleLabels[profile.role as keyof typeof roleLabels] || profile.role}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={skillColors[profile.skill_level as keyof typeof skillColors] || 'bg-gray-100 text-gray-800'}
                  >
                    {skillLevels[profile.skill_level as keyof typeof skillLevels] || profile.skill_level}
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="w-full space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.location || '강원도 춘천시'}</span>
                  </div>
                </div>

                {/* Activity Score */}
                <div className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">활동 점수</span>
                    <span className={`text-sm font-bold ${activityLevel.color}`}>
                      {profile.activity_score}점
                    </span>
                  </div>
                  <Progress value={activityLevel.progress} className="h-2" />
                  <p className={`text-xs mt-1 ${activityLevel.color}`}>
                    {activityLevel.level}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-2 space-y-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="stats">활동 통계</TabsTrigger>
              <TabsTrigger value="activities">최근 활동</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Bio */}
              <Card>
                <CardHeader>
                  <CardTitle>소개</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {profile.bio || 'AI 학습동아리 회원입니다.'}
                  </p>
                </CardContent>
              </Card>

              {/* AI Expertise */}
              <Card>
                <CardHeader>
                  <CardTitle>AI 전문분야</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.ai_expertise.length > 0 ? (
                      profile.ai_expertise.map((expertise) => (
                        <Badge key={expertise} variant="secondary">
                          {expertise}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">전문분야가 등록되지 않았습니다.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              {profile.achievements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      <span>성과</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.achievements.map((achievement) => (
                        <Badge key={achievement} variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Member Info */}
              <Card>
                <CardHeader>
                  <CardTitle>회원 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>가입일</span>
                    </div>
                    <span className="font-medium">{formatDate(profile.join_date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>마지막 로그인</span>
                    </div>
                    <span className="font-medium">{formatDate(profile.last_login)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4" />
                      <span>프로필 업데이트</span>
                    </div>
                    <span className="font-medium">{formatDate(profile.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>활동 통계</CardTitle>
                  <CardDescription>동아리 활동 참여 현황</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {activityStats?.posts || stats.totalPosts}
                        </div>
                        <div className="text-sm text-muted-foreground">게시글</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{stats.totalComments}</div>
                        <div className="text-sm text-muted-foreground">댓글</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{stats.totalLikes}</div>
                        <div className="text-sm text-muted-foreground">받은 좋아요</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{stats.totalViews}</div>
                        <div className="text-sm text-muted-foreground">조회수</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{stats.activitiesJoined}</div>
                        <div className="text-sm text-muted-foreground">활동 참여</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{stats.resourcesShared}</div>
                        <div className="text-sm text-muted-foreground">자료 공유</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      통계 정보를 불러올 수 없습니다.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Activity Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>활동 성장</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">활동 점수</span>
                        <span className="text-sm font-medium">{profile.activity_score}점</span>
                      </div>
                      <Progress value={Math.min((profile.activity_score / 1000) * 100, 100)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">게시글 활동</span>
                        <span className="text-sm font-medium">{stats?.totalPosts || 0}개</span>
                      </div>
                      <Progress value={Math.min((stats?.totalPosts || 0) * 10, 100)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">커뮤니티 참여</span>
                        <span className="text-sm font-medium">{stats?.totalComments || 0}개</span>
                      </div>
                      <Progress value={Math.min((stats?.totalComments || 0) * 5, 100)} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>최근 활동</CardTitle>
                  <CardDescription>최근 7일간의 활동 내역</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivities.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivities.map((activity, index) => {
                        const config = getActivityConfig(activity.activity_type, activity.target_type)
                        const ActivityIcon = config.icon
                        const isReply = activity.metadata?.is_reply === true
                        
                        // Handle special case for comments/replies
                        const activityLabel = activity.activity_type === 'comment_created' 
                          ? (isReply ? '답글 작성' : '댓글 작성')
                          : config.label
                        
                        return (
                          <motion.div 
                            key={`activity-${index}`} 
                            className="flex items-start space-x-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <div className={`h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center transition-colors hover:bg-primary/20`}>
                                <ActivityIcon className={`h-4 w-4 ${config.color}`} />
                              </div>
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">
                                <span className={config.color}>{activityLabel}</span>
                                {activity.title && <span className="text-foreground">: {activity.title}</span>}
                              </p>
                              
                              {/* Comment preview with better styling */}
                              {activity.metadata?.comment_preview && (
                                <div className="pl-2 border-l-2 border-muted">
                                  <p className="text-xs text-muted-foreground italic">
                                    "{activity.metadata.comment_preview.length > 80 
                                      ? activity.metadata.comment_preview.substring(0, 80) + '...'
                                      : activity.metadata.comment_preview}"
                                  </p>
                                </div>
                              )}
                              
                              {/* Metadata with icons */}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatRelativeTime(activity.created_at)}
                                </span>
                                
                                {activity.metadata?.views !== undefined && activity.metadata.views > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {activity.metadata.views}
                                  </span>
                                )}
                                
                                {activity.metadata?.likes !== undefined && activity.metadata.likes > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Heart className="h-3 w-3" />
                                    {activity.metadata.likes}
                                  </span>
                                )}
                                
                                {activity.metadata?.comments !== undefined && activity.metadata.comments > 0 && (
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {activity.metadata.comments}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        아직 활동 내역이 없습니다
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        게시글이나 댓글을 작성해보세요!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>활동 요약</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Content Creation Stats */}
                    <div className="pb-3 border-b">
                      <h4 className="text-sm font-semibold mb-2">콘텐츠 작성</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">게시글</span>
                          <span className="text-xs font-medium">{activityStats?.posts || 0}개</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">사례</span>
                          <span className="text-xs font-medium">{activityStats?.cases || 0}개</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">공지사항</span>
                          <span className="text-xs font-medium">{activityStats?.announcements || 0}개</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">자료</span>
                          <span className="text-xs font-medium">{activityStats?.resources || 0}개</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Engagement Stats */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">참여 활동</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">총 댓글</span>
                          <span className="text-sm font-medium">{activityStats?.comments || stats?.totalComments || 0}개</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">받은 좋아요</span>
                          <span className="text-sm font-medium">{stats?.totalLikes || 0}개</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">활동 참여</span>
                          <span className="text-sm font-medium">{stats?.activitiesJoined || 0}회</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}