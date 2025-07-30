/**
 * New Message Dialog Component
 * 
 * Allows users to start new conversations by selecting recipients
 * Includes member search and message composition
 */

'use client'

import { useState, useEffect } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { supabase } from '@/lib/supabase/client'
import { MessagesAPI } from '@/lib/api/messages'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, User, Send, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NewMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConversationStart?: (
    conversationId: string,
    recipientId: string,
    recipientName: string,
    recipientAvatar?: string | null
  ) => void
}

interface Member {
  id: string
  name: string
  email: string
  department: string | null
  avatar_url: string | null
  role: string
}

export function NewMessageDialog({
  open,
  onOpenChange,
  onConversationStart
}: NewMessageDialogProps) {
  const { user } = useOptimizedAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<Member | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // 멤버 목록 로드
  useEffect(() => {
    if (!open) return

    const fetchMembers = async () => {
      if (!user?.id) return
      
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, department, avatar_url, role')
          .in('role', ['member', 'vice-leader', 'leader', 'admin'])
          .neq('id', user.id) // 자신 제외
          .order('name')

        if (error) throw error
        setMembers(data || [])
      } catch (error) {
        console.error('Failed to fetch members:', error)
        toast.error('회원 목록을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [open, user?.id])

  // 검색 필터
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = members.filter(member =>
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.department?.toLowerCase().includes(query)
    )
    setFilteredMembers(filtered)
  }, [searchQuery, members])

  const handleRecipientSelect = (member: Member) => {
    setSelectedRecipient(member)
    setSearchQuery('')
  }

  const handleSendMessage = async () => {
    if (!user || !selectedRecipient || !message.trim()) return

    setSending(true)
    try {
      // 대화방 찾기 또는 생성
      const conversationResult = await MessagesAPI.findOrCreateConversation(
        user.id,
        selectedRecipient.id
      )

      if (!conversationResult.success) {
        throw new Error(conversationResult.error)
      }

      // 메시지 전송
      const messageResult = await MessagesAPI.sendMessage(
        user.id,
        selectedRecipient.id,
        message.trim(),
        conversationResult.data
      )

      if (!messageResult.success) {
        throw new Error(messageResult.error)
      }

      // 성공 시 대화방으로 이동
      if (onConversationStart) {
        onConversationStart(
          conversationResult.data!,
          selectedRecipient.id,
          selectedRecipient.name,
          selectedRecipient.avatar_url
        )
      }

      // 폼 초기화
      setSelectedRecipient(null)
      setMessage('')
      setSearchQuery('')

    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('메시지 전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setSelectedRecipient(null)
    setMessage('')
    setSearchQuery('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 메시지</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 받는 사람 선택 */}
          <div className="space-y-2">
            <Label>받는 사람</Label>
            
            {selectedRecipient ? (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedRecipient.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{selectedRecipient.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedRecipient.role === 'member' ? '회원' :
                   selectedRecipient.role === 'vice-leader' ? '운영진' :
                   selectedRecipient.role === 'leader' ? '동아리장' : '관리자'}
                </Badge>
                <Button
                  onClick={() => setSelectedRecipient(null)}
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="이름, 이메일 또는 부서로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-48 border rounded-md">
                  {loading ? (
                    <MemberSearchSkeleton />
                  ) : filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {searchQuery ? '검색 결과가 없습니다.' : '회원이 없습니다.'}
                    </div>
                  ) : (
                    <div className="p-1">
                      <AnimatePresence>
                        {filteredMembers.map((member, index) => (
                          <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.02 }}
                          >
                            <MemberSearchItem
                              member={member}
                              onClick={() => handleRecipientSelect(member)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </div>

          {/* 메시지 입력 */}
          <div className="space-y-2">
            <Label>메시지</Label>
            <Textarea
              placeholder="메시지를 입력하세요..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (selectedRecipient && message.trim() && !sending) {
                    handleSendMessage()
                  }
                }
              }}
              rows={4}
              maxLength={1000}
              disabled={!selectedRecipient}
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length}/1000
            </div>
            <div className="text-xs text-muted-foreground">
              Enter로 전송, Shift+Enter로 줄바꿈
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={sending}
            >
              취소
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!selectedRecipient || !message.trim() || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  전송
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Member search item
 */
interface MemberSearchItemProps {
  member: Member
  onClick: () => void
}

function MemberSearchItem({ member, onClick }: MemberSearchItemProps) {
  const getRoleBadge = (role: string) => {
    const roleMap = {
      member: { label: '회원', variant: 'secondary' as const },
      'vice-leader': { label: '운영진', variant: 'default' as const },
      leader: { label: '동아리장', variant: 'default' as const },
      admin: { label: '관리자', variant: 'destructive' as const }
    }
    return roleMap[role as keyof typeof roleMap] || roleMap.member
  }

  const roleBadge = getRoleBadge(member.role)

  return (
    <motion.div
      className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={member.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{member.name}</p>
          <Badge variant={roleBadge.variant} className="text-xs">
            {roleBadge.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{member.email}</span>
          {member.department && (
            <>
              <span>•</span>
              <span className="truncate">{member.department}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Loading skeleton for member search
 */
function MemberSearchSkeleton() {
  return (
    <div className="p-1 space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}