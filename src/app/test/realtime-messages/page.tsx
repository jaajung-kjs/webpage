/**
 * Realtime Messages Test Page
 * 
 * Tests RealtimeCore integration with message hooks
 * Verifies that messages update immediately after background recovery
 */

'use client'

import { useEffect, useState } from 'react'
import { useMessagesV2 } from '@/hooks/features/useMessagesV2'
import { useMessageNotifications } from '@/hooks/features/useMessageNotifications'
import { useAuthV2 } from '@/hooks/features/useAuthV2'
import { realtimeCore } from '@/lib/core/realtime-core'
import { connectionCore } from '@/lib/core/connection-core'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RealtimeMessagesTest() {
  const { user } = useAuthV2()
  const { useConversationsV2, useUnreadCountV2 } = useMessagesV2
  const { data: conversations, isLoading: conversationsLoading } = useConversationsV2()
  const { data: unreadCount } = useUnreadCountV2()
  const { permission, requestPermission, settings, updateSettings } = useMessageNotifications()
  
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<any>({})
  const [lastUpdate, setLastUpdate] = useState<string>('')

  // Monitor RealtimeCore subscriptions
  useEffect(() => {
    const unsubscribe = realtimeCore.onStatusChange((subs) => {
      setSubscriptions(subs)
      setLastUpdate(new Date().toLocaleTimeString())
    })

    return unsubscribe
  }, [])

  // Monitor connection status
  useEffect(() => {
    const unsubscribe = connectionCore.subscribe((status) => {
      setConnectionStatus(status)
    })

    return unsubscribe
  }, [])

  const handleSimulateRecovery = () => {
    // Simulate background recovery by triggering reconnection
    console.log('Simulating background recovery...')
    // This would normally happen when the tab comes back to foreground
    realtimeCore.handleReconnection()
  }

  const handleDebug = () => {
    console.log('=== RealtimeCore Debug ===')
    realtimeCore.debug()
    console.log('=== ConnectionCore Status ===')
    console.log(connectionCore.getStatus())
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Realtime Messages Test</h1>
      
      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>State: <span className={`font-semibold ${connectionStatus.state === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
              {connectionStatus.state}
            </span></p>
            <p>Is Visible: {connectionStatus.isVisible ? '✅' : '❌'}</p>
            <p>Is Online: {connectionStatus.isOnline ? '✅' : '❌'}</p>
            <p>Last Update: {lastUpdate}</p>
          </div>
        </CardContent>
      </Card>

      {/* RealtimeCore Subscriptions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Active Subscriptions ({subscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="p-2 bg-gray-50 rounded">
                <p className="font-mono text-sm">{sub.id}</p>
                <p className="text-xs text-gray-600">
                  Status: {sub.isSubscribed ? '🟢 Subscribed' : '🔴 Not Subscribed'}
                  {sub.subscribedAt && ` (${new Date(sub.subscribedAt).toLocaleTimeString()})`}
                </p>
                {sub.error && <p className="text-xs text-red-600">Error: {sub.error.message}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Message Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p>Permission: <span className="font-semibold">{permission}</span></p>
              {permission !== 'granted' && (
                <Button onClick={requestPermission} className="mt-2">
                  Request Permission
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.browser}
                  onChange={(e) => updateSettings({ browser: e.target.checked })}
                />
                Browser Notifications
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.toast}
                  onChange={(e) => updateSettings({ toast: e.target.checked })}
                />
                Toast Notifications
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.sound}
                  onChange={(e) => updateSettings({ sound: e.target.checked })}
                />
                Sound Notifications
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Messages Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>User: {user?.email || 'Not logged in'}</p>
            <p>Unread Count: <span className="font-bold text-red-600">{unreadCount || 0}</span></p>
            <p>Conversations: {conversationsLoading ? 'Loading...' : conversations?.length || 0}</p>
            {conversations && conversations.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Recent Conversations:</h4>
                {conversations.slice(0, 3).map((conv) => (
                  <div key={conv.id} className="p-2 bg-gray-50 rounded mb-2">
                    <p className="font-medium">{conv.participant.name}</p>
                    <p className="text-sm text-gray-600">
                      {conv.last_message?.content || 'No messages'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                        {conv.unread_count} unread
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={handleSimulateRecovery} variant="outline">
              Simulate Recovery
            </Button>
            <Button onClick={handleDebug} variant="outline">
              Debug Info
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Open this page in two browser windows</li>
          <li>Log in with different test accounts</li>
          <li>Send a message from one account to another</li>
          <li>Put the receiving tab in the background for 30+ seconds</li>
          <li>Bring it back to foreground</li>
          <li>Messages should update immediately without page reload</li>
          <li>Check console for RealtimeCore reconnection logs</li>
        </ol>
      </div>
    </div>
  )
}