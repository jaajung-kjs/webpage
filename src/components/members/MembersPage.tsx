'use client'

import { useState, useMemo, memo } from 'react'
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
import { useAuthV2 } from '@/hooks/features/useAuthV2'
import { Tables } from '@/lib/database.types'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'
// V2 시스템 사용
import { useProfileList, useUsersSimpleStats, useUserProfilesComplete } from '@/hooks/features/useProfileV2'
import { useUpdateMemberRoleV2 } from '@/hooks/features/useMembersV2'
import type { UserMetadata } from '@/lib/types'
import { MessageButton } from '@/components/messages'
import { getRoleConfig, getRoleLabels, getRoleColors, getRoleIcons } from '@/lib/roles'
import { getSkillLevelConfig, getSkillLevelLabels, getSkillLevelColors, getSkillLevelIcons, calculateSkillLevel } from '@/lib/skills'
import { getActivityLevelInfo } from '@/lib/activityLevels'
import { getAIToolConfig } from '@/lib/aiTools'
import { ACHIEVEMENTS } from '@/lib/achievements'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import StatsCard from '@/components/shared/StatsCard'
import UserLevelBadges from '@/components/shared/UserLevelBadges'

// V2 시스템에서는 UserV2를 확장한 타입 사용
import type { UserV2 } from '@/hooks/types/v2-types'

type MemberData = UserV2 & {
  phone?: string | null
  job_position?: string | null
  location?: string | null
  skill_level?: string
  ai_expertise?: string[]
  join_date?: string
  // achievements는 별도로 조회
}

// Get labels and configs from the new modules
const roleLabels = getRoleLabels()
const roleColors = getRoleColors()
const roleIcons = getRoleIcons()
const skillLevels = getSkillLevelLabels()
const skillColors = getSkillLevelColors()
const skillIcons = getSkillLevelIcons()

