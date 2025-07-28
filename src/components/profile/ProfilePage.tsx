'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Edit3,
  Save,
  X,
  Calendar,
  Trophy,
  MessageCircle,
  Heart,
  Eye,
  BookOpen,
  Users,
  Activity,
  Settings,
  Bell,
  Shield,
  Camera,
  Award,
  TrendingUp,
  Star
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api.modern'
import { toast } from 'sonner'

interface UserData {
  id: string
  name: string
  email: string
  phone: string
  department: string
  job_position: string
  role: string
  avatar: string
  joinDate: string
  location: string
  aiExpertise: string[]
  skillLevel: string
  bio: string
  achievements: string[]
  activityScore: number
  stats: {
    totalPosts: number
    totalComments: number
    totalLikes: number
    totalViews: number
    activitiesJoined: number
    resourcesShared: number
  }
  recentActivity: {
    type: 'post' | 'comment' | 'activity' | 'resource'
    title: string
    date: string
    engagement: {
      likes: number
      comments: number
      views: number
    }
  }[]
}

const skillLevels = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
  expert: '전문가'
}

const roleLabels = {
  leader: '동아리장',
  'vice-leader': '부동아리장',
  admin: '운영진',
  member: '일반회원'
}

const getActivityTitle = (activityType: string, targetType?: string) => {
  switch (activityType) {
    case 'post_created':
      return '새 게시글을 작성했습니다'
    case 'case_created':
      return '새 활용사례를 공유했습니다'
    case 'announcement_created':
      return '새 공지사항을 작성했습니다'
    case 'comment_created':
      return `${targetType || '게시글'}에 댓글을 남겼습니다`
    case 'like_given':
      return `${targetType || '게시글'}에 좋아요를 눌렀습니다`
    case 'content_viewed':
      return `${targetType || '게시글'}을 조회했습니다`
    case 'activity_joined':
      return '새 활동에 참여했습니다'
    case 'resource_shared':
      return '새 자료를 공유했습니다'
    default:
      return '활동을 수행했습니다'
  }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [editData, setEditData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('activity')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // 실제 사용자 데이터 로딩
  useEffect(() => {
    async function loadUserData() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Parallel API calls for better performance
        const [profileResult, statsResult, activityResult] = await Promise.allSettled([
          api.users.getUser(user.id),
          api.activities.getUserStats(user.id),
          api.activities.getUserActivityLogs(user.id, 10)
        ])
        
        // Process profile data
        let profile = null
        if (profileResult.status === 'fulfilled' && profileResult.value.success && profileResult.value.data) {
          profile = profileResult.value.data
        }
        
        // If no profile exists, use default values
        if (!profile) {
          profile = {
            id: user.id,
            name: (user as any).user_metadata?.name || user.email?.split('@')[0] || '사용자',
            email: user.email || '',
            department: '미지정',
            role: 'member',
            avatar_url: '',
            bio: '안녕하세요! AI 학습동아리에서 함께 성장하고 있습니다.',
            activity_score: 0,
            created_at: (user as any).created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              phone: '010-0000-0000',
              job_position: '미지정',
              location: '미지정',
              ai_expertise: ['ChatGPT'],
              skill_level: 'beginner',
              achievements: []
            },
            last_seen_at: null
          }
        }
        
        // Process stats data
        let stats = {
          totalPosts: 0,
          totalComments: 0,
          totalLikes: 0,
          totalViews: 0,
          activitiesJoined: 0,
          resourcesShared: 0
        }
        if (statsResult.status === 'fulfilled' && statsResult.value.success && statsResult.value.data) {
          stats = statsResult.value.data
        }

        // Process recent activity data
        let recentActivity: any[] = []
        if (activityResult.status === 'fulfilled' && activityResult.value.success && activityResult.value.data) {
          recentActivity = activityResult.value.data.map((log: any) => ({
            type: log.activity_type.replace('_created', '').replace('_given', '').replace('_joined', '').replace('_shared', '') as 'post' | 'comment' | 'activity' | 'resource',
            title: log.metadata?.title || getActivityTitle(log.activity_type, log.target_type),
            date: log.created_at,
            engagement: {
              likes: log.metadata?.likes || 0,
              comments: log.metadata?.comments || 0,
              views: log.metadata?.views || 0
            }
          }))
        }

        // Get user achievements from metadata
        const metadata = (profile.metadata || {}) as any
        let achievements: string[] = metadata.achievements || []

        const realUserData: UserData = {
          id: user.id,
          name: profile.name || user.email?.split('@')[0] || '사용자',
          email: user.email || '',
          phone: metadata.phone || '010-0000-0000',
          department: profile.department || '미지정',
          job_position: metadata.job_position || '미지정',
          role: profile.role || 'member',
          avatar: profile.avatar_url || '',
          joinDate: profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : (user as any).created_at ? new Date((user as any).created_at).toISOString().split('T')[0] : '2024-01-01',
          location: metadata.location || '미지정',
          bio: profile.bio || '안녕하세요! AI 학습동아리에서 함께 성장하고 있습니다.',
          aiExpertise: metadata.ai_expertise || ['ChatGPT'],
          skillLevel: metadata.skill_level || 'beginner',
          achievements,
          activityScore: profile.activity_score || 0,
          stats,
          recentActivity
        }
        
        setUserData(realUserData)
        setEditData(realUserData)
      } catch (error) {
        console.error('Error loading user data:', error)
        toast.error('프로필 데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [user])

  const handleEdit = () => {
    // 편집 탭으로 이동
    if (userData) {
      setEditData(userData)
      setActiveTab('edit')
    }
  }

  const handleSave = async () => {
    if (!user || !editData) return
    
    try {
      setSaving(true)
      
      // Update user in DB
      const response = await api.users.updateUser(user.id, {
        name: editData.name,
        bio: editData.bio,
        department: editData.department,
        metadata: {
          phone: editData.phone,
          location: editData.location,
          job_position: editData.job_position
        }
      })
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      // 업데이트된 프로필 데이터로 상태 업데이트
      const updatedUserData = {
        ...userData!,
        name: editData!.name,
        phone: editData!.phone,
        bio: editData!.bio,
        location: editData!.location,
        department: editData!.department,
        job_position: editData!.job_position
      }
      
      setUserData(updatedUserData)
      setEditData(updatedUserData)
      setActiveTab('activity') // 저장 후 활동 탭으로 이동
      
      toast.success('프로필이 성공적으로 업데이트되었습니다.')
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      toast.error('프로필 업데이트에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (userData) {
      setEditData(userData)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (editData) {
      setEditData(prev => ({
        ...prev!,
        [field]: value
      }))
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    try {
      setUploadingAvatar(true)
      
      // Upload avatar to Supabase Storage
      const uploadResult = await api.avatar.uploadAvatar(file, user.id)
      
      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Upload failed')
      }
      
      // Update user avatar URL in database
      const updateResult = await api.avatar.updateUserAvatar(user.id, uploadResult.data.url)
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update user avatar')
      }
      
      const successMessage = '프로필 사진이 업로드되었습니다.'
      
      // Update local state
      setUserData(prev => prev ? { ...prev, avatar: uploadResult.data?.url || prev.avatar } : null)
      setEditData(prev => prev ? { ...prev, avatar: uploadResult.data?.url || prev.avatar } : null)
      
      toast.success(successMessage)
    } catch (error) {
      console.error('Avatar upload failed:', error)
      const errorMessage = error instanceof Error ? error.message : '프로필 사진 업로드에 실패했습니다.'
      toast.error(errorMessage)
    } finally {
      setUploadingAvatar(false)
      // Reset the input value so the same file can be selected again
      event.target.value = ''
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getActivityLevel = (score: number) => {
    if (score >= 800) return { level: '매우 활발', color: 'text-green-600', bgColor: 'bg-green-100' }
    if (score >= 600) return { level: '활발', color: 'text-blue-600', bgColor: 'bg-blue-100' }
    if (score >= 400) return { level: '보통', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    return { level: '조용', color: 'text-gray-600', bgColor: 'bg-gray-100' }
  }

  const activityLevel = userData ? getActivityLevel(userData.activityScore) : { level: '조용', color: 'text-gray-600', bgColor: 'bg-gray-100' }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">프로필을 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !userData) {
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
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-3">
                    <AvatarImage src={userData.avatar} alt={userData.name} />
                    <AvatarFallback className="text-2xl">
                      {userData.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="avatar-upload">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={uploadingAvatar}
                      asChild
                    >
                      <span className="cursor-pointer">
                        {uploadingAvatar ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            업로드 중...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            사진 업로드
                          </>
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
                </div>
                
                <CardTitle className="text-xl">{userData.name}</CardTitle>
                <CardDescription className="space-y-1">
                  <div>{userData.department} {userData.job_position}</div>
                  <Badge variant="secondary" className="mt-2">
                    {roleLabels[userData.role as keyof typeof roleLabels]}
                  </Badge>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Bio */}
                <div>
                  <Label className="text-sm font-medium">소개</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {userData.bio}
                  </p>
                </div>

                {/* AI Expertise */}
                <div>
                  <Label className="text-sm font-medium">AI 전문분야</Label>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {userData.aiExpertise.map((expertise) => (
                      <Badge key={expertise} variant="outline" className="text-xs">
                        {expertise}
                      </Badge>
                    ))}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="mt-2 bg-purple-100 text-purple-800"
                  >
                    {skillLevels[userData.skillLevel as keyof typeof skillLevels]}
                  </Badge>
                </div>

                {/* Activity Level */}
                <div>
                  <Label className="text-sm font-medium">활동 레벨</Label>
                  <div className="mt-2 flex items-center space-x-2">
                    <div className={`rounded-full px-3 py-1 text-xs font-medium ${activityLevel.bgColor} ${activityLevel.color}`}>
                      {activityLevel.level}
                    </div>
                    <span className="text-sm font-medium">{userData.activityScore}점</span>
                  </div>
                </div>

                {/* Achievements */}
                <div>
                  <Label className="text-sm font-medium">성과</Label>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {userData.achievements.map((achievement) => (
                      <Badge 
                        key={achievement} 
                        variant="secondary" 
                        className="justify-center bg-yellow-100 text-yellow-800"
                      >
                        <Trophy className="mr-1 h-3 w-3" />
                        {achievement}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{userData.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{userData.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{userData.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(userData.joinDate)} 가입</span>
                  </div>
                </div>

                <Button 
                  className="w-full kepco-gradient"
                  onClick={handleEdit}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  프로필 편집
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="activity">활동 내역</TabsTrigger>
                <TabsTrigger value="stats">통계</TabsTrigger>
                <TabsTrigger value="settings">설정</TabsTrigger>
                <TabsTrigger value="edit">프로필 편집</TabsTrigger>
              </TabsList>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>최근 활동</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userData.recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3 border-b pb-4 last:border-b-0">
                          <div className="flex-shrink-0">
                            {activity.type === 'post' && (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                <MessageCircle className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            {activity.type === 'comment' && (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </div>
                            )}
                            {activity.type === 'activity' && (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                                <Users className="h-4 w-4 text-purple-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(activity.date)}
                            </p>
                            {activity.type === 'post' && (
                              <div className="mt-2 flex space-x-4 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                  <Eye className="mr-1 h-3 w-3" />
                                  {activity.engagement.views}
                                </span>
                                <span className="flex items-center">
                                  <Heart className="mr-1 h-3 w-3" />
                                  {activity.engagement.likes}
                                </span>
                                <span className="flex items-center">
                                  <MessageCircle className="mr-1 h-3 w-3" />
                                  {activity.engagement.comments}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stats Tab */}
              <TabsContent value="stats" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">게시글 통계</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">총 게시글</span>
                          <span className="font-semibold">{userData.stats.totalPosts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">총 댓글</span>
                          <span className="font-semibold">{userData.stats.totalComments}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">받은 좋아요</span>
                          <span className="font-semibold">{userData.stats.totalLikes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">총 조회수</span>
                          <span className="font-semibold">{userData.stats.totalViews.toLocaleString()}</span>
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
                          <span className="font-semibold">{userData.stats.activitiesJoined}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">공유 자료</span>
                          <span className="font-semibold">{userData.stats.resourcesShared}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">활동 점수</span>
                          <span className="font-semibold">{userData.activityScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">레벨</span>
                          <Badge variant="secondary" className={activityLevel.color}>
                            {activityLevel.level}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Achievement Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="h-5 w-5" />
                      <span>성과 진행률</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>활동 마스터 (20개 활동 참여)</span>
                          <span>{userData.stats.activitiesJoined}/20</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                          <div 
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${Math.min(userData.stats.activitiesJoined / 20 * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>콘텐츠 크리에이터 (50개 게시글)</span>
                          <span>{userData.stats.totalPosts}/50</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                          <div 
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${Math.min(userData.stats.totalPosts / 50 * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
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

              {/* Edit Tab */}
              <TabsContent value="edit" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Edit3 className="h-5 w-5" />
                      <span>프로필 편집</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="name">이름</Label>
                        <Input
                          id="name"
                          value={editData?.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">전화번호</Label>
                        <Input
                          id="phone"
                          value={editData?.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="department">부서</Label>
                        <Input
                          id="department"
                          value={editData?.department || ''}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="job_position">직급</Label>
                        <Input
                          id="job_position"
                          value={editData?.job_position || ''}
                          onChange={(e) => handleInputChange('job_position', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="bio">소개</Label>
                      <Textarea
                        id="bio"
                        value={editData?.bio || ''}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">지역</Label>
                      <Input
                        id="location"
                        value={editData?.location || ''}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="kepco-gradient"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? '저장 중...' : '저장'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        <X className="mr-2 h-4 w-4" />
                        취소
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  )
}