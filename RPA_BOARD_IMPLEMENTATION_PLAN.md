# RPA 게시판 구현 계획서

## 📋 목차
1. [개요](#개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [구현 단계](#구현-단계)
4. [기술 스택](#기술-스택)
5. [데이터베이스 설계](#데이터베이스-설계)
6. [보안 및 권한 관리](#보안-및-권한-관리)
7. [예제 RPA 프로그램](#예제-rpa-프로그램)
8. [확장 가능성](#확장-가능성)

---

## 개요

### 프로젝트 목표
기존 .exe 파일로 배포하던 RPA 프로그램들을 웹 기반으로 전환하여 KEPCO AI Community 웹사이트에서 직접 실행할 수 있는 플랫폼 구축

### 핵심 기능
- ✅ Member 등급 이상만 접근 가능한 RPA 게시판
- ✅ 웹 기반 RPA 프로그램 실행 환경
- ✅ 파일 업로드/다운로드 지원
- ✅ 실시간 처리 상태 표시
- ✅ 결과물 다운로드 및 이력 관리

### 사용 시나리오
1. **사용자가 RPA 게시판 접속** → 사용 가능한 RPA 프로그램 목록 확인
2. **원하는 RPA 프로그램 선택** → 프로그램 상세 설명 및 사용법 확인
3. **필요한 파일 업로드** → 예: 엑셀 파일 2개
4. **실행 버튼 클릭** → 서버에서 처리
5. **결과 확인 및 다운로드** → 처리된 파일 또는 결과 리포트

---

## 시스템 아키텍처

### 전체 구조
```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ RPA 목록    │  │ RPA 상세     │  │ 실행 & 결과     │  │
│  │ 페이지      │  │ 페이지       │  │ 페이지          │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Database    │  │ Storage      │  │ Edge Functions   │  │
│  │ (PostgreSQL)│  │ (파일 저장)  │  │ (RPA 실행)      │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    RPA 실행 환경                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Python      │  │ Node.js      │  │ 기타 런타임     │  │
│  │ (pandas,    │  │ (ExcelJS,    │  │                  │  │
│  │  openpyxl)  │  │  csv-parser) │  │                  │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 데이터 흐름
```mermaid
graph LR
    A[사용자] --> B[RPA 게시판]
    B --> C[RPA 프로그램 선택]
    C --> D[파일 업로드]
    D --> E[Supabase Storage]
    E --> F[Edge Function 실행]
    F --> G[RPA 처리]
    G --> H[결과 저장]
    H --> I[사용자에게 전달]
```

---

## 구현 단계

### 🚀 Phase 1: 기초 구조 구축 (1-2주)

#### 1.1 데이터베이스 설계
```sql
-- RPA 프로그램 정의 테이블
CREATE TABLE rpa_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    input_type JSONB, -- 입력 파일 타입 및 개수
    output_type JSONB, -- 출력 타입
    config JSONB, -- 프로그램별 설정
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RPA 실행 이력 테이블
CREATE TABLE rpa_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES rpa_programs(id),
    user_id UUID REFERENCES users_v2(id),
    status VARCHAR(50), -- pending, processing, completed, failed
    input_files JSONB,
    output_files JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- content_v2 테이블에 'rpa' 타입 추가
-- content_type ENUM에 'rpa' 추가
```

#### 1.2 Frontend 페이지 구조
```
src/app/rpa/
├── page.tsx                 # RPA 게시판 목록
├── [id]/
│   └── page.tsx            # RPA 프로그램 상세 및 실행
└── history/
    └── page.tsx            # 실행 이력
```

#### 1.3 권한 체크 미들웨어
```typescript
// 멤버 이상만 접근 가능하도록 설정
const checkMemberAccess = async (user) => {
  const profile = await getUserProfile(user.id)
  if (!['member', 'leader', 'vice-leader', 'admin'].includes(profile.role)) {
    throw new Error('회원 등급 이상만 이용 가능합니다')
  }
}
```

### 🛠 Phase 2: 핵심 기능 구현 (2-3주)

#### 2.1 파일 업로드 시스템
```typescript
// Supabase Storage 활용
const uploadFile = async (file: File, executionId: string) => {
  const { data, error } = await supabase.storage
    .from('rpa-inputs')
    .upload(`${executionId}/${file.name}`, file)
  return data
}
```

#### 2.2 RPA 실행 Edge Function
```typescript
// Supabase Edge Function 예제
export async function handler(req: Request) {
  const { programId, inputFiles } = await req.json()
  
  // 1. 프로그램 정보 조회
  const program = await getProgram(programId)
  
  // 2. 입력 파일 다운로드
  const files = await downloadInputFiles(inputFiles)
  
  // 3. RPA 로직 실행
  const result = await executeRPA(program.type, files)
  
  // 4. 결과 저장
  const outputUrl = await saveResult(result)
  
  return new Response(JSON.stringify({ outputUrl }))
}
```

#### 2.3 실시간 상태 업데이트
```typescript
// 실시간 구독으로 처리 상태 추적
const subscription = supabase
  .channel('rpa-execution')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rpa_executions',
    filter: `id=eq.${executionId}`
  }, (payload) => {
    updateExecutionStatus(payload.new.status)
  })
  .subscribe()
```

### 🎯 Phase 3: RPA 프로그램 구현 (3-4주)

#### 3.1 Excel 비교 프로그램
```python
# Python 기반 Excel 비교 로직
import pandas as pd

def compare_excel_files(file1_path, file2_path):
    df1 = pd.read_excel(file1_path)
    df2 = pd.read_excel(file2_path)
    
    # 차이점 찾기
    diff = pd.concat([df1, df2]).drop_duplicates(keep=False)
    
    # 결과 저장
    diff.to_excel('differences.xlsx', index=False)
    return 'differences.xlsx'
```

#### 3.2 추가 RPA 프로그램 예시
- **PDF 병합기**: 여러 PDF 파일을 하나로 합치기
- **이미지 리사이저**: 대량 이미지 크기 조정
- **CSV 데이터 정제기**: CSV 파일 정리 및 포맷팅
- **텍스트 추출기**: PDF/이미지에서 텍스트 추출
- **데이터 변환기**: Excel ↔ CSV ↔ JSON 변환

### ✅ Phase 4: 테스트 및 최적화 (1-2주)

#### 4.1 테스트 시나리오
- 권한 체크 테스트
- 파일 업로드 제한 테스트 (크기, 형식)
- 동시 실행 테스트
- 에러 처리 테스트

#### 4.2 성능 최적화
- 대용량 파일 처리 최적화
- 큐 시스템 도입 (동시 실행 제한)
- 캐싱 전략 구현

---

## 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query
- **File Upload**: react-dropzone

### Backend
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Serverless Functions**: Supabase Edge Functions
- **Queue System**: Supabase Realtime

### RPA 실행 환경
- **Python Runtime**: pandas, openpyxl, PyPDF2
- **Node.js Runtime**: ExcelJS, pdf-lib, sharp
- **Container**: Docker (격리된 실행 환경)

---

## 데이터베이스 설계

### ER 다이어그램
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   users_v2       │     │  rpa_programs    │     │ rpa_executions   │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ email            │     │ name             │     │ program_id (FK)  │
│ role             │     │ description      │     │ user_id (FK)     │
│ ...              │     │ category         │     │ status           │
└──────────────────┘     │ input_type       │     │ input_files      │
         ↑               │ output_type      │     │ output_files     │
         │               │ config           │     │ started_at       │
         │               │ is_active        │     │ completed_at     │
         │               └──────────────────┘     └──────────────────┘
         │                        ↑                         │
         └────────────────────────┴─────────────────────────┘
```

### 주요 인덱스
```sql
CREATE INDEX idx_rpa_executions_user_id ON rpa_executions(user_id);
CREATE INDEX idx_rpa_executions_status ON rpa_executions(status);
CREATE INDEX idx_rpa_executions_created_at ON rpa_executions(created_at DESC);
```

---

## 보안 및 권한 관리

### 접근 권한
| 역할 | RPA 목록 | RPA 실행 | 실행 이력 | 관리 |
|------|----------|----------|-----------|------|
| Guest | ❌ | ❌ | ❌ | ❌ |
| Member | ✅ | ✅ | 본인 것만 | ❌ |
| Leader | ✅ | ✅ | 전체 | ✅ |
| Admin | ✅ | ✅ | 전체 | ✅ |

### 보안 조치
1. **파일 검증**
   - 허용된 파일 형식만 업로드 (xlsx, xls, csv, pdf 등)
   - 파일 크기 제한 (최대 10MB)
   - 바이러스 스캔 (옵션)

2. **실행 환경 격리**
   - Docker 컨테이너에서 실행
   - 리소스 제한 (CPU, 메모리)
   - 타임아웃 설정 (최대 5분)

3. **데이터 보호**
   - 업로드 파일 암호화 저장
   - 실행 완료 후 임시 파일 삭제
   - 개인정보 마스킹 옵션

---

## 예제 RPA 프로그램

### 1. Excel 차이점 비교기
```typescript
interface ExcelComparer {
  name: "Excel 차이점 비교기"
  description: "두 Excel 파일을 비교하여 차이점을 찾아줍니다"
  inputs: {
    file1: { type: "excel", label: "비교할 첫 번째 파일" }
    file2: { type: "excel", label: "비교할 두 번째 파일" }
  }
  outputs: {
    differences: { type: "excel", label: "차이점 파일" }
    summary: { type: "text", label: "요약 리포트" }
  }
}
```

### 2. 대량 PDF 병합기
```typescript
interface PDFMerger {
  name: "PDF 병합기"
  description: "여러 PDF 파일을 하나로 합칩니다"
  inputs: {
    files: { type: "pdf[]", label: "병합할 PDF 파일들" }
    order: { type: "option", label: "정렬 순서" }
  }
  outputs: {
    merged: { type: "pdf", label: "병합된 PDF" }
  }
}
```

### 3. 데이터 정제 도구
```typescript
interface DataCleaner {
  name: "데이터 정제 도구"
  description: "CSV/Excel 데이터를 정제하고 포맷팅합니다"
  inputs: {
    file: { type: "csv|excel", label: "원본 데이터" }
    rules: { type: "config", label: "정제 규칙" }
  }
  outputs: {
    cleaned: { type: "csv|excel", label: "정제된 데이터" }
    report: { type: "text", label: "정제 리포트" }
  }
}
```

---

## 확장 가능성

### 단기 계획 (3-6개월)
1. **RPA 마켓플레이스**
   - 사용자가 직접 RPA 프로그램 등록
   - 평점 및 리뷰 시스템
   - 사용 통계 대시보드

2. **스케줄링 기능**
   - 정기적인 RPA 실행 예약
   - 반복 작업 자동화
   - 이메일 알림

3. **API 제공**
   - REST API로 외부 연동
   - Webhook 지원
   - 배치 처리

### 장기 계획 (6-12개월)
1. **AI 통합**
   - ChatGPT API 연동
   - 자연어로 RPA 작업 요청
   - 지능형 데이터 분석

2. **워크플로우 빌더**
   - 드래그 앤 드롭 RPA 설계
   - 조건부 로직 지원
   - 다단계 프로세스

3. **엔터프라이즈 기능**
   - 부서별 권한 관리
   - 감사 로그
   - SLA 관리

---

## 구현 우선순위

### 🔴 필수 (MVP)
1. RPA 게시판 기본 구조
2. 파일 업로드/다운로드
3. Excel 비교 프로그램 1개
4. 회원 권한 체크

### 🟡 중요
1. 실시간 처리 상태
2. 실행 이력 관리
3. 추가 RPA 프로그램 2-3개
4. 에러 처리 및 알림

### 🟢 선택
1. 스케줄링
2. API 제공
3. 통계 대시보드
4. 고급 설정 옵션

---

## 예상 일정

| 주차 | 작업 내용 | 완료 기준 |
|------|-----------|-----------|
| 1-2주 | DB 설계 및 기본 페이지 | RPA 게시판 접근 가능 |
| 3-4주 | 파일 업로드 및 Edge Function | 파일 업로드 테스트 완료 |
| 5-6주 | Excel 비교 프로그램 구현 | 첫 번째 RPA 실행 성공 |
| 7-8주 | 추가 RPA 프로그램 | 3개 이상 RPA 프로그램 |
| 9주 | 테스트 및 버그 수정 | E2E 테스트 통과 |
| 10주 | 배포 및 모니터링 | 프로덕션 배포 |

---

## 결론

RPA 게시판은 KEPCO AI Community의 핵심 기능으로, 기존 데스크톱 기반 RPA를 웹 기반으로 전환하여 접근성과 사용성을 크게 향상시킬 것입니다. 

단계적 구현을 통해 안정적인 서비스를 제공하고, 향후 AI 통합 및 워크플로우 자동화로 발전시켜 나갈 계획입니다.

### 다음 단계
1. 이 계획서 검토 및 피드백
2. 데이터베이스 마이그레이션 작성
3. 첫 번째 RPA 프로그램 프로토타입 개발
4. UI/UX 디자인 확정

---

*작성일: 2025년 1월*
*작성자: KEPCO AI Community 개발팀*