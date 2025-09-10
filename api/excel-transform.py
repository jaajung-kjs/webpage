"""
Vercel Function for Excel Transformation
휴전계획 보고서 변환 API
"""

from http.server import BaseHTTPRequestHandler
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

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """CORS preflight 요청 처리"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        """Excel 파일 변환 처리"""
        try:
            # 요청 데이터 읽기
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # JSON 파싱
            data = json.loads(post_data)
            
            # Base64로 인코딩된 파일 데이터 디코딩
            file_content = base64.b64decode(data['file'])
            filename = data.get('filename', 'input.xls')
            
            # BytesIO 객체로 변환
            input_buffer = BytesIO(file_content)
            
            # HTML 파싱 및 데이터 변환
            df = parse_html_buffer(input_buffer)
            
            # 데이터 없음 처리
            if df is None or df.empty:
                self.send_error_response(400, "유효한 데이터를 찾을 수 없습니다.")
                return
            
            # 데이터 변환 (필터링 및 정렬)
            transformed_df = transform_data(df)
            
            if transformed_df.empty:
                self.send_error_response(400, "변환된 데이터가 없습니다. 허용된 2차 사업소 데이터가 없을 수 있습니다.")
                return
            
            # 보고서 날짜 (오늘 날짜)
            report_date = datetime.now()
            
            # Excel 파일 생성
            output_buffer = save_to_excel_buffer(transformed_df, report_date)
            
            # 성공 응답
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Base64로 인코딩하여 반환
            excel_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
            
            response_data = {
                'success': True,
                'file': excel_base64,
                'filename': f"일일_휴전계획_보고_{report_date.strftime('%m.%d')}.xlsx",
                'recordCount': len(transformed_df),
                'message': f'{len(transformed_df)}개의 레코드가 성공적으로 변환되었습니다.'
            }
            
            self.wfile.write(json.dumps(response_data).encode())
            
        except json.JSONDecodeError as e:
            self.send_error_response(400, f"잘못된 JSON 형식: {str(e)}")
        except Exception as e:
            print(f"Error: {str(e)}")
            print(traceback.format_exc())
            self.send_error_response(500, f"서버 오류: {str(e)}")
    
    def send_error_response(self, code, message):
        """에러 응답 전송"""
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        error_data = {
            'success': False,
            'error': message
        }
        
        self.wfile.write(json.dumps(error_data).encode())