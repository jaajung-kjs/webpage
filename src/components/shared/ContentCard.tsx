'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { fadeInUp, cardHover } from '@/lib/animations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Eye,
  ThumbsUp,
  MessageCircle,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Tag,
  Paperclip,
  Pin,
  PinOff,
} from 'lucide-react'
import { cn, extractCleanPreview } from '@/lib/utils'
import UserLevelBadges from './UserLevelBadges'
interface ContentCardProps {
  content: any
  viewMode?: 'grid' | 'list'
  categoryLabels?: Record<string, string>
  categoryColors?: Record<string, string>
  categoryIcons?: Record<string, React.ElementType>
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onPin?: (id: string, pinned: boolean) => void
  canEdit?: boolean
  canDelete?: boolean
  canPin?: boolean
  linkPrefix: string // e.g., '/cases', '/community'
  index?: number
}

export default function ContentCard({
  content,
  viewMode = 'grid',
  categoryLabels = {},
  categoryColors = {},
  categoryIcons = {},
  onEdit,
  onDelete,
  onPin,
  canEdit = false,
  canDelete = false,
  canPin = false,
  linkPrefix,
  index = 0,
}: ContentCardProps) {
  const isPinned = (content.metadata as any)?.is_pinned
  const hasImage = (content.metadata as any)?.has_image
  const attachments = (content.metadata as any)?.attachments || []
  const CategoryIcon = categoryIcons[content.category || '']

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return '날짜 없음'
    return new Date(date).toLocaleDateString('ko-KR')
  }

  const cardContent = (
    <>
      <CardHeader className={viewMode === 'list' ? 'pb-3' : ''}>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {isPinned && (
                <Badge variant="default" className="bg-primary">
                  <Tag className="h-3 w-3 mr-1" />
                  고정
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={categoryColors[content.category || ''] || ''}
              >
                {CategoryIcon && <CategoryIcon className="h-3 w-3 mr-1" />}
                {categoryLabels[content.category || ''] || content.category}
              </Badge>
              {hasImage && (
                <Badge variant="outline">이미지</Badge>
              )}
              {attachments.length > 0 && (
                <Badge variant="outline">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {attachments.length}
                </Badge>
              )}
            </div>

            {/* Title */}
            <CardTitle className={cn(
              "line-clamp-2",
              viewMode === 'grid' ? "text-lg" : "text-xl"
            )}>
              <Link
                href={`${linkPrefix}/${content.id}`}
                className="hover:text-primary transition-colors"
              >
                {content.title || '제목 없음'}
              </Link>
            </CardTitle>
          </div>

          {/* Actions Dropdown */}
          {(canEdit || canDelete || canPin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {canPin && onPin && (
                  <>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      content.id && onPin(content.id, !isPinned)
                    }}>
                      {isPinned ? (
                        <>
                          <PinOff className="mr-2 h-4 w-4" />
                          고정 해제
                        </>
                      ) : (
                        <>
                          <Pin className="mr-2 h-4 w-4" />
                          고정
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {canEdit && onEdit && (
                  <>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      content.id && onEdit(content.id)
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {canDelete && onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      content.id && onDelete(content.id)
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Description/Excerpt */}
        <CardDescription className={cn(
          "mb-4 break-words overflow-wrap-anywhere min-w-0",
          viewMode === 'grid' ? "line-clamp-2" : "line-clamp-3"
        )}>
          {extractCleanPreview(content.excerpt || content.content || '', 150)}
        </CardDescription>

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {content.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {content.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{content.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className={cn(
          "flex items-center text-sm text-muted-foreground",
          viewMode === 'list' ? "justify-between" : "justify-between"
        )}>
          {/* Author Info */}
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarImage src={content.author?.avatar_url || undefined} />
              <AvatarFallback>{content.author?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-medium truncate">{content.author?.name || '익명'}</span>
              {/* 게임화 V2 레벨 뱃지 */}
              <UserLevelBadges 
                userId={content.author?.id} 
                variant="minimal" 
                size="sm" 
                className="flex-shrink-0"
              />
            </div>
            {viewMode === 'list' && content.author?.department && (
              <>
                <span className="flex-shrink-0">·</span>
                <span className="truncate">{content.author.department}</span>
              </>
            )}
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0">{formatDate(content.created_at)}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{content.interaction_counts?.views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>{content.interaction_counts?.likes || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{content.comment_count || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </>
  )

  return (
    <motion.div
      {...fadeInUp}
      transition={{ duration: 0.3, delay: 0.05 * index }}
      whileHover="hover"
      whileTap="tap"
      variants={cardHover}
    >
      <Card className={cn(
        "h-full transition-all hover:shadow-lg hover:-translate-y-1 touch-manipulation min-w-0 overflow-hidden",
        isPinned && "border-primary bg-primary/5"
      )}>
        <Link href={`${linkPrefix}/${content.id}`} className="block touch-manipulation">
          {cardContent}
        </Link>
      </Card>
    </motion.div>
  )
}