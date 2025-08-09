'use client'

import React from 'react'
import { Download, FileText, Image as ImageIcon, File, Video, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
// V2에서는 attachments가 JSON 필드로 저장됨
interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  attachment_type: 'image' | 'file'
}

interface AttachmentsListProps {
  attachments: Attachment[]
  className?: string
}

export default function AttachmentsList({ attachments, className = '' }: AttachmentsListProps) {
  if (!attachments || attachments.length === 0) {
    return null
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon
    if (fileType.startsWith('video/')) return Video
    if (fileType.startsWith('audio/')) return Music
    if (fileType.includes('pdf')) return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(attachment.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Separate images and other files
  const imageAttachments = attachments.filter(a => a.attachment_type === 'image')
  const fileAttachments = attachments.filter(a => a.attachment_type === 'file')

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Image Gallery */}
      {imageAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">첨부 이미지</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {imageAttachments.map((image) => (
              <Card key={image.id} className="overflow-hidden group cursor-pointer">
                <div className="relative aspect-square">
                  <img
                    src={image.file_url}
                    alt={image.file_name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onClick={() => window.open(image.file_url, '_blank')}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(image)
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      다운로드
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      {fileAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">첨부 파일</h4>
          <div className="space-y-2">
            {fileAttachments.map((file) => {
              const Icon = getFileIcon(file.file_type)
              return (
                <Card key={file.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-muted rounded-md">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      다운로드
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}