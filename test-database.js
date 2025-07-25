// 데이터베이스 API 연동 테스트 실행 스크립트
const { runDatabaseTests } = require('./src/lib/api-test.ts')

async function main() {
  console.log('🚀 KEPCO AI Community - Database API Integration Test')
  console.log('=' .repeat(60))
  
  try {
    const results = await runDatabaseTests()
    
    // 테스트 결과 분석
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      errors: results.filter(r => r.status === 'ERROR').length
    }
    
    console.log('\n🎯 Final Test Summary:')
    console.log('=' .repeat(30))
    console.log(`Total Tests: ${summary.total}`)
    console.log(`✅ Passed: ${summary.passed}`)
    console.log(`❌ Failed: ${summary.failed}`)
    console.log(`⚠️  Errors: ${summary.errors}`)
    console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`)
    
    // 실패한 테스트가 있는 경우 경고
    if (summary.failed > 0 || summary.errors > 0) {
      console.log('\n⚠️  Some tests failed. Please check the details above.')
      process.exit(1)
    } else {
      console.log('\n🎉 All tests passed! Database integration is working correctly.')
      process.exit(0)
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  }
}

main()