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
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useComments, useCreateComment, useUpdateComment, useDeleteComment, useToggleCommentLike } from '@/hooks/features/useComments'
import { supabaseClient } from '@/lib/core/connection-core'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { LoadingDots, EmptyState } from '@/components/shared/LoadingStates'
import { Skeleton, SkeletonList } from '@/components/ui/skeleton'

interface CommentSectionProps {
  contentId: string
  contentType?: 'post' | 'announcement' | 'resource' | 'case'
  maxDepth?: number // 최대 중첩 깊이 제한
  enableThreading?: boolean // 스레드 기능 활성화
  autoCollapseDepth?: number // 자동 접기 깊이
}

type CommentWithReplies = any & {
  replies?: CommentWithReplies[]
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
  const { user, profile, isMember } = useAuth()
  
  const { data: commentsData, isLoading: loading, refetch } = useComments(contentId)
  const createCommentMutation = useCreateComment()
  const updateCommentMutation = useUpdateComment()
  const deleteCommentMutation = useDeleteComment()
  const toggleCommentLikeMutation = useToggleCommentLike()
  const [likeLoading, setLikeLoading] = useState(false)
  
  const [comments, setComments] = useState<CommentWithReplies[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>({})
  const [replyingToComments, setReplyingToComments] = useState<{ [key: string]: boolean }>({})
  const [editingComments, setEditingComments] = useState<{ [key: string]: boolean }>({})
  const [replyContents, setReplyContents] = useState<{ [key: string]: string }>({})
  const [editContents, setEditContents] = useState<{ [key: string]: string }>({})
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest')
  
  const commentActionLoading = createCommentMutation.isPending || updateCommentMutation.isPending || deleteCommentMutation.isPending

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

  // Sort and organize comments
  useEffect(() => {
    if (commentsData) {
      // Organize comments into tree structure
      const commentMap = new Map<string, typeof commentsData[0][]>()
      const rootComments: typeof commentsData[0][] = []
      
      // First pass: separate root comments and create map for replies
      commentsData.forEach(comment => {
        if (!comment.parent_id) {
          rootComments.push(comment)
        } else {
          if (!commentMap.has(comment.parent_id)) {
            commentMap.set(comment.parent_id, [])
          }
          commentMap.get(comment.parent_id)!.push(comment)
        }
      })
      
      // Sort root comments
      const sorted = rootComments.sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
          case 'oldest':
            return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
          case 'popular':
            return (b.like_count || 0) - (a.like_count || 0)
          default:
            return 0
        }
      })
      
      // Attach replies to comments (flat structure - only one level deep)
      const attachReplies = (comments: typeof rootComments): CommentWithReplies[] => {
        return comments.map(comment => ({
          ...comment,
          replies: comment.id ? (commentMap.get(comment.id) || []).map(reply => ({
            ...reply,
            replies: [] // Always flat - no nested replies
          })) : []
        }))
      }
      
      const commentsWithReplies = attachReplies(sorted)
      setComments(commentsWithReplies)
      
      // Check like status for all comments
      if (user) {
        checkCommentLikeStatus(commentsWithReplies)
      }
    }
  }, [commentsData, sortBy, user])

  const getAllCommentIds = (comments: CommentWithReplies[]): string[] => {
    const ids: string[] = []
    
    const collectIds = (commentList: CommentWithReplies[]) => {
      commentList.forEach(comment => {
        if (comment.id) {
          ids.push(comment.id)
        }
        if (comment.replies && comment.replies.length > 0) {
          collectIds(comment.replies)
        }
      })
    }
    
    collectIds(comments)
    return ids
  }

  // Helper function to find the root parent comment ID
  const findRootParentId = (commentId: string): string => {
    const findInComments = (commentList: CommentWithReplies[]): string | null => {
      for (const comment of commentList) {
        if (comment.id === commentId) {
          return comment.id // This is a root comment
        }
        if (comment.replies) {
          for (const reply of comment.replies) {
            if (reply.id === commentId) {
              return comment.id // This reply's parent is the root
            }
          }
        }
      }
      return null
    }
    
    const rootId = findInComments(comments)
    return rootId || commentId // Fallback to the original ID
  }

  const checkCommentLikeStatus = async (comments: CommentWithReplies[]) => {
    if (!user) return

    try {
      const allCommentIds = getAllCommentIds(comments)
      
      if (allCommentIds.length === 0) return
      
      const { data: likes } = await supabaseClient
        .from('interactions')
        .select('comment_id')
        .eq('user_id', user.id)
        .eq('type', 'like')
        .in('comment_id', allCommentIds)
      
      const likedCommentIds = new Set(likes?.map(l => l.comment_id).filter(Boolean) || [])
      const newLikeStatus: { [key: string]: boolean } = {}
      
      allCommentIds.forEach(commentId => {
        newLikeStatus[commentId] = likedCommentIds.has(commentId)
      })
      
      setCommentLikes(newLikeStatus)
    } catch (error) {
      console.error('Error checking comment like status:', error)
    }
  }


  const handleSubmit = async () => {
    if (!user || !newComment.trim() || !isMember) return

    try {
      await createCommentMutation.mutateAsync({
        contentId: contentId,
        content: newComment.trim(),
        parentId: undefined
      })
      
      setNewComment('')
      await refetch()
      toast.success('댓글이 작성되었습니다.')
    } catch (error) {
      console.error('Error creating comment:', error)
      toast.error('댓글 작성에 실패했습니다.')
    }
  }

  const handleReply = async (parentId: string) => {
    if (!user || !isMember) return
    
    const content = replyContents[parentId]?.trim()
    if (!content) return

    try {
      // For flat structure: always use the root parent ID
      const rootParentId = findRootParentId(parentId)
      
      await createCommentMutation.mutateAsync({
        contentId: contentId,
        content: content,
        parentId: rootParentId
      })
      
      cancelReply(parentId)
      await refetch()
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
    
    if (!isMember) {
      toast.error('동아리 회원만 좋아요를 누를 수 있습니다.')
      return
    }

    const wasLiked = commentLikes[commentId] || false

    try {
      // Optimistically update UI
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: !wasLiked
      }))
      
      setComments(prev => prev.map((comment: any) => {
        if (comment.id === commentId) {
          return { 
            ...comment, 
            like_count: (comment.like_count || 0) + (wasLiked ? -1 : 1) 
          }
        }
        // Check nested replies
        if (comment.replies) {
          const updatedReplies = comment.replies.map((reply: any) => {
            if (reply.id === commentId) {
              return {
                ...reply,
                like_count: (reply.like_count || 0) + (wasLiked ? -1 : 1)
              }
            }
            return reply
          })
          return { ...comment, replies: updatedReplies }
        }
        return comment
      }))
      
      await toggleCommentLikeMutation.mutateAsync({ commentId: commentId, contentId: contentId })
      
    } catch (error) {
      // Revert on error
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: wasLiked
      }))
      
      setComments(prev => prev.map((comment: any) => {
        if (comment.id === commentId) {
          return { 
            ...comment, 
            like_count: (comment.like_count || 0) + (wasLiked ? 1 : -1) 
          }
        }
        // Check nested replies
        if (comment.replies) {
          const updatedReplies = comment.replies.map((reply: any) => {
            if (reply.id === commentId) {
              return {
                ...reply,
                like_count: (reply.like_count || 0) + (wasLiked ? 1 : -1)
              }
            }
            return reply
          })
          return { ...comment, replies: updatedReplies }
        }
        return comment
      }))
      
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
        id: commentId, 
        content: content,
        contentId: contentId 
      })
      
      cancelEdit(commentId)
      await refetch()
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
      await deleteCommentMutation.mutateAsync({ id: commentId, contentId: contentId })
      
      await refetch()
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
          {user && isMember ? (
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <Avatar>
                  <AvatarImage src={user.user_metadata?.avatar_url || profile?.avatar_url} />
                  <AvatarFallback>
                    {(profile?.name || user.email)?.charAt(0).toUpperCase()}
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
                    comment={comment}
                    depth={0}
                    maxDepth={maxDepth}
                    enableThreading={enableThreading}
                    isLiked={comment.id ? (commentLikes[comment.id] || false) : false}
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
                    isAuthor={comment.author_id === user?.id}
                    canModerate={false}
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
                    profile={profile}
                    commentLikes={commentLikes}
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
  commentLikes: { [key: string]: boolean }
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
  commentLikes,
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
              <AvatarImage src={comment.author_avatar_url || undefined} />
              <AvatarFallback>
                {comment.author_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.author_name || '익명'}
                </span>
                {comment.author_role && (
                  <Badge variant="outline" className="text-xs">
                    {getRoleLabel(comment.author_role)}
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
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthor && (
                <>
                  <DropdownMenuItem onClick={() => comment.id && onEdit(comment.id, comment.comment || '')}>
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
              {comment.comment}
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
              {comment.like_count || 0}
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

          {comment.replies && comment.replies.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="gap-1 h-8 px-2 ml-auto"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span className="text-xs">답글 {comment.replies?.length || 0}개</span>
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
              <AvatarImage src={user?.user_metadata?.avatar_url || profile?.avatar_url} />
              <AvatarFallback>
                {(profile?.name || user?.email)?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3 min-w-0">
              <Textarea
                placeholder={`${comment.author_name || '익명'}님에게 답글 작성...`}
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
      {comment.replies && comment.replies.length > 0 && !isCollapsed && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply: any) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={1}
              maxDepth={maxDepth}
              enableThreading={enableThreading}
              isLiked={reply.id ? (commentLikes[reply.id] || false) : false}
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
              profile={profile}
              commentLikes={commentLikes}
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

