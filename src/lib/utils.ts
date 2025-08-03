import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 마크다운 콘텐츠에서 깔끔한 미리보기 텍스트를 추출합니다.
 * 이미지 URL, 링크 URL, 마크다운 문법 등을 제거하고 순수 텍스트만 반환합니다.
 */
export function extractCleanPreview(content: string, maxLength: number = 150): string {
  if (!content) return '';
  
  let cleaned = content;
  
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
