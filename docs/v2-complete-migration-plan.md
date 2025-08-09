# V2 완전 마이그레이션 작업 계획 및 진행 상황

**작성일:** 2025-01-09  
**상태:** 🔴 CRITICAL - 전체 시스템 재점검 필요  
**목표:** 모든 페이지와 기능이 V2 스키마로 완벽하게 작동하도록 수정

## 🚨 현재 문제 상황 (사용자 보고)

1. ❌ **조회수가 증가하지 않음**
2. ❌ **활동 참가 신청/취소 작동 안함**  
3. ❌ **댓글 작성 불가**
4. ❌ **활동일정 게시판 작성자가 "운영자"로 표시**
5. ❌ **활동 설명이 "없음"으로 표시**
6. ❌ **게시글 작성자가 "익명"으로 표시**
7. ❌ **통계 표시 안됨**
8. ❌ **좋아요/북마크 작동 안함**
9. ❌ **프로필 페이지 깨짐**
10. ❌ **검색 기능 제대로 작동 안함**

## 📋 전체 페이지 점검 체크리스트

### 1. 🏠 홈페이지 (/)
- [ ] 최근 게시글 섹션 - 작성자명 표시
- [ ] 최근 게시글 섹션 - 조회수/좋아요 표시
- [ ] 활동 일정 섹션 - 참가자 수 표시
- [ ] 통계 섹션 - 실시간 데이터 표시
- [ ] 인기 게시글 - 정확한 데이터 표시

### 2. 📢 공지사항 (/announcements)
- [ ] 게시글 목록 - 작성자명 표시
- [ ] 게시글 목록 - 조회수/좋아요 표시
- [ ] 게시글 상세 - 모든 정보 표시
- [ ] 게시글 작성 기능
- [ ] 게시글 수정/삭제 기능
- [ ] 댓글 작성/수정/삭제 기능
- [ ] 좋아요 토글 기능

### 3. 📅 활동일정 (/activities)
- [ ] 활동 목록 - 작성자명 표시 (현재 "운영자"로 표시)
- [ ] 활동 목록 - 설명 표시 (현재 "없음"으로 표시)
- [ ] 활동 목록 - 참가자 수 표시
- [ ] 활동 상세 - 모든 정보 표시
- [ ] 참가 신청 기능 (현재 작동 안함)
- [ ] 참가 취소 기능 (현재 작동 안함)
- [ ] 활동 생성 기능
- [ ] 활동 수정/삭제 기능
- [ ] 참가자 목록 표시
- [ ] 출석 체크 기능

### 4. 💬 커뮤니티 (/community)
- [ ] 게시글 목록 - 작성자명 표시
- [ ] 게시글 목록 - 조회수/좋아요/댓글수 표시
- [ ] 게시글 상세 - 조회수 증가 (현재 작동 안함)
- [ ] 게시글 작성 기능
- [ ] 게시글 수정/삭제 기능
- [ ] 댓글 작성 기능 (현재 작동 안함)
- [ ] 댓글 수정/삭제 기능
- [ ] 좋아요 토글 기능
- [ ] 북마크 토글 기능

### 5. 📚 학습자료 (/resources)
- [ ] 자료 목록 - 작성자명 표시
- [ ] 자료 목록 - 조회수/다운로드수 표시
- [ ] 자료 상세 - 모든 정보 표시
- [ ] 파일 다운로드 기능
- [ ] 자료 업로드 기능
- [ ] 자료 수정/삭제 기능
- [ ] 댓글 기능
- [ ] 좋아요/북마크 기능

### 6. 💼 사례공유 (/cases)
- [ ] 사례 목록 - 작성자명 표시
- [ ] 사례 목록 - 조회수/좋아요 표시
- [ ] 사례 상세 - 모든 정보 표시
- [ ] 사례 작성 기능
- [ ] 사례 수정/삭제 기능
- [ ] 댓글 기능
- [ ] 좋아요/북마크 기능

