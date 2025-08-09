# V2 Hook 마이그레이션 종합 계획

> 작성일: 2025-01-08  
> 목적: 모든 컴포넌트를 V1 Hook에서 V2 Hook으로 완전 마이그레이션

## 📊 현황 분석

### 현재 상태
- **V2 Hook 구현**: ✅ 100% 완료 (18개 hooks)
- **V2 Hook 사용**: ❌ 0% (모든 컴포넌트가 V1 사용 중)
- **영향받는 컴포넌트**: 29개
- **예상 변경 라인**: 500-800줄

### V1 → V2 Hook 매핑

| V1 Hook | V2 Hook | 주요 변경사항 |
|---------|---------|--------------|
| `useContent` | `useContentV2` | 통합 content_v2 테이블 사용 |
| `useComments` | `useCommentsV2` | ltree 중첩 댓글 지원 |
| `useProfile` | `useProfileV2` | users_v2 테이블, 게임화 시스템 |
| `useBookmarks` | `useInteractionsV2` | 통합 상호작용 시스템 |
| `useReports` | `useInteractionsV2` | 통합 상호작용 시스템 |
| `useMessages` | `useNotificationsV2` | 알림 시스템으로 통합 |
| `useMembership` | `useMembershipV2` | 개선된 신청 워크플로우 |
| `useSearch` | `useSearchV2` | Full-text search 지원 |
| `useActivities` | `useActivitiesV2` | 이벤트 일정 관리 개선 |
| `useMembers` | `useMembersV2` | 향상된 회원 관리 |
| `useSettings` | `useSettingsV2` | content_metadata_v2 사용 |

## 🎯 마이그레이션 대상 컴포넌트

### Phase 1: Core Components (최우선)
| 컴포넌트 | 현재 Hook | 변경할 Hook | 영향도 |
|---------|-----------|------------|--------|
| `CommentSection.tsx` | useComments | useCommentsV2 | 🔴 매우 높음 |
| `ContentEditorPage.tsx` | useContent, useCreateContent, useUpdateContent | useContentV2 | 🔴 매우 높음 |

### Phase 2: Content Pages
| 컴포넌트 | 현재 Hook | 변경할 Hook | 영향도 |
|---------|-----------|------------|--------|
| `CommunityPage.tsx` | useContentList, useDeleteContent | useContentV2 | 🟡 높음 |
| `CommunityDetailPage.tsx` | useContent, useToggleLike, useIsLiked | useContentV2, useInteractionsV2 | 🟡 높음 |
| `ResourcesPage.tsx` | useContentList, useDeleteContent | useContentV2 | 🟡 높음 |
| `ResourceDetailPage.tsx` | useContent, useToggleBookmark | useContentV2, useInteractionsV2 | 🟡 높음 |
| `CasesListPage.tsx` | useContentList, useDeleteContent | useContentV2 | 🟡 높음 |
| `CaseDetailPage.tsx` | useContent, useToggleLike | useContentV2, useInteractionsV2 | 🟡 높음 |
| `AnnouncementsPage.tsx` | useContentList, useDeleteContent | useContentV2 | 🟡 높음 |
| `AnnouncementDetailPage.tsx` | useContent, useToggleBookmark | useContentV2, useInteractionsV2 | 🟡 높음 |

### Phase 3: User & Profile
| 컴포넌트 | 현재 Hook | 변경할 Hook | 영향도 |
|---------|-----------|------------|--------|
| `UnifiedProfilePage.tsx` | useUserProfileComplete, useUpdateProfileV2 | (이미 V2 사용) | ✅ 완료 |
| `ProfileEditDialog.tsx` | useUpdateProfileV2 | (이미 V2 사용) | ✅ 완료 |
| `SettingsPage.tsx` | useUserProfile, useUpdateProfile | useProfileV2 | 🟢 중간 |
| `MembersPage.tsx` | useProfileList, useUpdateMemberRole | useMembersV2 | 🟢 중간 |
| `MembershipApplicationPage.tsx` | useMyMembershipApplication | useMembershipV2 | 🟢 중간 |

### Phase 4: Features
| 컴포넌트 | 현재 Hook | 변경할 Hook | 영향도 |
|---------|-----------|------------|--------|
| `SearchPage.tsx` | useSearch, usePopularSearches | useSearchV2 | 🟢 중간 |
| `ActivitiesPage.tsx` | useActivities 관련 | useActivitiesV2 | 🟢 중간 |
| `MessageInbox.tsx` | useMessageInbox | useNotificationsV2 | 🟢 중간 |
| `ConversationThread.tsx` | useConversation, useSendMessage | useNotificationsV2 | 🟢 중간 |
| `MessageButton.tsx` | useStartConversation | useNotificationsV2 | 🟢 중간 |
| `MessageNotificationBadge.tsx` | useUnreadCount | useNotificationsV2 | 🟢 중간 |

