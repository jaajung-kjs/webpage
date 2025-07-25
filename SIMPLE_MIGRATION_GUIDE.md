# 🚀 간단한 마이그레이션 가이드

## ⚠️ 오류 해결 완료!

Supabase에서 발생하는 확장 관련 오류들을 모두 해결했습니다.

## 📋 최종 마이그레이션 파일 사용

복잡한 전문검색 인덱스를 제거하고 기본 인덱스만 사용합니다.

### 🗂️ 실행 순서

#### 1단계: 기본 스키마 생성
```sql
-- 001_initial_schema_final.sql 내용을 SQL Editor에서 실행
```

#### 2단계: 트리거 및 함수 생성
```sql  
-- 002_triggers_and_functions.sql 내용을 SQL Editor에서 실행
```

#### 3단계: 보안 정책 설정
```sql
-- 003_row_level_security.sql 내용을 SQL Editor에서 실행
```

#### 4단계: 샘플 데이터 입력 (선택사항)
```sql
-- 004_seed_data.sql 내용을 SQL Editor에서 실행
```

## ✅ 변경사항

### 제거된 기능:
- ❌ 한국어 전문검색 (`korean` config)
- ❌ trigram 확장 (`pg_trgm`)
- ❌ GIN trigram 인덱스

### 유지되는 기능:
- ✅ 기본 B-tree 인덱스 (빠른 정렬, 필터링)
- ✅ 실시간 좋아요/댓글
- ✅ 모든 테이블과 관계
- ✅ Row Level Security
- ✅ 자동 트리거

## 🔍 검색 방식

현재 API는 ILIKE 패턴 매칭을 사용합니다:

```typescript
// 예시: "ChatGPT" 검색
query = query.or(`title.ilike.%ChatGPT%,content.ilike.%ChatGPT%`)
```

이 방식으로도 한국어 검색이 잘 작동합니다.

## 🎯 확인 방법

마이그레이션 완료 후:

1. **테이블 확인:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
   ```

2. **데이터 삽입 테스트:**
   ```sql
   -- 회원가입 후 프로필이 자동 생성되는지 확인
   ```

3. **검색 테스트:**
   ```sql
   SELECT * FROM cases WHERE title ILIKE '%ChatGPT%';
   ```

## 🚀 다음 단계

1. 마이그레이션 완료
2. Storage 버킷 3개 생성:
   - `avatars` (public)
   - `attachments` (private)
   - `resources` (private)
3. 환경 변수 설정
4. 앱 실행: `npm run dev`

## 💡 성능 최적화 (나중에)

필요하다면 나중에 추가할 수 있는 기능들:

```sql
-- PostgreSQL 기본 전문검색 (영어)
CREATE INDEX idx_cases_fts ON cases USING gin(to_tsvector('english', title || ' ' || content));

-- 단순 텍스트 검색을 위한 추가 인덱스
CREATE INDEX idx_cases_title_lower ON cases(lower(title));
CREATE INDEX idx_cases_content_lower ON cases(lower(content));
```

하지만 현재 ILIKE 검색으로도 충분히 빠르고 정확합니다.

---

## 🎉 결론

**`001_initial_schema_final.sql`** 파일을 사용하면 오류 없이 마이그레이션이 완료됩니다!

모든 핵심 기능은 그대로 유지되며, 복잡한 확장 기능만 제거되었습니다.