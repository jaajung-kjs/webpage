"""
Google Cloud Function for Excel Transformation
휴전계획 보고서 변환 Cloud Function
"""

import functions_framework
import base64
import json
from io import BytesIO
from datetime import datetime
import traceback
import sys
import os

# 현재 디렉토리를 Python path에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# excel_transformer 모듈 import
from excel_transformer import parse_html_buffer, transform_data, save_to_excel_buffer

@functions_framework.http
def excel_transform(request):
    """HTTP Cloud Function for Excel transformation"""
    
    # CORS 헤더 설정
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }
    
    # OPTIONS 요청 처리 (CORS preflight)
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    # POST 요청만 처리
    if request.method != 'POST':
        return json.dumps({
            'success': False,
            'error': 'Method not allowed. Use POST.'
        }), 405, headers
    
    try:
        # 파일 처리 - FormData 또는 JSON
        file_content = None
        filename = 'input.xls'
        
        # FormData로 받은 경우
        if 'file' in request.files:
            file = request.files['file']
            filename = file.filename
            file_content = file.read()
            print(f"Received file via FormData: {filename}")
        # JSON으로 받은 경우 (Base64)
        elif request.content_type and 'application/json' in request.content_type:
            data = request.get_json()
            if data and 'file' in data:
                file_content = base64.b64decode(data['file'])
                filename = data.get('filename', 'input.xls')
                print(f"Received file via JSON/Base64: {filename}")
        
        if not file_content:
            return json.dumps({
                'success': False,
                'error': '파일이 제공되지 않았습니다.'
            }), 400, headers
        
        print(f"Processing file: {filename}, size: {len(file_content)} bytes")
        
        # BytesIO 객체로 변환
        input_buffer = BytesIO(file_content)
        
        # HTML 파싱 및 데이터 변환
        df = parse_html_buffer(input_buffer)
        
        # 데이터 없음 처리
        if df is None or df.empty:
            return json.dumps({
                'success': False,
                'error': '유효한 데이터를 찾을 수 없습니다.'
            }), 400, headers
        
        print(f"Parsed {len(df)} records from HTML")
        
        # 데이터 변환 (필터링 및 정렬)
        transformed_df = transform_data(df)
        
        if transformed_df.empty:
            return json.dumps({
                'success': False,
                'error': '변환된 데이터가 없습니다. 허용된 2차 사업소 데이터가 없을 수 있습니다.'
            }), 400, headers
        
        print(f"Transformed to {len(transformed_df)} records")
        
        # 보고서 날짜 (오늘 날짜)
        report_date = datetime.now()
        
        # Excel 파일 생성
        output_buffer = save_to_excel_buffer(transformed_df, report_date)
        
        # 직접 파일 다운로드 응답 또는 Base64 응답 선택
        # 클라이언트가 'response-type' 헤더를 보내면 해당 형식으로 응답
        response_type = request.headers.get('X-Response-Type', 'json')
        
        if response_type == 'binary':
            # 직접 바이너리 파일 응답
            from flask import Response
            response_headers = {
                **headers,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': f'attachment; filename="일일_휴전계획_보고_{report_date.strftime("%m.%d")}.xlsx"'
            }
            return Response(output_buffer.getvalue(), headers=response_headers)
        else:
            # JSON으로 Base64 인코딩된 파일 응답
            excel_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
            
            response_data = {
                'success': True,
                'file': excel_base64,
                'filename': f"일일_휴전계획_보고_{report_date.strftime('%m.%d')}.xlsx",
                'recordCount': len(transformed_df),
                'message': f'{len(transformed_df)}개의 레코드가 성공적으로 변환되었습니다.'
            }
            
            return json.dumps(response_data), 200, headers
        
    except Exception as e:
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        
        return json.dumps({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }), 500, headers