'use client'

import { useState } from 'react'
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

// Mock user data
const mockUserData = {
  id: '1',
  name: '김전력',
  email: 'kim.power@kepco.co.kr',
  phone: '010-1234-5678',
  department: '전력관리처',
  job_position: '차장',
  role: 'leader',
  avatar: '/avatars/kim.jpg',
  joinDate: '2023-03-15',
  location: '춘천',
  aiExpertise: ['ChatGPT', 'Claude', 'Midjourney', 'GitHub Copilot'],
  skillLevel: 'expert',
  bio: 'AI 기술을 활용한 업무 효율성 향상에 관심이 많습니다. 동아리원들과 지식을 공유하며 함께 성장하고 싶습니다.',
  achievements: ['최우수 회원', '멘토', '발표왕', '활동왕'],
  activityScore: 950,
  stats: {
    totalPosts: 24,
    totalComments: 156,
    totalLikes: 342,
    totalViews: 2847,
    activitiesJoined: 18,
    resourcesShared: 12
  },
  recentActivity: [
    {
      type: 'post',
      title: 'ChatGPT로 업무 보고서 작성 시간을 50% 단축했어요!',
      date: '2024-02-05',
      engagement: { likes: 42, comments: 18, views: 234 }
    },
    {
      type: 'comment',
      title: 'Claude와 ChatGPT 비교 사용 후기',
      date: '2024-02-04',
      engagement: { likes: 8, comments: 0, views: 0 }
    },
    {
      type: 'activity',
      title: 'ChatGPT 고급 활용법 워크샵',
      date: '2024-02-03',
      engagement: { likes: 0, comments: 0, views: 0 }
    }
  ]
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

export default function ProfilePage() {
  const { user } = useAuth()
  const [userData, setUserData] = useState(mockUserData)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(userData)

  const handleEdit = () => {
    setIsEditing(true)
    setEditData(userData)
  }

  const handleSave = () => {
    setUserData(editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData(userData)
    setIsEditing(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }))
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

  const activityLevel = getActivityLevel(userData.activityScore)

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
                <div className="relative mx-auto mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={userData.avatar} alt={userData.name} />
                    <AvatarFallback className="text-2xl">
                      {userData.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
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
            <Tabs defaultValue="activity" className="space-y-6">
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
                          value={editData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">전화번호</Label>
                        <Input
                          id="phone"
                          value={editData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="bio">소개</Label>
                      <Textarea
                        id="bio"
                        value={editData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">지역</Label>
                      <Input
                        id="location"
                        value={editData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={handleSave} className="kepco-gradient">
                        <Save className="mr-2 h-4 w-4" />
                        저장
                      </Button>
                      <Button variant="outline" onClick={handleCancel}>
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