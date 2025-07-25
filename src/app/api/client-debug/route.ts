import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const result: any = {
      supabaseClient: supabase ? 'Connected' : 'Null',
      timestamp: new Date().toISOString()
    }

    if (supabase) {
      // Test simple query
      const { error: testError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      result.testQuery = testError ? `Error: ${testError.message}` : 'Success'
      
      // Test auth status
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      result.authTest = authError ? `Error: ${authError.message}` : (session ? 'Has session' : 'No session')
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}