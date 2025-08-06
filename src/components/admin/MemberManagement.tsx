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
import { Search, MoreVertical, UserCog, UserMinus, Crown, Shield, UserCheck, User, Trash2 } from 'lucide-react'
import { useAuth } from '@/providers'
import { supabaseClient } from '@/lib/core/connection-core'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'
import { useMembers, useUpdateMemberRole, useDeleteMember } from '@/hooks/features/useMembers'
import { useMutation, useQueryClient } from '@tanstack/react-query'

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
  const queryClient = useQueryClient()
  const { data: membersData = [], isLoading: loading } = useMembers()
  const updateMemberRoleMutation = useUpdateMemberRole()
  const deleteMemberMutation = useDeleteMember()
  
  const [filteredMembers, setFilteredMembers] = useState<MemberData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Transform members data to expected format
  const members: MemberData[] = (membersData || []).map((userData: any) => ({
    id: userData.id || '',
    name: userData.name || '',
    email: userData.email || '',
    role: userData.role || 'guest',
    department: userData.department === '미지정' ? null : userData.department,
    created_at: userData.created_at || '',
    activity_score: userData.activity_score || 0,
    post_count: 0,
    comment_count: 0,
    metadata: userData.metadata || {}
  }))

  useEffect(() => {
    filterMembers()
  }, [searchTerm, members])

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
      await updateMemberRoleMutation.mutateAsync({
        userId: memberId,
        newRole: newRole as Database['public']['Enums']['user_role']
      })

      const member = members.find(m => m.id === memberId)
      toast.success(`${member?.name} 님의 역할을 ${roleLabels[newRole as keyof typeof roleLabels] || newRole}로 변경했습니다.`)
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['members'] })
    } catch (error: any) {
      console.error('Error changing member role:', error)
      toast.error(error.message || '역할 변경에 실패했습니다.')
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember || !user) return

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
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedMember || !user) return

    try {
      // Get the user's auth token
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session) {
        toast.error('인증 세션이 없습니다.')
        return
      }

      // Call the Edge Function to delete the user
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: selectedMember.id })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '사용자 삭제에 실패했습니다.')
      }

      toast.success(`${selectedMember.name} 님의 계정이 완전히 삭제되었습니다.`)
      setDeleteDialogOpen(false)
      setSelectedMember(null)
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['members'] })
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.message || '사용자 삭제에 실패했습니다.')
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
                                    disabled={updateMemberRoleMutation.isPending || member.role === role}
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
                                    disabled={updateMemberRoleMutation.isPending}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <UserMinus className="mr-2 h-4 w-4" />
                                    게스트로 변경
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member)
                                  setDeleteDialogOpen(true)
                                }}
                                disabled={false}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                계정 삭제
                              </DropdownMenuItem>
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
            <AlertDialogCancel disabled={updateMemberRoleMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={updateMemberRoleMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {updateMemberRoleMutation.isPending ? '처리 중...' : '변경'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ 계정 완전 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-red-600">{selectedMember?.name} ({selectedMember?.email})</strong> 님의 계정을 완전히 삭제하시겠습니까?
              <br />
              <br />
              <strong className="text-red-600">이 작업은 되돌릴 수 없습니다!</strong>
              <br />
              <br />
              삭제되는 데이터:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>사용자 계정 및 인증 정보</li>
                <li>프로필 정보</li>
                <li>작성한 모든 게시글과 댓글</li>
                <li>활동 기록 및 메시지</li>
                <li>가입 신청 이력</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              영구 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}