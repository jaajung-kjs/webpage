# 📧 KEPCO AI Community 메시지 시스템 최적화 계획

## 📋 현황 분석 요약

### 1. 현재 아키텍처
```
CoreProvider → GlobalRealtimeManager → UserMessageSubscriptionManager → useMessagesV2 Hook
```

### 2. 주요 문제점 식별

#### 🔴 Critical Issues
1. **전역 구독 안티패턴**: 모든 메시지를 전역으로 구독하여 불필요한 리소스 소비
2. **900줄의 모놀리식 Hook**: 관심사 분리 부재, 유지보수 어려움
3. **과도한 캐시 무효화**: 작은 변경에도 전체 캐시 무효화
4. **비효율적인 읽음 상태 추적**: 개별 메시지별 읽음 상태 조회

#### 🟡 Performance Issues
1. **DB 인덱스 부재**: 복합 인덱스 미설정으로 쿼리 성능 저하
2. **N+1 쿼리 문제**: 대화방별 개별 쿼리 실행
3. **중복 함수 존재**: legacy 함수들이 여전히 존재
4. **읽지 않은 메시지 카운트 집계 비효율성**: 실시간 집계로 성능 부담

## 🎯 최적화 전략

### Phase 1: 데이터베이스 최적화 (Week 1)

#### 1.1 인덱스 추가
```sql
-- 대화방 조회 최적화
CREATE INDEX CONCURRENTLY idx_conversations_v2_users_active 
ON conversations_v2 (user1_id, user2_id, deleted_at, is_active);

-- 읽지 않은 메시지 카운트 최적화
CREATE INDEX CONCURRENTLY idx_message_read_status_v2_user_unread
ON message_read_status_v2 (user_id, is_read) 
WHERE is_read = false;

-- 메시지 목록 조회 최적화
CREATE INDEX CONCURRENTLY idx_messages_v2_conversation_timeline
ON messages_v2 (conversation_id, created_at DESC, deleted_at);
```

#### 1.2 비정규화 전략
```sql
-- 읽지 않은 메시지 카운트 비정규화
ALTER TABLE conversations_v2 
ADD COLUMN unread_count_user1 INTEGER DEFAULT 0,
ADD COLUMN unread_count_user2 INTEGER DEFAULT 0;

-- 트리거로 자동 업데이트
CREATE OR REPLACE FUNCTION update_unread_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- 구현 로직
END;
$$ LANGUAGE plpgsql;
```

#### 1.3 Legacy 함수 제거
- ❌ `get_message_inbox`
- ❌ `send_message`
- ❌ `mark_conversation_messages_as_read`

### Phase 2: 구독 시스템 재설계 (Week 2)

#### 2.1 선택적 구독 패턴
```typescript
// 새로운 구독 전략
interface SubscriptionStrategy {
  // 내 대화방만 구독
  myConversations: string[]
  
  // 동적 구독 추가/제거
  subscribeToConversation(conversationId: string): void
  unsubscribeFromConversation(conversationId: string): void
  
  // 새 대화방 감지용 전역 리스너 (최소화)
  globalNewConversationListener: boolean
}
```