### Phase 5: Admin
| 컴포넌트 | 현재 Hook | 변경할 Hook | 영향도 |
|---------|-----------|------------|--------|
| `MemberManagement.tsx` | useMembers, useUpdateMemberRole | useMembersV2 | 🔵 낮음 |
| `MembershipApplicationManager.tsx` | useMembership 관련 | useMembershipV2 | 🔵 낮음 |
| `ReportManagement.tsx` | useReports, useUpdateReport | useInteractionsV2 | 🔵 낮음 |
| `report-dialog.tsx` | useCreateReport | useInteractionsV2 | 🔵 낮음 |

## 📝 마이그레이션 체크리스트

### Phase 1 체크리스트
- [ ] CommentSection.tsx 마이그레이션
  - [ ] useComments → useCommentsV2
  - [ ] ltree 중첩 댓글 테스트
  - [ ] Optimistic Updates 확인
- [ ] ContentEditorPage.tsx 마이그레이션
  - [ ] useContent → useContentV2
  - [ ] content_type 파라미터 추가
  - [ ] 통합 테이블 처리 확인

### Phase 2 체크리스트
- [ ] Community 페이지 (2개)
- [ ] Resources 페이지 (2개)
- [ ] Cases 페이지 (2개)
- [ ] Announcements 페이지 (2개)
- [ ] 각 페이지별 CRUD 테스트

### Phase 3 체크리스트
- [ ] Profile 관련 컴포넌트
- [ ] Members 페이지
- [ ] Settings 페이지
- [ ] 게임화 시스템 연동 확인

### Phase 4 체크리스트
- [ ] Search 기능
- [ ] Activities 기능
- [ ] Messages → Notifications 전환

### Phase 5 체크리스트
- [ ] Admin 페이지들
- [ ] 권한 체크
- [ ] 관리 기능 테스트

## 🔄 주요 변경 패턴

### 1. Import 변경
```typescript
// Before
import { useContent } from '@/hooks/features/useContent'

// After
import { useContentV2 } from '@/hooks/features/useContentV2'
```

### 2. Hook 사용 변경
```typescript
// Before
const { data: content } = useContent(id)

// After
const { data: content } = useContentV2(id)
```

### 3. 타입 변경
```typescript
// Before
type Content = Tables<'community_posts'> | Tables<'resources'> | Tables<'cases'>

// After
type Content = Tables<'content_v2'>
```

### 4. 상호작용 통합
```typescript
// Before
const { mutate: toggleLike } = useToggleLike()
const { mutate: toggleBookmark } = useToggleBookmark()

// After
const { mutate: toggleInteraction } = useToggleInteractionV2()
// 사용: toggleInteraction({ type: 'like', targetId, targetType: 'content' })
```

### 5. content_type 처리
```typescript
// After - content_type 명시적 지정
const { mutate: createContent } = useCreateContentV2()
createContent({
  ...data,
  content_type: 'community' // 'resource', 'case', 'notice', 'activity'
})
```

## 🧪 테스트 계획

### 기능 테스트
1. **CRUD 작업**: 생성, 조회, 수정, 삭제
2. **상호작용**: 좋아요, 북마크, 신고
3. **댓글**: 중첩 댓글, 수정, 삭제
4. **검색**: Full-text search
5. **알림**: 실시간 알림

### 성능 테스트
- 쿼리 응답 시간 < 100ms
- 캐시 히트율 > 80%
- 번들 크기 감소 확인

### 통합 테스트
- 전체 사용자 플로우
- 권한 체크
- 에러 처리

## 📅 일정 계획

| Phase | 컴포넌트 수 | 예상 시간 | 우선순위 |
|-------|------------|----------|---------|
| Phase 1 | 2개 | 2시간 | 🔴 즉시 |
| Phase 2 | 8개 | 4시간 | 🟡 높음 |
| Phase 3 | 5개 | 3시간 | 🟢 중간 |
| Phase 4 | 6개 | 3시간 | 🟢 중간 |
| Phase 5 | 4개 | 2시간 | 🔵 낮음 |
| **합계** | **25개** | **14시간** | - |

## ⚠️ 주의사항

1. **데이터베이스 마이그레이션 필수**
   - V2 테이블이 생성되어 있어야 함
   - 데이터 마이그레이션 완료 필요

2. **타입 생성 필수**
   ```bash
   npm run db:types
   ```

3. **백업 권장**
   - 마이그레이션 전 데이터 백업
   - 이전 버전 코드 보관

4. **점진적 배포**
   - Phase별로 배포
   - 롤백 계획 수립

## 🎯 성공 지표

- [ ] 모든 컴포넌트 V2 Hook 사용
- [ ] 쿼리 응답 시간 < 100ms
- [ ] 캐시 히트율 > 80%
- [ ] 에러율 < 0.1%
- [ ] 사용자 피드백 긍정적

## 📚 참고 문서

- [V2 스키마 설계서](./database-schema-v2.md)
- [V2 마이그레이션 진행 상황](./v2-migration-progress.md)
- [V2 Hook 구현 문서](../src/hooks/features/README.md)

---

이 계획에 따라 체계적으로 마이그레이션을 진행하면 안전하고 효율적으로 V2 시스템으로 전환할 수 있습니다.