# 🔍 KEPCO AI Community DB 스키마 중복 문제 분석

> 생성일: 2025-01-11  
> 상태: 🔴 Critical - 카테고리 시스템 불일치 및 중복  
> 담당: Database Agent

## 📊 현재 상황 분석

### 1. 핵심 문제
**게시글 카테고리가 제대로 표시되지 않는 이유:**
- `content_v2` 테이블에 `category` 필드 (TEXT) 직접 저장
- `categories_v2` 테이블 별도 존재 (정규화된 카테고리 마스터)
- `content_categories_v2` 연결 테이블 존재하지만 **데이터 없음** (사용 안됨)
- `content_with_metadata_v2` 뷰가 두 시스템을 혼합하여 참조

### 2. 데이터 불일치 현황

#### content_v2 테이블의 category 필드 (실제 사용 중)
```
- community: chat, discussion, help
- activity: lecture, regular, workshop  
- announcement: general, important
- case: creativity
- resource: presentation
```

#### categories_v2 테이블 (정의만 되어있고 연결 안됨)
```
- community: tips(꿀팁공유), help(도움요청), discussion(토론), question(질문), chat(잡담)
- activity: regular(정기모임), study(스터디), dinner(회식), lecture(강연)
- announcement: general(일반), important(중요), urgent(긴급), event(이벤트)
- case: productivity(업무효율), creativity(일상), development(개발), analysis(분석), other(기타)
- resource: presentation(발표자료), installation(설치방법), tutorial(튜토리얼), other_resource(기타)
```

### 3. 중복/혼란 요소

#### 카테고리 시스템 중복
1. **직접 저장 방식** (현재 사용): `content_v2.category` 필드에 slug 직접 저장
2. **정규화 방식** (미사용): `categories_v2` + `content_categories_v2` 연결 테이블
3. **뷰 혼합**: `content_with_metadata_v2`가 두 방식 모두 참조

#### 메타데이터 중복
- `content_v2.metadata` (JSONB) - 범용 메타데이터
- `content_v2.tags` (TEXT[]) - 태그 직접 저장
- `tags_v2` 테이블 - 정규화된 태그 (사용 중)
- `content_tags_v2` - 태그 연결 테이블 (사용 중)

#### 뷰 중복
- `content_with_metadata_v2` - 메타데이터 포함 뷰
- `content_with_interactions_v2` - 상호작용 포함 뷰  
- `trending_content_v2` - 트렌딩 콘텐츠 뷰

## 🔴 문제점 요약

### 1. 카테고리 시스템 혼란
- **Frontend**: `content.category` 필드 직접 참조 (slug 값)
- **Categories_v2 테이블**: 정의는 있지만 연결 안됨
- **Label 불일치**: Frontend는 하드코딩된 라벨, DB는 다른 라벨

### 2. 데이터 정합성 문제
- 같은 카테고리가 다른 값으로 저장 (ex: tips vs 꿀팁공유)
- 연결 테이블이 비어있어 정규화 의미 없음
- 뷰가 잘못된 JOIN으로 빈 배열 반환

### 3. 유지보수 어려움
- 카테고리 추가/수정 시 여러 곳 수정 필요
- Frontend 하드코딩과 DB 불일치
- 중복 시스템으로 인한 혼란

## 💡 개선 방안

### Option 1: 단순화 (권장) ✅
**현재 사용 중인 직접 저장 방식 유지 및 정리**

#### 장점
- 구현 간단, 쿼리 성능 좋음
- 기존 데이터 마이그레이션 최소화
- Frontend 수정 최소화

#### 단점
- 카테고리 변경 시 모든 콘텐츠 UPDATE 필요
- 다국어 지원 어려움

#### 작업 내용
1. `categories_v2`, `content_categories_v2` 테이블 삭제
2. `content_v2.category`를 CHECK 제약조건으로 관리
3. 카테고리 라벨/설정을 Frontend 상수로 통일
4. `content_with_metadata_v2` 뷰 단순화

### Option 2: 정규화 (장기적)
**categories_v2 테이블 활용하여 완전 정규화**

#### 장점
- 카테고리 중앙 관리
- 다국어 지원 용이
- 계층형 카테고리 가능

#### 단점  
- 대규모 마이그레이션 필요
- JOIN 증가로 성능 영향
- Frontend 대규모 수정

#### 작업 내용
1. 모든 content의 category를 categories_v2 연결
2. Frontend를 categories_v2 참조하도록 수정
3. content_v2.category 필드 제거
4. 뷰 재구성

## 🎯 즉시 수정 필요 사항

### 1. 카테고리 라벨 통일
```typescript
// Frontend와 DB slug 매핑 통일
const CATEGORY_CONFIG = {
  community: {
    tips: '꿀팁공유',
    help: '도움요청',
    discussion: '토론',
    question: '질문',
    chat: '잡담'
  },
  // ...
}
```

### 2. 불필요한 테이블/뷰 정리
- 사용하지 않는 연결 테이블 삭제 검토
- 중복 뷰 통합

### 3. 데이터 정합성 확보
- NULL 카테고리 처리
- 잘못된 카테고리 값 수정

## 📝 권장 실행 계획

### Phase 1: 즉시 수정 (1-2일)
1. Frontend 카테고리 라벨 매핑 수정
2. content_v2.category 값 정리 및 통일
3. CHECK 제약조건 추가

### Phase 2: 구조 정리 (3-5일)
1. 미사용 테이블/뷰 삭제
2. content_with_metadata_v2 뷰 단순화
3. Frontend 카테고리 시스템 리팩토링

### Phase 3: 장기 개선 (선택적)
1. 정규화 여부 최종 결정
2. 필요시 마이그레이션 계획 수립
3. 다국어 지원 고려

## ⚠️ 리스크

1. **데이터 손실 위험**: 마이그레이션 시 백업 필수
2. **Frontend 영향**: 카테고리 시스템 변경 시 전체 테스트 필요
3. **성능 영향**: 정규화 시 JOIN 증가로 성능 모니터링 필요

## 📊 영향 범위

### 영향받는 컴포넌트
- ContentCard.tsx - 카테고리 표시
- CommunityDetailPage.tsx - 카테고리 라벨/아이콘
- ContentListLayout.tsx - 카테고리 필터
- useContentV2.ts - 카테고리 쿼리

### 영향받는 테이블/뷰
- content_v2 (category 필드)
- categories_v2 (전체)
- content_categories_v2 (전체)
- content_with_metadata_v2 (뷰 정의)

---

**문서 버전**: 1.0.0  
**작성자**: Database Agent  
**다음 단계**: Option 선택 후 상세 실행 계획 수립