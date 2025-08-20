# 인증 시스템 통합 프로젝트

## 개요
KEPCO AI Community 프로젝트의 중복된 인증 Hook(useAuth와 useAuthV2)을 통합하여 코드 일관성과 유지보수성을 향상시킵니다.

## 목표
1. **기능 통합**: useAuthV2의 모든 기능을 AuthProvider의 useAuth로 통합
2. **코드 정리**: 14개 컴포넌트의 useAuthV2 사용을 useAuth로 변경
3. **타입 안정성**: 권한 체크를 boolean 값으로 통일하여 타입 에러 방지
4. **성능 최적화**: React Query 뮤테이션 상태 통합으로 중복 요청 방지

## 작업 단계

### Phase 1: AuthProvider.tsx 수정 ✅ 완료
**목표**: useAuthV2의 추가 기능들을 useAuth에 통합

**통합할 기능들**:
- [x] 분석 완료: useAuthV2 vs useAuth 기능 비교
- [x] 비밀번호 재설정 기능 추가
- [x] 계정 삭제 기능 추가 
- [x] 재인증 기능 추가
- [x] React Query 뮤테이션 상태 통합
- [x] 권한 체크를 boolean 값으로 통일
- [x] 추가 권한 체크 함수들 (canModerate, isViceLeader 등)

**기능 분석 결과**:

#### useAuth (현재)
- 기본 인증: signIn, signUp, signOut, updateProfile
- 이메일 재전송: resendEmailConfirmation
- 권한 체크: boolean 값으로 반환 (isAdmin, isMember, etc.)
- 상태: loading, error, isAuthenticated, isSigningOut

#### useAuthV2 (통합 대상)
- 추가 기능: 비밀번호 재설정, 계정 삭제, 재인증
- React Query 뮤테이션: 상태 관리 (isPending, mutate, mutateAsync)
- 권한 체크: 함수로 반환 (isAdmin(), isMember(), etc.)
- 추가 권한: canModerate, isViceLeader
- 활동 점수 관리 (deprecated이지만 호환성 유지)

### Phase 2: 컴포넌트 수정 ✅ 완료
**목표**: 모든 useAuthV2 사용처를 useAuth로 변경

**수정 대상 컴포넌트 (14개)**:
- [x] `/src/components/community/CommunityPage.tsx`
- [x] `/src/components/members/MembersPage.tsx` 
- [x] `/src/components/admin/AdminDashboard.tsx`
- [x] `/src/components/admin/MembershipApplicationManager.tsx`
- [x] `/src/components/resources/ResourceDetailPage.tsx`
- [x] `/src/components/shared/PermissionGate.tsx`
- [x] `/src/components/shared/CommentSection.tsx`
- [x] `/src/components/auth/LoginDialog.tsx`
- [x] `/src/components/messages/ConversationThread.tsx`
- [x] `/src/components/messages/MessageInbox.tsx`
- [x] `/src/components/messages/MessageNotificationBadge.tsx`
- [x] `/src/components/messages/MessageButton.tsx`
- [x] `/src/components/messages/NewMessageDialog.tsx`
- [x] `/src/components/resources/ResourcesPage.tsx`

**수정 대상 Hook (4개)**:
- [x] `/src/hooks/features/useBookmarksV2.ts`
- [x] `/src/hooks/core/useRealtimeQueryV2.ts`
- [x] `/src/hooks/core/useCacheStrategyV2.ts`
- [x] `/src/hooks/features/useAuthV2.ts` (자체 참조)

**변경 사항**:
- Import 경로: `@/hooks/features/useAuthV2` → `@/providers`
- 함수 이름: `useAuthV2` → `useAuth`
- 권한 체크: `isAdmin()` → `isAdmin`
- 뮤테이션 상태: 새로운 통합 상태 사용

### Phase 3: 정리 ✅ 완료
**목표**: 레거시 코드 제거 및 최종 정리

- [x] `/src/hooks/features/useAuthV2.ts` 파일 삭제
- [x] `/src/hooks/features/index.ts`에서 export 제거
- [x] `/src/hooks/index.ts`에서 참조 제거
- [x] `/src/hooks/core/index.ts` 주석 업데이트
- [x] 타입 에러 확인 및 수정
- [x] 빌드 테스트 (성공)
- [ ] E2E 테스트 실행 (권장)

## 주의사항

### 기능 호환성
- **메시지 구독 초기화 로직**: AuthProvider의 기존 로직 유지 필수
- **권한 체크**: 함수 호출에서 boolean 값으로 변경 시 모든 사용처 확인
- **에러 처리**: 기존 에러 핸들링 로직 유지
- **캐시 전략**: React Query 캐시 무효화 로직 통합

### 타입 안정성
- UserV2 타입과 Tables<'users_v2'> 타입 통일
- 권한 체크 반환 타입 통일 (boolean)
- React Query 뮤테이션 타입 정확성 확보

### 성능 고려사항
- 중복 쿼리 방지
- 불필요한 리렌더링 방지
- 메모리 누수 방지

## 진행 상황
- **시작일**: 2025-08-20
- **완료일**: 2025-08-20
- **현재 단계**: 완료 ✅
- **완료율**: 100%

## 통합 결과

### 성공적으로 통합된 기능
1. **비밀번호 관리**: 재설정, 업데이트, 재인증
2. **계정 관리**: 프로필 업데이트, 계정 삭제 (Soft Delete)
3. **권한 시스템**: 기존 useAuthV2의 모든 권한 체크 함수 포함
4. **React Query 통합**: 뮤테이션 상태 관리 및 Optimistic Updates
5. **타입 안정성**: 권한 체크를 boolean 값으로 통일
6. **호환성 유지**: deprecated 메서드들은 경고와 함께 유지

### 마이그레이션 통계
- **수정된 컴포넌트**: 14개
- **수정된 Hook 파일**: 4개  
- **삭제된 파일**: 1개 (`useAuthV2.ts`)
- **빌드 테스트**: 성공 ✅
- **타입 에러**: 없음 ✅

## 테스트 계획
1. **단위 테스트**: 각 단계별 기능 테스트
2. **통합 테스트**: 인증 플로우 전체 테스트
3. **E2E 테스트**: 사용자 시나리오 기반 테스트

## 롤백 계획
각 Phase별 백업 및 롤백 포인트 설정으로 안전한 마이그레이션 보장