"""
Vercel Function for Excel Transformation
휴전계획 보고서 변환 API
"""

import json
import base64
from io import BytesIO
import traceback
from datetime import datetime
import sys
import os

# 현재 디렉토리를 Python path에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# excel_transformer 모듈 import
from excel_transformer import parse_html_buffer, transform_data, save_to_excel_buffer

def handler(event, context):
    """Vercel Serverless Function 핸들러"""
    
    # HTTP 메서드 확인
    method = event.get('httpMethod', event.get('method', 'GET'))
    
    # CORS 헤더
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    # OPTIONS 요청 처리 (CORS preflight)
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    # POST 요청만 처리
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': 'Method not allowed. Use POST.'
            })
        }
    
    try:
        # 요청 본문 파싱
        body = event.get('body', '')
        
        # Base64로 인코딩된 body인 경우 디코딩
        if event.get('isBase64Encoded', False):
            body = base64.b64decode(body).decode('utf-8')
        
        # JSON 파싱
        if isinstance(body, str):
            data = json.loads(body)
        else:
            data = body
        
        # Base64로 인코딩된 파일 데이터 디코딩
        file_content = base64.b64decode(data['file'])
        filename = data.get('filename', 'input.xls')
        
        print(f"Processing file: {filename}")
        
        # BytesIO 객체로 변환
        input_buffer = BytesIO(file_content)
        
        # HTML 파싱 및 데이터 변환
        df = parse_html_buffer(input_buffer)
        
        # 데이터 없음 처리
        if df is None or df.empty:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': '유효한 데이터를 찾을 수 없습니다.'
                })
            }
        
        print(f"Parsed {len(df)} records")
        
        # 데이터 변환 (필터링 및 정렬)
        transformed_df = transform_data(df)
        
        if transformed_df.empty:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': '변환된 데이터가 없습니다. 허용된 2차 사업소 데이터가 없을 수 있습니다.'
                })
            }
        
        print(f"Transformed to {len(transformed_df)} records")
        
        # 보고서 날짜 (오늘 날짜)
        report_date = datetime.now()
        
        # Excel 파일 생성
        output_buffer = save_to_excel_buffer(transformed_df, report_date)
        
        # Base64로 인코딩하여 반환
        excel_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'file': excel_base64,
                'filename': f"일일_휴전계획_보고_{report_date.strftime('%m.%d')}.xlsx",
                'recordCount': len(transformed_df),
                'message': f'{len(transformed_df)}개의 레코드가 성공적으로 변환되었습니다.'
            })
        }
        
    except json.JSONDecodeError as e:
        print(f"JSON Error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': f'잘못된 JSON 형식: {str(e)}'
            })
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': f'서버 오류: {str(e)}'
            })
        }