### 7. 👤 프로필 (/profile)
- [ ] 사용자 정보 표시
- [ ] 활동 통계 표시 (현재 작동 안함)
- [ ] 작성 게시글 목록
- [ ] 참여 활동 목록
- [ ] 업적/뱃지 표시
- [ ] 프로필 수정 기능
- [ ] 팔로우/팔로워 기능

### 8. 🔍 검색 (/search)
- [ ] 통합 검색 기능
- [ ] 검색 결과 - 작성자명 표시
- [ ] 검색 결과 - 조회수/좋아요 표시
- [ ] 필터링 기능
- [ ] 정렬 기능

### 9. 👥 회원목록 (/members)
- [ ] 회원 목록 표시
- [ ] 회원 상세 정보
- [ ] 역할별 필터링
- [ ] 부서별 필터링

### 10. ⚙️ 관리자 (/admin)
- [ ] 대시보드 통계
- [ ] 회원 관리
- [ ] 콘텐츠 관리
- [ ] 활동 관리
- [ ] 신고 관리

## 🔧 컴포넌트별 수정 필요 사항

### 핵심 컴포넌트 (Critical)
| 컴포넌트 | 문제점 | 수정 필요 사항 | 상태 |
|---------|--------|--------------|------|
| ContentCard.tsx | 작성자 익명 표시 | author?.name 매핑 | ⏳ |
| ActivityCard.tsx | 작성자 "운영자", 설명 "없음" | content.author?.name, content.summary 매핑 | ❌ |
| CommentSection.tsx | 댓글 작성 불가 | V2 API 연결 | ❌ |
| LikeButton.tsx | 좋아요 작동 안함 | toggleInteraction 수정 | ❌ |
| ViewCounter.tsx | 조회수 증가 안함 | increment RPC 호출 | ❌ |
| ActivityRegistration.tsx | 참가/취소 불가 | V2 RPC 함수 연결 | ❌ |

### 페이지 컴포넌트
| 페이지 | 문제점 | 수정 필요 사항 | 상태 |
|--------|--------|--------------|------|
| ActivitiesPage.tsx | 다중 표시 오류 | 전체 데이터 매핑 재작성 | ❌ |
| ProfilePage.tsx | 통계 표시 안됨 | useGamificationV2 연결 | ❌ |
| SearchPage.tsx | 검색 결과 불완전 | V2 RPC 함수 사용 | ❌ |

### Hooks (데이터 페칭)
| Hook | 문제점 | 수정 필요 사항 | 상태 |
|------|--------|--------------|------|
| useContentV2.ts | 조회수 증가 로직 | RPC 함수 호출 확인 | ❌ |
| useActivitiesV2.ts | 참가/취소 오류 | mutation 함수 디버깅 | ❌ |
| useCommentsV2.ts | 댓글 작성 불가 | create mutation 수정 | ❌ |
| useInteractionsV2.ts | 좋아요/북마크 오류 | toggle 로직 수정 | ❌ |

## 📊 V2 스키마 매핑 가이드

### Content 구조
```typescript
// ❌ V1 (잘못된 구조)
{
  author_name: string,
  author_avatar_url: string,
  author_department: string,
  view_count: number,
  like_count: number,
  comment_count: number
}

// ✅ V2 (올바른 구조)
{
  author: {
    id: string,
    name: string,
    avatar_url: string,
    department: string,
    role: string
  },
  interaction_counts: {
    views: number,
    likes: number,
    bookmarks: number,
    reports: number
  },
  comment_count: number  // 별도 필드
}
```

### Activity 구조
```typescript
// ✅ V2 Activity
{
  id: string,
  content_id: string,
  content: {
    id: string,
    title: string,
    content: string,
    summary: string,  // 설명
    author: {
      id: string,
      name: string,  // 작성자명
      avatar_url: string
    }
  },
  current_participants: number,
  max_participants: number,
  available_spots: number,
  event_date: string,
  event_type: string,
  location: string,
  is_online: boolean
}
```

### Comment 구조
```typescript
// ✅ V2 Comment
{
  id: string,
  content_id: string,
  user_id: string,
  user: {
    id: string,
    name: string,
    avatar_url: string,
    department: string
  },
  content: string,
  created_at: string,
  updated_at: string
}
```

