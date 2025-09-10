#!/bin/bash

# Google Cloud Functions 배포 스크립트
# 사용법: ./deploy.sh [function-name] [project-id]

set -e

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 기본 설정
PROJECT_ID="${2:-kepco-rpa-project}"
REGION="asia-northeast3"  # Seoul
RUNTIME="python312"
MEMORY="512MB"
TIMEOUT="540s"

# 함수 이름
FUNCTION_NAME="${1:-excel-transform}"

echo -e "${YELLOW}Google Cloud Functions 배포 시작${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Function: $FUNCTION_NAME"
echo ""

# 프로젝트 설정
echo -e "${GREEN}1. Google Cloud 프로젝트 설정...${NC}"
gcloud config set project $PROJECT_ID

# 함수 디렉토리 확인
if [ ! -d "$FUNCTION_NAME" ]; then
    echo -e "${RED}Error: $FUNCTION_NAME 디렉토리를 찾을 수 없습니다.${NC}"
    exit 1
fi

cd $FUNCTION_NAME

# 함수 배포
echo -e "${GREEN}2. Cloud Function 배포 중...${NC}"
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=$RUNTIME \
    --region=$REGION \
    --source=. \
    --entry-point=${FUNCTION_NAME//-/_} \
    --trigger-http \
    --allow-unauthenticated \
    --memory=$MEMORY \
    --timeout=$TIMEOUT \
    --set-env-vars="PROJECT_ID=$PROJECT_ID"

# 배포 확인
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 배포 성공!${NC}"
    
    # Function URL 가져오기
    FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME \
        --region=$REGION \
        --format='get(serviceConfig.uri)')
    
    echo ""
    echo -e "${GREEN}Function URL:${NC}"
    echo "$FUNCTION_URL"
    echo ""
    echo -e "${YELLOW}Next.js .env.local에 추가하세요:${NC}"
    echo "NEXT_PUBLIC_GCF_EXCEL_TRANSFORM_URL=$FUNCTION_URL"
else
    echo -e "${RED}❌ 배포 실패${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}배포 완료!${NC}"