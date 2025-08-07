/**
 * Event Type Definitions
 * 
 * 커스텀 이벤트 및 이벤트 핸들러 타입 정의
 * 타입 안전성을 위해 as any 대신 사용
 */

/**
 * 신고 다이얼로그 이벤트
 */
export interface ReportDialogEventDetail {
  contentId: string
  contentType: 'post' | 'comment' | 'resource' | 'announcement' | 'case' | 'user'
  reporterId?: string
  reason?: string
}

export interface ReportDialogEvent extends CustomEvent<ReportDialogEventDetail> {
  type: 'openReportDialog'
}

/**
 * 모달/다이얼로그 이벤트
 */
export interface ModalEventDetail {
  modalId: string
  action: 'open' | 'close' | 'toggle'
  data?: any
}

export interface ModalEvent extends CustomEvent<ModalEventDetail> {
  type: 'modalAction'
}

/**
 * 알림 이벤트
 */
export interface NotificationEventDetail {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface NotificationEvent extends CustomEvent<NotificationEventDetail> {
  type: 'showNotification'
}

/**
 * 데이터 업데이트 이벤트
 */
export interface DataUpdateEventDetail {
  entity: 'user' | 'post' | 'comment' | 'message' | 'activity'
  action: 'create' | 'update' | 'delete'
  id: string
  data?: any
}

export interface DataUpdateEvent extends CustomEvent<DataUpdateEventDetail> {
  type: 'dataUpdate'
}

/**
 * 네비게이션 이벤트
 */
export interface NavigationEventDetail {
  from: string
  to: string
  params?: Record<string, any>
  preventDefault?: boolean
}

export interface NavigationEvent extends CustomEvent<NavigationEventDetail> {
  type: 'navigation'
}

/**
 * 파일 업로드 이벤트
 */
export interface FileUploadEventDetail {
  files: File[]
  uploadType: 'image' | 'document' | 'video' | 'any'
  maxSize?: number
  onProgress?: (progress: number) => void
  onComplete?: (urls: string[]) => void
  onError?: (error: Error) => void
}

export interface FileUploadEvent extends CustomEvent<FileUploadEventDetail> {
  type: 'fileUpload'
}

/**
 * 검색 이벤트
 */
export interface SearchEventDetail {
  query: string
  filters?: {
    type?: string[]
    category?: string[]
    dateRange?: {
      start: Date
      end: Date
    }
    tags?: string[]
  }
  source: 'header' | 'sidebar' | 'page'
}

export interface SearchEvent extends CustomEvent<SearchEventDetail> {
  type: 'search'
}

/**
 * 권한 요청 이벤트
 */
export interface PermissionRequestEventDetail {
  permission: 'camera' | 'microphone' | 'location' | 'notification'
  reason: string
  onGranted?: () => void
  onDenied?: () => void
}

export interface PermissionRequestEvent extends CustomEvent<PermissionRequestEventDetail> {
  type: 'permissionRequest'
}

/**
 * 클립보드 이벤트 (붙여넣기)
 */
export interface ClipboardPasteEventDetail {
  text?: string
  html?: string
  files?: File[]
  source: 'editor' | 'input' | 'textarea'
}

export interface ClipboardPasteEvent extends ClipboardEvent {
  detail?: ClipboardPasteEventDetail
}

/**
 * 드래그 앤 드롭 이벤트
 */
export interface DragDropEventDetail {
  files?: File[]
  data?: any
  dropZone: string
  position: { x: number; y: number }
}

export interface DragDropEvent extends CustomEvent<DragDropEventDetail> {
  type: 'dragDrop'
}

/**
 * 키보드 단축키 이벤트
 */
export interface ShortcutEventDetail {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  action: string
}

export interface ShortcutEvent extends CustomEvent<ShortcutEventDetail> {
  type: 'shortcut'
}

/**
 * 이벤트 리스너 타입
 */
export type EventListenerMap = {
  openReportDialog: (event: ReportDialogEvent) => void
  modalAction: (event: ModalEvent) => void
  showNotification: (event: NotificationEvent) => void
  dataUpdate: (event: DataUpdateEvent) => void
  navigation: (event: NavigationEvent) => void
  fileUpload: (event: FileUploadEvent) => void
  search: (event: SearchEvent) => void
  permissionRequest: (event: PermissionRequestEvent) => void
}

/**
 * 이벤트 디스패처 헬퍼 함수
 */
export function dispatchCustomEvent<K extends keyof EventListenerMap>(
  eventType: K,
  detail: Parameters<EventListenerMap[K]>[0]['detail']
): void {
  const event = new CustomEvent(eventType, {
    detail,
    bubbles: true,
    cancelable: true
  })
  window.dispatchEvent(event)
}

/**
 * 이벤트 리스너 헬퍼 함수
 */
export function addCustomEventListener<K extends keyof EventListenerMap>(
  eventType: K,
  handler: EventListenerMap[K]
): () => void {
  window.addEventListener(eventType, handler as EventListener)
  
  // cleanup 함수 반환
  return () => {
    window.removeEventListener(eventType, handler as EventListener)
  }
}

/**
 * React Hook을 위한 이벤트 리스너
 */
import { useEffect } from 'react'

export function useCustomEventListener<K extends keyof EventListenerMap>(
  eventType: K,
  handler: EventListenerMap[K]
): void {
  useEffect(() => {
    const cleanup = addCustomEventListener(eventType, handler)
    return cleanup
  }, [eventType, handler])
}

/**
 * 이벤트 타입 가드
 */
export function isReportDialogEvent(event: Event): event is ReportDialogEvent {
  return event.type === 'openReportDialog' && 'detail' in event
}

export function isModalEvent(event: Event): event is ModalEvent {
  return event.type === 'modalAction' && 'detail' in event
}

export function isNotificationEvent(event: Event): event is NotificationEvent {
  return event.type === 'showNotification' && 'detail' in event
}

export function isDataUpdateEvent(event: Event): event is DataUpdateEvent {
  return event.type === 'dataUpdate' && 'detail' in event
}

export function isNavigationEvent(event: Event): event is NavigationEvent {
  return event.type === 'navigation' && 'detail' in event
}

export function isFileUploadEvent(event: Event): event is FileUploadEvent {
  return event.type === 'fileUpload' && 'detail' in event
}

export function isSearchEvent(event: Event): event is SearchEvent {
  return event.type === 'search' && 'detail' in event
}

export function isPermissionRequestEvent(event: Event): event is PermissionRequestEvent {
  return event.type === 'permissionRequest' && 'detail' in event
}