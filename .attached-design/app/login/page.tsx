import type { Metadata } from 'next'
import { AuthHeading, AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <AuthShell topLink={{ prompt: 'New to Unikart?', label: 'Create an account', href: '/register' }}>
      <AuthHeading
        title="Welcome back"
        description="Sign in with the email issued by your institution to buy, borrow and sell books at your campus store."
      />
      <LoginForm />
    </AuthShell>
  )
}
