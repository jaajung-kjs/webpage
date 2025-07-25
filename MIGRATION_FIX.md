# 🔧 마이그레이션 오류 해결 가이드

## 문제: Korean Text Search 오류

```
ERROR: 42704: text search configuration "korean" does not exist
```

## 원인
Supabase에서는 기본적으로 한국어 전문검색 설정이 제공되지 않습니다.

## 해결방법

### 1. 수정된 마이그레이션 파일 사용

기존 `001_initial_schema.sql` 대신 `001_initial_schema_fixed.sql`을 사용하세요.

**주요 변경사항:**
- 한국어 전문검색 → 영어 전문검색으로 변경
- `pg_trgm` 확장을 사용한 trigram 검색 추가
- LIKE 검색을 위한 GIN 인덱스 추가

### 2. 마이그레이션 실행 순서

```sql
-- 1단계: 수정된 스키마 실행
-- 001_initial_schema_fixed.sql의 내용을 SQL Editor에서 실행

-- 2단계: 트리거 및 함수 실행  
-- 002_triggers_and_functions.sql 실행

-- 3단계: 보안 정책 실행
-- 003_row_level_security.sql 실행

-- 4단계: 샘플 데이터 실행 (선택사항)
-- 004_seed_data.sql 실행
```

### 3. 검색 기능 변경사항

API에서 검색 방식이 변경되었습니다:

**이전:**
```typescript
query = query.textSearch('title', filters.search)
```

**변경 후:**
```typescript  
query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
```

### 4. 검색 성능 최적화

trigram 인덱스를 통해 한국어 검색도 효율적으로 처리됩니다:

- `pg_trgm` 확장 활성화
- GIN 인덱스 적용
- ILIKE 패턴 매칭 최적화

## 마이그레이션 재실행 방법

### 기존 데이터가 있는 경우:

1. **테이블 삭제** (주의: 데이터 손실)
```sql
-- 모든 테이블과 타입 삭제
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS activity_participants CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 열거형 타입들 삭제
DROP TYPE IF EXISTS resource_type CASCADE;
DROP TYPE IF EXISTS resource_category CASCADE;
DROP TYPE IF EXISTS community_category CASCADE;
DROP TYPE IF EXISTS announcement_priority CASCADE;
DROP TYPE IF EXISTS announcement_category CASCADE;
DROP TYPE IF EXISTS activity_status CASCADE;
DROP TYPE IF EXISTS activity_category CASCADE;
DROP TYPE IF EXISTS post_subcategory CASCADE;
DROP TYPE IF EXISTS post_category CASCADE;
DROP TYPE IF EXISTS skill_level CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
```

2. **수정된 스키마 재실행**
```sql
-- 001_initial_schema_fixed.sql 실행
```

### 새 프로젝트인 경우:
수정된 마이그레이션 파일을 순서대로 실행하면 됩니다.

## 확인 방법

마이그레이션이 성공적으로 완료되면:

1. **테이블 확인:**
   - Database > Tables에서 모든 테이블이 생성되었는지 확인

2. **인덱스 확인:**
   ```sql
   SELECT indexname, tablename FROM pg_indexes 
   WHERE tablename IN ('cases', 'resources', 'community_posts', 'announcements');
   ```

3. **검색 테스트:**
   ```sql
   SELECT * FROM cases WHERE title ILIKE '%ChatGPT%';
   ```

## 추가 도움

문제가 지속된다면:
1. Supabase Dashboard의 Logs 확인
2. SQL Editor에서 에러 메시지 상세 확인
3. `001_initial_schema_fixed.sql` 파일 사용 확인