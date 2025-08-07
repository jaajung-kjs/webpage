'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  Star,
  Clock
} from 'lucide-react'
import { useAuth } from '@/providers'
import { Tables } from '@/lib/database.types'
import { toast } from 'sonner'
// V1 시스템 (주석 처리 - 롤백용 보관)
// import { useUserProfile, useUserStats, useUserActivities, useUpdateProfile, useUploadAvatar } from '@/hooks/features/useProfile'

// V2 시스템
import { useUserProfileComplete, useUpdateProfileV2, useCheckAchievements } from '@/hooks/features/useProfileV2'
import { useUploadAvatar } from '@/hooks/features/useProfile' // 아바타 업로드는 그대로 사용
import { ACHIEVEMENTS, getUserAchievements, getTotalAchievementPoints, TIER_COLORS, TIER_ICONS } from '@/lib/achievements'
import { getRoleConfig, getRoleLabels } from '@/lib/roles'
import { getSkillLevelConfig, getSkillLevelLabels } from '@/lib/skills'
import { getActivityLevelInfo } from '@/lib/activityLevels'
import { getAIToolsByCategory, AI_TOOL_CATEGORIES, getAIToolConfig } from '@/lib/aiTools'

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
  lastLogin: string | null
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
  activityStats?: {
    posts: number
    cases: number
    announcements: number
    resources: number
    comments: number
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

const skillLevels = getSkillLevelLabels()
const roleLabels = getRoleLabels()

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
  // V2 시스템 - 단일 Hook으로 모든 데이터 조회 (업적 포함)
  const { data: profileV2Data, isLoading: loading, refetch } = useUserProfileComplete(user?.id, true, 8, true)
  
  // 업적 데이터는 이제 profileV2Data에 포함됨
  const achievementProgress = profileV2Data?.achievements
  const checkAchievementsMutation = useCheckAchievements()
  
  // V1 시스템 (주석 처리 - 롤백용 보관)
  // const { data: profileData, isLoading: profileLoading } = useUserProfile(user?.id)
  // const { data: statsData, isLoading: statsLoading } = useUserStats(user?.id)
  // const { data: activitiesData, isLoading: activitiesLoading } = useUserActivities(user?.id, 8)
  
  const updateProfileMutation = useUpdateProfileV2()
  const uploadAvatarMutation = useUploadAvatar()
  
  const [activeTab, setActiveTab] = useState('activity')
  const saving = updateProfileMutation.isPending
  const uploadingAvatar = uploadAvatarMutation.isPending

  // V2 시스템 - 간단한 데이터 매핑
  useEffect(() => {
    if (profileV2Data?.profile && profileV2Data?.stats) {
      const profile = profileV2Data.profile
      const stats = profileV2Data.stats
      const metadata = (profile.metadata || {}) as any
      
      const formattedData: UserData = {
        id: profile.id,
        name: profile.name || '',
        email: profile.email || '',
        phone: metadata.phone || '010-0000-0000',
        department: profile.department || '미지정',
        job_position: metadata.job_position || '미지정',
        role: profile.role || 'member',
        avatar: profile.avatar_url || '',
        joinDate: profile.created_at || new Date().toISOString(),
        lastLogin: profile.last_seen_at || null,
        location: metadata.location || '미지정',
        aiExpertise: metadata.ai_expertise || ['ChatGPT'],
        skillLevel: metadata.skill_level || 'beginner',
        bio: profile.bio || '안녕하세요! AI 학습동아리에서 함께 성장하고 있습니다.',
        achievements: [], // V2 시스템에서 직접 관리
        activityScore: profile.activity_score || 0,
        stats: {
          totalPosts: stats.posts_count || 0,
          totalComments: stats.comments_count || 0,
          totalLikes: stats.total_likes_received || 0,
          totalViews: stats.total_views || 0,
          activitiesJoined: stats.activities_joined || 0,
          resourcesShared: stats.resources_count || 0
        },
        activityStats: {
          posts: stats.posts_count || 0,
          cases: stats.cases_count || 0,
          announcements: stats.announcements_count || 0,
          resources: stats.resources_count || 0,
          comments: stats.comments_count || 0
        },
        recentActivity: (profileV2Data.recent_activities || []).map(activity => ({
          type: activity.type as any,
          title: activity.title,
          date: activity.date,
          engagement: {
            likes: activity.engagement.likes || 0,
            comments: activity.engagement.comments || 0,
            views: activity.engagement.views || 0
          }
        }))
      }
      setUserData(formattedData)
      setEditData(formattedData)
    }
  }, [profileV2Data])

  // Remove the old complex loadUserData function
  /*
  async function loadUserData() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        await loadFreshUserData(false)
      } catch (error) {
        console.error('Error loading user data:', error)
        toast.error('프로필 데이터를 불러오는데 실패했습니다.')
        setLoading(false)
      }
    }

    async function loadFreshUserData(isBackgroundUpdate: boolean) {
      if (!user) return
      
      try {
        // Parallel queries for better performance
        const [profileResult, statsResult, activityResult] = await Promise.allSettled([
          supabase.from('users').select('*').eq('id', user.id).single(),
          supabase.from('user_stats').select('*').eq('user_id', user.id).single(),
          supabase.from('user_activity_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
        ])
        
        // Process profile data
        let profile = null
        if (profileResult.status === 'fulfilled' && !profileResult.value.error && profileResult.value.data) {
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
        if (statsResult.status === 'fulfilled' && !statsResult.value.error && statsResult.value.data) {
          const statsData = statsResult.value.data
          stats = {
            totalPosts: statsData.posts_count || 0,
            totalComments: statsData.comments_count || 0,
            totalLikes: statsData.likes_received || 0,
            totalViews: 0, // Not available in user_stats view
            activitiesJoined: 0, // Not available in user_stats view
            resourcesShared: 0 // Not available in user_stats view
          }
        }

        // Fetch comprehensive activity data using enhanced RPC
        let recentActivity: any[] = []
        let activityStats: any = null
        try {
          const { data: comprehensiveData, error: comprehensiveError } = await supabase
            .rpc('get_user_comprehensive_stats', { p_user_id: user.id })
          
          if (!comprehensiveError && comprehensiveData && comprehensiveData.length > 0) {
            const statsData = comprehensiveData[0]
            
            // Update main stats with comprehensive data
            stats = {
              totalPosts: statsData.total_posts || 0,
              totalComments: statsData.total_comments || 0,
              totalLikes: statsData.total_likes_received || 0,
              totalViews: statsData.total_views || 0,
              activitiesJoined: 0, // Not available yet
              resourcesShared: 0 // Will get from get_user_content_stats
            }
          }
          
          // Fetch content stats and recent activities
          const { data: contentData, error: contentError } = await supabase
            .rpc('get_user_content_stats', { user_id_param: user.id })
          
          if (!contentError && contentData) {
            const typedData = contentData as unknown as any
            
            // Update resource count from content stats
            if (typedData.stats) {
              stats.resourcesShared = typedData.stats.resources || 0
            }
            
            // Set recent activities from RPC
            if (typedData.recent_activities) {
              recentActivity = typedData.recent_activities.map((activity: any) => ({
                type: activity.activity_type.replace('_created', '').replace('_given', '').replace('_joined', '').replace('_shared', '') as 'post' | 'comment' | 'activity' | 'resource',
                title: activity.title || getActivityTitle(activity.activity_type, activity.target_type),
                date: activity.created_at,
                engagement: {
                  likes: activity.metadata?.likes || 0,
                  comments: activity.metadata?.comments || 0,
                  views: activity.metadata?.views || 0
                }
              }))
            } else {
              recentActivity = []
            }
          } else {
            console.warn('Failed to fetch user content stats from RPC:', contentError)
            
            // Fallback to basic activity processing
            if (activityResult.status === 'fulfilled' && !activityResult.value.error && activityResult.value.data) {
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
          }
        } catch (error) {
          console.error('Error fetching user activity from RPC:', error)
          
          // Fallback to basic activity processing
          if (activityResult.status === 'fulfilled' && !activityResult.value.error && activityResult.value.data) {
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
          lastLogin: profile.last_seen_at || null,
          location: metadata.location || '미지정',
          bio: profile.bio || '안녕하세요! AI 학습동아리에서 함께 성장하고 있습니다.',
          aiExpertise: metadata.ai_expertise || ['ChatGPT'],
          skillLevel: metadata.skill_level || 'beginner',
          achievements,
          activityScore: profile.activity_score || 0,
          stats,
          activityStats,
          recentActivity
        }
        
        
        if (!isBackgroundUpdate) {
          setUserData(realUserData)
          setEditData(realUserData)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error loading fresh user data:', error)
        if (!isBackgroundUpdate) {
          toast.error('프로필 데이터를 불러오는데 실패했습니다.')
          setLoading(false)
        }
      }
    }

  */

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
      // Update user profile using mutation
      await updateProfileMutation.mutateAsync({
        name: editData.name,
        bio: editData.bio,
        department: editData.department,
        metadata: {
          phone: editData.phone,
          location: editData.location,
          job_position: editData.job_position,
          ai_expertise: editData.aiExpertise,
          skill_level: editData.skillLevel
          // achievements는 V2 시스템에서 자동 관리
        }
      })
      
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
      
      // Invalidate cache after update
      
      toast.success('프로필이 성공적으로 업데이트되었습니다.')
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      toast.error('프로필 업데이트에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleCancel = () => {
    if (userData) {
      setEditData(userData)
    }
  }

  const handleInputChange = (field: string, value: string | string[]) => {
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
      // Upload avatar to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      // Use uploadAvatarMutation instead of direct supabase call
      const avatarUrl = await uploadAvatarMutation.mutateAsync(file)
      
      // The mutation already returns the public URL
      const publicUrl = avatarUrl
      
      // Update user avatar URL in database using updateProfile mutation
      await updateProfileMutation.mutateAsync({
        avatar_url: publicUrl
      })
      
      const successMessage = '프로필 사진이 업로드되었습니다.'
      
      // Update local state
      setUserData(prev => prev ? { ...prev, avatar: publicUrl } : null)
      setEditData(prev => prev ? { ...prev, avatar: publicUrl } : null)
      
      // Invalidate cache after avatar update
      
      toast.success(successMessage)
    } catch (error) {
      console.error('Avatar upload failed:', error)
      const errorMessage = error instanceof Error ? error.message : '프로필 사진 업로드에 실패했습니다.'
      toast.error(errorMessage)
    } finally {
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

  const activityLevel = userData ? getActivityLevelInfo(userData.activityScore) : null

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
                  {(() => {
                    const roleConfig = getRoleConfig(userData.role)
                    if (roleConfig) {
                      const RoleIcon = roleConfig.icon
                      return (
                        <Badge variant="secondary" className={`mt-2 ${roleConfig.color}`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleConfig.label}
                        </Badge>
                      )
                    }
                    return (
                      <Badge variant="secondary" className="mt-2">
                        {userData.role}
                      </Badge>
                    )
                  })()}
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
                    {userData.aiExpertise.map((expertise) => {
                      const toolConfig = getAIToolConfig(expertise)
                      const Icon = toolConfig?.icon
                      return (
                        <Badge key={expertise} variant="outline" className="text-xs">
                          {Icon && <Icon className={`h-3 w-3 mr-1 ${toolConfig.color || ''}`} />}
                          {toolConfig?.label || expertise}
                        </Badge>
                      )
                    })}
                  </div>
                  {(() => {
                    const skillConfig = getSkillLevelConfig(userData.skillLevel)
                    if (skillConfig) {
                      const SkillIcon = skillConfig.icon
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="secondary" 
                                className={`mt-2 ${skillConfig.color}`}
                              >
                                <SkillIcon className="h-3 w-3 mr-1" />
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
                      )
                    }
                    return (
                      <Badge 
                        variant="secondary" 
                        className="mt-2 bg-kepco-blue-400/10 text-kepco-blue-700 dark:bg-kepco-blue-400/20 dark:text-kepco-blue-300"
                      >
                        {userData.skillLevel}
                      </Badge>
                    )
                  })()}
                </div>

                {/* Activity Level */}
                <div>
                  <Label className="text-sm font-medium">활동 레벨</Label>
                  <div className="mt-2 space-y-2">
                    {activityLevel && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="secondary" 
                                className={`${activityLevel.color} inline-flex items-center`}
                              >
                                <activityLevel.icon className="h-3 w-3 mr-1" />
                                {activityLevel.level}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">활동 레벨</p>
                              <p className="text-xs">{activityLevel.description}</p>
                              <p className="text-xs mt-1">점수 범위: {activityLevel.scoreRange}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{userData.activityScore}점</span>
                          <span className="text-xs text-muted-foreground">{activityLevel.scoreRange}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Achievements */}
                <div>
                  <Label className="text-sm font-medium">
                    성과 
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({userData.achievements.length}개 • {getTotalAchievementPoints(userData.achievements)}점)
                    </span>
                  </Label>
                  <div className="mt-2 space-y-2">
                    {userData.achievements.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1">
                        {userData.achievements.slice(0, 6).map((achievementId) => {
                          const def = ACHIEVEMENTS[achievementId] || { 
                            name: achievementId, 
                            icon: '🏆', 
                            tier: 'bronze' as const,
                            description: '',
                            points: 0
                          }
                          return (
                            <TooltipProvider key={achievementId}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="secondary" 
                                    className={`justify-center cursor-help ${TIER_COLORS[def.tier]}`}
                                  >
                                    <span className="mr-1">{def.icon}</span>
                                    <span className="truncate">{def.name}</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <p className="font-semibold">{def.name}</p>
                                    <p className="text-muted-foreground">{def.description}</p>
                                    <p className="mt-1">
                                      {TIER_ICONS[def.tier]} {def.tier} • {def.points}점
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        아직 획득한 업적이 없습니다
                      </div>
                    )}
                    {userData.achievements.length > 6 && (
                      <div className="text-xs text-center text-muted-foreground">
                        +{userData.achievements.length - 6}개 더 보기
                      </div>
                    )}
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
                  {userData.lastLogin && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>마지막 로그인: {formatRelativeTime(userData.lastLogin)}</span>
                    </div>
                  )}
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
              <TabsList className="flex w-full h-auto items-center justify-between rounded-md bg-muted p-0.5 text-muted-foreground">
                <TabsTrigger
                  value="activity"
                  className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
                >
                  활동 내역
                </TabsTrigger>
                <TabsTrigger
                  value="stats"
                  className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
                >
                  통계
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
                >
                  설정
                </TabsTrigger>
                <TabsTrigger
                  value="edit"
                  className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center"
                >
                  프로필 편집
                </TabsTrigger>
              </TabsList>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                {/* Achievement Progress - 통합된 업적 시스템 */}
                {achievementProgress && achievementProgress.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Trophy className="h-5 w-5" />
                        <span>다음 업적까지</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* 진행 중인 업적 또는 다음 티어 업적 표시 */}
                        {(() => {
                          // 각 카테고리별로 다음 획득 가능한 업적 찾기
                          const upcomingAchievements: typeof achievementProgress = []
                          
                          // 업적 카테고리별 그룹화
                          const achievementCategories = {
                            posts: ['first_post', 'post_10', 'post_50', 'post_100'],
                            comments: ['first_comment', 'comment_master', 'comment_legend'],
                            activities: ['activity_starter', 'activity_master', 'activity_legend'],
                            likes: ['popular_10', 'popular_50', 'popular_100', 'viral_content'],
                            members: ['member_7days', 'member_30days', 'member_90days', 'member_365days', 'founding_member']
                          }
                          
                          // 각 카테고리에서 다음 업적 찾기
                          Object.entries(achievementCategories).forEach(([category, ids]) => {
                            const categoryAchievements = achievementProgress
                              .filter(a => ids.includes(a.achievement_id))
                              .sort((a, b) => a.requirement_count - b.requirement_count)
                            
                            // 완료되지 않은 첫 번째 업적 찾기
                            const nextAchievement = categoryAchievements.find(a => !a.is_completed)
                            
                            // 현재 진행률이 100% 넘은 경우 (예: 2/1) 다음 티어 업적 찾기
                            if (nextAchievement) {
                              if (nextAchievement.current_progress >= nextAchievement.requirement_count) {
                                // 다음 티어 업적 찾기
                                const currentIndex = categoryAchievements.indexOf(nextAchievement)
                                const nextTierAchievement = categoryAchievements[currentIndex + 1]
                                if (nextTierAchievement && !nextTierAchievement.is_completed) {
                                  upcomingAchievements.push(nextTierAchievement)
                                }
                              } else {
                                upcomingAchievements.push(nextAchievement)
                              }
                            }
                          })
                          
                          // 진행률 기준으로 정렬하여 상위 3개 표시
                          return upcomingAchievements
                            .filter(a => a.progress_percentage > 0 || a.requirement_count <= 5)
                            .sort((a, b) => b.progress_percentage - a.progress_percentage)
                            .slice(0, 3)
                            .map((achievement) => (
                              <div key={achievement.achievement_id}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">
                                    {achievement.icon} {achievement.name}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {Math.min(achievement.current_progress, achievement.requirement_count)}/{achievement.requirement_count}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      achievement.tier === 'platinum' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                      achievement.tier === 'gold' ? 'bg-yellow-500' :
                                      achievement.tier === 'silver' ? 'bg-gray-400' :
                                      'bg-orange-500'
                                    }`}
                                    style={{ width: `${Math.min(achievement.progress_percentage, 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {achievement.description}
                                </p>
                              </div>
                            ))
                        })()}
                        
                        {/* 업적 체크 버튼 */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => checkAchievementsMutation.mutate()}
                          disabled={checkAchievementsMutation.isPending}
                          className="w-full"
                        >
                          {checkAchievementsMutation.isPending ? (
                            <>업적 확인 중...</>
                          ) : (
                            <>✨ 업적 확인하기</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>최근 활동</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userData.recentActivity.slice(0, 8).map((activity, index) => (
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
                          <span className="font-semibold">{userData.activityStats?.posts || userData.stats.totalPosts}</span>
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
                          <span className="font-semibold">{profileV2Data?.stats?.activities_joined || userData.stats.activitiesJoined}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">공유 자료</span>
                          <span className="font-semibold">{profileV2Data?.stats?.resources_count || userData.stats.resourcesShared}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">활동 점수</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{userData.activityScore}</span>
                            {activityLevel && (
                              <Badge variant="secondary" className={activityLevel.color}>
                                <activityLevel.icon className="h-3 w-3 mr-1" />
                                {activityLevel.level}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Achievement Progress - 전체 업적 진행률 (통합 데이터) */}
                {achievementProgress && achievementProgress.length > 0 && (
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
                        
                        {/* 주요 업적 카테고리별 진행률 */}
                        {[
                          { type: 'posts', label: '콘텐츠 작성', icon: '📝' },
                          { type: 'activities', label: '활동 참여', icon: '🎭' },
                          { type: 'likes', label: '인기도', icon: '❤️' },
                          { type: 'days', label: '가입 기간', icon: '📅' }
                        ].map(category => {
                          const categoryAchievements = achievementProgress.filter(
                            a => a.requirement_type === category.type
                          )
                          const completedCount = categoryAchievements.filter(a => a.is_completed).length
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

                {/* Content Creation Stats */}
                {userData.activityStats && (
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
                            {userData.activityStats.posts}
                          </div>
                          <div className="text-sm text-muted-foreground">게시글</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {userData.activityStats.cases}
                          </div>
                          <div className="text-sm text-muted-foreground">사례</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {userData.activityStats.announcements}
                          </div>
                          <div className="text-sm text-muted-foreground">공지사항</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {userData.activityStats.resources}
                          </div>
                          <div className="text-sm text-muted-foreground">자료</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
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
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">이름</Label>
                        <Input
                          id="name"
                          value={editData?.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">전화번호</Label>
                        <Input
                          id="phone"
                          value={editData?.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="department">부서</Label>
                        <Input
                          id="department"
                          value={editData?.department || ''}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="job_position">직급</Label>
                        <Input
                          id="job_position"
                          value={editData?.job_position || ''}
                          onChange={(e) => handleInputChange('job_position', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">소개</Label>
                      <Textarea
                        id="bio"
                        value={editData?.bio || ''}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">지역</Label>
                      <Input
                        id="location"
                        value={editData?.location || ''}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="aiExpertise">AI 전문분야</Label>
                        <span className="text-xs text-muted-foreground">
                          {editData?.aiExpertise?.length || 0}/5 선택됨
                        </span>
                      </div>
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (!editData?.aiExpertise?.includes(value) && (!editData?.aiExpertise || editData.aiExpertise.length < 5)) {
                            handleInputChange('aiExpertise', [...(editData?.aiExpertise || []), value])
                          }
                        }}
                      >
                        <SelectTrigger id="aiExpertise">
                          <SelectValue placeholder="AI 도구를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(AI_TOOL_CATEGORIES).map(([category, categoryLabel]) => {
                            const categoryTools = getAIToolsByCategory()[category]
                            return categoryTools && categoryTools.length > 0 ? (
                              <div key={category}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  {categoryLabel}
                                </div>
                                {categoryTools.map((tool) => {
                                  const Icon = tool.icon
                                  const isSelected = editData?.aiExpertise?.includes(tool.value)
                                  return (
                                    <SelectItem 
                                      key={tool.value} 
                                      value={tool.value}
                                      disabled={isSelected || (editData?.aiExpertise?.length || 0) >= 5}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        <span>{tool.label}</span>
                                        {isSelected && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                              </div>
                            ) : null
                          })}
                        </SelectContent>
                      </Select>
                      {editData?.aiExpertise && editData.aiExpertise.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {editData.aiExpertise.map((expertise) => {
                            const toolConfig = getAIToolConfig(expertise)
                            const Icon = toolConfig?.icon
                            return (
                              <Badge
                                key={expertise}
                                variant="secondary"
                                className="text-xs"
                              >
                                {Icon && <Icon className={`h-3 w-3 mr-1 ${toolConfig.color || ''}`} />}
                                {toolConfig?.label || expertise}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleInputChange('aiExpertise', editData.aiExpertise.filter(item => item !== expertise))
                                  }}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skillLevel">스킬 레벨</Label>
                      <Select
                        value={editData?.skillLevel || 'beginner'}
                        onValueChange={(value) => handleInputChange('skillLevel', value)}
                      >
                        <SelectTrigger id="skillLevel">
                          <SelectValue placeholder="스킬 레벨을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(skillLevels).filter(([key]) => key !== 'all').map(([value, label]) => {
                            const config = getSkillLevelConfig(value)
                            const Icon = config?.icon
                            return (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  {Icon && <Icon className="h-4 w-4" />}
                                  <span>{label}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
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