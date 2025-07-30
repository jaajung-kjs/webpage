'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Search, MoreVertical, UserCog, UserMinus, Crown, Shield, UserCheck, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'
import { HybridCache, createCacheKey } from '@/lib/utils/cache'

interface MemberData {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  created_at: string
  activity_score: number
  post_count: number
  comment_count: number
  metadata?: any
}

const roleLabels = {
  leader: '동아리장',
  'vice-leader': '부동아리장',
  admin: '운영진',
  member: '일반회원',
  guest: '게스트',
  pending: '대기중'
}

const roleColors = {
  leader: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'vice-leader': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  guest: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pending: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
}

export default function MemberManagement() {
  const { user } = useAuth()
  const [members, setMembers] = useState<MemberData[]>([])
  const [filteredMembers, setFilteredMembers] = useState<MemberData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [operationLoading, setOperationLoading] = useState(false)

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    filterMembers()
  }, [searchTerm, members])

  const fetchMembers = async (forceRefresh = false) => {
    try {
      setLoading(true)
      
      // Check cache first
      const cacheKey = createCacheKey('admin', 'members')
      if (!forceRefresh) {
        const cachedData = HybridCache.get<MemberData[]>(cacheKey)
        if (cachedData !== null) {
          setMembers(cachedData)
          setFilteredMembers(cachedData)
          setLoading(false)
          
          // Still fetch fresh data in background
          fetchMembersData(true)
          return
        }
      }
      
      await fetchMembersData(false)
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('회원 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchMembersData = async (isBackgroundUpdate: boolean) => {
    // Fetch users with stats from the view - single query!
    const { data: users, error } = await supabase
      .from('members_with_stats')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error

    // If no users, just set empty arrays
    if (!users || users.length === 0) {
      setMembers([])
      setFilteredMembers([])
      return
    }

    const transformedData: MemberData[] = users.map((userData) => ({
      id: userData.id || '',
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'guest',
      department: userData.department === '미지정' ? null : userData.department,
      created_at: userData.created_at || '',
      activity_score: userData.activity_score || 0,
      post_count: userData.content_count || 0,
      comment_count: userData.comment_count || 0,
      metadata: userData.metadata || {}
    }))

    // Cache the data (10 minutes TTL)
    const cacheKey = createCacheKey('admin', 'members')
    HybridCache.set(cacheKey, transformedData, 600000) // 10 minutes

    if (!isBackgroundUpdate) {
      setMembers(transformedData)
      setFilteredMembers(transformedData)
    }
  }

  const filterMembers = () => {
    let filtered = members

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.department?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sort by role hierarchy then by activity score
    const roleOrder = ['leader', 'vice-leader', 'admin', 'member', 'pending', 'guest']
    filtered.sort((a, b) => {
      const roleIndexA = roleOrder.indexOf(a.role)
      const roleIndexB = roleOrder.indexOf(b.role)
      if (roleIndexA !== roleIndexB) {
        return roleIndexA - roleIndexB
      }
      return b.activity_score - a.activity_score
    })

    setFilteredMembers(filtered)
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
      
      // Invalidate cache and refresh
      const cacheKey = createCacheKey('admin', 'members')
      HybridCache.invalidate(cacheKey)
      fetchMembers(true) // Force refresh
    } catch (error: any) {
      console.error('Error changing member role:', error)
      toast.error(error.message || '역할 변경에 실패했습니다.')
    } finally {
      setOperationLoading(false)
    }
  }

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
      
      // Invalidate cache and refresh
      const cacheKey = createCacheKey('admin', 'members')
      HybridCache.invalidate(cacheKey)
      fetchMembers(true) // Force refresh
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.message || '회원 제거에 실패했습니다.')
    } finally {
      setOperationLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return Crown
      case 'vice-leader': return Shield  
      case 'admin': return UserCog
      default: return UserCheck
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>회원 관리</CardTitle>
          <CardDescription>
            등록된 회원 목록을 관리하고 권한을 변경할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="이름, 이메일, 부서로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {members.filter(m => ['member', 'vice-leader', 'leader', 'admin'].includes(m.role)).length}
                </div>
                <div className="text-sm text-muted-foreground">정식 회원</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === 'member').length}
                </div>
                <div className="text-sm text-muted-foreground">일반 회원</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === 'guest').length}
                </div>
                <div className="text-sm text-muted-foreground">게스트</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">승인 대기</div>
              </CardContent>
            </Card>
          </div>

          {/* Members Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>회원</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>활동</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={roleColors[member.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'}
                        >
                          {roleLabels[member.role as keyof typeof roleLabels] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.department || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>게시글: {member.post_count}</div>
                          <div>댓글: {member.comment_count}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(member.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {user && member.id !== user.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-sm font-medium text-muted-foreground cursor-default"
                                disabled
                              >
                                역할 변경
                              </DropdownMenuItem>
                              {['leader', 'vice-leader', 'admin', 'member', 'guest'].map((role) => {
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
                              {member.role === 'member' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedMember(member)
                                      setRemoveDialogOpen(true)
                                    }}
                                    disabled={operationLoading}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <UserMinus className="mr-2 h-4 w-4" />
                                    게스트로 변경
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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