#### 2.2 채널 최적화
```typescript
class OptimizedMessageSubscriptionManager {
  private conversationChannels: Map<string, RealtimeChannel> = new Map()
  private globalChannel: RealtimeChannel | null = null
  
  // 개별 대화방 구독
  subscribeToConversation(conversationId: string) {
    if (this.conversationChannels.has(conversationId)) return
    
    const channel = supabaseClient()
      .channel(`conversation-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages_v2',
        filter: `conversation_id=eq.${conversationId}`
      }, this.handleMessageChange)
      .subscribe()
    
    this.conversationChannels.set(conversationId, channel)
  }
  
  // 새 대화방 감지용 최소 전역 구독
  initializeMinimalGlobalSubscription(userId: string) {
    this.globalChannel = supabaseClient()
      .channel(`user-new-conversations-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations_v2',
        filter: `or(user1_id.eq.${userId},user2_id.eq.${userId})`
      }, this.handleNewConversation)
      .subscribe()
  }
}
```

### Phase 3: Hook 분리 및 최적화 (Week 3)

#### 3.1 Hook 분리 전략
```typescript
// 기존 900줄 Hook을 기능별로 분리
hooks/messages/
├── useConversations.ts       // 대화방 목록 관리
├── useMessages.ts            // 메시지 CRUD
├── useMessageSubscription.ts // 실시간 구독 관리
├── useUnreadCount.ts         // 읽지 않은 메시지 카운트
├── useReadReceipts.ts        // 읽음 표시 관리
└── useMessageSearch.ts       // 메시지 검색
```

#### 3.2 상태 관리 최적화
```typescript
// Zustand store for message state
interface MessageStore {
  conversations: Map<string, Conversation>
  messages: Map<string, Message[]>
  unreadCounts: Map<string, number>
  
  // Granular updates
  updateConversation(id: string, data: Partial<Conversation>): void
  addMessage(conversationId: string, message: Message): void
  markAsRead(conversationId: string, messageIds: string[]): void
}
```

### Phase 4: 캐싱 전략 개선 (Week 4)

#### 4.1 Granular Cache Invalidation
```typescript
// 세밀한 캐시 무효화
interface CacheStrategy {
  // 특정 대화방만 무효화
  invalidateConversation(conversationId: string): void
  
  // 특정 메시지만 업데이트
  updateMessage(conversationId: string, messageId: string): void
  
  // 읽음 상태만 업데이트
  updateReadStatus(conversationId: string, userId: string): void
}
```

#### 4.2 Optimistic Updates
```typescript
// 낙관적 업데이트로 UX 개선
const sendMessage = useMutation({
  mutationFn: async (params) => {
    // DB 호출
  },
  onMutate: async (params) => {
    // 즉시 UI 업데이트
    const optimisticMessage = {
      id: generateTempId(),
      ...params,
      status: 'sending'
    }
    queryClient.setQueryData(['messages', conversationId], old => 
      [...old, optimisticMessage]
    )
  },
  onError: (error, variables, context) => {
    // 롤백
  }
})
```

## 📊 예상 성능 개선

| 항목 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| 대화방 목록 로딩 | 500ms | 100ms | 80% ↓ |
| 메시지 로딩 | 300ms | 50ms | 83% ↓ |
| 읽지 않은 카운트 | 200ms | 20ms | 90% ↓ |
| 실시간 업데이트 지연 | 100ms | 10ms | 90% ↓ |
| 메모리 사용량 | 50MB | 20MB | 60% ↓ |

## ✅ 작업 체크리스트

### Week 1: Database Optimization
- [ ] 복합 인덱스 추가 (CONCURRENTLY로 무중단)
- [ ] 읽지 않은 카운트 비정규화
- [ ] Legacy 함수 제거 확인 및 삭제
- [ ] DB 함수 성능 테스트

### Week 2: Subscription System
- [ ] 선택적 구독 Manager 구현
- [ ] 대화방별 채널 관리 로직
- [ ] 새 대화방 감지 최소화
- [ ] 메모리 누수 방지 로직

### Week 3: Hook Refactoring
- [ ] 900줄 Hook 분리 작업
- [ ] 각 Hook별 단위 테스트
- [ ] Zustand store 구현
- [ ] 컴포넌트 마이그레이션

### Week 4: Caching & Performance
- [ ] Granular 캐시 전략 구현
- [ ] Optimistic Update 적용
- [ ] 성능 모니터링 설정
- [ ] E2E 테스트

## 🔧 구현 우선순위

### Priority 1 (즉시 시작)
1. **DB 인덱스 추가** - 가장 빠른 성능 개선
2. **선택적 구독 패턴** - 리소스 사용량 대폭 감소

### Priority 2 (1주 내)
1. **Hook 분리** - 유지보수성 개선
2. **읽지 않은 카운트 비정규화** - 쿼리 부하 감소

### Priority 3 (2주 내)
1. **Granular 캐싱** - UX 개선
2. **성능 모니터링** - 지속적 최적화

## 🚀 마이그레이션 전략

### 점진적 마이그레이션
1. **새 시스템 병렬 구현**: 기존 코드 유지하며 새 구조 구현
2. **Feature Flag 사용**: 점진적 롤아웃
3. **A/B 테스트**: 성능 비교 검증
4. **단계적 전환**: 컴포넌트별 순차 적용

### 롤백 계획
- 각 Phase별 독립적 롤백 가능
- DB 변경사항은 backward compatible 유지
- 모든 변경사항 Feature Flag로 제어

## 📈 모니터링 지표

### 성능 지표
- Query 실행 시간
- 캐시 히트율
- 메모리 사용량
- WebSocket 연결 수

### 사용자 경험 지표
- 메시지 전송 지연 시간
- 읽음 표시 업데이트 속도
- 대화방 목록 로딩 시간
- 실시간 알림 지연

## 🎯 최종 목표

1. **성능**: 모든 주요 작업 100ms 이내 완료
2. **확장성**: 10,000+ 동시 사용자 지원
3. **유지보수성**: 명확한 관심사 분리와 테스트 커버리지 80%+
4. **사용자 경험**: 즉각적인 반응성과 안정적인 실시간 업데이트

---

*Last Updated: 2025-01-21*
*Author: KEPCO AI Community Development Team*