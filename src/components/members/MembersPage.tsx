'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  User,
  Activity,
  Zap
} from 'lucide-react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { supabase, Tables } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'
import { HybridCache, createCacheKey } from '@/lib/utils/cache'
import { MessageButton } from '@/components/messages'
import { getRoleConfig, getRoleLabels, getRoleColors, getRoleIcons } from '@/lib/roles'
import { getSkillLevelConfig, getSkillLevelLabels, getSkillLevelColors, getSkillLevelIcons, calculateSkillLevel } from '@/lib/skills'
import { getActivityLevelInfo } from '@/lib/activityLevels'
import { getAIToolConfig } from '@/lib/aiTools'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import StatsCard from '@/components/shared/StatsCard'

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
  metadata?: any
}

// Get labels and configs from the new modules
const roleLabels = getRoleLabels()
const roleColors = getRoleColors()
const roleIcons = getRoleIcons()
const skillLevels = getSkillLevelLabels()
const skillColors = getSkillLevelColors()
const skillIcons = getSkillLevelIcons()

function MembersPage() {
  const { user, isMember } = useOptimizedAuth()
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
      
      // Check cache first
      const cacheKey = createCacheKey('members', 'list')
      const cachedMembers = HybridCache.get<MemberWithStats[]>(cacheKey)
      
      if (cachedMembers !== null) {
        setMembers(cachedMembers)
        setFilteredMembers(cachedMembers)
        setLoading(false)
        
        // Still fetch fresh data in background
        fetchMembersData(true)
        return
      }
      
      await fetchMembersData(false)
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('회원 목록을 불러오는데 실패했습니다.')
      setLoading(false)
    }
  }

  const fetchMembersData = async (isBackgroundUpdate: boolean) => {
    try {
      // Fetch members directly from users table
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          *,
          content:content!author_id(count),
          comments:comments!author_id(count)
        `)
        .in('role', ['member', 'vice-leader', 'leader', 'admin'])
      
      if (error) throw error

      // Filter to only show members with role 'member' or higher
      const membersOnly = userData || []

      // Transform user data to MemberWithStats format
      const transformedData: MemberWithStats[] = membersOnly.map((userData: any) => {
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
            total_posts: userData.content?.[0]?.count || 0,
            total_comments: userData.comments?.[0]?.count || 0,
            total_likes_received: 0, // Would need a separate query
            total_views: 0, // Would need a separate query
            activities_joined: 0, // Would need a separate query
            resources_shared: 0 // Would need a separate query
          }],
          metadata: userData.metadata // Preserve the full metadata object
        }
      })

      // Cache the members list (10 minutes TTL)
      const cacheKey = createCacheKey('members', 'list')
      HybridCache.set(cacheKey, transformedData, 600000) // 10 minutes

      if (!isBackgroundUpdate) {
        setMembers(transformedData)
        setFilteredMembers(transformedData)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching members data:', error)
      if (!isBackgroundUpdate) {
        toast.error('회원 목록을 불러오는데 실패했습니다.')
        setLoading(false)
      }
    }
  }

  const fetchAssignableRoles = async () => {
    if (!user) return
    
    try {
      // Define role hierarchy
      const roleHierarchy: Record<string, string[]> = {
        'admin': ['leader', 'vice-leader', 'member', 'guest'],
        'leader': ['vice-leader', 'member', 'guest'],
        'vice-leader': ['member', 'guest'],
        'member': [],
        'guest': []
      }
      
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      const userRole = profile?.role || 'member'
      setAssignableRoles(roleHierarchy[userRole] || [])
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

    // No need to filter removed members as we now use guest role

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
      const { error } = await supabase
        .from('users')
        .update({ 
          role: 'guest' as Database['public']['Enums']['user_role'],
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMember.id)
      
      if (error) throw error

      toast.success(`${selectedMember.name} 님을 일반 회원에서 게스트로 변경했습니다.`)
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
      const { error } = await supabase
        .from('users')
        .update({ 
          role: newRole as Database['public']['Enums']['user_role'],
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
      
      if (error) throw error

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


  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long'
    })
  }


  const getMemberStats = (member: MemberWithStats) => {
    const stats = member.user_stats?.[0]
    return {
      posts: stats?.total_posts || 0,
      comments: stats?.total_comments || 0,
      participation: stats?.activities_joined || 0
    }
  }

  // Categories for tabs - exclude guest and pending
  const categories = Object.entries(roleLabels)
    .filter(([value]) => !['guest', 'pending'].includes(value))
    .map(([value, label]) => ({ value, label }))

  // Calculate new members this month
  const newMembersThisMonth = members.filter(m => {
    const joinDate = new Date(m.join_date)
    const now = new Date()
    return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear()
  }).length

  // Calculate active members percentage
  const activeMembers = members.filter(m => (m.activity_score || 0) > 200).length
  const activePercentage = members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 0

  // Stats Section
  const statsSection = (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatsCard
        title="총 회원"
        value={members.length}
        icon={Users}
        subtitle={`이번 달 +${newMembersThisMonth}`}
        loading={loading}
      />
      <StatsCard
        title="활동 회원"
        value={activeMembers}
        icon={Activity}
        subtitle={`전체의 ${activePercentage}%`}
        loading={loading}
      />
      <StatsCard
        title="신규 회원"
        value={members.filter(m => new Date(m.join_date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
        icon={UserPlus}
        subtitle="최근 7일"
        loading={loading}
      />
      <StatsCard
        title="운영진"
        value={members.filter(m => ['leader', 'vice-leader', 'admin'].includes(m.role)).length}
        icon={Shield}
        subtitle="리더 및 관리자"
        loading={loading}
      />
    </div>
  )

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const advancedFilters = (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">스킬 레벨</h3>
      <div className="space-y-2">
        {Object.entries(skillLevels).map(([value, label]) => (
          <Button
            key={value}
            variant={activeSkill === value ? "default" : "ghost"}
            size="sm"
            onClick={() => handleSkillChange(value)}
            className="w-full justify-start"
          >
            <span>{label}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {value === 'all' 
                ? members.length
                : members.filter(m => m.skill_level === value).length}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <ContentListLayout
        title={
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            회원목록
          </span>
        }
        description={
          <span className="font-semibold">AI 학습동아리 회원들을 만나보세요</span>
        }
        searchPlaceholder="이름, 부서, 직급, AI 도구로 검색..."
        searchValue={searchTerm}
        onSearchChange={handleSearch}
        showCreateButton={false}
        categories={categories}
        activeCategory={activeRole}
        onCategoryChange={handleRoleChange}
        showViewToggle={false}
        showAdvancedFilters={showAdvancedFilters}
        onAdvancedFiltersToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
        advancedFilters={advancedFilters}
        advancedFiltersCount={activeSkill !== 'all' ? 1 : 0}
        statsSection={statsSection}
        loading={loading}
        resultCount={filteredMembers.length}
        emptyMessage="조건에 맞는 회원이 없습니다."
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          const activityLevel = getActivityLevelInfo(member.activity_score || 0)
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
                        <CardTitle className="text-lg truncate">
                          {member.name || '익명'}
                        </CardTitle>
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
                        {(() => {
                          const RoleIcon = roleIcons[member.role as keyof typeof roleIcons] || User
                          return (
                            <>
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {roleLabels[member.role as keyof typeof roleLabels] || member.role}
                            </>
                          )
                        })()}
                      </Badge>
                      
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
                        {(() => {
                          const SkillIcon = skillIcons[member.skill_level as keyof typeof skillIcons] || Zap
                          return (
                            <>
                              <SkillIcon className="h-3 w-3 mr-1" />
                              {skillLevels[member.skill_level as keyof typeof skillLevels] || member.skill_level || '미정'}
                            </>
                          )
                        })()}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {member.ai_expertise?.slice(0, 2).map((expertise) => {
                        const toolConfig = getAIToolConfig(expertise)
                        const Icon = toolConfig?.icon
                        return (
                          <Badge key={expertise} variant="outline" className="text-xs truncate max-w-24">
                            {Icon && <Icon className={`h-3 w-3 mr-0.5 flex-shrink-0 ${toolConfig.color || ''}`} />}
                            {toolConfig?.label || expertise}
                          </Badge>
                        )
                      }) || (
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
                        <Badge variant="outline" className={`text-xs ${activityLevel.color} px-1 py-0`}>
                          <activityLevel.icon className="h-3 w-3 mr-0.5" />
                          {activityLevel.level}
                        </Badge>
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
                    {isMember && user?.id !== member.id && (
                      <MessageButton
                        recipientId={member.id}
                        recipientName={member.name}
                        recipientAvatar={member.avatar_url}
                        recipientRole={member.role}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      />
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={isMember && user?.id !== member.id ? "flex-1" : "w-full"}
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
        </div>
      </ContentListLayout>

      {/* Remove Member Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>회원 권한 변경 확인</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedMember?.name}</strong> 님을 일반 회원에서 게스트로 변경하시겠습니까?
              <br />
              <br />
              게스트로 변경되면 동아리 활동이 제한되며, 다시 가입 신청을 해야 합니다.
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
              {operationLoading ? '처리 중...' : '변경'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// React.memo로 성능 최적화
export default memo(MembersPage)