# Realtime 구독 최적화 계획 및 진행 추적

## 📅 작성일: 2025-08-16

## 🎯 목표
분산된 실시간 구독을 중앙집중화하여 재연결 로직 중복 제거 및 메모리 효율성 향상

## 📊 현재 상황 분석

### 1. 중앙 관리 시스템 (✅ 좋음)
- **GlobalRealtimeManager** (4개 테이블)
  - content_v2
  - users_v2
  - comments_v2
  - activity_participants_v2
  
- **UserMessageSubscriptionManager** (2개 테이블)
  - messages_v2
  - message_read_status_v2

### 2. 개별 Hook 직접 구독 (❌ 문제)
| Hook | 구독 테이블 | 중복 여부 | 조치 계획 |
|------|------------|-----------|-----------|
| useActivitiesV2 | activity_participants_v2 | ✅ 중복 | 제거 |
| useGamificationV2 | users_v2 (특정 사용자) | ✅ 중복 | 제거 |
| useLeaderboardV2 | users_v2 (activity_score 필터) | ✅ 중복 | 제거 |
| useStatisticsV2 | users_v2, content_v2, interactions_v2 | ✅ 부분 중복 | 제거 |
| useActivityLogsV2 | audit_logs_v2 | ❌ 독립 | 중앙 관리 추가 |
| useMembershipV2 | membership_applications_v2 | ❌ 독립 | **유지** (필요시에만) |
| useNotificationsV2 | notifications_v2 | ❌ 독립 (미사용) | 제거 |

## 🚀 최적화 전략: 선택적 중앙집중화

### 최종 구조
**GlobalRealtimeManager 관리 (상시 구독)**
- content_v2 ✅
- users_v2 ✅
- comments_v2 ✅
- activity_participants_v2 ✅
- audit_logs_v2 (추가 예정)
- interactions_v2 (추가 예정)

**UserMessageSubscriptionManager 관리**
- messages_v2 ✅
- message_read_status_v2 ✅

**개별 Hook 직접 관리 (필요시에만)**
- useMembershipV2: membership_applications_v2 (회원가입 관리 시에만)

## 📝 작업 계획

### Phase 1: 중복 구독 제거
- [x] useActivitiesV2의 activity_participants_v2 구독 제거 ✅
- [x] useGamificationV2의 users_v2 구독 제거 ✅
- [x] useLeaderboardV2의 users_v2 구독 제거 ✅
- [x] useStatisticsV2의 users_v2, content_v2 구독 제거 ✅

### Phase 2: 신규 테이블 중앙 관리 추가
- [x] audit_logs_v2를 GlobalRealtimeManager에 추가 ✅
- [x] interactions_v2를 GlobalRealtimeManager에 추가 ✅
- [x] useActivityLogsV2의 audit_logs_v2 직접 구독 제거 ✅
- [x] useStatisticsV2의 interactions_v2 직접 구독 제거 ✅

### Phase 3: Hook 리팩토링
- [x] 각 Hook에서 직접 채널 생성 코드 제거 완료 ✅
- [x] 중복 구독 코드를 주석으로 대체 ✅
- [x] 필터링 로직은 GlobalRealtimeManager에서 처리 중 ✅

### Phase 4: 테스트 및 검증
- [ ] 네트워크 재연결 시 모든 구독 복구 확인
- [ ] 백그라운드 복귀 시 구독 상태 확인
- [ ] 메모리 사용량 개선 확인
- [ ] 중복 이벤트 발생 여부 확인

## 📊 진행 상황

### 2025-08-16
- [x] 현황 분석 완료
- [x] 최적화 계획 수립
- [x] Phase 1: 중복 구독 제거 완료
  - useActivitiesV2: activity_participants_v2 구독 제거
  - useGamificationV2: users_v2 구독 제거
  - useLeaderboardV2: users_v2 구독 제거
  - useStatisticsV2: users_v2, content_v2 구독 제거
- [x] Phase 2: GlobalRealtimeManager에 테이블 추가 완료 ✅

---

## 🔧 Phase 1 상세 작업

### 1. useActivitiesV2 수정
**현재 코드:**
```typescript
channel = supabase
  .channel('activity_participants_v2')
  .on('postgres_changes', {...}, callback)
  .subscribe()
```

**변경 후:**
```typescript
// GlobalRealtimeManager가 이미 activity_participants_v2 구독 중
// 개별 Hook에서 직접 구독하지 않음 (중복 방지)
```

### 2. useGamificationV2 수정
**현재 코드:**
```typescript
const channel = supabaseClient
  .channel(`gamification:${user.id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'users_v2',
    filter: `id=eq.${user.id}`
  }, callback)
```

**변경 후:**
```typescript
// GlobalRealtimeManager가 users_v2 전체를 구독
// Hook에서는 필터링만 수행
```

### 3. useLeaderboardV2 수정
**현재 코드:**
```typescript
const channel = supabaseClient
  .channel('leaderboard-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'users_v2',
    filter: 'activity_score=neq.null'
  }, callback)
```

**변경 후:**
```typescript
// GlobalRealtimeManager가 users_v2 전체를 구독
// Hook에서는 activity_score 필터링만 수행
```

### 4. useStatisticsV2 수정
**현재 코드:**
```typescript
// 3개 채널 생성: users_v2, content_v2, interactions_v2
```

**변경 후:**
```typescript
// GlobalRealtimeManager가 users_v2, content_v2 구독
// interactions_v2는 Phase 2에서 추가 예정
```

---

**다음 단계**: Phase 1 - useActivitiesV2부터 시작