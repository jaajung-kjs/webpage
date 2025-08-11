# RPA 게시판 구현 가이드

## 📌 개요
KEPCO AI Community 웹사이트에 Member 이상만 접근 가능한 RPA 게시판을 구현했습니다.

## 🏗️ 구현 내용

### 1. 디렉토리 구조 (간소화)
```
src/
├── app/rpa/
│   ├── page.tsx                    # RPA 목록 페이지 (Member 이상만 접근)
│   ├── layout.tsx                  # RPA 섹션 레이아웃
│   └── programs/                   # 개별 RPA 프로그램들
│       ├── template-simple.tsx    # 페이지 템플릿 (UI 포함)
│       ├── excel-compare/
│       │   └── page.tsx           # Excel 비교 페이지 (UI 포함)
│       ├── pdf-merger/
│       │   └── page.tsx           # PDF 병합 페이지 (UI 포함)
│       └── data-cleaner/
│           └── page.tsx           # 데이터 정제 페이지 (UI 포함)
│
└── components/rpa/
    ├── RPAListPage.tsx            # RPA 목록 메인 페이지
    ├── RPACard.tsx                # RPA 카드 컴포넌트
    └── RPACreateDialog.tsx        # Admin용 RPA 추가 다이얼로그
```

### 2. 권한 체계

| 역할 | 메뉴 표시 | RPA 접근 | RPA 추가 |
|------|-----------|----------|----------|
| Guest | ❌ | ❌ | ❌ |
| Member | ✅ | ✅ | ❌ |
| Leader | ✅ | ✅ | ❌ |
| Vice-Leader | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ |

### 3. 데이터베이스
- 기존 `content_v2` 테이블 활용
- `content_type = 'rpa'`로 RPA 프로그램 구분
- `metadata` JSONB 필드에 RPA 정보 저장:
  ```json
  {
    "icon": "excel",
    "path": "/rpa/programs/excel-compare",
    "inputTypes": ["Excel 파일 2개"],
    "outputTypes": ["차이점 Excel 파일"],
    "isActive": true
  }
  ```

## 🚀 새 RPA 프로그램 추가 방법

### 방법 1: Admin 다이얼로그 사용 (UI)
1. Admin 계정으로 로그인
2. RPA 게시판 → "RPA 추가" 버튼 클릭
3. 정보 입력 후 저장

### 방법 2: 직접 코드 작성

#### Step 1: 페이지 생성 (UI 포함)
```typescript
// src/app/rpa/programs/my-program/page.tsx
// template-simple.tsx 복사 후 수정
// UI 코드도 같은 파일에 작성
```

#### Step 2: DB에 추가
```sql
INSERT INTO content_v2 (
    content_type, title, content, author_id, status, metadata
) VALUES (
    'rpa',
    '프로그램 이름',
    '프로그램 설명',
    'admin-user-id',
    'published',
    '{
        "icon": "bot",
        "path": "/rpa/programs/my-program",
        "inputTypes": ["입력 타입"],
        "outputTypes": ["출력 타입"],
        "isActive": true
    }'::jsonb
);
```

## 📝 템플릿 사용법

### 간단한 통합 템플릿 (template-simple.tsx)
하나의 파일에 페이지와 UI를 모두 포함:

```typescript
'use client'
import { useAuth } from '@/providers'
import MainLayout from '@/components/layout/MainLayout'

export default function MyRPAPage() {
  // 1. Member 권한 체크
  useEffect(() => {
    if (!loading && (!user || !isMember)) {
      router.push('/')
    }
  }, [user, isMember, loading, router])
  
  // 2. UI 로직
  const [file, setFile] = useState(null)
  const handleExecute = async () => { /* ... */ }
  
  // 3. UI 렌더링
  return (
    <MainLayout>
      <div className="container">
        {/* 모든 UI 코드 직접 작성 */}
      </div>
    </MainLayout>
  )
}
```

### 필수 요소
- 뒤로가기 버튼 (`/rpa`로 이동)
- 파일 업로드 처리
- 진행 상태 표시 (Progress)
- 결과 다운로드
- 에러 처리 (Toast)

## 🔗 백엔드 연동

### API 엔드포인트 예시
```typescript
// 파일 업로드 및 처리
const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/rpa/excel-compare', {
  method: 'POST',
  body: formData
})
```

### 백엔드 구현 옵션
1. **Next.js API Routes** (간단한 처리)
2. **Python Flask/FastAPI** (복잡한 RPA)
3. **Supabase Edge Functions** (서버리스)

## ⚠️ 주의사항

1. **권한 체크 필수**
   - 모든 RPA 페이지는 Member 이상만 접근 가능
   - Guest는 메뉴 자체가 보이지 않음

2. **파일 검증**
   - 파일 타입 체크
   - 파일 크기 제한 (기본 10MB)

3. **UI 일관성**
   - 기존 웹사이트 디자인과 통일
   - shadcn/ui 컴포넌트 사용
   - kepco-gradient 클래스 활용

## 🧪 테스트

### Member 권한 테스트
```typescript
// E2E 테스트 계정
Email: jaajung@naver.com
Password: kjs487956!@
```

### 테스트 항목
- [ ] Guest: RPA 메뉴 안보임, 접근 불가
- [ ] Member: RPA 메뉴 보임, 접근 가능, 추가 불가
- [ ] Admin: RPA 메뉴 보임, 접근 가능, 추가 가능

## 📚 관련 파일
- `/src/app/rpa/` - RPA 페이지들
- `/src/components/rpa/` - RPA 컴포넌트들
- `/supabase/migrations/20250111_add_rpa_content_type.sql` - DB 마이그레이션

---

*작성일: 2025년 1월 11일*