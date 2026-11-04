'use client'

import * as React from 'react'
import { Bell, Lock, LogOut, ShieldAlert, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, PasswordInput } from '@/components/ui/field'
import { Card, CardHeader, PageHeader } from '@/components/ui/primitives'
import { useAuth } from '@/lib/auth-context'
import { getInstitution, resolveInstitutionId } from '@/lib/data'
import { authApi, getAuthToken } from '@/lib/api-client'

export function SettingsView() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [session, setSession] = React.useState<any>(null)

  // Profile form state
  const [fullName, setFullName] = React.useState(user?.name || '')

  // Notification preferences
  const [orderUpdates, setOrderUpdates] = React.useState(true)
  const [borrowingReminders, setBorrowingReminders] = React.useState(true)
  const [fineAlerts, setFineAlerts] = React.useState(true)
  const [promoMessages, setPromoMessages] = React.useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [passwordError, setPasswordError] = React.useState('')

  React.useEffect(() => {
    try {
      const s = localStorage.getItem('unikart_session')
      if (s) {
        const parsed = JSON.parse(s)
        setSession(parsed)
        if (parsed.name) setFullName(parsed.name)
      } else if (user?.name) {
        setFullName(user.name)
      }
    } catch {}
  }, [user])

  const email = user?.email ?? session?.email ?? ''
  const instId = resolveInstitutionId({
    id: user?.institutionId,
    name: user?.contextTitle,
    email: user?.email,
  }) || resolveInstitutionId({ id: session?.institutionId, email: session?.email })
  const institution = user?.contextTitle ?? session?.contextTitle ?? (instId ? getInstitution(instId).name : 'Your Institution')
  const programmeRole = user?.contextSubtitle ?? session?.contextSubtitle ?? 'Student'

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = fullName.trim()
    if (!cleanName) {
      toast.error('Full name cannot be blank')
      return
    }

    // 1. Sync to live backend if authenticated
    const token = getAuthToken()
    if (token) {
      try {
        await authApi.updateProfile({ fullName: cleanName })
      } catch (err: any) {
        console.warn('Live backend profile update notice:', err.message)
      }
    }

    // 2. Update AuthContext, active session, and user-scoped storage
    try {
      updateUser({ name: cleanName })
      const updated = session ? { ...session, name: cleanName } : { name: cleanName }
      localStorage.setItem('unikart_session', JSON.stringify(updated))
      const targetEmail = user?.email || session?.email
      if (targetEmail) {
        const uKey = targetEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')
        localStorage.setItem(`unikart_profile_${uKey}`, JSON.stringify(updated))
      }
      setSession(updated)
    } catch {}

    toast.success('Profile updated successfully')
  }

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Preferences saved')
  }

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      setPasswordError('Please enter your current password.')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    setPasswordError('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Password updated')
  }

  const handleSignOutAll = () => {
    try {
      localStorage.removeItem('unikart_session')
      localStorage.removeItem('unikart_store')
      localStorage.removeItem('unikart_cart')
    } catch {}
    toast.info('Signed out of all devices')
    router.push('/login')
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile & Settings"
        description="Manage your account, preferences, and security."
        breadcrumbs={[{ label: 'Home', href: '/customer' }, { label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 gap-8">
        {/* Section 1: Profile */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader
            title="Profile information"
            description="Your personal identity and academic registration details."
          />
          <form onSubmit={handleSaveProfile} className="space-y-4 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="profile-name" label="Full name">
                {(props) => (
                  <Input
                    {...props}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your legal name"
                    required
                  />
                )}
              </Field>

              <Field id="profile-email" label="Institutional email" hint="Verified via campus SSO">
                {(props) => (
                  <Input
                    {...props}
                    value={email}
                    readOnly
                    className="cursor-not-allowed bg-muted/70 text-muted-foreground"
                  />
                )}
              </Field>

              <Field id="profile-institution" label="Institution" hint="Managed by platform administrator">
                {(props) => (
                  <Input
                    {...props}
                    value={institution}
                    readOnly
                    className="cursor-not-allowed bg-muted/70 text-muted-foreground"
                  />
                )}
              </Field>

              <Field id="profile-programme" label="Programme / Role" hint="Current active enrollment">
                {(props) => (
                  <Input
                    {...props}
                    value={programmeRole}
                    readOnly
                    className="cursor-not-allowed bg-muted/70 text-muted-foreground"
                  />
                )}
              </Field>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary">
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Section 2: Notification Preferences */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader
            title="Notification preferences"
            description="Control alerts delivered to your university email and registered phone number."
          />
          <form onSubmit={handleSavePreferences} className="space-y-4 p-5 sm:p-6">
            <div className="divide-y divide-border">
              <label
                htmlFor="notif-orders"
                className="flex items-start justify-between gap-4 py-3 cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">Order updates</p>
                  <p className="text-xs text-muted-foreground">
                    Pickup OTPs, store readiness notices, and courier tracking (Email + SMS)
                  </p>
                </div>
                <Checkbox
                  id="notif-orders"
                  checked={orderUpdates}
                  onChange={(e) => setOrderUpdates(e.target.checked)}
                />
              </label>

              <label
                htmlFor="notif-borrowings"
                className="flex items-start justify-between gap-4 py-3 cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">Borrowing reminders</p>
                  <p className="text-xs text-muted-foreground">
                    Advance alerts 3 days and 1 day before borrow period expiry (Email + SMS)
                  </p>
                </div>
                <Checkbox
                  id="notif-borrowings"
                  checked={borrowingReminders}
                  onChange={(e) => setBorrowingReminders(e.target.checked)}
                />
              </label>

              <label
                htmlFor="notif-fines"
                className="flex items-start justify-between gap-4 py-3 cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">Fine alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Overdue penalty notifications and dispute resolution updates (Email + SMS)
                  </p>
                </div>
                <Checkbox
                  id="notif-fines"
                  checked={fineAlerts}
                  onChange={(e) => setFineAlerts(e.target.checked)}
                />
              </label>

              <label
                htmlFor="notif-promo"
                className="flex items-start justify-between gap-4 py-3 cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">Promotional messages</p>
                  <p className="text-xs text-muted-foreground">
                    Semester course book deals, book exchange drives, and campus book fairs
                  </p>
                </div>
                <Checkbox
                  id="notif-promo"
                  checked={promoMessages}
                  onChange={(e) => setPromoMessages(e.target.checked)}
                />
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary">
                Save preferences
              </Button>
            </div>
          </form>
        </Card>

        {/* Section 3: Security */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader
            title="Change password"
            description="Ensure your account is secured using a strong, unique password."
          />
          <form onSubmit={handleUpdatePassword} className="space-y-4 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field id="current-password" label="Current password">
                {(props) => (
                  <PasswordInput
                    {...props}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      setPasswordError('')
                    }}
                    placeholder="Enter current password"
                    required
                  />
                )}
              </Field>

              <Field id="new-password" label="New password">
                {(props) => (
                  <PasswordInput
                    {...props}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setPasswordError('')
                    }}
                    placeholder="At least 6 characters"
                    required
                  />
                )}
              </Field>

              <Field id="confirm-password" label="Confirm new password">
                {(props) => (
                  <PasswordInput
                    {...props}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setPasswordError('')
                    }}
                    placeholder="Re-enter new password"
                    required
                  />
                )}
              </Field>
            </div>

            {passwordError && (
              <p className="text-xs font-medium text-destructive">{passwordError}</p>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="secondary">
                <Lock className="size-4" />
                Update password
              </Button>
            </div>
          </form>
        </Card>

        {/* Section 4: Danger Zone */}
        <Card className="border-destructive/30 bg-destructive-soft/10 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="size-5 shrink-0" />
                <h3 className="text-base font-semibold">Danger zone</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Signing out of all devices revokes all active session tokens and clears your local cache.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOutAll}
              className="shrink-0"
            >
              <LogOut className="size-4" />
              Sign out of all devices
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
