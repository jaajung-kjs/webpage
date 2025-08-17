/**
 * File Upload V2 Hooks
 * 
 * 파일 업로드 및 스토리지 관리를 위한 TanStack Query 기반 hooks
 * TiptapEditor 등에서 사용할 수 있는 범용적인 파일 업로드 솔루션
 */

import { useMutation } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { toast } from 'sonner'

// 업로드 옵션 타입
export interface FileUploadOptions {
  bucket?: 'attachments' | 'avatars' | 'content-images' | 'resources'
  folder?: string
  maxSizeInMB?: number
  allowedTypes?: string[]
}

// 업로드 결과 타입
export interface FileUploadResult {
  url: string
  path: string
  size: number
  type: string
  name: string
}

/**
 * 단일 파일 업로드 Hook
 */
export function useFileUpload(options: FileUploadOptions = { bucket: 'attachments' }) {
  const { user } = useAuth()
  
  return useMutation<FileUploadResult, Error, File>({
    mutationFn: async (file) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      
      // 파일 크기 체크
      const maxSize = (options.maxSizeInMB || 10) * 1024 * 1024 // 기본 10MB
      if (file.size > maxSize) {
        throw new Error(`파일 크기는 ${options.maxSizeInMB || 10}MB를 초과할 수 없습니다.`)
      }
      
      // 파일 타입 체크 (기본적으로 모든 타입 허용)
      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        throw new Error('지원하지 않는 파일 형식입니다.')
      }
      
      // 파일명 생성
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const folder = options.folder || 'content'
      const filePath = `${folder}/${fileName}`
      
      // Storage에 업로드
      const { data, error } = await supabaseClient().storage
        .from(options.bucket || 'attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) throw error
      
      // Public URL 가져오기
      const { data: urlData } = supabaseClient().storage
        .from(options.bucket || 'attachments')
        .getPublicUrl(filePath)
      
      return {
        url: urlData.publicUrl,
        path: data.path,
        size: file.size,
        type: file.type,
        name: file.name
      }
    }
  })
}

/**
 * 여러 파일 업로드 Hook
 */
export function useMultipleFileUpload(options: FileUploadOptions = { bucket: 'attachments' }) {
  const { user } = useAuth()
  
  return useMutation<FileUploadResult[], Error, File[]>({
    mutationFn: async (files) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      
      const uploadPromises = files.map(async (file) => {
        // 파일 크기 체크
        const maxSize = (options.maxSizeInMB || 10) * 1024 * 1024
        if (file.size > maxSize) {
          throw new Error(`파일 "${file.name}"의 크기가 ${options.maxSizeInMB || 10}MB를 초과합니다.`)
        }
        
        // 파일 타입 체크
        if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
          throw new Error(`파일 "${file.name}"은 지원하지 않는 형식입니다.`)
        }
        
        // 파일명 생성 - 원본 파일명 유지하면서 중복 방지
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        // 파일명에서 확장자 분리
        const lastDotIndex = file.name.lastIndexOf('.')
        const nameWithoutExt = lastDotIndex > -1 ? file.name.substring(0, lastDotIndex) : file.name
        const fileExt = lastDotIndex > -1 ? file.name.substring(lastDotIndex + 1) : ''
        // 안전한 파일명으로 변환 (특수문자 제거, 공백을 언더스코어로)
        const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9가-힣_.-]/g, '_')
        const fileName = fileExt 
          ? `${timestamp}_${randomStr}_${safeName}.${fileExt}`
          : `${timestamp}_${randomStr}_${safeName}`
        const folder = options.folder || 'content'
        const filePath = `${folder}/${fileName}`
        
        // Storage에 업로드
        const { data, error } = await supabaseClient().storage
          .from(options.bucket || 'attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (error) throw error
        
        // Public URL 가져오기
        const { data: urlData } = supabaseClient().storage
          .from(options.bucket || 'attachments')
          .getPublicUrl(filePath)
        
        return {
          url: urlData.publicUrl,
          path: data.path,
          size: file.size,
          type: file.type,
          name: file.name
        }
      })
      
      return Promise.all(uploadPromises)
    }
  })
}

/**
 * 이미지 전용 업로드 Hook (TiptapEditor용)
 */
export function useImageUploadForEditor() {
  return useFileUpload({
    bucket: 'attachments',
    folder: 'content',
    maxSizeInMB: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  })
}

/**
 * 모든 파일 타입 업로드 Hook (TiptapEditor용)
 */
export function useFileUploadForEditor() {
  return useFileUpload({
    bucket: 'attachments',
    folder: 'content',
    maxSizeInMB: 10,
    // 기본적으로 모든 파일 타입 허용
    allowedTypes: undefined
  })
}

/**
 * 다중 파일 업로드 Hook (TiptapEditor용)
 */
export function useMultipleFileUploadForEditor() {
  return useMultipleFileUpload({
    bucket: 'attachments',
    folder: 'content',
    maxSizeInMB: 10
  })
}