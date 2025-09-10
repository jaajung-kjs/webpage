import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

// 허용된 2차 사업소 리스트
const ALLOWED_SECOND_VALUES = ['직할', '강릉', '동해', '원주', '태백']

// 2차 사업소 정렬 순서
const SECOND_ORDER: Record<string, number> = {
  '직할': 1,
  '강릉': 2,
  '동해': 3,
  '원주': 4,
  '태백': 5
}

interface RawData {
  사업소_1차: string
  사업소_2차: string
  변전소: string
  전압: string
  설비명: string
  공사명: string
  공사개요: string
  휴전일시_시작: string
  휴전일시_종료: string
  구분: string
  주관부서: string
  감독자: string
  도급업체명: string
  수속절차: string
  휴전종류: string
}

interface TransformedData {
  구분: string
  순번: number
  휴전일시_시작: string
  휴전일시_종료: string
  '2차': string
  변전소: string
  전압: string
  설비명: string
  공사개요: string
  구분2: string
  주관부서: string
  감독자: string
  안전관리자: string
}

function parseHtmlExcel(buffer: ArrayBuffer): RawData[] {
  try {
    // HTML 형식의 Excel 파일 읽기
    const workbook = XLSX.read(buffer, { type: 'array', codepage: 949 }) // cp949 for Korean
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // 데이터를 JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    
    // 헤더 찾기 (보통 3번째 행부터 시작)
    const dataRows: RawData[] = []
    
    for (let i = 3; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (row && row.length >= 15) {
        dataRows.push({
          사업소_1차: row[0] || '',
          사업소_2차: row[1] || '',
          변전소: row[2] || '',
          전압: row[3] || '',
          설비명: row[4] || '',
          공사명: row[5] || '',
          공사개요: row[6] || '',
          휴전일시_시작: row[7] || '',
          휴전일시_종료: row[8] || '',
          구분: row[9] || '',
          주관부서: row[10] || '',
          감독자: row[11] || '',
          도급업체명: row[12] || '',
          수속절차: row[13] || '',
          휴전종류: row[14] || ''
        })
      }
    }
    
    return dataRows
  } catch (error) {
    console.error('Error parsing HTML Excel:', error)
    throw new Error('Excel 파일 파싱 중 오류가 발생했습니다.')
  }
}

function transformData(data: RawData[]): TransformedData[] {
  const transformed: TransformedData[] = []
  
  for (const row of data) {
    // 2차 사업소 필터링
    if (!ALLOWED_SECOND_VALUES.includes(row.사업소_2차)) {
      continue
    }
    
    // 활선 작업 여부 확인
    const isLiveWork = row.수속절차 === '활선작업'
    
    transformed.push({
      구분: isLiveWork ? '활선' : '휴전',
      순번: 0, // 나중에 재할당
      휴전일시_시작: row.휴전일시_시작,
      휴전일시_종료: row.휴전일시_종료,
      '2차': row.사업소_2차,
      변전소: row.변전소,
      전압: row.전압,
      설비명: row.설비명,
      공사개요: row.공사개요,
      구분2: row.구분,
      주관부서: row.주관부서,
      감독자: row.감독자,
      안전관리자: ''
    })
  }
  
  // 정렬 (휴전 먼저, 그 다음 활선)
  const shutdown = transformed.filter(item => item.구분 === '휴전')
  const live = transformed.filter(item => item.구분 === '활선')
  
  // 각 그룹 내에서 2차 사업소와 시작 시간으로 정렬
  const sortFn = (a: TransformedData, b: TransformedData) => {
    const orderA = SECOND_ORDER[a['2차']] || 999
    const orderB = SECOND_ORDER[b['2차']] || 999
    if (orderA !== orderB) return orderA - orderB
    
    // 시작 시간으로 정렬
    return a.휴전일시_시작.localeCompare(b.휴전일시_시작)
  }
  
  shutdown.sort(sortFn)
  live.sort(sortFn)
  
  // 합치고 순번 재할당
  const finalData = [...shutdown, ...live]
  finalData.forEach((item, index) => {
    item.순번 = index + 1
  })
  
  return finalData
}

