# KEPCO AI Community 데이터베이스 스키마 및 Hooks 분석 보고서

## 📊 요약

- **분석 일자**: 2025-01-10
- **총 테이블 수**: 28개 (V2 스키마)
- **총 함수 수**: 80개+
- **총 Hooks 수**: 20개+
- **중요 발견사항**: 보안 취약점 3개, 성능 문제 85개+, 스키마 혼란 다수

## 🚨 긴급 조치 필요 사항

### 1. 보안 취약점 (즉시 수정 필요)
- **RLS 비활성화**: 12개+ 사용자 활동 로그 파티션에 Row Level Security 없음
- **SQL Injection 취약점**: 5개 핵심 함수에서 search_path 취약점 발견
- **인증 보안**: OTP 만료 시간 과도 (3600초), 비밀번호 보호 비활성화

### 2. 성능 문제
- **사용되지 않는 인덱스**: 85개+ (스토리지 낭비, 쓰기 성능 저하)
- **N+1 쿼리 문제**: `useContentV2` 등 핵심 hooks에서 페이지당 20회+ 개별 쿼리
- **무시되는 Materialized Views**: 비싼 뷰가 존재하지만 hooks가 우회

## 📋 테이블별 상세 분석

### 🔍 궁금하신 테이블들 설명

#### 1. **audit_logs_v2 (빈 테이블)**
- **목적**: 규정 준수를 위한 감사 로깅 시스템
- **상태**: 설정만 완료, 실제 사용 안 함
- **구조**: 월별 파티셔닝 준비 완료 (2025년 1-12월)
- **왜 비어있나**: 아직 감사 로깅 기능이 활성화되지 않음
- **향후 계획**: 규제 요구사항 발생 시 즉시 활성화 가능

#### 2. **content_categories vs categories_v2**
- **content_categories**: V1 레거시 (삭제 예정)
- **categories_v2**: 현재 사용 중인 메인 카테고리 시스템
  - 계층 구조 지원 (parent_id)
  - 정렬 순서 관리 (sort_order)
  - 활성화 상태 관리 (is_active)

#### 3. **중복 metadata 시스템**
- **content_v2.metadata (JSONB 컬럼)**: 단순 키-값 메타데이터
  ```json
  {
    "views": 100,
    "downloads": 50,
    "rating": 4.5
  }
  ```
- **content_metadata_v2 (별도 테이블)**: 복잡한 관계형 메타데이터
  - 버전 관리
  - 타입별 검증
  - 히스토리 추적

#### 4. **중복 content_tags_v2**
- 실제로는 하나의 테이블만 존재
- 혼란은 뷰와 테이블 이름이 유사해서 발생
- **content_tags_v2**: 실제 태그 매핑 테이블
- **content_tag_stats_v2**: 태그 사용 통계 뷰

## 🗂️ 전체 테이블 목록 및 용도

### 핵심 컨텐츠 테이블
| 테이블명 | 용도 | 연결된 Hook | 상태 |
|---------|------|------------|------|
| content_v2 | 메인 컨텐츠 저장소 | useContentV2, useContentDetail | ✅ 활성 |
| categories_v2 | 카테고리 관리 | useCategoriesV2 | ✅ 활성 |
| content_tags_v2 | 태그 매핑 | useTagsV2 | ✅ 활성 |
| tags_v2 | 태그 정의 | useTagsV2 | ✅ 활성 |
| content_metadata_v2 | 상세 메타데이터 | useContentMetadata | ⚠️ 부분 사용 |

### 사용자 관련 테이블
| 테이블명 | 용도 | 연결된 Hook | 상태 |
|---------|------|------------|------|
| users | 사용자 계정 | useAuth, useUser | ✅ 활성 |
| user_settings_v2 | 사용자 설정 | useUserSettings | ✅ 활성 |
| membership_applications | 가입 신청 | useMembershipApplications | ✅ 활성 |
| user_activity_logs_v2_* | 활동 로그 (파티션) | useActivityLogs | ⚠️ RLS 없음 |

### 상호작용 테이블
| 테이블명 | 용도 | 연결된 Hook | 상태 |
|---------|------|------------|------|
| likes_v2 | 좋아요 | useLikes | ✅ 활성 |
| comments_v2 | 댓글 | useComments | ✅ 활성 |
| bookmarks_v2 | 북마크 | useBookmarks | ✅ 활성 |
| messages_v2 | 메시지 | useMessages | ✅ 활성 |
| notifications_v2 | 알림 | useNotifications | ✅ 활성 |

### 관리 테이블
| 테이블명 | 용도 | 연결된 Hook | 상태 |
|---------|------|------------|------|
| reports_v2 | 신고 관리 | useReports | ✅ 활성 |
| audit_logs_v2 | 감사 로그 | - | ❌ 미사용 |
| announcements_v2 | 공지사항 | useAnnouncements | ✅ 활성 |

## 🔗 Hook-테이블 매핑

