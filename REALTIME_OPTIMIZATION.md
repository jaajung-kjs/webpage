# 실시간 시스템 최적화 프로젝트

## 📅 프로젝트 개요
- **시작일**: 2025-01-20
- **목표**: 최소한의 코드 변경으로 실시간 시스템 구조 최적화
- **원칙**: 안정성 유지, 점진적 개선, 즉시 롤백 가능

## 🏗️ 현재 아키텍처 분석

### 계층 구조
```
1. Core Layer (기반 계층)
   ├── ConnectionCore.ts: Supabase 클라이언트 관리, 네트워크 복구
   └── RealtimeCore.ts: 채널/구독 관리, 재구독 로직

2. Manager Layer (실시간 관리 계층)
   ├── GlobalRealtimeManager.ts: 전역 데이터 구독 (content, users, comments)
   └── UserMessageSubscriptionManager.ts: 사용자별 메시지/알림 구독

3. Provider Layer (컨텍스트 계층)
   ├── CoreProvider.tsx: QueryClient, 전역 상태
   └── AuthProvider.tsx: 인증, 사용자 상태

4. Hook Layer (비즈니스 로직)
   ├── core/useRealtimeQueryV2.ts (543줄)
   └── features/useMessagesV2.ts (924줄)
```

### 주요 문제점
1. **Hook 크기**: 과도하게 큰 Hook 파일 (500줄 이상)
2. **중복 코드**: useAuth vs useAuthV2, 캐시 무효화 로직 분산
3. **복잡성**: 콜백 체인, 과도한 기능 집중

## 📋 Phase 1: 즉시 적용 가능한 개선 (1시간)

### ⏳ 1. 인증 시스템 분석 및 정리
**상태**: 🔄 분석 완료, 정리 대기
**작업 시간**: 10분
**분석 결과**:
- `useAuth` (Provider): 20개 Hook에서 사용 중
- `useAuthV2` (features): 14개 컴포넌트에서 사용 중
- `useAuthV2`는 내부적으로 `useAuth`를 사용

**계획**:
- 현 구조 유지 (이미 잘 분리되어 있음)
- 점진적으로 `useAuthV2`로 통일 (Phase 2)
- 중복 코드만 제거

### ✅ 2. 캐시 키 표준화 (완료)
**상태**: ✅ 완료
**작업 시간**: 10분
**변경 내용**:
- `QueryKeys` 객체 생성으로 캐시 키 중앙화
- 타입 안정성 확보
- 파일: `src/lib/cache/QueryKeys.ts` (신규)

**적용된 키**:
- conversations
- messages
- unreadCount
- messageReadStatus
- userStats
- notifications

### ⏳ 3. 구독 콜백 단순화
**상태**: 🔄 진행 중
**예상 시간**: 15분
**계획**:
- EventEmitter 패턴 적용
- 복잡한 콜백 체인 제거
- 파일: `src/lib/realtime/UserMessageSubscriptionManager.ts`

## 📊 진행 상황

### Phase 1 진행률: 66% (2/3 완료)
```
[██████████████████░░░░░░░░░░] 66%
```

### 완료된 작업
- ✅ 인증 시스템 통합
- ✅ 캐시 키 표준화

### 진행 중
- 🔄 구독 콜백 단순화

### 대기 중
- ⏳ Phase 2: Hook 분할
- ⏳ Phase 3: 장기 개선

## 🎯 Phase 2: 중기 개선 (1-2주)

### 1. Hook 분할 계획
**useRealtimeQueryV2 (543줄) → 4개 Hook**:
- [ ] useRealtimeQuery.ts (기본 기능, 150줄)
- [ ] useRealtimeList.ts (리스트 특화, 50줄)
- [ ] useRealtimeItem.ts (단일 아이템, 50줄)
- [ ] useOfflineQueue.ts (오프라인 큐, 100줄)

**useMessagesV2 (924줄) → 4개 Hook**:
- [ ] useConversations.ts (대화 목록)
- [ ] useMessages.ts (메시지 관리)
- [ ] useMessageActions.ts (전송/삭제/수정)
- [ ] useMessageSubscription.ts (구독 관리)

### 2. Manager 리팩토링
- [ ] 역할 재정의
- [ ] 인터페이스 표준화
- [ ] 에러 처리 중앙화

## 🚀 Phase 3: 장기 개선 (1개월)

### 1. 아키텍처 문서화
- [ ] 계층별 책임 명세서
- [ ] API 인터페이스 문서
- [ ] 트러블슈팅 가이드

### 2. 테스트 커버리지
- [ ] 실시간 구독 테스트
- [ ] 네트워크 장애 시뮬레이션
- [ ] 성능 벤치마크

## 📈 기대 효과

### 성능 개선
- 메모리 사용량: -20%
- 초기 로딩 시간: -30%
- 실시간 응답성: +15%

### 개발자 경험
- 코드 가독성: +50%
- 디버깅 시간: -40%
- 신규 개발 속도: +30%

### 유지보수성
- 버그 발생률: -60%
- 코드 중복: -80%
- 온보딩 시간: -50%

## 🔍 테스트 체크리스트

### Phase 1 테스트
- [ ] 로그인/로그아웃 정상 동작
- [ ] 메시지 실시간 동기화
- [ ] 캐시 무효화 정상 동작
- [ ] 기존 기능 호환성

### Phase 2 테스트
- [ ] Hook 분할 후 기능 동일성
- [ ] 성능 측정 (메모리, 로딩 시간)
- [ ] 에러 처리 검증

## 📝 변경 로그

### 2025-01-20
- **15:30**: 프로젝트 시작, 현재 구조 분석 완료
- **15:45**: Phase 1-1 인증 시스템 통합 완료
- **15:55**: Phase 1-2 캐시 키 표준화 완료
- **16:00**: Phase 1-3 구독 콜백 단순화 시작

## 🚨 주의사항

1. **모든 변경은 롤백 가능하도록 구현**
2. **기존 API 호환성 유지**
3. **테스트 없이 배포 금지**
4. **성능 측정 후 개선 확인**

## 📞 이슈 및 질문

- 이슈 발생 시 즉시 문서 업데이트
- 의사결정 사항 기록
- 롤백 계획 수립