async function createExcelReport(data: TransformedData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('휴전계획')
  
  // 오늘 날짜
  const today = new Date()
  const dateStr = `${today.getMonth() + 1}.${today.getDate()}`
  
  // 제목 추가
  worksheet.mergeCells('A1:M1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = `일일 휴전계획 보고(${dateStr})`
  titleCell.font = { size: 14, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  
  // 헤더 스타일
  const headerFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFD3D3D3' }
  }
  
  const border = {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const }
  }
  
  // 헤더 설정 (병합된 셀들)
  worksheet.mergeCells('A4:A5')
  worksheet.getCell('A4').value = '구분'
  
  worksheet.mergeCells('B4:B5')
  worksheet.getCell('B4').value = '순번'
  
  worksheet.mergeCells('C4:F4')
  worksheet.getCell('C4').value = '휴전일시'
  worksheet.getCell('C5').value = '시작'
  worksheet.getCell('D5').value = '종료'
  worksheet.getCell('E5').value = '2차'
  worksheet.getCell('F5').value = '변전소'
  
  worksheet.mergeCells('G4:G5')
  worksheet.getCell('G4').value = '전압'
  
  worksheet.mergeCells('H4:H5')
  worksheet.getCell('H4').value = '설비명'
  
  worksheet.mergeCells('I4:I5')
  worksheet.getCell('I4').value = '공사개요'
  
  worksheet.mergeCells('J4:J5')
  worksheet.getCell('J4').value = '구분'
  
  worksheet.mergeCells('K4:K5')
  worksheet.getCell('K4').value = '주관부서'
  
  worksheet.mergeCells('L4:L5')
  worksheet.getCell('L4').value = '감독자'
  
  worksheet.mergeCells('M4:M5')
  worksheet.getCell('M4').value = '안전관리자'
  
  // 헤더 스타일 적용
  for (let row = 4; row <= 5; row++) {
    for (let col = 1; col <= 13; col++) {
      const cell = worksheet.getCell(row, col)
      cell.font = { bold: true }
      cell.fill = headerFill
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = border
    }
  }
  
  // 데이터 추가
  let currentRow = 6
  for (const item of data) {
    const row = worksheet.getRow(currentRow)
    
    row.getCell(1).value = item.구분
    row.getCell(2).value = currentRow - 5 // 순번 (자동 계산)
    row.getCell(3).value = item.휴전일시_시작
    row.getCell(4).value = item.휴전일시_종료
    row.getCell(5).value = item['2차']
    row.getCell(6).value = item.변전소
    row.getCell(7).value = item.전압
    row.getCell(8).value = item.설비명
    row.getCell(9).value = item.공사개요
    row.getCell(10).value = item.구분2
    row.getCell(11).value = item.주관부서
    row.getCell(12).value = item.감독자
    row.getCell(13).value = item.안전관리자
    
    // 스타일 적용
    for (let col = 1; col <= 13; col++) {
      const cell = row.getCell(col)
      cell.border = border
      
      if (col === 1 || col === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else {
        cell.alignment = { vertical: 'middle', wrapText: true }
      }
      
      // 활선 작업인 경우 노란색 배경
      if (item.구분 === '활선') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF99' }
        }
      }
    }
    
    currentRow++
  }
  
  // 컬럼 너비 조정
  worksheet.getColumn(1).width = 8
  worksheet.getColumn(2).width = 6
  worksheet.getColumn(3).width = 18
  worksheet.getColumn(4).width = 18
  worksheet.getColumn(5).width = 10
  worksheet.getColumn(6).width = 12
  worksheet.getColumn(7).width = 8
  worksheet.getColumn(8).width = 25
  worksheet.getColumn(9).width = 40
  worksheet.getColumn(10).width = 8
  worksheet.getColumn(11).width = 15
  worksheet.getColumn(12).width = 20
  worksheet.getColumn(13).width = 12
  
  // Buffer로 변환
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Base64로 인코딩된 파일 데이터 디코딩
    const fileBuffer = Buffer.from(data.file, 'base64')
    const filename = data.filename || 'input.xls'
    
    console.log(`Processing file: ${filename}`)
    
    // HTML Excel 파일 파싱 (ArrayBuffer로 변환)
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    )
    const rawData = parseHtmlExcel(arrayBuffer)
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json({
        success: false,
        error: '유효한 데이터를 찾을 수 없습니다.'
      }, { status: 400 })
    }
    
    console.log(`Parsed ${rawData.length} records`)
    
    // 데이터 변환 (필터링 및 정렬)
    const transformedData = transformData(rawData)
    
    if (transformedData.length === 0) {
      return NextResponse.json({
        success: false,
        error: '변환된 데이터가 없습니다. 허용된 2차 사업소 데이터가 없을 수 있습니다.'
      }, { status: 400 })
    }
    
    console.log(`Transformed to ${transformedData.length} records`)
    
    // Excel 보고서 생성
    const excelBuffer = await createExcelReport(transformedData)
    
    // Base64로 인코딩하여 반환
    const excelBase64 = excelBuffer.toString('base64')
    
    const today = new Date()
    const dateStr = `${today.getMonth() + 1}.${today.getDate()}`
    
    return NextResponse.json({
      success: true,
      file: excelBase64,
      filename: `일일_휴전계획_보고_${dateStr}.xlsx`,
      recordCount: transformedData.length,
      message: `${transformedData.length}개의 레코드가 성공적으로 변환되었습니다.`
    })
    
  } catch (error) {
    console.error('Excel transform error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}