## 🚀 작업 우선순위

### 🔴 긴급 (P0) - 즉시 수정
1. ActivityCard.tsx - 작성자/설명 표시 수정
2. 활동 참가/취소 기능 복구
3. 댓글 작성 기능 복구
4. 조회수 증가 기능 복구

### 🟡 높음 (P1) - 오늘 중 수정
5. 좋아요/북마크 기능 복구
6. 모든 목록 페이지 작성자명 표시
7. 프로필 통계 표시
8. 검색 기능 수정

### 🟢 보통 (P2) - 내일까지
9. 파일 다운로드 기능
10. 관리자 페이지 기능
11. 팔로우 기능
12. 알림 기능

## 📈 진행 상황

### 오늘 (2025-01-09)
- ✅ 전체 시스템 점검 계획 수립
- ✅ ActivitiesPage.tsx 수정 - 작성자/설명 표시 수정 완료
- ✅ 조회수 증가 기능 수정 - increment_view_count_v2 RPC 호출로 변경
- ✅ ContentCard.tsx 확인 - 이미 V2 매핑 적용됨
- [ ] 활동 참가/취소 기능 테스트
- [ ] 댓글 작성 기능 테스트
- [ ] 좋아요/북마크 기능 테스트

### 완료된 작업
- ✅ 문제 분석 및 계획 수립
- ✅ ActivitiesPage.tsx - 작성자 "운영진" → 실제 작성자명 표시
- ✅ ActivitiesPage.tsx - 설명 "없음" → content.summary 표시
- ✅ useContentV2.ts - 조회수 증가 RPC 함수 수정 (increment_view_count_v2)
- ✅ useContentV2.ts - 조회수 캐시 업데이트 수정 (interaction_counts.views)
- ✅ ContentCard.tsx - V2 데이터 매핑 확인 (이미 적용됨)
- ✅ useGamificationV2.ts - UserStats 타입 오류 수정
- ✅ 빌드 성공 확인

### 진행 중
- 🔄 전체 페이지 테스트 및 검증

### 대기 중
- ⏳ 프로필 통계 표시 테스트
- ⏳ 검색 기능 테스트

## 🎯 완료 기준

- [ ] 모든 페이지에서 작성자명이 정상 표시
- [ ] 모든 상호작용 기능 작동 (좋아요, 북마크, 댓글)
- [ ] 조회수가 정상적으로 증가
- [ ] 활동 참가/취소 기능 정상 작동
- [ ] 모든 통계가 실시간으로 표시
- [ ] 검색 기능 정상 작동
- [ ] 파일 업로드/다운로드 정상 작동
- [ ] 관리자 기능 모두 작동
- [ ] 콘솔 에러 0개
- [ ] 모든 데이터가 V2 스키마에서 정상 로드

## 📝 테스트 시나리오

### 시나리오 1: 게시글 작성 및 조회
1. 새 게시글 작성
2. 목록에서 작성자명 확인
3. 게시글 클릭하여 조회수 증가 확인
4. 댓글 작성
5. 좋아요 토글

### 시나리오 2: 활동 참가
1. 활동 목록에서 작성자명/설명 확인
2. 활동 참가 신청
3. 참가자 수 증가 확인
4. 참가 취소
5. 참가자 수 감소 확인

### 시나리오 3: 프로필 및 통계
1. 프로필 페이지 접속
2. 모든 통계 표시 확인
3. 작성 게시글 목록 확인
4. 참여 활동 목록 확인

## 🔥 다음 단계

1. **즉시**: ActivityCard.tsx 수정하여 작성자/설명 표시 문제 해결
2. **다음**: 활동 참가/취소 mutation 함수 디버깅
3. **그 다음**: 댓글 작성 기능 수정
4. **마지막**: 전체 페이지 순회하며 남은 문제 수정

---

**마지막 업데이트:** 2025-01-09 16:30  
**다음 점검:** 2025-01-09 18:00