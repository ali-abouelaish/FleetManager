'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'
import { useState } from 'react'

export function Topbar() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-16 items-center justify-between border-b-2 border-navy bg-white px-6 shadow-sm">
      <div className="flex items-center">
        <button className="mr-4 lg:hidden">
          <Menu className="h-6 w-6 text-navy" />
        </button>
        <h2 className="text-xl font-semibold text-navy">Fleet Management System</h2>
      </div>
      <div className="flex items-center space-x-4">
        <button
          onClick={handleLogout}
          disabled={loading}
          className="flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-navy transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span>{loading ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </div>
  )
}

