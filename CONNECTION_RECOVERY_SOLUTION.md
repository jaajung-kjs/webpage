# 🔧 연결 복구 및 실시간 동기화 문제 해결 솔루션

> 생성일: 2025-01-11
> 상태: ✅ 구현 완료
> 작성자: KEPCO AI Community Dev Team

## 📊 해결된 문제들

### 1. 네트워크 연결 복구 문제 ✅
**증상**: 
- 인터넷 연결이 끊어졌다가 복구될 때 자동 재연결 안됨
- 백그라운드 탭에서 돌아왔을 때 데이터 로딩 안됨
- Realtime 알림이 작동하지 않음

**원인**:
- Document Visibility API 미구현
- Online/Offline 이벤트 핸들러 부재
- 재연결 시 구독 복구 로직 미흡

**해결책**: `ConnectionRecoveryManager` 구현
- Document Visibility API로 탭 전환 감지
- Online/Offline 이벤트로 네트워크 상태 감지
- Focus 이벤트로 윈도우 포커스 감지
- 자동 재연결 및 캐시 갱신

### 2. 게시글 작성 후 작성자 익명 표시 문제 ✅
**증상**:
- 게시글 작성 직후 상세페이지에서 작성자가 "익명"으로 표시
- 새로고침하면 정상적으로 표시됨

**원인**:
- createContent 시 author 정보를 포함하지 않고 반환
- 캐시에 불완전한 데이터 저장

**해결책**: 
- createContent mutation에서 author 정보 포함하여 반환
- 캐시에 완전한 데이터 저장

## 🏗️ 구현된 아키텍처

### ConnectionRecoveryManager
```typescript
// 핵심 기능
- Document Visibility 변경 감지
- Online/Offline 이벤트 처리
- Focus/Blur 이벤트 처리
- PageShow 이벤트 처리 (뒤로가기/앞으로가기)

// 복구 전략
- 30초 이상 백그라운드: 전체 캐시 갱신
- 5-30초 백그라운드: 활성 쿼리만 갱신
- 네트워크 복구: 전체 재연결 및 갱신
- 포커스 복귀: 활성 쿼리 갱신
```

### 개선된 데이터 흐름
```
1. 게시글 작성
   ↓
2. createContent (author 정보 포함 반환)
   ↓
3. 캐시에 완전한 데이터 저장
   ↓
4. 상세페이지 이동
   ↓
5. 캐시에서 즉시 author 정보 표시
```

## 📝 주요 코드 변경사항

### 1. ConnectionRecoveryManager 생성
- **파일**: `/src/lib/core/connection-recovery.ts`
- **기능**: 
  - 모든 브라우저 이벤트 통합 관리
  - 지능적인 복구 전략 구현
  - React Query와 연동

### 2. CoreProvider 업데이트
- **파일**: `/src/providers/CoreProvider.tsx`
- **변경**: 
  - ConnectionRecovery 초기화 추가
  - QueryClient 연결

### 3. useContentV2 개선
- **파일**: `/src/hooks/features/useContentV2.ts`
- **변경**:
  - createContent: author 정보 포함하여 반환
  - 캐시에 완전한 데이터 저장

### 4. RealtimeCore 개선
- **파일**: `/src/lib/core/realtime-core.ts`
- **변경**:
  - handleReconnection 메서드 추가
  - 재연결 시 모든 구독 복구

## 🎯 동작 방식

### 백그라운드 복구 플로우
```
1. 사용자가 다른 탭으로 전환
   ↓
2. visibilitychange 이벤트 발생
   ↓
3. 30초 후 다시 돌아옴
   ↓
4. ConnectionRecovery가 감지
   ↓
5. 전체 캐시 무효화 및 재연결
   ↓
6. 모든 데이터 최신 상태로 갱신
```

### 네트워크 복구 플로우
```
1. 인터넷 연결 끊김
   ↓
2. offline 이벤트 발생
   ↓
3. 연결 복구됨
   ↓
4. online 이벤트 발생
   ↓
5. ConnectionRecovery가 자동 재연결
   ↓
6. Realtime 구독 복구
   ↓
7. 캐시 갱신
```

## 🔍 다른 사이트들의 구현 방식

### Facebook/Meta
- Service Worker로 백그라운드 동기화
- Long Polling + WebSocket 하이브리드
- Exponential Backoff 재연결

### Twitter/X
- EventSource (Server-Sent Events)
- 페이지 포커스 시 증분 업데이트
- 타임스탬프 기반 동기화

### Discord
- WebSocket 유지 관리 전담 시스템
- 하트비트 메커니즘
- 연결 풀 관리

### 우리의 접근법
- React Query의 내장 기능 활용
- Supabase Realtime 활용
- 브라우저 이벤트 기반 복구
- 지능적 캐시 관리

## ✅ 테스트 방법

### 백그라운드 복구 테스트
1. 게시글 목록 페이지 열기
2. 다른 탭으로 전환
3. 30초 이상 대기
4. 다시 돌아오기
5. 자동으로 최신 데이터 로드 확인

### 네트워크 복구 테스트
1. 개발자 도구 > Network > Offline 체크
2. 3-5초 대기
3. Online으로 다시 변경
4. 자동 재연결 및 데이터 갱신 확인

### 게시글 작성 테스트
1. 새 게시글 작성
2. 작성 완료 후 상세페이지 이동
3. 작성자 이름이 즉시 표시되는지 확인

## 🚀 성능 최적화

### 캐시 전략
- **staleTime**: 2분 (자주 갱신)
- **gcTime**: 5분 (메모리 효율)
- **refetchOnWindowFocus**: true
- **refetchOnReconnect**: true

### 복구 지연
- **RECOVERY_DELAY**: 100ms (빠른 전환 시 불필요한 복구 방지)
- **BACKGROUND_THRESHOLD**: 30초 (전체 갱신 기준)

## 📈 개선 효과

| 지표 | 이전 | 이후 | 개선율 |
|------|------|------|--------|
| 백그라운드 복귀 시 데이터 갱신 | 수동 새로고침 필요 | 자동 갱신 | 100% |
| 네트워크 복구 시 재연결 | 페이지 새로고침 필요 | 자동 재연결 | 100% |
| 게시글 작성 후 작성자 표시 | 새로고침 필요 | 즉시 표시 | 100% |
| Realtime 구독 복구 | 수동 재연결 | 자동 복구 | 100% |

## 🔧 추가 개선 가능 사항

### 단기
- [ ] Service Worker 구현으로 오프라인 지원
- [ ] 복구 상태 UI 표시 (토스트 알림)
- [ ] 복구 메트릭 수집

### 장기
- [ ] WebSocket 연결 풀 구현
- [ ] 증분 동기화 구현
- [ ] 백그라운드 동기화 API 활용

## 📚 참고 자료

- [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [MDN: Online and offline events](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
- [React Query: Window Focus Refetching](https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching)
- [Supabase: Realtime](https://supabase.com/docs/guides/realtime)

---

**결론**: 브라우저 이벤트 기반의 지능적인 연결 복구 시스템을 구현하여, 사용자가 수동으로 새로고침할 필요 없이 항상 최신 데이터를 볼 수 있도록 개선했습니다.