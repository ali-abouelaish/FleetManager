'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

type UserProfile = {
  id: number
  full_name: string | null
  email: string
  avatar_url: string | null
}

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [initialEmail, setInitialEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const previewUrl = useMemo(() => {
    if (!avatarFile) return null
    return URL.createObjectURL(avatarFile)
  }, [avatarFile])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('Not authenticated')
        }

        const { data, error: userError } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url')
          .eq('email', user.email)
          .maybeSingle()

        if (userError) throw userError
        if (!data) throw new Error('User record not found')

        const profile = data as UserProfile
        setUserId(profile.id)
        setFullName(profile.full_name ?? '')
        setEmail(profile.email || user.email || '')
        setInitialEmail(profile.email || user.email || '')
        setAvatarUrl(profile.avatar_url ?? null)
      } catch (err: any) {
        setError(err.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!userId) {
      setError('User record not loaded')
      return
    }

    if (!fullName.trim()) {
      setError('Name is required')
      return
    }

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    setSaving(true)

    try {
      let nextAvatarUrl = avatarUrl

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() || 'jpg'
        const path = `user-avatars/${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('DRIVER_DOCUMENTS')
          .upload(path, avatarFile, { cacheControl: '3600', upsert: true })

        if (uploadError) {
          if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
            throw new Error('Storage bucket "DRIVER_DOCUMENTS" not found.')
          }
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('DRIVER_DOCUMENTS')
          .getPublicUrl(path)
        nextAvatarUrl = publicUrl
      }

      if (email.trim() !== initialEmail.trim()) {
        const { error: authError } = await supabase.auth.updateUser({ email: email.trim() })
        if (authError) throw authError
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          email: email.trim(),
          avatar_url: nextAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) throw updateError

      setAvatarUrl(nextAvatarUrl ?? null)
      setAvatarFile(null)
      setInitialEmail(email.trim())
      setSuccess('Profile updated successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const currentAvatar = previewUrl || avatarUrl

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-600">
            Update your name, email, and profile photo.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
          {loading ? (
            <div className="text-sm text-slate-500">Loading profile…</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-8">
              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 border border-rose-100">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-100">
                  {success}
                </div>
              )}

              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    'No photo'
                  )}
                </div>
                <div className="space-y-2 w-full max-w-sm text-center">
                  <Label htmlFor="avatar">Profile photo</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button type="submit" disabled={saving} className="min-w-[160px]">
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
                {initialEmail !== email.trim() && (
                  <p className="text-xs text-slate-500 text-center">
                    Email changes may require confirmation before taking effect.
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

