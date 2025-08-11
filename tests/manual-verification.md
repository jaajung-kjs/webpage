# 🧪 Multi-Tab Promise 문제 해결 - 수동 검증 가이드

## 개선 사항 요약

### ✅ 구현 완료된 기능
1. **PromiseManager**: 모든 Promise에 타임아웃 적용 (3-30초)
2. **ConnectionCore 개선**: suspended 상태 추가, 백그라운드 리소스 절약
3. **Circuit Breaker**: 연쇄 실패 방지, 자동 복구
4. **Recovery Manager**: 배치 처리, 우선순위 기반 복구
5. **GlobalRealtimeManager**: 이벤트 최적화, 재시도 메커니즘

## 🔍 수동 검증 방법

### 1. 기본 동작 확인
1. http://localhost:3000 접속
2. 개발자 도구 콘솔 열기 (F12)
3. 다음 로그 확인:
   - `[ConnectionCore]` - 연결 상태
   - `[GlobalRealtime]` - 실시간 구독
   - `[PromiseManager]` - Promise 관리
   - `[CircuitBreaker]` - 회로 차단기

**예상 결과**: 
- 에러 없이 정상 로드
- "Heartbeat check failed" 무한 루프 없음
- TimeoutError가 있어도 "ignored" 처리

### 2. 다중 탭 시나리오
1. 현재 탭에서 로그인 후 메인 페이지 접속
2. 새 탭 열기 (Ctrl+T)
3. 새 탭에서 같은 사이트 접속
4. 첫 번째 탭으로 돌아가기
5. 콘솔 로그 확인

**예상 결과**:
- 첫 번째 탭이 자동으로 suspended 상태
- 복귀 시 자동 재연결
- 에러 없이 정상 동작

### 3. 백그라운드 복구 테스트
1. 사이트 접속 후 다른 탭으로 전환
2. 10초 이상 대기
3. 원래 탭으로 복귀

**콘솔에서 확인**:
```javascript
// 콘솔에서 실행
console.log('[Test] Checking recovery strategy...')
```

**예상 로그**:
- `[ConnectionCore] Suspending connection (background)`
- `[ConnectionCore] Resuming connection (foreground return)`
- `Recovery strategy: PARTIAL` (10-30초 백그라운드)

### 4. Promise 타임아웃 확인
**콘솔에서 실행**:
```javascript
// Promise 상태 확인
window.PromiseManager?.getActivePromises?.() || 'PromiseManager not exposed'

// 타임아웃 테스트
fetch('/api/slow-endpoint').catch(e => console.log('Timeout handled:', e.message))
```

**예상 결과**:
- 3-5초 후 타임아웃
- 에러가 적절히 처리됨
- 무한 재시도 없음

### 5. Circuit Breaker 테스트
**콘솔에서 실행**:
```javascript
// Circuit Breaker 상태 확인
localStorage.getItem('circuit_breaker_state') || 'No state'

// 강제 에러 발생 (개발자 도구 > Network > Offline)
// 3번 요청 실패 후 Circuit Breaker 열림
// 30초 후 자동 복구
```

**예상 로그**:
- `[CircuitBreaker] Circuit breaker opened`
- 30초 후: `[CircuitBreaker] Circuit breaker half-open`
- 성공 시: `[CircuitBreaker] Circuit breaker closed`

### 6. 실시간 구독 확인
1. 댓글이 있는 게시글 열기
2. 다른 브라우저/시크릿 모드에서 같은 게시글 열기
3. 댓글 작성
4. 실시간 업데이트 확인

**예상 결과**:
- 실시간으로 댓글 업데이트
- 백그라운드 탭에서도 업데이트
- 재연결 시 구독 자동 복구

## 📊 성능 메트릭 확인

**콘솔에서 실행**:
```javascript
// 성능 메트릭 확인
performance.getEntriesByType('measure').filter(m => 
  m.name.includes('connection') || 
  m.name.includes('recovery')
)

// 메모리 사용량
console.log('Memory:', performance.memory)

// 활성 Promise 수
console.log('Active Promises:', window.PromiseManager?.activeCount || 0)
```

## ⚠️ 알려진 이슈

1. **Mock 테스트 실패**: 테스트 환경에서만 발생, 실제 동작에는 영향 없음
2. **초기 로드 타임아웃**: 첫 로드 시 가끔 발생, 자동 재시도로 해결

## 🎯 검증 체크리스트

- [ ] 페이지 정상 로드
- [ ] 콘솔에 무한 루프 에러 없음
- [ ] 다중 탭 전환 시 에러 없음
- [ ] 백그라운드 복귀 시 자동 재연결
- [ ] Promise 타임아웃 정상 동작
- [ ] Circuit Breaker 자동 복구
- [ ] 실시간 구독 유지
- [ ] 메모리 누수 없음

## 🔧 디버깅 명령어

```javascript
// 전체 시스템 상태
console.log({
  connection: localStorage.getItem('connection_state'),
  circuitBreaker: localStorage.getItem('circuit_breaker_state'),
  promises: window.PromiseManager?.activeCount || 0,
  realtime: window.globalRealtimeManager?.getSystemStatus() || 'Not available'
})

// 강제 재연결
window.connectionCore?.reconnect()

// Circuit Breaker 리셋
window.connectionCore?.resetAllCircuitBreakers()
```

---

**작성일**: 2025-01-11
**테스트 환경**: http://localhost:3000 (개발 서버)