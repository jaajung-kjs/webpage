'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MessageCircle,
  Send,
  ThumbsUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  Flag,
  Clock,
  User,
  Heart
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthV2 } from '@/hooks/features/useAuthV2'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { 
  useCommentsV2, 
  useCreateCommentV2, 
  useUpdateCommentV2, 
  useDeleteCommentV2, 
  useToggleCommentLikeV2 
} from '@/hooks/features/useCommentsV2'
import { supabaseClient } from '@/lib/core/connection-core'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { LoadingDots, EmptyState } from '@/components/shared/LoadingStates'
import { Skeleton, SkeletonList } from '@/components/ui/skeleton'
import UserLevelBadges from './UserLevelBadges'

interface CommentSectionProps {
  contentId: string
  contentType?: 'post' | 'announcement' | 'resource' | 'case'
  maxDepth?: number // 최대 중첩 깊이 제한
  enableThreading?: boolean // 스레드 기능 활성화
  autoCollapseDepth?: number // 자동 접기 깊이
}

// Import the proper type from V2 hooks
type CommentWithReplies = {
  id: string
  content_id: string
  author_id: string
  comment_text: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
  parent_id?: string | null
  path?: string | null
  depth: number
  author: {
    id: string
    name: string
    avatar_url?: string | null
    role: string
  }
  interaction_counts: {
    likes: number
  }
  user_interactions: {
    is_liked: boolean
  }
  children?: CommentWithReplies[]
}

// Helper function for role labels
function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    'admin': '관리자',
    'leader': '동아리장',
    'vice-leader': '부동아리장',
    'member': '회원'
  }
  return labels[role] || role
}

