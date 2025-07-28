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
  Star
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import api from '@/lib/api.modern'
import { supabase } from '@/lib/api.modern'

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

interface RecentActivity {
  id: string
  type: 'post' | 'comment' | 'activity' | 'resource'
  title: string
  description: string
  created_at: string
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
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchProfileData()
  }, [userId])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // Fetch profile using user API
      const profileResponse = await api.users.getUser(userId)
      if (!profileResponse.success) throw new Error(profileResponse.error || 'Failed to fetch profile')
      
      const userData = profileResponse.data
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
      
      // Fetch actual user stats
      try {
        const statsResponse = await api.activities.getUserStats(userId)
        if (statsResponse.success && statsResponse.data) {
          setStats({
            totalPosts: statsResponse.data.totalPosts || 0,
            totalComments: statsResponse.data.totalComments || 0,
            totalLikes: statsResponse.data.totalLikes || 0,
            totalViews: statsResponse.data.totalViews || 0,
            activitiesJoined: statsResponse.data.activitiesJoined || 0,
            resourcesShared: statsResponse.data.resourcesShared || 0
          })
        } else {
          // getUserStats failed, try to fetch from user_stats view directly
          try {
            const { data: userStatsData, error: statsError } = await supabase
              .from('user_stats')
              .select('*')
              .eq('id', userId)
              .single()
            
            if (!statsError && userStatsData) {
              setStats({
                totalPosts: userStatsData.post_count || 0,
                totalComments: userStatsData.comment_count || 0,
                totalLikes: userStatsData.like_count || 0,
                totalViews: 0, // Not available in user_stats view
                activitiesJoined: 0, // Not available in user_stats view
                resourcesShared: 0 // Not available in user_stats view
              })
            } else {
              // Final fallback to zeros
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
            console.warn('Failed to fetch user_stats:', error)
            // Final fallback to zeros
            setStats({
              totalPosts: 0,
              totalComments: 0,
              totalLikes: 0,
              totalViews: 0,
              activitiesJoined: 0,
              resourcesShared: 0
            })
          }
        }
      } catch (statsError) {
        console.warn('Failed to fetch user stats:', statsError)
        // Final fallback to zeros
        setStats({
          totalPosts: 0,
          totalComments: 0,
          totalLikes: 0,
          totalViews: 0,
          activitiesJoined: 0,
          resourcesShared: 0
        })
      }
      
      // Set empty activities for now (will be implemented with actual API later)
      setRecentActivities([])
      
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

  const getActivityLevel = (score: number) => {
    if (score >= 800) return { level: '매우 활발', color: 'text-green-600', progress: 100 }
    if (score >= 600) return { level: '활발', color: 'text-blue-600', progress: 75 }
    if (score >= 400) return { level: '보통', color: 'text-yellow-600', progress: 50 }
    return { level: '조용', color: 'text-gray-600', progress: 25 }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post': return BookOpen
      case 'comment': return MessageSquare
      case 'activity': return Activity
      case 'resource': return Award
      default: return Activity
    }
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
                        <div className="text-2xl font-bold text-primary">{stats.totalPosts}</div>
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
                      {recentActivities.map((activity) => {
                        const ActivityIcon = getActivityIcon(activity.type)
                        return (
                          <div key={activity.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <ActivityIcon className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">{activity.title}</p>
                              <p className="text-xs text-muted-foreground">{activity.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(activity.created_at)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      최근 활동이 없습니다.
                    </p>
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">총 게시글</span>
                      <span className="text-sm font-medium">{stats?.totalPosts || 0}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">총 댓글</span>
                      <span className="text-sm font-medium">{stats?.totalComments || 0}개</span>
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}