function MembersPage() {
  const { user, isMember } = useAuthV2()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeRole, setActiveRole] = useState('all')
  const [activeSkill, setActiveSkill] = useState('all')
  
  // V2 Hook 사용 - 페이지네이션과 필터링 지원
  const { 
    data: members = [], 
    isLoading: loading 
  } = useProfileList({
    search: searchTerm,
    role: activeRole === 'all' ? undefined : activeRole,
    orderBy: 'activity_score',
    order: 'desc',
    limit: 100
  })
  
  const updateMemberRoleMutation = useUpdateMemberRoleV2()
  // Note: useDeleteMember is not available in V2, remove if not needed
  // const deleteMemberMutation = useDeleteMember()
  
  // Admin functionality state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<UserV2 | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  
  // 회원 ID 목록 추출
  const memberIds = useMemo(() => {
    return members.map(m => m.id)
  }, [members])
  
  // 회원들의 통계 데이터 가져오기
  // TODO: Fix hook parameters - currently disabled due to type mismatch
  // const { data: memberStats } = useUsersSimpleStats(memberIds)
  const memberStats = undefined
  
  // 회원들의 전체 프로필 데이터 가져오기 (업적 포함)
  // TODO: Fix hook parameters - currently disabled due to type mismatch
  // const { data: memberProfiles } = useUserProfilesComplete(memberIds, {
  //   includeActivities: false,
  //   includeAchievements: true,
  //   activitiesLimit: 0
  // })
  const memberProfiles = undefined

  // V2 시스템에서는 변환 불필요 - 직접 사용
  const transformedMembers = useMemo(() => {
    if (!members || !Array.isArray(members)) return []
    
    return members.map((member) => {
      // In V2, metadata fields are likely part of the main table structure
      return {
        ...member,
        phone: (member as any).phone || null,
        job_position: (member as any).job_position || null,
        location: (member as any).location || null,
        skill_level: (member as any).skill_level || 'beginner',
        ai_expertise: (member as any).ai_expertise || [],
        join_date: member.created_at || new Date().toISOString(),
        // V2에서는 stats가 없으므로 기본값 사용
        user_stats: null,
        metadata: (member as any).metadata || {} // Json 타입 그대로 사용
      } as MemberData
    })
  }, [members])

  // Filter members based on search and filters
  const filteredMembers = useMemo(() => {
    let filtered = transformedMembers

    // V2 시스템에서는 서버 사이드 필터링이 되므로 추가 필터링만 수행
    if (activeSkill !== 'all') {
      filtered = filtered.filter(member => member.skill_level === activeSkill)
    }

    // 이미 activity_score로 정렬되어 있음

    return filtered
  }, [transformedMembers, activeSkill])

  // Determine assignable roles based on user's role using useMemo
  const assignableRoles = useMemo(() => {
    if (!(user as any)?.role) return []
    
    const roleHierarchy: Record<string, string[]> = {
      'admin': ['leader', 'vice-leader', 'member', 'guest'],
      'leader': ['vice-leader', 'member', 'guest'],
      'vice-leader': ['member', 'guest'],
      'member': [],
      'guest': []
    }
    
    return roleHierarchy[(user as any).role] || []
  }, [(user as any)?.role])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleRoleChange = (role: string) => {
    setActiveRole(role)
  }

  const handleSkillChange = (skill: string) => {
    setActiveSkill(skill)
  }

  // Admin functions
  const handleRemoveMember = async () => {
    if (!selectedMember || !user) return

    setOperationLoading(true)
    try {
      await updateMemberRoleMutation.mutateAsync({
        userId: selectedMember.id,
        newRole: 'guest'
      })

      toast.success(`${selectedMember.name} 님을 일반 회원에서 게스트로 변경했습니다.`)
      setRemoveDialogOpen(false)
      setSelectedMember(null)
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.message || '회원 제거에 실패했습니다.')
    } finally {
      setOperationLoading(false)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!user) return

    setOperationLoading(true)
    try {
      await updateMemberRoleMutation.mutateAsync({
        userId: memberId,
        newRole: newRole as any
      })

      const member = transformedMembers.find(m => m.id === memberId)
      toast.success(`${member?.name} 님의 역할을 ${roleLabels[newRole as keyof typeof roleLabels] || newRole}로 변경했습니다.`)
    } catch (error: any) {
      console.error('Error changing member role:', error)
      toast.error(error.message || '역할 변경에 실패했습니다.')
    } finally {
      setOperationLoading(false)
    }
  }


  const formatJoinDate = (dateString: string | undefined) => {
    if (!dateString) return '정보 없음'
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long'
    })
  }


  const getMemberStats = (member: MemberData) => {
    // 회원별 통계 데이터 조회
    if (memberStats && Array.isArray(memberStats)) {
      const stats = (memberStats as any[]).find((s: any) => s.user_id === member.id)
      if (stats) {
        return {
          posts: stats.posts_count || 0,
          comments: stats.comments_count || 0,
          participation: stats.activities_joined || 0
        }
      }
    }
    
    // 통계 데이터가 없으면 기본값 반환
    return {
      posts: 0,
      comments: 0,
      participation: 0
    }
  }

  // Categories for tabs - exclude guest and pending
  const categories = Object.entries(roleLabels)
    .filter(([value]) => !['guest', 'pending'].includes(value))
    .map(([value, label]) => ({ value, label }))

  // Calculate new members this month
  const newMembersThisMonth = transformedMembers.filter(m => {
    if (!m.join_date) return false
    const joinDate = new Date(m.join_date)
    const now = new Date()
    return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear()
  }).length

  // Calculate active members percentage
  const activeMembers = transformedMembers.filter(m => (m.activity_score || 0) > 200).length
  const activePercentage = transformedMembers.length > 0 ? Math.round((activeMembers / transformedMembers.length) * 100) : 0

  // Stats Section
  const statsSection = (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatsCard
        title="총 회원"
        value={transformedMembers.length}
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
        value={transformedMembers.filter(m => m.join_date && new Date(m.join_date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
        icon={UserPlus}
        subtitle="최근 7일"
        loading={loading}
      />
      <StatsCard
        title="운영진"
        value={transformedMembers.filter(m => ['leader', 'vice-leader', 'admin'].includes(m.role)).length}
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
                ? transformedMembers.length
                : transformedMembers.filter(m => m.skill_level === value).length}
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
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg truncate">
                            {member.name || '익명'}
                          </CardTitle>
                          {/* 게임화 V2 레벨 뱃지 */}
                          <UserLevelBadges 
                            userId={member.id} 
                            variant="compact" 
                            size="sm" 
                            className="flex-shrink-0"
                          />
                        </div>
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
                      <div className="flex items-center gap-2">
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

                  {/* Achievements - V2 시스템 사용 */}
                  {(() => {
                    const profile = (memberProfiles as any)?.find?.((p: any) => p.profile.id === member.id)
                    const completedAchievements = profile?.achievement_progress
                      ?.filter((a: any) => a.is_completed)
                      ?.map((a: any) => ({
                        id: a.achievement_id,
                        ...ACHIEVEMENTS[a.achievement_id]
                      }))
                      ?.filter(Boolean) || []
                    
                    if (completedAchievements.length === 0) return null
                    
                    return (
                      <div className="mb-4">
                        <div className="mb-2 flex items-center space-x-1">
                          <Award className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">업적</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {completedAchievements.slice(0, 2).map((achievement: any) => (
                            <Badge 
                              key={achievement.id} 
                              variant="secondary" 
                              className="text-xs bg-yellow-100 text-yellow-800"
                            >
                              {achievement.icon} {achievement.name}
                            </Badge>
                          ))}
                          {completedAchievements.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{completedAchievements.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })()}

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
                    {isMember() && (user as any)?.id !== member.id && (
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
                      className={isMember() && (user as any)?.id !== member.id ? "flex-1" : "w-full"}
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