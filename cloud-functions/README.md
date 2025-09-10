# Google Cloud Functions for RPA

이 디렉토리는 Python RPA 프로그램을 Google Cloud Functions로 실행하기 위한 코드입니다.

## 구조

```
cloud-functions/
├── excel-transform/       # Excel 변환 RPA
│   ├── main.py           # Cloud Function 핸들러
│   ├── excel_transformer.py  # 핵심 변환 로직
│   └── requirements.txt  # Python 패키지
└── deploy.sh             # 배포 스크립트
```

## 설정

### 1. Google Cloud CLI 설치

```bash
# macOS
brew install --cask google-cloud-sdk

# 로그인
gcloud auth login
```

### 2. 프로젝트 생성

```bash
# 새 프로젝트 생성
gcloud projects create kepco-rpa-project

# 프로젝트 설정
gcloud config set project kepco-rpa-project

# Cloud Functions API 활성화
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. 배포

```bash
# 배포 스크립트 실행
cd cloud-functions
./deploy.sh excel-transform kepco-rpa-project
```

## 함수 목록

### excel-transform
- **용도**: HTML 형식 Excel 파일을 정형화된 보고서로 변환
- **URL**: 배포 후 생성됨
- **메서드**: POST
- **입력**: Excel 파일 (FormData 또는 Base64 JSON)
- **출력**: 변환된 Excel 파일

## 새 RPA 추가 방법

1. 새 디렉토리 생성:
```bash
mkdir new-rpa-function
```

2. Python 코드 추가:
```python
# new-rpa-function/main.py
import functions_framework

@functions_framework.http
def new_rpa_function(request):
    # RPA 로직
    return {'success': True}
```

3. requirements.txt 생성:
```txt
functions-framework==3.*
# 필요한 패키지 추가
```

4. 배포:
```bash
./deploy.sh new-rpa-function
```

## 환경변수

Next.js `.env.local`에 추가:

```env
NEXT_PUBLIC_GCF_EXCEL_TRANSFORM_URL=https://asia-northeast3-kepco-rpa-project.cloudfunctions.net/excel-transform
```

## 비용

- **무료 티어**: 월 200만 요청, 400,000 GB-초
- **예상 비용**: 일반적인 사용량은 무료 티어 내에서 처리 가능

## 문제 해결

### 권한 오류
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="allUsers" \
    --role="roles/cloudfunctions.invoker"
```

### 로그 확인
```bash
gcloud functions logs read excel-transform --region=asia-northeast3
```

### 함수 삭제
```bash
gcloud functions delete excel-transform --region=asia-northeast3
```