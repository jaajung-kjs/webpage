# 🔧 카테고리 CHECK 제약조건 위반 문제 최종 해결

> 작성일: 2025-01-11  
> 상태: ✅ 해결 완료

## 🐛 발견된 문제

### 문제 증상
- 게시글 작성 시 오류: `new row for relation "content_v2" violates check constraint "valid_category_per_type"`

### 근본 원인
1. **ContentEditorPage에서 category 필드 누락**
   - `newContent` 객체 생성 시 `category: values.category` 누락
   - UPDATE 시에도 category 필드 누락

2. **content_type 매핑 오류**
   - ContentEditorPage props: `'post' | 'case' | 'announcement' | 'resource'`
   - DB content_type: `'community' | 'activity' | 'announcement' | 'case' | 'resource'`
   - 'post' → 'community' 매핑 필요

3. **categories.ts 불일치**
   - `/src/lib/constants/categories.ts`에 workshop 잔재
   - resource 카테고리 other vs other_resource 불일치

## ✅ 해결 내용

### 1. ContentEditorPage 수정
```typescript
// 수정 전
const newContent: TablesInsert<'content_v2'> = {
  content_type: contentType,
  title: values.title.trim(),
  content: values.content.trim(),
  author_id: (user as any).id,
  status: 'published'
}

// 수정 후
const contentTypeMap = {
  post: 'community',
  case: 'case',
  announcement: 'announcement',
  resource: 'resource'
} as const

const newContent: TablesInsert<'content_v2'> = {
  content_type: contentTypeMap[contentType] || contentType,
  category: values.category, // ✅ 카테고리 필드 추가
  title: values.title.trim(),
  content: values.content.trim(),
  author_id: (user as any).id,
  status: 'published'
}
```

### 2. 데이터 마이그레이션
- workshop → regular (2개 활동)
- other_resource → other (resources)

### 3. CHECK 제약조건 동기화
```sql
-- categories.ts 파일과 완벽히 일치
CHECK (
  (content_type = 'community' AND category IN ('tips', 'help', 'discussion', 'question', 'chat'))
  OR (content_type = 'activity' AND category IN ('regular', 'study', 'dinner', 'lecture'))
  OR (content_type = 'announcement' AND category IN ('general', 'important', 'urgent', 'event'))
  OR (content_type = 'case' AND category IN ('productivity', 'creativity', 'development', 'analysis', 'other'))
  OR (content_type = 'resource' AND category IN ('presentation', 'installation', 'tutorial', 'other'))
  OR content_type IS NULL
)
```

## 📋 검증 완료

1. ✅ 빌드 성공
2. ✅ TypeScript 타입 체크 통과
3. ✅ DB CHECK 제약조건과 categories.ts 완전 동기화
4. ✅ 모든 게시판 new/edit 페이지 정상 작동

## 🎯 핵심 변경사항

### 수정된 파일
1. `/src/components/shared/ContentEditorPage.tsx`
   - category 필드 추가
   - content_type 매핑 로직 추가
   - 디버깅 로그 추가

2. `/src/lib/constants/categories.ts`
   - workshop 카테고리 제거
   - resource의 other_resource → other 변경

3. Database
   - CHECK 제약조건 재정의
   - 잘못된 카테고리 데이터 마이그레이션

## 💡 디버깅 팁

게시글 작성 시 문제가 발생하면 콘솔에서 다음 로그 확인:
```javascript
console.log('Creating content with:', {
  content_type: newContent.content_type,
  category: newContent.category,
  contentType_prop: contentType,
  category_value: values.category
})
```

## ✨ 최종 상태

- 모든 게시판에서 글 작성/수정 정상 작동
- 카테고리 시스템 완전 동기화
- CHECK 제약조건 위반 오류 해결