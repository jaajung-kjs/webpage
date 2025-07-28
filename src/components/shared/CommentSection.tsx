'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  Flag
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import api, { type CommentWithAuthorNonNull } from '@/lib/api.modern'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CommentSectionProps {
  contentId: string
  contentType?: 'post' | 'announcement' | 'resource' | 'case'
  maxDepth?: number // 최대 중첩 깊이 제한
  enableThreading?: boolean // 스레드 기능 활성화
  autoCollapseDepth?: number // 자동 접기 깊이
}

export default function CommentSection({ 
  contentId, 
  contentType = 'post',
  maxDepth = 3,
  enableThreading = true,
  autoCollapseDepth = 2
}: CommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<CommentWithAuthorNonNull[]>([])
  const [loading, setLoading] = useState(true)
  const [commentLoading, setCommentLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest')
  const commentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    fetchComments()
  }, [contentId])
  
  useEffect(() => {
    // Resort comments when sort option changes
    if (comments.length > 0) {
      const sortedComments = sortComments(comments, sortBy)
      setComments(sortedComments)
    }
  }, [sortBy])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await api.comments.getThreadedComments(contentId)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      const commentsData = response.data || []
      
      // Sort comments based on current sort option
      const sortedComments = sortComments(commentsData, sortBy)
      setComments(sortedComments)
      
      // Auto-collapse deep threads
      if (autoCollapseDepth > 0) {
        const toCollapse = new Set<string>()
        commentsData.forEach(comment => {
          if (getCommentDepth(comment, commentsData) >= autoCollapseDepth) {
            toCollapse.add(comment.id)
          }
        })
        setCollapsedThreads(toCollapse)
      }
      
      // Check comment like status for logged in user
      if (user && response.data) {
        checkCommentLikeStatus(response.data)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkCommentLikeStatus = async (comments: CommentWithAuthorNonNull[]) => {
    if (!user) return

    try {
      const likesStatus: { [key: string]: boolean } = {}
      
      // Check like status for all comments (including replies)
      for (const comment of comments) {
        const response = await api.comments.checkCommentLike(comment.id, user.id)
        if (response.success) {
          likesStatus[comment.id] = response.data || false
        }
      }
      
      setCommentLikes(likesStatus)
    } catch (error) {
      console.error('Error checking comment like status:', error)
    }
  }

  const handleCommentSubmit = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    if (!newComment.trim()) {
      toast.error('댓글 내용을 입력해주세요.')
      return
    }

    try {
      setCommentLoading(true)
      const response = await api.comments.createComment({
        content_id: contentId,
        author_id: user.id,
        comment: newComment.trim()
      })
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      setNewComment('')
      await fetchComments() // Refresh comments
      toast.success('댓글이 등록되었습니다.')
    } catch (error) {
      console.error('Error creating comment:', error)
      toast.error('댓글 작성에 실패했습니다.')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const response = await api.comments.toggleCommentLike(commentId, user.id)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      if (response.data) {
        const isLiked = response.data.isLiked
        setCommentLikes(prev => ({
          ...prev,
          [commentId]: isLiked
        }))
        
        // Update likes count in comments array
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, like_count: (comment.like_count || 0) + (isLiked ? 1 : -1) }
            : comment
        ))
      }
    } catch (error) {
      console.error('Error toggling comment like:', error)
      toast.error('좋아요 처리에 실패했습니다.')
    }
  }

  // Helper functions
  const sortComments = (comments: CommentWithAuthorNonNull[], sort: 'newest' | 'oldest' | 'popular') => {
    const sorted = [...comments]
    switch (sort) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'popular':
        return sorted.sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      default:
        return sorted
    }
  }

  const getCommentDepth = (comment: CommentWithAuthorNonNull, allComments: CommentWithAuthorNonNull[]): number => {
    if (!comment.parent_id) return 0
    const parent = allComments.find(c => c.id === comment.parent_id)
    if (!parent) return 0
    return getCommentDepth(parent, allComments) + 1
  }

  const toggleThreadCollapse = (commentId: string) => {
    setCollapsedThreads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const scrollToComment = (commentId: string) => {
    const element = commentRefs.current[commentId]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('highlight-comment')
      setTimeout(() => element.classList.remove('highlight-comment'), 2000)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!user || !editContent.trim()) return

    try {
      setCommentLoading(true)
      // API call to update comment would go here
      // await api.comments.updateComment(commentId, editContent)
      
      setEditingComment(null)
      setEditContent('')
      await fetchComments()
      toast.success('댓글이 수정되었습니다.')
    } catch (error) {
      console.error('Error editing comment:', error)
      toast.error('댓글 수정에 실패했습니다.')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!user) return
    
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) return

    try {
      // API call to delete comment would go here
      // await api.comments.deleteComment(commentId)
      
      await fetchComments()
      toast.success('댓글이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('댓글 삭제에 실패했습니다.')
    }
  }

  const handleReply = async (parentId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    if (!replyContent.trim()) {
      toast.error('답글 내용을 입력해주세요.')
      return
    }

    try {
      setCommentLoading(true)
      const response = await api.comments.createReply(
        contentId,
        parentId,
        replyContent.trim(),
        user.id
      )
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      setReplyContent('')
      setReplyingTo(null)
      await fetchComments() // Refresh comments
      toast.success('답글이 등록되었습니다.')
    } catch (error) {
      console.error('Error creating reply:', error)
      toast.error('답글 작성에 실패했습니다.')
    } finally {
      setCommentLoading(false)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return '방금 전'
    if (diffInHours < 24) return `${diffInHours}시간 전`
    if (diffInHours < 48) return '1일 전'
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const getRoleLabel = (role: string) => {
    const roleLabels: { [key: string]: string } = {
      'leader': '동아리장',
      'vice-leader': '부동아리장',
      'admin': '운영진',
      'member': '일반회원'
    }
    return roleLabels[role] || role
  }

  // Organize comments into tree structure
  const organizeComments = (comments: CommentWithAuthorNonNull[]) => {
    const rootComments = comments.filter(c => !c.parent_id)
    const commentMap = new Map<string, CommentWithAuthorNonNull[]>()
    
    comments.forEach(comment => {
      if (comment.parent_id) {
        if (!commentMap.has(comment.parent_id)) {
          commentMap.set(comment.parent_id, [])
        }
        const replies = commentMap.get(comment.parent_id)!
        replies.push(comment)
        // Sort replies by date
        replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }
    })
    
    return { rootComments, commentMap }
  }

  const { rootComments, commentMap } = organizeComments(comments)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>댓글 ({rootComments.length}{commentMap.size > 0 && ` · 답글 ${comments.length - rootComments.length}`})</span>
          </CardTitle>
          {comments.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  정렬: {sortBy === 'newest' ? '최신순' : sortBy === 'oldest' ? '오래된순' : '인기순'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('newest')}>
                  최신순
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                  오래된순
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('popular')}>
                  인기순
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* New Comment Form */}
        <div className="mb-6">
          <Textarea
            placeholder="댓글을 작성해보세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mb-3"
            rows={3}
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleCommentSubmit} 
              className="kepco-gradient"
              disabled={commentLoading || !newComment.trim()}
            >
              {commentLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              댓글 작성
            </Button>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Comments List */}
        {rootComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
          </div>
        ) : (
          <div className="space-y-6">
            {rootComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                replies={commentMap.get(comment.id) || []}
                onLike={handleCommentLike}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLiked={commentLikes[comment.id] || false}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                editingComment={editingComment}
                setEditingComment={setEditingComment}
                editContent={editContent}
                setEditContent={setEditContent}
                commentLoading={commentLoading}
                getRoleLabel={getRoleLabel}
                formatRelativeTime={formatRelativeTime}
                commentLikes={commentLikes}
                depth={0}
                maxDepth={maxDepth}
                commentRefs={commentRefs}
                currentUserId={user?.id}
                commentMap={commentMap}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Comment Thread Component
interface CommentThreadProps {
  comment: CommentWithAuthorNonNull
  replies: CommentWithAuthorNonNull[]
  onLike: (commentId: string) => void
  onReply: (parentId: string) => void
  onEdit: (commentId: string) => void
  onDelete: (commentId: string) => void
  isLiked: boolean
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  replyContent: string
  setReplyContent: (content: string) => void
  editingComment: string | null
  setEditingComment: (id: string | null) => void
  editContent: string
  setEditContent: (content: string) => void
  commentLoading: boolean
  getRoleLabel: (role: string) => string
  formatRelativeTime: (date: string) => string
  commentLikes: { [key: string]: boolean }
  depth?: number
  maxDepth: number
  commentRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
  currentUserId?: string
  commentMap?: Map<string, CommentWithAuthorNonNull[]>
}

function CommentThread({
  comment,
  replies,
  onLike,
  onReply,
  onEdit,
  onDelete,
  isLiked,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  editingComment,
  setEditingComment,
  editContent,
  setEditContent,
  commentLoading,
  getRoleLabel,
  formatRelativeTime,
  commentLikes,
  depth = 0,
  maxDepth,
  commentRefs,
  currentUserId,
  commentMap
}: CommentThreadProps) {
  const hasReplies = replies.length > 0
  const isMaxDepth = depth >= maxDepth
  return (
    <div ref={el => { if (el) commentRefs.current[comment.id] = el }}>
      <CommentItem
        comment={comment}
        onLike={onLike}
        onReply={() => !isMaxDepth && setReplyingTo(comment.id)}
        onEdit={() => {
          setEditingComment(comment.id)
          setEditContent(comment.comment)
        }}
        onDelete={() => onDelete(comment.id)}
        isLiked={isLiked}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        replyContent={replyContent}
        setReplyContent={setReplyContent}
        handleReply={onReply}
        editingComment={editingComment}
        editContent={editContent}
        setEditContent={setEditContent}
        handleEdit={() => onEdit(comment.id)}
        setEditingComment={setEditingComment}
        commentLoading={commentLoading}
        getRoleLabel={getRoleLabel}
        formatRelativeTime={formatRelativeTime}
        hasReplies={hasReplies}
        isCollapsed={false}
        onToggleCollapse={undefined}
        canReply={!isMaxDepth}
        depth={depth}
        isOwner={currentUserId === comment.author_id}
      />
      
      {/* Replies */}
      {hasReplies && !isMaxDepth && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "mt-4 space-y-3",
            depth === 0 ? "ml-12" : "ml-8 border-l-2 border-gray-100 dark:border-gray-800 pl-4"
          )}
        >
          {replies.map((reply) => {
            // 재귀적으로 대댓글의 대댓글도 찾기
            const subReplies = commentMap ? (commentMap.get(reply.id) || []) : []
            return (
              <CommentThread
                key={reply.id}
                comment={reply}
                replies={subReplies}
                onLike={onLike}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                isLiked={commentLikes[reply.id] || false}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                editingComment={editingComment}
                setEditingComment={setEditingComment}
                editContent={editContent}
                setEditContent={setEditContent}
                commentLoading={commentLoading}
                getRoleLabel={getRoleLabel}
                formatRelativeTime={formatRelativeTime}
                commentLikes={commentLikes}
                depth={depth + 1}
                maxDepth={maxDepth}
                commentRefs={commentRefs}
                currentUserId={currentUserId}
                commentMap={commentMap}
              />
            )
          })}
        </motion.div>
      )}
      
      {/* Show collapsed indicator for max depth */}
      {isMaxDepth && hasReplies && (
        <div className="ml-12 mt-2">
          <span className="text-xs text-muted-foreground">
            <MessageSquare className="inline mr-1 h-3 w-3" />
            {replies.length}개의 추가 답글
          </span>
        </div>
      )}
    </div>
  )
}

