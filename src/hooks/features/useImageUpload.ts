/**
 * Image Upload Hooks
 * 
 * 이미지 업로드 및 스토리지 관리를 위한 TanStack Query 기반 hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { toast } from 'sonner'

// 업로드 옵션 타입
export interface UploadOptions {
  bucket: 'avatars' | 'content-images' | 'resources'
  folder?: string
  maxSizeInMB?: number
  allowedTypes?: string[]
  generateThumbnail?: boolean
}

// 업로드 결과 타입
export interface UploadResult {
  url: string
  path: string
  size: number
  type: string
}

/**
 * 이미지 업로드 Hook
 */
export function useUploadImage(options: UploadOptions = { bucket: 'content-images' }) {
  const { user } = useAuth()
  
  return useMutation<UploadResult, Error, File>({
    mutationFn: async (file) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      
      // 파일 크기 체크
      const maxSize = (options.maxSizeInMB || 5) * 1024 * 1024 // 기본 5MB
      if (file.size > maxSize) {
        throw new Error(`파일 크기는 ${options.maxSizeInMB || 5}MB를 초과할 수 없습니다.`)
      }
      
      // 파일 타입 체크
      const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('지원하지 않는 파일 형식입니다.')
      }
      
      // 파일명 생성
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const folder = options.folder || new Date().toISOString().slice(0, 7) // YYYY-MM
      const filePath = `${folder}/${fileName}`
      
      // Storage에 업로드
      const { data, error } = await supabaseClient.storage
        .from(options.bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) throw error
      
      // Public URL 가져오기
      const { data: urlData } = supabaseClient.storage
        .from(options.bucket)
        .getPublicUrl(filePath)
      
      return {
        url: urlData.publicUrl,
        path: data.path,
        size: file.size,
        type: file.type
      }
    },
    onError: (error) => {
      console.error('Image upload error:', error)
      toast.error(error.message || '이미지 업로드에 실패했습니다.')
    }
  })
}

/**
 * 여러 이미지 업로드 Hook
 */
export function useUploadImages(options: UploadOptions = { bucket: 'content-images' }) {
  const { user } = useAuth()
  
  return useMutation<UploadResult[], Error, File[]>({
    mutationFn: async (files) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      
      const uploadPromises = files.map(async (file) => {
        // 파일 크기 체크
        const maxSize = (options.maxSizeInMB || 5) * 1024 * 1024
        if (file.size > maxSize) {
          throw new Error(`파일 "${file.name}"의 크기가 ${options.maxSizeInMB || 5}MB를 초과합니다.`)
        }
        
        // 파일 타입 체크
        const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`파일 "${file.name}"은 지원하지 않는 형식입니다.`)
        }
        
        // 파일명 생성
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        const folder = options.folder || new Date().toISOString().slice(0, 7)
        const filePath = `${folder}/${fileName}`
        
        // Storage에 업로드
        const { data, error } = await supabaseClient.storage
          .from(options.bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (error) throw error
        
        // Public URL 가져오기
        const { data: urlData } = supabaseClient.storage
          .from(options.bucket)
          .getPublicUrl(filePath)
        
        return {
          url: urlData.publicUrl,
          path: data.path,
          size: file.size,
          type: file.type
        }
      })
      
      return Promise.all(uploadPromises)
    },
    onError: (error) => {
      console.error('Images upload error:', error)
      toast.error(error.message || '이미지 업로드에 실패했습니다.')
    }
  })
}

/**
 * 이미지 삭제 Hook
 */
export function useDeleteImage() {
  const { user } = useAuth()
  
  return useMutation<void, Error, { bucket: string; path: string }>({
    mutationFn: async ({ bucket, path }) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      
      const { error } = await supabaseClient.storage
        .from(bucket)
        .remove([path])
      
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('이미지가 삭제되었습니다.')
    },
    onError: (error) => {
      console.error('Image delete error:', error)
      toast.error('이미지 삭제에 실패했습니다.')
    }
  })
}

/**
 * 이미지 목록 조회 Hook
 */
export function useImageList(bucket: string, folder?: string) {
  const { user } = useAuth()
  
  return useQuery<{ name: string; url: string; size: number; created_at: string }[], Error>({
    queryKey: ['images', bucket, folder, user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabaseClient.storage
        .from(bucket)
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })
      
      if (error) throw error
      
      // Public URL 추가
      return (data || []).map(file => {
        const { data: urlData } = supabaseClient.storage
          .from(bucket)
          .getPublicUrl(`${folder ? folder + '/' : ''}${file.name}`)
        
        return {
          name: file.name,
          url: urlData.publicUrl,
          size: file.metadata?.size || 0,
          created_at: file.created_at
        }
      })
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 에디터용 이미지 업로드 Hook
 * 에디터에서 이미지를 붙여넣거나 드래그할 때 사용
 */
export function useEditorImageUpload() {
  const uploadImage = useUploadImage({
    bucket: 'content-images',
    maxSizeInMB: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  })
  
  return useMutation<string, Error, File>({
    mutationFn: async (file) => {
      const result = await uploadImage.mutateAsync(file)
      return result.url
    },
    onSuccess: (url) => {
      toast.success('이미지가 업로드되었습니다.')
    },
    onError: (error) => {
      console.error('Editor image upload error:', error)
      toast.error(error.message || '이미지 업로드에 실패했습니다.')
    }
  })
}

/**
 * 클립보드에서 이미지 붙여넣기 처리
 */
export function usePasteImage() {
  const uploadImage = useEditorImageUpload()
  
  const handlePaste = async (event: ClipboardEvent): Promise<string | null> => {
    const items = event.clipboardData?.items
    if (!items) return null
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          try {
            const url = await uploadImage.mutateAsync(file)
            return url
          } catch (error) {
            console.error('Paste image error:', error)
            return null
          }
        }
      }
    }
    
    return null
  }
  
  return { handlePaste, isUploading: uploadImage.isPending }
}

/**
 * 드래그 앤 드롭 이미지 업로드
 */
export function useDropImage() {
  const uploadImages = useUploadImages({
    bucket: 'content-images',
    maxSizeInMB: 10
  })
  
  const handleDrop = async (event: DragEvent): Promise<string[]> => {
    event.preventDefault()
    
    const files = Array.from(event.dataTransfer?.files || [])
      .filter(file => file.type.startsWith('image/'))
    
    if (files.length === 0) return []
    
    try {
      const results = await uploadImages.mutateAsync(files)
      toast.success(`${results.length}개의 이미지가 업로드되었습니다.`)
      return results.map(r => r.url)
    } catch (error) {
      console.error('Drop images error:', error)
      return []
    }
  }
  
  return { handleDrop, isUploading: uploadImages.isPending }
}