export default function CommentSection({ 
  contentId, 
  contentType = 'post',
  maxDepth = 3,
  enableThreading = true,
  autoCollapseDepth = 2
}: CommentSectionProps) {
  const { user, isMember, canModerate } = useAuthV2()
  
  const { data: commentsData, isLoading: loading, refetch } = useCommentsV2(contentId)
  const createCommentMutation = useCreateCommentV2()
  const updateCommentMutation = useUpdateCommentV2()
  const deleteCommentMutation = useDeleteCommentV2()
  const toggleCommentLikeMutation = useToggleCommentLikeV2()
  
  const [newComment, setNewComment] = useState('')
  const [replyingToComments, setReplyingToComments] = useState<{ [key: string]: boolean }>({})
  const [editingComments, setEditingComments] = useState<{ [key: string]: boolean }>({})
  const [replyContents, setReplyContents] = useState<{ [key: string]: string }>({})
  const [editContents, setEditContents] = useState<{ [key: string]: string }>({})
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest')
  
  // Comments are already in the correct format from V2 hooks
  const comments = commentsData || []
  
  const commentActionLoading = createCommentMutation.isPending || updateCommentMutation.isPending || deleteCommentMutation.isPending
  const likeLoading = toggleCommentLikeMutation.isPending

  // Helper functions for individual comment state management
  const startReply = (commentId: string) => {
    setReplyingToComments(prev => ({ ...prev, [commentId]: true }))
    setReplyContents(prev => ({ ...prev, [commentId]: '' }))
  }

  const cancelReply = (commentId: string) => {
    setReplyingToComments(prev => ({ ...prev, [commentId]: false }))
    setReplyContents(prev => ({ ...prev, [commentId]: '' }))
  }

  const startEdit = (commentId: string, currentContent: string) => {
    setEditingComments(prev => ({ ...prev, [commentId]: true }))
    setEditContents(prev => ({ ...prev, [commentId]: currentContent }))
  }

  const cancelEdit = (commentId: string) => {
    setEditingComments(prev => ({ ...prev, [commentId]: false }))
    setEditContents(prev => ({ ...prev, [commentId]: '' }))
  }

  // V2 hooks already handle comment organization and user interactions
  // No need for complex processing - the data comes pre-structured

  // V2 hooks handle all like status checking automatically


  const handleSubmit = async () => {
    if (!user || !newComment.trim() || !isMember()) return

    try {
      await createCommentMutation.mutateAsync({
        contentId: contentId,
        comment: newComment.trim(),
        parentId: undefined
      })
      
      setNewComment('')
      toast.success('댓글이 작성되었습니다.')
    } catch (error: any) {
      console.error('Error creating comment:', error)
      const errorMessage = error?.message || error?.error || '댓글 작성에 실패했습니다.'
      toast.error(errorMessage)
    }
  }

  const handleReply = async (parentId: string) => {
    if (!user || !isMember()) return
    
    const content = replyContents[parentId]?.trim()
    if (!content) return

    try {
      await createCommentMutation.mutateAsync({
        contentId: contentId,
        comment: content,
        parentId: parentId
      })
      
      cancelReply(parentId)
      toast.success('답글이 작성되었습니다.')
    } catch (error) {
      console.error('Error creating reply:', error)
      toast.error('답글 작성에 실패했습니다.')
    }
  }

  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }
    
    if (!isMember()) {
      toast.error('동아리 회원만 좋아요를 누를 수 있습니다.')
      return
    }

    try {
      // V2 hook handles optimistic updates automatically
      await toggleCommentLikeMutation.mutateAsync({ 
        commentId: commentId, 
        contentId: contentId 
      })
    } catch (error) {
      console.error('Error toggling comment like:', error)
      toast.error('좋아요 처리에 실패했습니다.')
    }
  }

  const handleCommentEdit = async (commentId: string) => {
    if (!user) return
    
    const content = editContents[commentId]?.trim()
    if (!content) return

    try {
      await updateCommentMutation.mutateAsync({ 
        commentId: commentId, 
        comment: content,
        contentId: contentId 
      })
      
      cancelEdit(commentId)
      toast.success('댓글이 수정되었습니다.')
    } catch (error) {
      console.error('Error editing comment:', error)
      toast.error('댓글 수정에 실패했습니다.')
    }
  }

  const handleCommentDelete = async (commentId: string) => {
    if (!user) return
    
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) return

    try {
      await deleteCommentMutation.mutateAsync({ 
        commentId: commentId, 
        contentId: contentId 
      })
      
      toast.success('댓글이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('댓글 삭제에 실패했습니다.')
    }
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              댓글 {comments.length}
            </CardTitle>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">최신순</SelectItem>
                <SelectItem value="oldest">오래된순</SelectItem>
                <SelectItem value="popular">인기순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Comment Input */}
          {user && isMember() ? (
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <Avatar>
                  <AvatarImage src={(user as any)?.avatar_url || (user as any)?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {((user as any)?.name || (user as any)?.email)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3 min-w-0">
                  <Textarea
                    placeholder="댓글을 작성하세요..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px] resize-none w-full"
                  />
                  
                  <div className="flex justify-end">
                    <Button
                      className="kepco-gradient"
                      size="sm"
                      onClick={handleSubmit}
                      disabled={!newComment.trim() || commentActionLoading}
                    >
                      {commentActionLoading ? (
                        <LoadingDots text="작성 중" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          댓글 작성
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-lg bg-muted text-center">
              <p className="text-sm text-muted-foreground">
                {!user ? '댓글을 작성하려면 로그인하세요.' : '동아리 회원만 댓글을 작성할 수 있습니다.'}
              </p>
            </div>
          )}

          <Separator className="mb-6" />

          {/* Comments List */}
          {loading ? (
            <SkeletonList />
          ) : comments.length === 0 ? (
            <EmptyState
              title="첫 댓글을 작성해보세요"
              message="아직 댓글이 없습니다."
            />
          ) : (
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-4"
            >
              {comments.map((comment) => (
                <motion.div key={comment.id} variants={staggerItem}>
                  <CommentItem
                    comment={comment as any}
                    depth={0}
                    maxDepth={maxDepth}
                    enableThreading={enableThreading}
                    isLiked={comment.user_interactions.is_liked}
                    onLike={handleCommentLike}
                    onReply={startReply}
                    onEdit={startEdit}
                    onEditCancel={cancelEdit}
                    onEditSave={handleCommentEdit}
                    onDelete={handleCommentDelete}
                    onReport={(commentId: string) => {
                    // Dispatch custom event to open report dialog
                    window.dispatchEvent(new CustomEvent('openReportDialog', {
                      detail: {
                        targetType: 'comment',
                        targetId: commentId,
                        parentContentId: contentId
                      }
                    }))
                  }}
                    isAuthor={comment.author_id === (user as any)?.id}
                    canModerate={canModerate()}
                    isReplying={comment.id ? (replyingToComments[comment.id] || false) : false}
                    isEditing={comment.id ? (editingComments[comment.id] || false) : false}
                    editContent={comment.id ? (editContents[comment.id] || '') : ''}
                    setEditContent={(content) => {
                      if (comment.id) {
                        setEditContents(prev => ({ ...prev, [comment.id as string]: content }))
                      }
                    }}
                    handleReply={handleReply}
                    replyContent={comment.id ? (replyContents[comment.id] || '') : ''}
                    setReplyContent={(content) => {
                      if (comment.id) {
                        setReplyContents(prev => ({ ...prev, [comment.id as string]: content }))
                      }
                    }}
                    cancelReply={cancelReply}
                    user={user}
                    profile={user}
                    replyingToComments={replyingToComments}
                    editingComments={editingComments}
                    editContents={editContents}
                    replyContents={replyContents}
                    setEditContents={setEditContents}
                    setReplyContents={setReplyContents}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface CommentItemProps {
  comment: CommentWithReplies
  depth: number
  maxDepth: number
  enableThreading: boolean
  isLiked: boolean
  onLike: (commentId: string) => void
  onReply: (commentId: string) => void
  onEdit: (commentId: string, content: string) => void
  onEditCancel: (commentId: string) => void
  onEditSave: (commentId: string) => void
  onDelete: (commentId: string) => void
  onReport: (commentId: string) => void
  isAuthor: boolean
  canModerate: boolean
  isReplying: boolean
  isEditing: boolean
  editContent: string
  setEditContent: (content: string) => void
  handleReply: (parentId: string) => void
  replyContent: string
  setReplyContent: (content: string) => void
  cancelReply: (commentId: string) => void
  user: any
  profile: any
  // Add state objects for nested access
  replyingToComments: { [key: string]: boolean }
  editingComments: { [key: string]: boolean }
  editContents: { [key: string]: string }
  replyContents: { [key: string]: string }
  setEditContents: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>
  setReplyContents: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>
}

function CommentItem({
  comment,
  depth,
  maxDepth,
  enableThreading,
  isLiked,
  onLike,
  onReply,
  onEdit,
  onEditCancel,
  onEditSave,
  onDelete,
  onReport,
  isAuthor,
  canModerate,
  isReplying,
  isEditing,
  editContent,
  setEditContent,
  handleReply,
  replyContent,
  setReplyContent,
  cancelReply,
  user,
  profile,
  replyingToComments,
  editingComments,
  editContents,
  replyContents,
  setEditContents,
  setReplyContents
}: CommentItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  
  // For flat structure: limit visual depth to 1
  const visualDepth = Math.min(depth, 1)
  const canReply = enableThreading && depth < maxDepth

  return (
    <motion.div
      {...fadeInUp}
      className={cn(
        "group relative min-w-0 overflow-hidden",
        visualDepth > 0 && "ml-4 sm:ml-8 mt-4"
      )}
    >
      {/* Thread Line */}
      {visualDepth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border -ml-4 sm:-ml-8" />
      )}
      
      <div className={cn(
        "rounded-lg transition-all min-w-0 overflow-hidden",
        visualDepth === 0 ? "bg-card border p-4" : "bg-muted/50 p-3",
        "hover:shadow-sm"
      )}>
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className={cn(
              "transition-all",
              visualDepth === 0 ? "h-10 w-10" : "h-8 w-8"
            )}>
              <AvatarImage src={comment.author.avatar_url || undefined} />
              <AvatarFallback>
                {comment.author.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {comment.author.name || '익명'}
                </span>
                
                {/* 게임화 V2 레벨 뱃지 */}
                <UserLevelBadges 
                  userId={comment.author_id} 
                  variant="minimal" 
                  size="sm" 
                  className="flex-shrink-0"
                />
                
                {comment.author.role && (
                  <Badge variant="outline" className="text-xs">
                    {getRoleLabel(comment.author.role)}
                  </Badge>
                )}
                {isAuthor && (
                  <Badge variant="secondary" className="text-xs">
                    작성자
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(comment.created_at || ''), {
                    addSuffix: true,
                    locale: ko
                  })}
                </span>
                {comment.updated_at && comment.updated_at !== comment.created_at && (
                  <>
                    <span>·</span>
                    <span>(수정됨)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthor && (
                <>
                  <DropdownMenuItem onClick={() => comment.id && onEdit(comment.id, comment.comment_text || '')}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {(isAuthor || canModerate) && (
                <DropdownMenuItem 
                  onClick={() => comment.id && onDelete(comment.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              )}
              {!isAuthor && (
                <DropdownMenuItem onClick={() => comment.id && onReport(comment.id)}>
                  <Flag className="mr-2 h-4 w-4" />
                  신고
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div className="space-y-3 min-w-0">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none w-full"
              placeholder="댓글을 수정하세요..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => comment.id && onEditSave(comment.id)}
                disabled={!editContent.trim()}
              >
                수정 완료
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => comment.id && onEditCancel(comment.id)}
              >
                취소
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none min-w-0">
            <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere word-break-break-word min-w-0">
              {comment.comment_text}
            </p>
          </div>
        )}

        {/* Comment Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => comment.id && onLike(comment.id)}
            className={cn(
              "gap-1 h-8 px-2",
              isLiked && "text-red-600"
            )}
          >
            <Heart className={cn(
              "h-3.5 w-3.5 transition-all",
              isLiked && "fill-current"
            )} />
            <span className="text-xs font-medium">
              {comment.interaction_counts.likes || 0}
            </span>
          </Button>

          {canReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => comment.id && onReply(comment.id)}
              className="gap-1 h-8 px-2"
            >
              <Reply className="h-3.5 w-3.5" />
              <span className="text-xs">답글</span>
            </Button>
          )}

          {comment.children && comment.children.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="gap-1 h-8 px-2 ml-auto"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span className="text-xs">답글 {comment.children?.length || 0}개</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span className="text-xs">답글 숨기기</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Reply Input */}
      {isReplying && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 ml-12"
        >
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={(user as any)?.avatar_url || (user as any)?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {((user as any)?.name || (user as any)?.email)?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3 min-w-0">
              <Textarea
                placeholder={`${comment.author.name || '익명'}님에게 답글 작성...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px] resize-none w-full"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => comment.id && handleReply(comment.id)}
                  disabled={!replyContent.trim()}
                >
                  답글 작성
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => comment.id && cancelReply(comment.id)}
                >
                  취소
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Nested replies */}
      {comment.children && comment.children.length > 0 && !isCollapsed && (
        <div className="mt-4 space-y-4">
          {comment.children.map((reply: any) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={1}
              maxDepth={maxDepth}
              enableThreading={enableThreading}
              isLiked={reply.user_interactions.is_liked}
              onLike={onLike}
              onReply={onReply}
              onEdit={onEdit}
              onEditCancel={onEditCancel}
              onEditSave={onEditSave}
              onDelete={onDelete}
              onReport={onReport}
              isAuthor={reply.author_id === user?.id}
              canModerate={canModerate}
              isReplying={reply.id ? (replyingToComments[reply.id] || false) : false}
              isEditing={reply.id ? (editingComments[reply.id] || false) : false}
              editContent={reply.id ? (editContents[reply.id] || '') : ''}
              setEditContent={(content) => {
                if (reply.id) {
                  setEditContents(prev => ({ ...prev, [reply.id as string]: content }))
                }
              }}
              handleReply={handleReply}
              replyContent={reply.id ? (replyContents[reply.id] || '') : ''}
              setReplyContent={(content) => {
                if (reply.id) {
                  setReplyContents(prev => ({ ...prev, [reply.id as string]: content }))
                }
              }}
              cancelReply={cancelReply}
              user={user}
              profile={user}
              replyingToComments={replyingToComments}
              editingComments={editingComments}
              editContents={editContents}
              replyContents={replyContents}
              setEditContents={setEditContents}
              setReplyContents={setReplyContents}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

