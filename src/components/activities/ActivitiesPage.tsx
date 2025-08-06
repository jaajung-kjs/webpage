'use client'

import { useState, useMemo, useCallback, useEffect, memo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Clock, 
  MapPin, 
  Users, 
  Calendar,
  Plus,
  UserCheck,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Info,
  Activity,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { 
  useActivities, 
  useCreateActivity, 
  useUpdateActivity, 
  useDeleteActivity,
  useJoinActivity,
  useLeaveActivity,
  useActivityParticipants,
  type ActivityWithContent
} from '@/hooks/features/useActivities'
import { supabaseClient } from '@/lib/core/connection-core'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { getBoardCategoryData } from '@/lib/categories'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import StatsCard from '@/components/shared/StatsCard'

// Get category data from centralized configuration
const { categoryLabels, categoryColors, categoryIcons } = getBoardCategoryData('activities')

const statusLabels = {
  all: '전체',
  upcoming: '예정',
  ongoing: '진행중',
  completed: '완료',
  cancelled: '취소'
}

const statusColors = {
  upcoming: 'bg-kepco-blue-100 text-kepco-blue-800 dark:bg-kepco-blue-900/20 dark:text-kepco-blue-300',
  ongoing: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  completed: 'bg-kepco-gray-100 text-kepco-gray-700 dark:bg-kepco-gray-900 dark:text-kepco-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
}

function ActivitiesPage() {
  const { user, profile } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeStatus, setActiveStatus] = useState('all')
  
  // Use Supabase hooks
  const { data: activities, isLoading: loading, refetch } = useActivities()
  const createActivityMutation = useCreateActivity()
  const updateActivityMutation = useUpdateActivity()
  const deleteActivityMutation = useDeleteActivity()
  const joinActivityMutation = useJoinActivity()
  const leaveActivityMutation = useLeaveActivity()
  
  const operationLoading = 
    createActivityMutation.isPending || 
    updateActivityMutation.isPending || 
    deleteActivityMutation.isPending || 
    joinActivityMutation.isPending || 
    leaveActivityMutation.isPending

  // Admin functionality state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Tables<'activities'> | null>(null)
  const [participationStatus, setParticipationStatus] = useState<{ [key: string]: boolean }>({})
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    location: '',
    max_participants: 20,
    category: 'regular' as 'regular' | 'study' | 'dinner' | 'lecture',
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
    tags: [] as string[]
  })

  // Filter activities based on search and filters
  const filteredActivities = useMemo(() => {
    if (!activities) return []
    
    let filtered = [...activities]

    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.status?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Note: activities don't have a category field directly
    // We'd need to join with content table to filter by category

    if (activeStatus !== 'all') {
      filtered = filtered.filter(activity => activity.status === activeStatus)
    }

    // Sort by scheduled_at (upcoming first)
    filtered.sort((a, b) => new Date(a.scheduled_at || '').getTime() - new Date(b.scheduled_at || '').getTime())

    return filtered
  }, [activities, searchTerm, activeCategory, activeStatus])
  
  // Check participation status for all activities
  useEffect(() => {
    if (user && activities && activities.length > 0) {
      checkAllParticipationStatus()
    }
  }, [user, activities])

  const checkAllParticipationStatus = async () => {
    if (!user || !activities) return
    
    const status: { [key: string]: boolean } = {}
    
    for (const activity of activities) {
      if (activity.id) {
        const { data } = await supabaseClient
          .from('activity_participants')
          .select('id')
          .eq('activity_id', activity.id)
          .eq('user_id', user.id)
          .single()
        
        status[activity.id] = !!data
      }
    }
    
    setParticipationStatus(status)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
  }

  const handleStatusChange = (status: string) => {
    setActiveStatus(status)
  }



  // Admin functions
  // Utility functions for formatting
  const formatActivityDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }
  
  const formatActivityTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }
  
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours}시간 ${mins}분`
    } else if (hours > 0) {
      return `${hours}시간`
    } else {
      return `${mins}분`
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      duration: 60,
      location: '',
      max_participants: 20,
      category: 'regular' as 'regular' | 'study' | 'dinner' | 'lecture',
      status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
      tags: []
    })
  }

  const handleCreateActivity = async () => {
    if (!user || !formData.title.trim() || !formData.description.trim()) {
      toast.error('제목과 설명을 입력해주세요.')
      return
    }

    try {
      // First create content
      const { data: contentData, error: contentError } = await supabaseClient
        .from('content')
        .insert({
          title: formData.title,
          content: formData.description,
          category: formData.category,
          type: 'activity' as const,
          author_id: user.id,
          tags: formData.tags || []
        })
        .select()
        .single()
      
      if (contentError) throw contentError
      
      // Then create activity with content_id
      const activityData: TablesInsert<'activities'> = {
        content_id: contentData.id,
        scheduled_at: `${formData.date}T${formData.time}:00`,
        duration_minutes: formData.duration || 60,
        location: formData.location,
        max_participants: formData.max_participants,
        status: (formData.status || 'upcoming') as 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
        instructor_id: user.id
      }
      
      await createActivityMutation.mutateAsync(activityData)

      toast.success('활동이 성공적으로 등록되었습니다.')
      setCreateDialogOpen(false)
      resetForm()
      refetch()
    } catch (error: any) {
      console.error('Error creating activity:', error)
      toast.error(error.message || '활동 등록에 실패했습니다.')
    }
  }

  const handleEditActivity = async () => {
    if (!selectedActivity || !selectedActivity.id || !user || !formData.title.trim() || !formData.description.trim()) {
      toast.error('제목과 설명을 입력해주세요.')
      return
    }

    try {
      // Update content first if it exists
      if (selectedActivity.content_id) {
        const { error: contentError } = await supabaseClient
          .from('content')
          .update({
            title: formData.title,
            content: formData.description,
            category: formData.category,
            tags: formData.tags || []
          })
          .eq('id', selectedActivity.content_id)
        
        if (contentError) throw contentError
      }
      
      // Then update activity
      const activityUpdates: TablesUpdate<'activities'> = {
        scheduled_at: `${formData.date}T${formData.time}:00`,
        duration_minutes: formData.duration || 60,
        location: formData.location,
        max_participants: formData.max_participants,
        status: formData.status as 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
      }
      
      await updateActivityMutation.mutateAsync({
        id: selectedActivity.id,
        updates: activityUpdates
      })
      
      toast.success('활동이 성공적으로 수정되었습니다.')
      setEditDialogOpen(false)
      setSelectedActivity(null)
      resetForm()
      refetch()
    } catch (error: any) {
      console.error('Error updating activity:', error)
      toast.error(error.message || '활동 수정에 실패했습니다.')
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!user) return

    try {
      // First get the activity to find content_id
      const { data: activity } = await supabaseClient
        .from('activities')
        .select('content_id')
        .eq('id', activityId)
        .single()
      
      // Delete activity first
      await deleteActivityMutation.mutateAsync(activityId)
      
      // Then delete content if it exists
      if (activity?.content_id) {
        await supabaseClient
          .from('content')
          .delete()
          .eq('id', activity.content_id)
      }
      
      toast.success('활동이 성공적으로 삭제되었습니다.')
      refetch()
    } catch (error: any) {
      console.error('Error deleting activity:', error)
      toast.error(error.message || '활동 삭제에 실패했습니다.')
    }
  }

  const openEditDialog = (activity: ActivityWithContent) => {
    setSelectedActivity(activity)
    
    // Extract date and time from scheduled_at
    const scheduledDate = activity.scheduled_at ? new Date(activity.scheduled_at) : new Date()
    const dateStr = scheduledDate.toISOString().split('T')[0]
    const timeStr = scheduledDate.toTimeString().substring(0, 5)
    
    setFormData({
      title: activity.content?.title || '',
      description: activity.content?.content || '',
      date: dateStr,
      time: timeStr,
      duration: activity.duration_minutes || 60,
      location: activity.location || '',
      max_participants: activity.max_participants || 20,
      category: (activity.content?.category || 'regular') as 'regular' | 'study' | 'dinner' | 'lecture',
      status: activity.status as 'upcoming' | 'ongoing' | 'completed' | 'cancelled' || 'upcoming',
      tags: activity.content?.tags || []
    })
    setEditDialogOpen(true)
  }


  const handleActivityParticipation = async (activityId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    // 권한 체크 추가
    if (!profile || !['member', 'vice-leader', 'leader', 'admin'].includes(profile.role)) {
      toast.error('정회원 이상만 활동에 참가할 수 있습니다.')
      return
    }

    try {
      const isCurrentlyParticipating = participationStatus[activityId]
      
      if (isCurrentlyParticipating) {
        // Leave activity
        await leaveActivityMutation.mutateAsync(activityId)
        
        toast.success('활동에서 탈퇴하였습니다.')
      } else {
        // Join activity
        await joinActivityMutation.mutateAsync(activityId)
        
        toast.success('활동에 참가하였습니다.')
      }
      
      await checkAllParticipationStatus()
      refetch()
    } catch (error: any) {
      console.error('Error handling activity participation:', error)
      toast.error(error.message || '참가 처리에 실패했습니다.')
    }
  }

  // Categories for tabs
  const categories = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))

  // Calculate today's activities
  const todayActivities = activities?.filter(a => {
    if (!a.scheduled_at) return false
    const today = new Date().toISOString().split('T')[0]
    const activityDate = new Date(a.scheduled_at).toISOString().split('T')[0]
    return activityDate === today
  }).length || 0

  // Calculate this week's activities
  const thisWeekActivities = activities?.filter(a => {
    if (!a.scheduled_at) return false
    const activityDate = new Date(a.scheduled_at)
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return activityDate >= weekStart && activityDate <= weekEnd
  }).length || 0

  // Stats Section
  const statsSection = (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatsCard
        title="예정된 활동"
        value={activities?.filter(a => a.status === 'upcoming').length || 0}
        icon={Calendar}
        subtitle={`오늘 ${todayActivities}개`}
        loading={loading}
      />
      <StatsCard
        title="진행 중"
        value={activities?.filter(a => a.status === 'ongoing').length || 0}
        icon={Activity}
        subtitle="현재 진행 중"
        loading={loading}
      />
      <StatsCard
        title="총 참여자"
        value={activities?.reduce((total, a) => total + (a.current_participants || 0), 0) || 0}
        icon={Users}
        subtitle={`이번 주 ${thisWeekActivities}개 활동`}
        loading={loading}
      />
      <StatsCard
        title="완료된 활동"
        value={activities?.filter(a => a.status === 'completed').length || 0}
        icon={CheckCircle}
        subtitle="누적 완료"
        loading={loading}
      />
    </div>
  )

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const advancedFilters = (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">상태 필터</h3>
      <div className="space-y-2">
        {Object.entries(statusLabels).map(([value, label]) => (
          <Button
            key={value}
            variant={activeStatus === value ? "default" : "ghost"}
            size="sm"
            onClick={() => handleStatusChange(value)}
            className="w-full justify-start"
          >
            {label}
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
            <Calendar className="h-5 w-5" />
            활동일정
          </span>
        }
        description={
          <span className="font-semibold">AI 학습동아리의 다양한 활동과 세미나에 참여해보세요</span>
        }
        searchPlaceholder="활동명, 설명, 장소, 태그로 검색..."
        searchValue={searchTerm}
        onSearchChange={handleSearch}
        showCreateButton={!!(user && profile?.role && ['admin', 'leader', 'vice-leader'].includes(profile.role))}
        createButtonText="활동 등록하기"
        onCreateClick={() => {
          resetForm()
          setCreateDialogOpen(true)
        }}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        showViewToggle={false}
        showAdvancedFilters={showAdvancedFilters}
        onAdvancedFiltersToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
        advancedFilters={advancedFilters}
        advancedFiltersCount={activeStatus !== 'all' ? 1 : 0}
        statsSection={statsSection}
        loading={loading}
        resultCount={filteredActivities.length}
        emptyMessage="활동이 없습니다."
        emptyAction={
          user && profile?.role && ['admin', 'leader', 'vice-leader'].includes(profile.role) && (
            <Button 
              className="kepco-gradient" 
              onClick={() => {
                resetForm()
                setCreateDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              첫 번째 활동을 등록해보세요!
            </Button>
          )
        }
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-6 bg-muted rounded animate-pulse" />
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
        ) : filteredActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
          >
            <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  {activity.content?.category && (
                    <Badge 
                      variant="secondary" 
                      className={categoryColors[activity.content.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'}
                    >
                      {(() => {
                        const CategoryIcon = categoryIcons[activity.content.category as keyof typeof categoryIcons]
                        return (
                          <>
                            {CategoryIcon && <CategoryIcon className="h-3 w-3 mr-1" />}
                            {categoryLabels[activity.content.category as keyof typeof categoryLabels] || activity.content.category}
                          </>
                        )
                      })()}
                    </Badge>
                  )}
                  <Badge 
                    variant="outline"
                    className={statusColors[activity.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}
                  >
                    {statusLabels[activity.status as keyof typeof statusLabels] || activity.status}
                  </Badge>
                </div>
                <CardTitle className="line-clamp-2 text-xl leading-tight">
                  {activity.content?.title || '제목 없음'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 line-clamp-3 text-base leading-relaxed">
                  {activity.content?.content || '설명 없음'}
                </CardDescription>
                
                {/* Activity Details */}
                <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{activity.scheduled_at ? new Date(activity.scheduled_at).toLocaleString('ko-KR') : '시간 미정'}</span>
                  </div>
                  {activity.duration_minutes && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>약 {activity.duration_minutes}분</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{activity.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {0}/{activity.max_participants || '∞'}명
                    </span>
                  </div>
                </div>

                {/* Instructor */}
                <div className="mb-4 flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      U
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{activity.content?.author_name || '익명'}</div>
                    <div className="text-xs text-muted-foreground">진행자</div>
                  </div>
                </div>

                {/* Admin Controls and Action Button */}
                <div className="flex items-center gap-2">
                  {activity.status === 'upcoming' && profile && 
                   ['member', 'vice-leader', 'leader', 'admin'].includes(profile.role) ? (
                    <Button 
                      className="flex-1 kepco-gradient"
                      onClick={() => activity.id && handleActivityParticipation(activity.id)}
                      disabled={operationLoading || !activity.id || (activity.max_participants !== null && (activity.current_participants || 0) >= activity.max_participants)}
                    >
                      {activity.id && participationStatus[activity.id] ? (
                        <>
                          <UserMinus className="mr-2 h-4 w-4" />
                          참가 취소
                        </>
                      ) : activity.max_participants !== null && (activity.current_participants || 0) >= activity.max_participants ? (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          마감됨
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          참가 신청
                        </>
                      )}
                    </Button>
                  ) : activity.status === 'upcoming' && (!profile || profile.role === 'guest' || profile.role === 'pending') ? (
                    <Button className="flex-1" variant="outline" disabled>
                      <UserCheck className="mr-2 h-4 w-4" />
                      회원만 참가 가능
                    </Button>
                  ) : (
                    <Button className="flex-1" variant="outline">
                      <UserCheck className="mr-2 h-4 w-4" />
                      {activity.status === 'ongoing' ? '진행 중' : 
                       activity.status === 'completed' ? '완료됨' : '취소됨'}
                    </Button>
                  )}
                  
                  {user && profile && (profile.role === 'admin' || profile.role === 'leader' || 
                   profile.role === 'vice-leader' || activity.content?.author_id === user.id) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(activity)}
                          disabled={operationLoading}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => activity.id && handleDeleteActivity(activity.id)}
                          disabled={operationLoading}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        </div>
      </ContentListLayout>

      {/* Create Activity Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 활동 등록</DialogTitle>
            <DialogDescription>
              동아리 구성원들을 위한 새로운 학습 활동을 등록해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">제목</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="활동 제목을 입력하세요"
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">카테고리</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as 'regular' | 'study' | 'dinner' | 'lecture' })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">정기모임</SelectItem>
                    <SelectItem value="study">스터디</SelectItem>
                    <SelectItem value="dinner">회식</SelectItem>
                    <SelectItem value="lecture">강연</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">상태</label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as 'upcoming' | 'ongoing' | 'completed' | 'cancelled' })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">예정</SelectItem>
                    <SelectItem value="ongoing">진행중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">날짜</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">시간</label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">소요시간 (분)</label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                  placeholder="60"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">최대 참여자 수</label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 20 })}
                  placeholder="20"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">장소</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="활동 장소를 입력하세요"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">설명</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="활동에 대한 자세한 설명을 입력하세요"
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={operationLoading}>
              취소
            </Button>
            <Button onClick={handleCreateActivity} disabled={operationLoading}>
              {operationLoading ? '등록 중...' : '등록 완료'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>활동 수정</DialogTitle>
            <DialogDescription>
              활동 정보를 수정해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">제목</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="활동 제목을 입력하세요"
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">카테고리</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as 'regular' | 'study' | 'dinner' | 'lecture' })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">정기모임</SelectItem>
                    <SelectItem value="study">스터디</SelectItem>
                    <SelectItem value="dinner">회식</SelectItem>
                    <SelectItem value="lecture">강연</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">상태</label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as 'upcoming' | 'ongoing' | 'completed' | 'cancelled' })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">예정</SelectItem>
                    <SelectItem value="ongoing">진행중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">날짜</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">시간</label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">소요시간 (분)</label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                  placeholder="60"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">최대 참여자 수</label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 20 })}
                  placeholder="20"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">장소</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="활동 장소를 입력하세요"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">설명</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="활동에 대한 자세한 설명을 입력하세요"
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditDialogOpen(false)
                setSelectedActivity(null)
                resetForm()
              }} 
              disabled={operationLoading}
            >
              취소
            </Button>
            <Button onClick={handleEditActivity} disabled={operationLoading}>
              {operationLoading ? '수정 중...' : '수정 완료'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// React.memo로 성능 최적화
export default memo(ActivitiesPage)