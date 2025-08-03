'use client'

import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { fadeInUp, fadeInLeft } from '@/lib/animations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Eye,
  MessageCircle,
  Heart,
  Share2,
  Bookmark,
  BookmarkCheck,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  User,
  LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import MarkdownRenderer from './MarkdownRenderer'

interface DetailLayoutProps {
  // Content data
  title: string
  description?: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
    department?: string
  }
  createdAt: string
  viewCount: number
  
  // Category & Tags
  category?: {
    label: string
    value: string
    color?: string
    icon?: LucideIcon
  }
  tags?: string[]
  
  // Actions
  likeCount: number
  commentCount: number
  isLiked: boolean
  isBookmarked: boolean
  canEdit: boolean
  canDelete: boolean
  
  // Handlers
  onLike: () => void
  onBookmark: () => void
  onShare: () => void
  onEdit?: () => void
  onDelete?: () => void
  
  // Additional sections
  additionalInfo?: ReactNode
  actionButtons?: ReactNode
  children?: ReactNode
  
  // Navigation
  backLink: string
  backLinkText?: string
  
  // Loading states
  loading?: boolean
  likeLoading?: boolean
  bookmarkLoading?: boolean
  deleteLoading?: boolean
}

export default function DetailLayout({
  title,
  description,
  content,
  author,
  createdAt,
  viewCount,
  category,
  tags,
  likeCount,
  commentCount,
  isLiked,
  isBookmarked,
  canEdit,
  canDelete,
  onLike,
  onBookmark,
  onShare,
  onEdit,
  onDelete,
  additionalInfo,
  actionButtons,
  children,
  backLink,
  backLinkText = '목록으로',
  loading = false,
  likeLoading = false,
  bookmarkLoading = false,
  deleteLoading = false
}: DetailLayoutProps) {
  const CategoryIcon = category?.icon || MessageCircle

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <motion.div
        {...fadeInLeft}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Link href={backLink}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {backLinkText}
          </Button>
        </Link>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[1fr,300px] min-w-0">
        {/* Main content */}
        <div className="space-y-6 min-w-0">
          {/* Header */}
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  {/* Category and title */}
                  <div className="space-y-3">
                    {category && (
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                        <Badge className={cn(category.color)}>
                          {category.label}
                        </Badge>
                      </div>
                    )}
                    <CardTitle className="text-2xl sm:text-3xl">
                      {title}
                    </CardTitle>
                    {description && (
                      <p className="text-lg text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>

                  {/* Author info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={author.avatar} />
                        <AvatarFallback>
                          {author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/profile/${author.id}`}
                          className="font-medium hover:underline"
                        >
                          {author.name}
                        </Link>
                        {author.department && (
                          <p className="text-sm text-muted-foreground">
                            {author.department}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions dropdown */}
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="touch-manipulation">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && onEdit && (
                            <DropdownMenuItem onClick={onEdit}>
                              <Edit className="mr-2 h-4 w-4" />
                              수정
                            </DropdownMenuItem>
                          )}
                          {canEdit && canDelete && <DropdownMenuSeparator />}
                          {canDelete && onDelete && (
                            <DropdownMenuItem
                              onClick={onDelete}
                              className="text-red-600"
                              disabled={deleteLoading}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDistanceToNow(new Date(createdAt), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      조회 {viewCount}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      댓글 {commentCount}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="pt-6 min-w-0 overflow-hidden">
                {/* Content */}
                <MarkdownRenderer content={content} />

                {/* Tags */}
                {tags && tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Additional info section */}
                {additionalInfo && (
                  <div className="mt-6">
                    {additionalInfo}
                  </div>
                )}
              </CardContent>

              <Separator />

              {/* Action buttons */}
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={onLike}
                    disabled={likeLoading}
                    className="gap-2 flex-shrink-0"
                  >
                    <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                    <span className="hidden sm:inline">좋아요 {likeCount}</span>
                    <span className="sm:hidden">{likeCount}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBookmark}
                    disabled={bookmarkLoading}
                    className="gap-2 flex-shrink-0"
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{isBookmarked ? '북마크됨' : '북마크'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onShare}
                    className="gap-2 flex-shrink-0"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">공유</span>
                  </Button>

                  {/* Custom action buttons */}
                  {actionButtons}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Children (usually CommentSection) */}
          {children}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Author card */}
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">작성자</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={author.avatar} />
                    <AvatarFallback>
                      {author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{author.name}</p>
                    {author.department && (
                      <p className="text-sm text-muted-foreground">
                        {author.department}
                      </p>
                    )}
                  </div>
                </div>
                <Link href={`/profile/${author.id}`}>
                  <Button variant="outline" className="mt-4 w-full">
                    <User className="mr-2 h-4 w-4" />
                    프로필 보기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Related content or additional sidebar content can go here */}
        </div>
      </div>
    </div>
  )
}