'use client'

import { useState, useMemo, useCallback, useEffect, memo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Search, 
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
  UserMinus
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { useActivities, useSupabaseMutation } from '@/hooks/useSupabase'
import { supabase, Views, TablesInsert, TablesUpdate } from '@/lib/supabase/client'

const categoryLabels = {
  all: '전체',
  workshop: '워크샵',
  seminar: '세미나',
  study: '스터디',
  discussion: '토론회',
  meeting: '모임'
}

const statusLabels = {
  all: '전체',
  upcoming: '예정',
  ongoing: '진행중',
  completed: '완료',
  cancelled: '취소'
}

const categoryColors = {
  workshop: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  seminar: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  study: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  discussion: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  meeting: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300'
}

const statusColors = {
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ongoing: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

function ActivitiesPage() {
  const { user, profile } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeStatus, setActiveStatus] = useState('all')
  
  // Use Supabase hooks
  const { data: activities, loading, refetch } = useActivities()
  const { mutate: createActivity, loading: createLoading } = useSupabaseMutation()
  const { mutate: updateActivity, loading: updateLoading } = useSupabaseMutation()
  const { mutate: deleteActivity, loading: deleteLoading } = useSupabaseMutation()
  const { mutate: joinActivity, loading: joinLoading } = useSupabaseMutation()
  const { mutate: leaveActivity, loading: leaveLoading } = useSupabaseMutation()
  
  const operationLoading = createLoading || updateLoading || deleteLoading || joinLoading || leaveLoading

  // Admin functionality state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Views<'activities_with_details'> | null>(null)
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
    category: 'workshop' as 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting',
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
    tags: [] as string[]
  })

  // Filter activities based on search and filters
  const filteredActivities = useMemo(() => {
    if (!activities) return []
    
    let filtered = [...activities]

    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (activeCategory !== 'all') {
      filtered = filtered.filter(activity => activity.category === activeCategory)
    }

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
        const { data } = await supabase
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
      category: 'workshop' as 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting',
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
      // Create content first
      const contentData: TablesInsert<'content'> = {
        title: formData.title,
        content: formData.description,
        category: formData.category,
        tags: formData.tags,
        author_id: user.id,
        type: 'activity',
        status: 'published'
      }
      
      const { data: contentResult, error: contentError } = await supabase
        .from('content')
        .insert(contentData)
        .select()
        .single()
        
      if (contentError) throw contentError
      
      // Then create activity
      const scheduledAt = formData.date && formData.time 
        ? new Date(`${formData.date}T${formData.time}`).toISOString()
        : new Date().toISOString()

      const activityData: TablesInsert<'activities'> = {
        content_id: contentResult.id,
        scheduled_at: scheduledAt,
        duration_minutes: formData.duration,
        location: formData.location,
        max_participants: formData.max_participants,
        status: formData.status,
        instructor_id: user.id
      }
      
      const result = await createActivity(async () =>
        await supabase
          .from('activities')
          .insert(activityData)
          .select()
          .single()
      )

      if (result.error) throw result.error

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
      // Update content first
      const contentUpdates: TablesUpdate<'content'> = {
        title: formData.title,
        content: formData.description,
        category: formData.category,
        tags: formData.tags
      }
      
      const { error: contentError } = await supabase
        .from('content')
        .update(contentUpdates)
        .eq('id', selectedActivity.content_id!)
      
      if (contentError) throw contentError
      
      // Then update activity
      const activityUpdates: TablesUpdate<'activities'> = {
        scheduled_at: new Date(`${formData.date}T${formData.time}`).toISOString(),
        duration_minutes: formData.duration,
        location: formData.location,
        max_participants: formData.max_participants,
        status: formData.status
      }
      
      const result = await updateActivity(async () =>
        await supabase
          .from('activities')
          .update(activityUpdates)
          .eq('id', selectedActivity.id!)
          .select()
          .single()
      )
      
      if (result.error) throw result.error
      
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
      const result = await deleteActivity(async () =>
        await supabase
          .from('activities')
          .delete()
          .eq('id', activityId)
      )
      
      if (result.error) throw result.error
      
      toast.success('활동이 성공적으로 삭제되었습니다.')
      refetch()
    } catch (error: any) {
      console.error('Error deleting activity:', error)
      toast.error(error.message || '활동 삭제에 실패했습니다.')
    }
  }

  const openEditDialog = (activity: Views<'activities_with_details'>) => {
    setSelectedActivity(activity)
    
    // Extract date and time from scheduled_at
    const scheduledDate = activity.scheduled_at ? new Date(activity.scheduled_at) : new Date()
    const dateString = scheduledDate.toISOString().split('T')[0]
    const timeString = scheduledDate.toTimeString().split(' ')[0].substring(0, 5)
    
    setFormData({
      title: activity.title || '',
      description: activity.content || '',
      date: dateString,
      time: timeString,
      duration: activity.duration_minutes || 60,
      location: activity.location || '',
      max_participants: activity.max_participants || 20,
      category: activity.category as 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting' || 'workshop',
      status: activity.status as 'upcoming' | 'ongoing' | 'completed' | 'cancelled' || 'upcoming',
      tags: activity.tags || []
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
        const result = await leaveActivity(async () =>
          await supabase
            .from('activity_participants')
            .delete()
            .eq('activity_id', activityId)
            .eq('user_id', user.id)
        )
        
        if (result.error) throw result.error
        
        toast.success('활동에서 탈퇴하였습니다.')
      } else {
        // Join activity
        const result = await joinActivity(async () =>
          await supabase
            .from('activity_participants')
            .insert({
              activity_id: activityId,
              user_id: user.id
            })
        )
        
        if (result.error) throw result.error
        
        toast.success('활동에 참가하였습니다.')
      }
      
      await checkAllParticipationStatus()
      refetch()
    } catch (error: any) {
      console.error('Error handling activity participation:', error)
      toast.error(error.message || '참가 처리에 실패했습니다.')
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
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              학습 활동
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              AI 학습동아리의 다양한 활동과 세미나에 참여해보세요
            </p>
          </div>
          {user && profile?.role && ['admin', 'leader', 'vice-leader'].includes(profile.role) && (
            <Button 
              className="kepco-gradient"
              onClick={() => {
                resetForm()
                setCreateDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              활동 등록하기
            </Button>
          )}
        </motion.div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">
                {loading ? '-' : activities?.filter(a => a.status === 'upcoming').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">예정된 활동</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {loading ? '-' : activities?.filter(a => a.status === 'ongoing').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">진행 중</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '-' : activities?.reduce((total, a) => total + (a.current_participants || 0), 0) || 0}
              </div>
              <div className="text-sm text-muted-foreground">총 참여자</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {loading ? '-' : activities?.filter(a => a.status === 'completed').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">완료된 활동</div>
            </CardContent>
          </Card>
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
            placeholder="활동명, 설명, 장소, 태그로 검색..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
              <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="whitespace-nowrap px-3 py-1.5 text-xs font-medium">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          <div className="overflow-x-auto">
            <Tabs value={activeStatus} onValueChange={handleStatusChange}>
              <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max">
                {Object.entries(statusLabels).map(([key, label]) => (
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
          {loading ? '로딩 중...' : `총 ${filteredActivities.length}개의 활동이 있습니다`}
        </p>
      </motion.div>

      {/* Activities Grid */}
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
                  <Badge 
                    variant="secondary" 
                    className={categoryColors[activity.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'}
                  >
                    {categoryLabels[activity.category as keyof typeof categoryLabels] || activity.category}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={statusColors[activity.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}
                  >
                    {statusLabels[activity.status as keyof typeof statusLabels] || activity.status}
                  </Badge>
                </div>
                <CardTitle className="line-clamp-2 text-xl leading-tight">
                  {activity.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 line-clamp-3 text-base leading-relaxed">
                  {activity.content}
                </CardDescription>
                
                {/* Activity Details */}
                <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatActivityDate(activity.scheduled_at)} {formatActivityTime(activity.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(activity.duration_minutes)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{activity.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className={
                      activity.max_participants && (activity.current_participants || 0) >= activity.max_participants 
                        ? 'text-red-600 font-semibold' 
                        : activity.max_participants && (activity.current_participants || 0) >= activity.max_participants * 0.8 
                          ? 'text-orange-600 font-medium'
                          : ''
                    }>
                      {activity.current_participants || 0}/{activity.max_participants || '∞'}명
                      {activity.max_participants && (activity.current_participants || 0) >= activity.max_participants && ' (마감)'}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {activity.tags && activity.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1">
                    {activity.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {activity.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{activity.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Instructor */}
                <div className="mb-4 flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.instructor_avatar || ''} alt={activity.instructor_name || ''} />
                    <AvatarFallback>
                      {activity.instructor_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{activity.instructor_name || '익명'}</div>
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
                   profile.role === 'vice-leader' || activity.author_id === user.id) && (
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
      </motion.div>

      {/* Empty state */}
      {!loading && filteredActivities.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="mb-4 text-6xl">📅</div>
          <h3 className="mb-2 text-xl font-semibold">
            {!activities || activities.length === 0 ? '아직 등록된 활동이 없습니다' : '검색 결과가 없습니다'}
          </h3>
          <p className="mb-4 text-muted-foreground">
            {!activities || activities.length === 0 ? '첫 번째 활동을 등록해보세요!' : '다른 검색어나 필터를 시도해보세요'}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setActiveCategory('all')
              setActiveStatus('all')
            }}
          >
            {!activities || activities.length === 0 ? '새로고침' : '전체 보기'}
          </Button>
        </motion.div>
      )}

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
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting' })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workshop">워크샵</SelectItem>
                    <SelectItem value="seminar">세미나</SelectItem>
                    <SelectItem value="study">스터디</SelectItem>
                    <SelectItem value="discussion">토론회</SelectItem>
                    <SelectItem value="meeting">모임</SelectItem>
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
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as 'workshop' | 'seminar' | 'study' | 'discussion' | 'meeting' })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workshop">워크샵</SelectItem>
                    <SelectItem value="seminar">세미나</SelectItem>
                    <SelectItem value="study">스터디</SelectItem>
                    <SelectItem value="discussion">토론회</SelectItem>
                    <SelectItem value="meeting">모임</SelectItem>
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
    </div>
  )
}

// React.memo로 성능 최적화
export default memo(ActivitiesPage)