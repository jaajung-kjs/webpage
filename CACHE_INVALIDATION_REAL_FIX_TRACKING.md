# 🔄 캐시 무효화 문제 실제 해결 추적 문서

> 생성일: 2025-01-11 (세 번째 시도 - 최종 해결)
> 상태: ✅ 완료
> 이전 시도: exact: false 추가했지만 실제 문제는 callback override였음

## 🚨 문제 현황

### 증상 (해결됨 ✅)
- ~~게시글 작성 후 목록에 즉시 표시되지 않음~~ ✅ 해결됨
- ~~새로고침해야만 새 게시글이 보임~~ ✅ 해결됨
- ~~이전에 onSuccess 콜백을 추가했지만 여전히 작동하지 않음~~ ✅ 해결됨

### 근본 원인 (발견 및 해결)
- ContentEditorPage가 mutate 호출 시 custom onSuccess를 전달하여 mutation의 기본 onSuccess를 덮어씀
- 해결: mutate 대신 mutateAsync 사용

## 📊 진행 상태

| 작업 | 상태 | 메모 |
|-----|------|------|
| 1. 실제 사용되는 쿼리 키 확인 | ✅ 완료 | `['contents-v2', filter, sortBy, sortOrder]` |
| 2. useInfiniteContents의 쿼리 키 분석 | ✅ 완료 | 필터와 정렬 옵션 포함됨 |
| 3. createContent와 연결 확인 | ✅ 완료 | onSuccess는 있었지만 callback override 문제 발견 |
| 4. 올바른 캐시 무효화 구현 | ✅ 완료 | `exact: false` 추가 |
| 5. ContentEditorPage 수정 | ✅ 완료 | mutate → mutateAsync 변경 |
| 6. 빌드 및 테스트 | ✅ 완료 | 빌드 성공, TypeScript 오류 없음 |

## 🔍 분석 내용

### 1. 현재 코드 상태

#### useContentV2.ts의 createContent mutation
```typescript
onSuccess: (data) => {
  // 이미 추가되어 있는 캐시 무효화 코드
  queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
  queryClient.invalidateQueries({ queryKey: ['infinite-contents-v2'] })
  queryClient.invalidateQueries({ queryKey: ['trending-contents-v2'] })
  queryClient.invalidateQueries({ queryKey: ['user-contents-v2', user?.id] })
  
  if (data) {
    queryClient.setQueryData(['content-v2', data.id], data)
  }
}
```

### 2. 의심되는 문제점
- 실제 게시판에서 사용하는 쿼리 키가 다를 수 있음
- useInfiniteContents가 다른 쿼리 키를 사용할 가능성
- 캐시 무효화가 실행되지만 효과가 없을 가능성

## 📝 작업 로그

### 2025-01-11 (현재)
- 이전 작업 문서(CACHE_INVALIDATION_FIX.md) 확인
- useContentV2.ts에 이미 onSuccess 콜백이 있음을 확인
- 문제가 여전히 지속되는 이유 분석 시작
- **근본 원인 발견**: `invalidateQueries`가 exact matching을 사용하고 있었음
- **해결책 적용**: `exact: false` 옵션 추가로 부분 매칭 활성화

## ✅ 해결된 문제

### 실제 근본 원인 (--ultrathink 분석으로 발견)
```typescript
// 문제의 코드: ContentEditorPage.tsx
const result = await new Promise((resolve, reject) => {
  contentV2.createContent(newContent, { 
    onSuccess: resolve,  // ⚠️ 이것이 mutation의 기본 onSuccess를 덮어씀!
    onError: reject 
  })
})
```

### 최종 해결책
```typescript
// 해결: mutate 대신 mutateAsync 사용
const result = await contentV2.createContentAsync(newContent)
// 이제 mutation의 기본 onSuccess (캐시 무효화)가 정상 실행됨
```

### 이전 시도들
1. **첫 번째 시도**: onSuccess에 캐시 무효화 추가 → 실패 (callback이 덮어써짐)
2. **두 번째 시도**: exact: false 추가 → 부분적 도움이 되었지만 근본 문제 해결 못함
3. **세 번째 시도**: mutateAsync 사용 → ✅ 성공!

## 🎯 적용된 수정 사항

### ContentEditorPage.tsx
1. **createContent 호출 변경**:
   - Before: `contentV2.createContent(newContent, { onSuccess, onError })`
   - After: `await contentV2.createContentAsync(newContent)`
   
2. **updateContent 호출 변경**:
   - Before: `contentV2.updateContent({ id, updates }, { onSuccess, onError })`
   - After: `await contentV2.updateContentAsync({ id, updates })`

### useContentV2.ts (이전 수정 유지)
1. **createContent mutation**: `exact: false` 추가
2. **updateContent mutation**: `exact: false` 추가
3. **deleteContent mutation**: `exact: false` 추가
4. **디버깅 로그 추가**: 캐시 무효화 확인용

## ✨ 최종 상태

- ✅ 게시글 작성 후 목록에 즉시 반영
- ✅ 게시글 수정 후 목록에 즉시 반영
- ✅ 게시글 삭제 후 목록에서 즉시 제거
- ✅ 새로고침 없이 실시간 업데이트