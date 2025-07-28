'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  Star,
  Calendar,
  Trophy,
  MessageCircle,
  Users,
  UserPlus,
  Award,
  TrendingUp,
  MoreVertical,
  UserCog,
  UserMinus,
  Crown,
  Shield,
  UserCheck,
  User
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api.modern'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'

interface MemberWithStats {
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
  user_stats: {
    total_posts: number
    total_comments: number
    total_likes_received: number
    total_views: number
    activities_joined: number
    resources_shared: number
  }[] | null
}

const roleLabels = {
  all: '전체',
  leader: '동아리장',
  'vice-leader': '부동아리장',
  admin: '운영진',
  moderator: '중재자',
  member: '일반회원'
}

const skillLevels = {
  all: '전체',
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

function MembersPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<MemberWithStats[]>([])
  const [filteredMembers, setFilteredMembers] = useState<MemberWithStats[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeRole, setActiveRole] = useState('all')
  const [activeSkill, setActiveSkill] = useState('all')
  const [loading, setLoading] = useState(true)
  
  // Admin functionality state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberWithStats | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  const [assignableRoles, setAssignableRoles] = useState<string[]>([])

  useEffect(() => {
    fetchMembers()
    if (user) {
      fetchAssignableRoles()
    }
  }, [user])

  useEffect(() => {
    filterMembers(searchTerm, activeRole, activeSkill)
  }, [searchTerm, activeRole, activeSkill, members])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      // Fetch members using member management API
      const response = await api.users.getAllMembers()
      
      if (!response.success) throw new Error(response.error || 'Failed to fetch members')

      // Transform user data to MemberWithStats format
      const transformedData: MemberWithStats[] = (response.data || []).map((userData: any) => {
        const metadata = (userData.metadata || {}) as any
        return {
          id: userData.id || '',
          name: userData.name || '익명',
          email: userData.email || '',
          phone: metadata.phone || null,
          department: userData.department || null,
          job_position: metadata.job_position || null,
          role: userData.role || 'member',
          avatar_url: userData.avatar_url || null,
          location: metadata.location || null,
          skill_level: metadata.skill_level || 'beginner',
          bio: userData.bio || null,
          activity_score: userData.activity_score || 0,
          ai_expertise: metadata.ai_expertise || [],
          achievements: metadata.achievements || [],
          join_date: userData.created_at || new Date().toISOString(),
          user_stats: [{
            total_posts: userData.post_count || 0,
            total_comments: userData.comment_count || 0,
            total_likes_received: userData.like_count || 0,
            total_views: userData.view_count || 0,
            activities_joined: userData.activity_count || 0,
            resources_shared: userData.resource_count || 0
          }]
        }
      })

      setMembers(transformedData)
      setFilteredMembers(transformedData)
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('회원 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignableRoles = async () => {
    if (!user) return
    
    try {
      const response = await api.users.getAssignableRoles(user.id)
      if (response.success) {
        setAssignableRoles(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching assignable roles:', error)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleRoleChange = (role: string) => {
    setActiveRole(role)
  }

  const handleSkillChange = (skill: string) => {
    setActiveSkill(skill)
  }

  const filterMembers = (term: string, role: string, skill: string) => {
    let filtered = members

    // Filter out removed members unless user is admin
    if (!user) {
      filtered = filtered.filter(member => member.role !== 'removed')
    }

    if (term) {
      filtered = filtered.filter(member =>
        member.name?.toLowerCase().includes(term.toLowerCase()) ||
        member.department?.toLowerCase().includes(term.toLowerCase()) ||
        member.job_position?.toLowerCase().includes(term.toLowerCase()) ||
        member.ai_expertise?.some(expertise => 
          expertise.toLowerCase().includes(term.toLowerCase())
        )
      )
    }

    if (role !== 'all') {
      filtered = filtered.filter(member => member.role === role)
    }

    if (skill !== 'all') {
      filtered = filtered.filter(member => member.skill_level === skill)
    }

    // Note: Permission-based filtering disabled for MVP
    // filtered = filterMembersByPermissions(user, filtered, 'view')

    // Sort by activity score
    filtered.sort((a, b) => (b.activity_score || 0) - (a.activity_score || 0))

    setFilteredMembers(filtered)
  }

  // Admin functions
  const handleRemoveMember = async () => {
    if (!selectedMember || !user) return

    try {
      setOperationLoading(true)
      const result = await api.users.removeUser(selectedMember.id, user.id, '회원 삭제')
      
      if (!result.success) {
        throw new Error(result.error || '회원 제거에 실패했습니다.')
      }

      toast.success(`${selectedMember.name} 님을 회원 목록에서 제거했습니다.`)
      setRemoveDialogOpen(false)
      setSelectedMember(null)
      fetchMembers() // Refresh the list
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.message || '회원 제거에 실패했습니다.')
    } finally {
      setOperationLoading(false)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!user) return

    try {
      setOperationLoading(true)
      const result = await api.users.changeUserRole(memberId, newRole as Database['public']['Enums']['user_role'], user.id)
      
      if (!result.success) {
        throw new Error(result.error || '역할 변경에 실패했습니다.')
      }

      const member = members.find(m => m.id === memberId)
      toast.success(`${member?.name} 님의 역할을 ${roleLabels[newRole as keyof typeof roleLabels] || newRole}로 변경했습니다.`)
      fetchMembers() // Refresh the list
    } catch (error: any) {
      console.error('Error changing member role:', error)
      toast.error(error.message || '역할 변경에 실패했습니다.')
    } finally {
      setOperationLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return Crown
      case 'vice-leader': return Shield  
      case 'admin': return UserCog
      case 'moderator': return Shield
      case 'removed': return UserMinus
      default: return UserCheck
    }
  }

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long'
    })
  }

  const getActivityLevel = (score: number) => {
    if (score >= 800) return { level: '매우 활발', color: 'text-green-600' }
    if (score >= 600) return { level: '활발', color: 'text-blue-600' }
    if (score >= 400) return { level: '보통', color: 'text-yellow-600' }
    return { level: '조용', color: 'text-gray-600' }
  }

  const getMemberStats = (member: MemberWithStats) => {
    const stats = member.user_stats?.[0]
    return {
      posts: stats?.total_posts || 0,
      comments: stats?.total_comments || 0,
      participation: stats?.activities_joined || 0
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            회원목록
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI 학습동아리 회원들을 만나보세요
          </p>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{loading ? '-' : members.length}</div>
                <div className="text-sm text-muted-foreground">총 회원</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{loading ? '-' : members.filter(m => (m.activity_score || 0) > 200).length}</div>
                <div className="text-sm text-muted-foreground">활동 회원</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{loading ? '-' : members.filter(m => new Date(m.join_date).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000).length}</div>
                <div className="text-sm text-muted-foreground">신규 회원</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{loading ? '-' : members.filter(m => ['leader', 'vice-leader', 'admin'].includes(m.role)).length}</div>
                <div className="text-sm text-muted-foreground">운영진</div>
              </CardContent>
            </Card>
          </div>
          
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8 space-y-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름, 부서, 직급, AI 도구로 검색..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <Tabs value={activeRole} onValueChange={handleRoleChange}>
              <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max">
                {Object.entries(roleLabels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="whitespace-nowrap px-3 py-1.5 text-xs font-medium">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          <div className="overflow-x-auto">
            <Tabs value={activeSkill} onValueChange={handleSkillChange}>
              <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max">
                {Object.entries(skillLevels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="whitespace-nowrap px-3 py-1.5 text-xs font-medium">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </motion.div>

      {/* Results count */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-6"
      >
        <p className="text-sm text-muted-foreground">
          {loading ? '로딩 중...' : `총 ${filteredMembers.length}명의 회원이 있습니다`}
        </p>
      </motion.div>

      {/* Members Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {loading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
                    <div>
                      <div className="h-6 w-24 bg-muted rounded animate-pulse mb-2" />
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredMembers.map((member, index) => {
          const activityLevel = getActivityLevel(member.activity_score || 0)
          const stats = getMemberStats(member)
          
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url || ''} alt={member.name || ''} />
                        <AvatarFallback>
                          {member.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{member.name || '익명'}</CardTitle>
                        <CardDescription className="truncate">
                          {member.department || '미상'} {member.job_position || ''}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Badge 
                        variant="secondary" 
                        className={`${roleColors[member.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'} whitespace-nowrap`}
                      >
                        {roleLabels[member.role as keyof typeof roleLabels] || member.role}
                      </Badge>
                      
                      {/* Admin Controls - Show only if user can manage this member */}
                      {user && member.id !== user?.id && (user.role && ['leader', 'vice-leader'].includes(user.role) || assignableRoles.length > 0) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {assignableRoles.length > 0 && (
                              <>
                                <DropdownMenuItem 
                                  className="text-sm font-medium text-muted-foreground cursor-default"
                                  disabled
                                >
                                  역할 변경
                                </DropdownMenuItem>
                                {/* Show assignable roles based on user's permissions */}
                                {assignableRoles.map((role) => {
                                  const RoleIcon = getRoleIcon(role)
                                  return (
                                    <DropdownMenuItem
                                      key={role}
                                      onClick={() => handleChangeRole(member.id, role)}
                                      disabled={operationLoading || member.role === role}
                                      className="pl-6"
                                    >
                                      <RoleIcon className="mr-2 h-4 w-4" />
                                      {roleLabels[role as keyof typeof roleLabels] || role}
                                    </DropdownMenuItem>
                                  )
                                })}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {user.role && ['leader', 'vice-leader'].includes(user.role) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member)
                                  setRemoveDialogOpen(true)
                                }}
                                disabled={operationLoading}
                                className="text-red-600 focus:text-red-600"
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                회원 제거
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Bio */}
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                    {member.bio || 'AI 학습동아리 회원입니다.'}
                  </p>
                  
                  {/* AI Expertise */}
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">AI 전문분야</span>
                      <Badge 
                        variant="outline" 
                        className={skillColors[member.skill_level as keyof typeof skillColors] || 'bg-gray-100 text-gray-800'}
                      >
                        {skillLevels[member.skill_level as keyof typeof skillLevels] || member.skill_level || '미정'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {member.ai_expertise?.slice(0, 2).map((expertise) => (
                        <Badge key={expertise} variant="outline" className="text-xs truncate max-w-20">
                          {expertise}
                        </Badge>
                      )) || (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          전문분야 미정
                        </Badge>
                      )}
                      {(member.ai_expertise?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(member.ai_expertise?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>활동 점수</span>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-medium">{member.activity_score || 0}</span>
                        <span className={`text-xs ${activityLevel.color}`}>
                          ({activityLevel.level})
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div className="text-center">
                        <div className="font-medium text-foreground">{stats.posts}</div>
                        <div>게시글</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-foreground">{stats.comments}</div>
                        <div>댓글</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-foreground">{stats.participation}</div>
                        <div>참여</div>
                      </div>
                    </div>
                  </div>

                  {/* Achievements */}
                  {member.achievements && member.achievements.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-2 flex items-center space-x-1">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">성과</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {member.achievements.slice(0, 2).map((achievement) => (
                          <Badge key={achievement} variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            {achievement}
                          </Badge>
                        ))}
                        {member.achievements.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{member.achievements.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact Info & Join Date */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{member.location || '강원도 춘천시'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatJoinDate(member.join_date)} 가입</span>
                    </div>
                  </div>

                  {/* Contact Button */}
                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      메시지
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        window.location.href = `/profile/${member.id}`
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      프로필
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Empty state */}
      {!loading && filteredMembers.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="mb-4 text-6xl">👥</div>
          <h3 className="mb-2 text-xl font-semibold">검색 결과가 없습니다</h3>
          <p className="mb-4 text-muted-foreground">
            다른 검색어나 필터를 시도해보세요
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setActiveRole('all')
              setActiveSkill('all')
              filterMembers('', 'all', 'all')
            }}
          >
            전체 보기
          </Button>
        </motion.div>
      )}

      {/* Remove Member Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>회원 제거 확인</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedMember?.name}</strong> 님을 회원 목록에서 제거하시겠습니까?
              <br />
              <br />
              제거된 회원은 다시 복구할 수 있지만, 현재 활동 기록은 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationLoading}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={operationLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {operationLoading ? '처리 중...' : '제거'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// React.memo로 성능 최적화
export default memo(MembersPage)