import type { Metadata } from 'next'
import { AuthHeading, AuthShell } from '@/components/auth/auth-shell'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Create account' }

export default function RegisterPage() {
  return (
    <AuthShell topLink={{ prompt: 'Already a member?', label: 'Sign in', href: '/login' }}>
      <AuthHeading
        title="Create your account"
        description="Unikart is open to authorised students and faculty of participating institutions."
      />
      <RegisterForm />
    </AuthShell>
  )
}
