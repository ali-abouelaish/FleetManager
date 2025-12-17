'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export function RefreshNotificationsButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/refresh', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to refresh notifications'
        const details = data.details ? `\n\nDetails: ${data.details}` : ''
        throw new Error(errorMessage + details)
      }
      
      alert('Notifications refreshed successfully!')
      router.refresh()
    } catch (error: any) {
      alert('Error refreshing notifications: ' + error.message)
      console.error('Refresh error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleRefresh} disabled={loading}>
      {loading ? 'Refreshing...' : 'Refresh Notifications'}
    </Button>
  )
}

