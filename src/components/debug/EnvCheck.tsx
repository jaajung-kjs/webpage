'use client'

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/core/connection-core'

interface EnvCheckData {
  status: string
  environment: Record<string, string>
  database: {
    connectionStatus: string
    error: string | null
    testQuery: string
  }
  deployment: {
    platform: string
    region: string
  }
}

export function EnvCheck() {
  const [envData, setEnvData] = useState<EnvCheckData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 클라이언트 사이드 환경 변수 체크
    console.log('🔍 Client-side Environment Check:')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
    
    // Supabase 클라이언트 초기화 상태 확인
    console.log('Supabase client:', supabaseClient ? '✅ Initialized' : '❌ Not initialized')

    // API 엔드포인트 호출
    fetch('/api/env-test')
      .then(res => res.json())
      .then(data => {
        setEnvData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })

    // 직접 Supabase 연결 테스트
    testSupabaseConnection()
  }, [])

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('count')
        .limit(1)
        .single()
      
      if (error) {
        console.error('❌ Supabase client-side connection error:', error)
      } else {
        console.log('✅ Supabase client-side connection successful')
      }
    } catch (e) {
      console.error('❌ Supabase client-side error:', e)
    }
  }

  if (loading) return <div className="p-4">Loading environment check...</div>
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>
  if (!envData) return <div className="p-4">No data</div>

  return (
    <div className="p-4 space-y-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold">Environment Check</h2>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Environment Variables:</h3>
        {Object.entries(envData.environment).map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className="font-mono">{key}:</span> {value}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Database Connection:</h3>
        <div className="text-sm">Status: {envData.database.connectionStatus}</div>
        <div className="text-sm">Test Query: {envData.database.testQuery}</div>
        {envData.database.error && (
          <div className="text-sm text-red-500">Error: {envData.database.error}</div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Deployment Info:</h3>
        <div className="text-sm">Platform: {envData.deployment.platform}</div>
        <div className="text-sm">Region: {envData.deployment.region}</div>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        Check browser console for more details
      </div>
    </div>
  )
}