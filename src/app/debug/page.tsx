'use client'

export const dynamic = 'force-dynamic'

import { EnvCheck } from '@/components/debug/EnvCheck'

export default function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
      
      <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 mb-6 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-200">
          ⚠️ This page is for debugging purposes only and should not be accessible in production.
        </p>
      </div>

      <EnvCheck />
      
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Troubleshooting Steps:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Check if all environment variables show ✅ Set</li>
          <li>Verify the Supabase project ID matches your expectations</li>
          <li>Check if database connection shows ✅ Connected</li>
          <li>Look for any error messages in the console</li>
          <li>Try re-deploying on Vercel after setting environment variables</li>
        </ol>
      </div>
    </div>
  )
}