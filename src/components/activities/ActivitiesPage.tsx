'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Search, 
  Clock, 
  MapPin, 
  Users, 
  Calendar,
  Plus,
  Filter,
  Star,
  UserCheck
} from 'lucide-react'
import { activitiesApi } from '@/lib/api'

interface ActivityWithInstructor {
  id: string
  title: string
  description: string
  date: string
  time: string
  duration: number
  location: string
  max_participants: number
  current_participants: number
  category: string
  status: string
  tags: string[]
  created_at: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    role: string
  } | null
}

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

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityWithInstructor[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityWithInstructor[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeStatus, setActiveStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [])

  useEffect(() => {
    filterActivities(searchTerm, activeCategory, activeStatus)
  }, [searchTerm, activeCategory, activeStatus, activities])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const { data, error } = await activitiesApi.getAll({
        limit: 100
      })

      if (error) throw error
      setActivities(data || [])
      setFilteredActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
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

  const filterActivities = (term: string, category: string, status: string) => {
    let filtered = activities

    if (term) {
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(term.toLowerCase()) ||
        activity.description.toLowerCase().includes(term.toLowerCase()) ||
        activity.location.toLowerCase().includes(term.toLowerCase()) ||
        activity.tags?.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
      )
    }

    if (category !== 'all') {
      filtered = filtered.filter(activity => activity.category === category)
    }

    if (status !== 'all') {
      filtered = filtered.filter(activity => activity.status === status)
    }

    // Sort by date (upcoming first)
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    setFilteredActivities(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) // HH:MM format
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
          <Button className="kepco-gradient">
            <Plus className="mr-2 h-4 w-4" />
            활동 등록하기
          </Button>
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
                {loading ? '-' : activities.filter(a => a.status === 'upcoming').length}
              </div>
              <div className="text-sm text-muted-foreground">예정된 활동</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {loading ? '-' : activities.filter(a => a.status === 'ongoing').length}
              </div>
              <div className="text-sm text-muted-foreground">진행 중</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '-' : activities.reduce((total, a) => total + (a.current_participants || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">총 참여자</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {loading ? '-' : activities.filter(a => a.status === 'completed').length}
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

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
              <TabsList className="grid w-full grid-cols-6">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          <div className="w-full sm:w-60">
            <Tabs value={activeStatus} onValueChange={handleStatusChange}>
              <TabsList className="grid w-full grid-cols-5">
                {Object.entries(statusLabels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
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
                  {activity.description}
                </CardDescription>
                
                {/* Activity Details */}
                <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(activity.date)} {formatTime(activity.time)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{activity.duration}분</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{activity.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{activity.current_participants}/{activity.max_participants}명</span>
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
                    <AvatarImage src={activity.profiles?.avatar_url || ''} alt={activity.profiles?.name || ''} />
                    <AvatarFallback>
                      {activity.profiles?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{activity.profiles?.name || '익명'}</div>
                    <div className="text-xs text-muted-foreground">진행자</div>
                  </div>
                </div>

                {/* Action Button */}
                <Button className="w-full kepco-gradient">
                  <UserCheck className="mr-2 h-4 w-4" />
                  {activity.status === 'upcoming' ? '참가 신청' : '자세히 보기'}
                </Button>
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
            {activities.length === 0 ? '아직 등록된 활동이 없습니다' : '검색 결과가 없습니다'}
          </h3>
          <p className="mb-4 text-muted-foreground">
            {activities.length === 0 ? '첫 번째 활동을 등록해보세요!' : '다른 검색어나 필터를 시도해보세요'}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setActiveCategory('all')
              setActiveStatus('all')
              filterActivities('', 'all', 'all')
            }}
          >
            {activities.length === 0 ? '새로고침' : '전체 보기'}
          </Button>
        </motion.div>
      )}
    </div>
  )
}