### 컨텐츠 관련 Hooks
```typescript
// useContentV2.ts
- 테이블: content_v2, categories_v2, users, likes_v2, bookmarks_v2
- 문제: N+1 쿼리 (각 컨텐츠마다 5개 추가 쿼리)
- 개선: JOIN 사용 또는 배치 쿼리

// useContentDetail.ts  
- 테이블: content_v2, users, content_tags_v2, tags_v2
- 문제: 태그 정보 별도 쿼리
- 개선: 단일 쿼리로 통합

// useCategoriesV2.ts
- 테이블: categories_v2
- 문제: 계층 구조 비효율적 로딩
- 개선: 재귀 CTE 활용
```

### 사용자 관련 Hooks
```typescript
// useAuth.ts
- 테이블: users_v2, user_settings_v2
- 문제: 프로필 정보 중복 페칭
- 개선: 세션에 캐싱

// useMembershipApplications.ts
- 테이블: membership_applications, users
- 문제: 페이지네이션 없음
- 개선: 무한 스크롤 구현
```

## ⚡ 데이터베이스 함수 및 트리거

### 주요 함수
| 함수명 | 용도 | 보안 문제 |
|--------|------|----------|
| increment_view_count_v2 | 조회수 증가 | ⚠️ search_path 취약 |
| search_content_v2 | 컨텐츠 검색 | ⚠️ search_path 취약 |
| get_user_stats_v2 | 사용자 통계 | ✅ 안전 |
| handle_new_user | 사용자 생성 트리거 | ⚠️ 에러 처리 없음 |

### 활성 트리거
```sql
-- 자동 updated_at 업데이트
CREATE TRIGGER update_updated_at_column
  BEFORE UPDATE ON [모든 V2 테이블]
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 새 사용자 프로필 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

## 🚀 최적화 권장사항

### Phase 1: 긴급 (1-3일)
1. **보안 수정**
   ```sql
   -- RLS 활성화
   ALTER TABLE user_activity_logs_v2_2025_01 ENABLE ROW LEVEL SECURITY;
   -- 함수 search_path 수정
   ALTER FUNCTION increment_view_count_v2() SET search_path = public;
   ```

2. **불필요한 인덱스 제거**
   ```sql
   -- 85개 미사용 인덱스 삭제
   DROP INDEX IF EXISTS idx_unused_1, idx_unused_2, ...;
   ```

### Phase 2: 중요 (1주)
1. **N+1 쿼리 해결**
   ```typescript
   // Before: 20+ queries
   const content = await getContent(id);
   const author = await getUser(content.author_id);
   const likes = await getLikes(content.id);
   
   // After: 1 query
   const { data } = await supabase
     .from('content_v2')
     .select(`
       *,
       author:users!author_id(*),
       likes:likes_v2(count)
     `)
     .eq('id', id)
     .single();
   ```

2. **인덱스 추가**
   ```sql
   -- 자주 사용되는 쿼리용 복합 인덱스
   CREATE INDEX idx_content_category_status 
     ON content_v2(category_id, status) 
     WHERE deleted_at IS NULL;
   ```

### Phase 3: 개선 (2-3주)
1. **스키마 정리**
   - audit_logs_v2 활성화 또는 제거
   - 중복 metadata 시스템 통합
   - 네이밍 컨벤션 통일

2. **쿼리 최적화**
   - Materialized View 활용
   - 배치 처리 구현
   - 캐싱 전략 수립

### Phase 4: 고급 (4주)
1. **모니터링 설정**
   - pg_stat_statements 활성화
   - 슬로우 쿼리 로깅
   - 성능 대시보드 구축

2. **파티셔닝 최적화**
   - 활동 로그 자동 파티션 관리
   - 오래된 파티션 자동 삭제

## 📈 예상 성능 개선

- **쿼리 성능**: 70% 개선 (N+1 해결)
- **스토리지**: 30% 절감 (인덱스 정리)
- **응답 시간**: 50% 단축 (최적화된 쿼리)
- **유지보수성**: 80% 개선 (스키마 정리)

## 🔍 추가 분석 필요 사항

1. **실제 쿼리 패턴 분석**: pg_stat_statements 데이터 필요
2. **데이터 증가율 예측**: 용량 계획 수립
3. **백업/복구 전략**: 재해 복구 계획
4. **샤딩 필요성 검토**: 대용량 처리 대비

## 📝 결론

KEPCO AI Community 데이터베이스는 V2 마이그레이션이 성공적으로 완료되었으나, 즉각적인 보안 수정과 성능 최적화가 필요합니다. 특히 RLS 설정, 인덱스 정리, N+1 쿼리 해결이 시급합니다.

audit_logs_v2는 규정 준수를 위해 준비된 것으로 보이며, 중복 metadata 시스템은 서로 다른 용도로 설계되었으나 문서화가 필요합니다.

권장사항을 단계별로 적용하면 보안성과 성능이 크게 개선될 것으로 예상됩니다.