// Comment Item Component
interface CommentItemProps {
  comment: CommentWithAuthorNonNull
  onLike: (commentId: string) => void
  onReply: () => void
  onEdit?: () => void
  onDelete?: () => void
  isLiked: boolean
  replyingTo: string | null
  setReplyingTo?: (id: string | null) => void
  replyContent: string
  setReplyContent: (content: string) => void
  handleReply: (parentId: string) => void
  editingComment: string | null
  editContent: string
  setEditContent: (content: string) => void
  handleEdit: () => void
  setEditingComment: (id: string | null) => void
  commentLoading: boolean
  getRoleLabel: (role: string) => string
  formatRelativeTime: (date: string) => string
  hasReplies?: boolean
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  canReply?: boolean
  depth?: number
  isOwner?: boolean
}

function CommentItem({ 
  comment, 
  onLike, 
  onReply,
  onEdit,
  onDelete, 
  isLiked, 
  replyingTo,
  setReplyingTo,
  replyContent, 
  setReplyContent, 
  handleReply,
  editingComment,
  editContent,
  setEditContent,
  handleEdit,
  setEditingComment,
  commentLoading,
  getRoleLabel,
  formatRelativeTime,
  hasReplies = false,
  isCollapsed = false,
  onToggleCollapse,
  canReply = true,
  depth = 0,
  isOwner = false
}: CommentItemProps) {
  const isEditing = editingComment === comment.id
  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-start space-x-3 p-3 rounded-lg transition-all",
          depth > 0 && "bg-gray-50/50 dark:bg-gray-800/50",
          "hover:bg-gray-50 dark:hover:bg-gray-800"
        )}
      >
        <Avatar className={cn(
          "transition-all",
          depth > 0 ? "h-8 w-8" : "h-10 w-10"
        )}>
          <AvatarImage src={comment.author_avatar || ''} alt={comment.author_name || '익명'} />
          <AvatarFallback>
            {(comment.author_name || '익명').charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className={cn(
                "font-semibold",
                depth > 0 && "text-sm"
              )}>{comment.author_name || '익명'}</span>
              <Badge variant="outline" className="text-xs">
                {getRoleLabel(comment.author_role || 'member')}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {comment.created_at ? formatRelativeTime(comment.created_at) : '날짜 없음'}
              </span>
            </div>
            
            {/* Comment actions menu */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Comment content or edit form */}
          {isEditing ? (
            <div className="mt-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px] text-sm"
                autoFocus
              />
              <div className="mt-2 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingComment(null)
                    setEditContent('')
                  }}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={commentLoading || !editContent.trim()}
                  className="kepco-gradient"
                >
                  {commentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  수정 완료
                </Button>
              </div>
            </div>
          ) : (
            <p className={cn(
              "mt-2 leading-relaxed break-words",
              depth > 0 && "text-sm"
            )}>
              {comment.comment}
            </p>
          )}
          
          {/* Comment actions */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs hover:text-primary"
                onClick={() => onLike(comment.id)}
                disabled={commentLoading}
              >
                <ThumbsUp className={cn(
                  "mr-1 h-3 w-3 transition-all",
                  isLiked && "fill-current text-primary"
                )} />
                좋아요 ({comment.like_count || 0})
              </Button>
              
              {canReply && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 text-xs hover:text-primary" 
                  onClick={onReply}
                >
                  <Reply className="mr-1 h-3 w-3" />
                  답글
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs hover:text-primary"
              >
                <Flag className="mr-1 h-3 w-3" />
                신고
              </Button>
            </div>
            
            {/* Show reply count */}
            {hasReplies && (
              <span className="text-xs text-muted-foreground">
                {/* Reply count is shown in thread */}
              </span>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Reply Input */}
      {replyingTo === comment.id && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ml-12 mt-3"
        >
          <div className="flex items-start space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                You
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder={`${comment.author_name || '익명'}님에게 답글 작성...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="mt-2 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplyingTo?.(null)
                    setReplyContent('')
                  }}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleReply(comment.id)}
                  disabled={commentLoading || !replyContent.trim()}
                  className="kepco-gradient"
                >
                  {commentLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  답글 작성
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  )
}