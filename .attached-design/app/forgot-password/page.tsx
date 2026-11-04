import type { Metadata } from 'next'
import { AuthHeading, AuthShell } from '@/components/auth/auth-shell'
import { ForgotForm } from '@/components/auth/forgot-form'

export const metadata: Metadata = { title: 'Reset password' }

export default function ForgotPasswordPage() {
  return (
    <AuthShell topLink={{ prompt: 'Remembered it?', label: 'Sign in', href: '/login' }}>
      <AuthHeading
        title="Reset your password"
        description="Enter your institutional email and we’ll send you a secure link to choose a new password."
      />
      <ForgotForm />
    </AuthShell>
  )
}
