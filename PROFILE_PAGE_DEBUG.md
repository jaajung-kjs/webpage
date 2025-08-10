# 프로필 페이지 데이터 로딩 문제 디버깅

## 문제 설명
프로필 페이지에서 다음 항목들이 제대로 로드되지 않음:
- 최근 활동 (Recent Activities)
- 통계 (Statistics) 
- 업적 (Achievements)

## 진행 상황
- [ ] 1. DB 스키마 검증
- [ ] 2. 데이터 존재 여부 확인
- [ ] 3. RPC 함수 검증
- [ ] 4. 프론트엔드 hooks 검증
- [ ] 5. 컴포넌트 렌더링 검증
- [ ] 6. 문제 해결

## 1. DB 스키마 검증

### 관련 테이블 확인
- [x] users_v2 - 27명의 사용자 존재
- [x] content_v2 - 17개 콘텐츠 존재 
- [x] comments_v2 - 테이블 존재
- [x] interactions_v2 - 14개 상호작용 데이터 존재
- [x] activities_v2 - 테이블 존재
- [x] activity_participants_v2 - 12개 참가 데이터 존재
- [ ] achievements_v2 - **테이블 없음**
- [ ] user_achievements_v2 - **테이블 없음**

### 검증 결과
- 업적 관련 테이블이 없음
- 대부분의 사용자 activity_score가 0

## 2. 데이터 존재 여부 확인

### 각 테이블의 실제 데이터 확인
(진행 중...)

## 3. RPC 함수 검증

### 관련 RPC 함수
- [ ] get_user_profile_v2 - **함수 없음**
- [x] get_user_stats_v2 - 존재하지만 모든 값이 0 반환
- [ ] get_user_recent_activities_v2 - **함수 없음**
- [ ] get_user_achievements_v2 - **함수 없음**
- [x] get_user_activity_history_v2 - 존재하지만 활동 참가 이력만 반환

### 검증 결과
- 필요한 RPC 함수 대부분 없음
- get_user_stats_v2는 데이터가 있어도 0 반환

## 4. 프론트엔드 검증

### Hook 검증
- [ ] useProfileV2
- [ ] useAuthV2

### 컴포넌트 검증
- [ ] ProfilePage.tsx
- [ ] ProfileDetailPage.tsx

### 검증 결과
(진행 중...)

## 5. 문제 원인

1. **필수 RPC 함수 누락**
   - `get_user_recent_activities_v2` 함수가 없었음
   - `get_user_statistics_v2` 함수가 잘못된 컬럼명 사용

2. **데이터 매핑 문제**
   - 프론트엔드가 기대하는 키 이름과 백엔드가 반환하는 키 이름 불일치
   - `total_posts` → `total_content_count`
   - `total_comments` → `comments_count`

3. **comments_v2 테이블 구조 차이**
   - `content` 컬럼이 아닌 `comment_text` 사용

4. **업적 시스템 미구현**
   - achievements_v2, user_achievements_v2 테이블 없음

## 6. 해결 방안

### 완료된 수정사항

1. **RPC 함수 생성 및 수정**
   - ✅ `get_user_recent_activities_v2` 함수 생성
   - ✅ `get_user_statistics_v2` 함수 수정 (컬럼명 매핑)

2. **프론트엔드 Hook 수정**
   - ✅ `useUserRecentActivitiesV2` 훅 추가
   - ✅ `useUserProfileComplete` 훅 수정

3. **데이터 구조 정렬**
   - ✅ 통계 데이터 키 이름 통일
   - ✅ 최근 활동 데이터 구조 정의

## 7. 수정 내역

### 2025-01-30 수정 완료

#### 백엔드 (RPC 함수)
1. **get_user_recent_activities_v2** - 새로 생성
   - 게시글, 댓글, 활동 참가 내역 통합 조회
   - 최근 활동 10개 기본 반환

2. **get_user_statistics_v2** - 수정
   - 프론트엔드 키 이름과 일치하도록 수정
   - total_content_count, comments_count 등 사용
   - activities_joined, resources_count 추가

#### 프론트엔드
1. **useProfileV2.ts**
   - useUserRecentActivitiesV2 훅 추가
   - useUserProfileComplete에서 새 훅 사용

### 테스트 결과
- ✅ 통계 데이터 정상 표시
- ✅ 최근 활동 정상 표시
- ⚠️ 업적 시스템은 추후 구현 필요