import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 마크다운 또는 HTML 콘텐츠에서 깔끔한 미리보기 텍스트를 추출합니다.
 * 이미지 URL, 링크 URL, 마크다운 문법, HTML 태그 등을 제거하고 순수 텍스트만 반환합니다.
 */
export function extractCleanPreview(content: string, maxLength: number = 150): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // HTML 콘텐츠인지 확인 (Tiptap 에디터에서 생성된 콘텐츠)
  const isHTML = cleaned.trim().startsWith('<') && cleaned.includes('</');
  
  if (isHTML) {
    // HTML 콘텐츠 처리
    // 1. 이미지 태그 완전 제거
    cleaned = cleaned.replace(/<img[^>]*>/gi, '');
    
    // 2. 비디오, 오디오, iframe 등 미디어 태그 제거
    cleaned = cleaned.replace(/<video[^>]*>.*?<\/video>/gi, '');
    cleaned = cleaned.replace(/<audio[^>]*>.*?<\/audio>/gi, '');
    cleaned = cleaned.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    cleaned = cleaned.replace(/<embed[^>]*>/gi, '');
    cleaned = cleaned.replace(/<object[^>]*>.*?<\/object>/gi, '');
    
    // 3. 스크립트와 스타일 태그 및 내용 제거
    cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gi, '');
    
    // 4. 링크 태그에서 텍스트만 추출: <a href="...">text</a> → text
    cleaned = cleaned.replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1');
    
    // 5. 파일 다운로드 링크나 첨부 파일 관련 태그 제거
    cleaned = cleaned.replace(/<a[^>]*download[^>]*>.*?<\/a>/gi, '');
    
    // 6. 모든 HTML 태그 제거하되 텍스트는 유지
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');
    
    // 7. HTML 엔티티 디코딩
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#039;/g, "'");
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
  } else {
    // 마크다운 콘텐츠 처리 (기존 로직)
    // 1. 이미지 제거: 다단계 방식으로 모든 이미지 문법 제거
    // 1-1. 완전한 이미지 문법 제거: ![alt](url)
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
    // 1-2. 불완전한 이미지 문법 제거: ![alt]
    cleaned = cleaned.replace(/!\[[^\]]*\]/g, '');
    // 1-3. 남은 이미지 관련 잔해 제거
    cleaned = cleaned.replace(/!\[.*?\]/g, ''); // 기타 불완전한 형태
    
    // 2. 링크 텍스트만 추출: [text](url) → text
    cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    
    // 3. 파일 첨부 제거: file:filename:url → ''
    cleaned = cleaned.replace(/file:[^:]+:[^\s]+/g, '');
    
    // 4. 마크다운 서식 제거
    cleaned = cleaned.replace(/[#*_`~]/g, ''); // 제목, 굵게, 기울임, 코드, 취소선
    cleaned = cleaned.replace(/^[-+*]\s+/gm, ''); // 리스트 마커
    cleaned = cleaned.replace(/^\d+\.\s+/gm, ''); // 번호 리스트
    cleaned = cleaned.replace(/^>\s+/gm, ''); // 인용문
  }
  
  // 공통 처리
  // 5. 공백 정리
  cleaned = cleaned.replace(/\n/g, ' '); // 줄바꿈 → 공백
  cleaned = cleaned.replace(/\s+/g, ' ').trim(); // 연속 공백 제거
  
  // 6. 길이 제한 (단어 단위로 자르기)
  if (cleaned.length > maxLength) {
    const truncated = cleaned.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    cleaned = (lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated) + '...';
  }
  
  return cleaned || '내용 미리보기가 없습니다.';
}
