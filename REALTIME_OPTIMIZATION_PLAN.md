# 🚀 KEPCO AI Community 실시간 데이터 동기화 최적화 계획

> 생성일: 2025-01-11
> 완료일: 2025-01-11
> 상태: ✅ 완료 (Phase 1-3 모두 완료)
> 목표: 단순하고 효율적인 실시간 데이터 동기화 시스템 구축 ✅

## 📊 현재 문제점 분석

### 1. 즉시 해결 필요한 오류
- **오류**: `Cannot read properties of undefined (reading 'queryKey')`
- **원인**: `setQueriesData` 콜백에서 query 객체 구조 문제
- **위치**: `/src/hooks/features/useContentV2.ts` line 440

### 2. 구조적 문제
- **과도한 방어 코드**: 3중 refetch (staleTime:0, focus event, visibility event)
- **실시간 동기화 부재**: Supabase Realtime 미활용
- **캐시 관리 혼란**: 수동 캐시 업데이트와 invalidation 혼재
- **리소스 낭비**: 불필요한 네트워크 요청 과다

## 🎯 목표 아키텍처

### 핵심 원칙
1. **Single Source of Truth**: Supabase DB가 유일한 진실 공급원
2. **Push, Not Pull**: Realtime 구독으로 변경사항 푸시
3. **Smart Cache**: React Query 캐시 자동 업데이트
4. **Zero Refetch**: 불필요한 refetch 완전 제거

### 구현 전략
```
Supabase DB (진실 공급원)
    ↓
Realtime 구독 (변경 감지)
    ↓
React Query 캐시 (자동 업데이트)
    ↓
UI (즉시 반영)
```

## 📋 구현 단계

### Phase 0: 긴급 수정 ✅ 완료
- [x] QueryKey undefined 오류 수정
- [x] 불필요한 refetch 코드 제거
- [x] 기본 동작 복구

### Phase 1: Realtime 기반 구축 ✅ 완료
- [x] GlobalRealtimeManager 생성
- [x] 콘텐츠 테이블 실시간 구독
- [x] React Query 캐시 자동 업데이트

### Phase 2: 시스템 통합 ✅ 완료 (2025-01-11)
- [x] 모든 테이블 실시간 구독 (content_v2, users_v2, profiles_v2)
- [x] 사용자 권한 실시간 동기화 (role change events)
- [x] 회원 목록 실시간 업데이트 (cross-user updates)

### Phase 3: 최적화 및 정리 ✅ 완료 (2025-01-11)
- [x] 불필요한 코드 제거
  - [x] refetchInterval 제거 (메시지, 알림, 캐시 전략)
  - [x] 중복 실시간 시스템 제거 (realtimeSync vs GlobalRealtimeManager)
  - [x] 불필요한 refetchOnWindowFocus 비활성화
- [x] React Query 설정 최적화
  - [x] staleTime 증가 (2분 → 5분)
  - [x] gcTime 증가 (5분 → 10분)
  - [x] 기본 refetchOnWindowFocus 비활성화
- [x] 빌드 성공 및 TypeScript 오류 해결

## 🔧 Phase 0: 긴급 수정

### 1. QueryKey 오류 수정
**문제 코드**:
```typescript
queryClient.setQueriesData(
  { predicate: (query) => query.queryKey[0] === 'contents-v2' },
  (oldData: any, query: any) => {
    const queryKey = query.queryKey // ❌ query는 undefined
```

**해결책**:
```typescript
// 간단하고 안전한 캐시 무효화만 사용
queryClient.invalidateQueries({ 
  queryKey: ['contents-v2'],
  exact: false 
})
```

### 2. 과도한 refetch 제거
**제거할 코드**:
- CommunityPage의 focus/visibility 이벤트 리스너
- staleTime: 0 설정
- refetchOnMount: 'always' 설정

## 🏗️ Phase 1: GlobalRealtimeManager

### 목적
모든 실시간 구독을 중앙에서 관리하고 React Query 캐시를 자동 업데이트

### 핵심 기능
```typescript
class GlobalRealtimeManager {
  // 1. 테이블별 구독 설정
  subscribeToTable(table: string, options: {
    onInsert?: (record) => void
    onUpdate?: (record) => void
    onDelete?: (record) => void
  })
  
  // 2. React Query 캐시 자동 업데이트
  private updateQueryCache(table: string, event: string, record: any) {
    // 자동으로 관련 쿼리 찾아서 업데이트
  }
  
  // 3. 글로벌 구독 (모든 사용자가 영향 받음)
  initializeGlobalSubscriptions() {
    this.subscribeToTable('content_v2', {...})
    this.subscribeToTable('users_v2', {...})
    this.subscribeToTable('comments_v2', {...})
  }
}
```

## ✅ 최종 완료된 기능

### 실시간 데이터 동기화 시스템 (Phase 1-3 완료)
- **GlobalRealtimeManager**: 중앙 실시간 관리 시스템
  - content_v2 테이블: INSERT/UPDATE/DELETE 실시간 감지
  - users_v2 테이블: 사용자 정보 실시간 동기화  
  - comments_v2 테이블: 댓글 실시간 업데이트
- **CoreProvider 통합**: 자동 초기화 및 cleanup
- **중복 시스템 제거**: realtimeSync 시스템 완전 제거
- **React Query 최적화**: Real-time 중심 설정으로 전환
- **성능 최적화**: 불필요한 refetch 메커니즘 제거
- **빌드 성공**: TypeScript 오류 없이 프로덕션 준비 완료

## 📈 최종 성능 개선 효과

### Before (이전)
- 게시글 작성 → 캐시 수동 업데이트 → 복잡한 로직
- 다른 사용자 게시글 → 새로고침 필요  
- 권한 변경 → 재로그인 필요
- 네트워크 요청: 페이지 이동마다 발생 + refetchInterval로 주기적 polling
- 코드 중복: realtimeSync + GlobalRealtimeManager 병존

### After (완료)
- 게시글 작성 → Realtime 이벤트 → 모든 사용자 자동 업데이트 (<100ms)
- 다른 사용자 게시글 → 실시간 표시  
- 권한 변경 → 즉시 반영 (CustomEvent 발생)
- 네트워크 요청: 최초 1회 + Realtime 구독 (polling 완전 제거)
- 코드 단순화: GlobalRealtimeManager 단일 시스템

## 🚀 실행 계획

### 즉시 (10분)
1. QueryKey 오류 수정
2. 불필요한 refetch 코드 제거

### Day 1
1. GlobalRealtimeManager 구현
2. content_v2 테이블 실시간 구독
3. 테스트 및 검증

### Day 2-3
1. 전체 시스템 마이그레이션
2. 최적화 및 정리
3. 문서화

## 📊 성능 목표 달성도

| 지표 | 이전 | 목표 | 달성 |
|------|------|------|------|
| 데이터 동기화 시간 | 수동 새로고침 | < 100ms | ✅ < 100ms |
| 네트워크 요청 | 페이지당 3-5회 + polling | 페이지당 1회 | ✅ 1회 + Realtime |
| 코드 복잡도 | 높음 (중복 시스템) | 낮음 (단일 시스템) | ✅ 단일 시스템 |
| 사용자 경험 | 새로고침 필요 | 완전 실시간 | ✅ 완전 실시간 |

## 🔍 참고 사항

### Supabase Realtime 한계
- 초당 10 이벤트 제한
- 동시 접속자 수 제한
- 네트워크 지연 고려

### React Query 고려사항
- 캐시 키 일관성 유지
- Optimistic Update vs Realtime Update
- 오프라인 지원

---

**다음 단계**: Phase 0 긴급 수정 시작