'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Check user approval status
        // Use lowercase email for comparison to avoid case sensitivity issues
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('approval_status, email, role')
          .ilike('email', email) // Case-insensitive comparison
          .single()

        // If user doesn't exist in users table, create it automatically (for existing admin accounts)
        if (userError && userError.code === 'PGRST116') {
          // User not found in users table - create it automatically with approved status
          // This handles existing admin accounts that were created before the approval system
          // Extract name from email if possible (first part before @)
          const nameFromEmail = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

          const { error: createError } = await supabase.from('users').insert({
            email: email,
            password_hash: 'managed_by_supabase_auth',
            role: 'admin', // Default to admin for existing accounts
            approval_status: 'approved', // Auto-approve existing accounts
            full_name: nameFromEmail, // Generate name from email
          })

          if (createError) {
            console.error('Error creating user record:', createError)
            throw new Error('Failed to create user account. Please contact an administrator.')
          }

          // Proceed to dashboard after creating the record
          router.push('/dashboard')
          router.refresh()
          return
        }

        if (userError) {
          console.error('Error fetching user data:', userError)
          throw new Error(`Failed to verify user account: ${userError.message}`)
        }

        if (!userData) {
          throw new Error('User account not found')
        }

        // Check approval status (case-insensitive comparison and handle null)
        const approvalStatus = (userData.approval_status || '').toLowerCase().trim()

        console.log('User approval status:', approvalStatus, 'for email:', email)

        if (approvalStatus === 'pending') {
          await supabase.auth.signOut()
          setError('Your account is pending admin approval. Please wait for an administrator to review your account.')
          return
        }

        if (approvalStatus === 'rejected') {
          await supabase.auth.signOut()
          setError('Your account has been rejected. Please contact an administrator for more information.')
          return
        }

        if (approvalStatus !== 'approved') {
          await supabase.auth.signOut()
          setError(`Your account is not approved (status: ${userData.approval_status || 'null'}). Please contact an administrator.`)
          return
        }

        // User is approved, proceed to dashboard
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-200 via-slate-50 to-white">
      <div className="max-w-md w-full space-y-8 p-10 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent transform scale-110 tracking-tight mb-2">
            CountyCars
          </h1>
          <h2 className="text-2xl font-bold text-slate-800">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your fleet dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-xl bg-rose-50 p-4 border border-rose-100 flex items-start gap-3">
              <div className="text-sm text-rose-600 font-medium">{error}</div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 ease-in-out sm:text-sm bg-slate-50 focus:bg-white"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 ease-in-out sm:text-sm bg-slate-50 focus:bg-white"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 shadow-lg shadow-violet-500/30 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-slate-500">Don't have an account? </span>
            <Link
              href="/signup"
              className="font-bold text-violet-600 hover:text-violet-500 transition-colors"
            >
              Sign up now
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

