'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, PasswordInput, Select } from '@/components/ui/field'
import { institutions } from '@/lib/data'
import { cn } from '@/lib/utils'
import { validateInstitutionalEmail, validateStaffEmail } from '@/lib/validation'

type LoginRole = 'customer' | 'manager' | 'admin'

const roleTabs: { id: LoginRole; label: string }[] = [
  { id: 'customer', label: 'Student / Faculty' },
  { id: 'manager', label: 'Store staff' },
  { id: 'admin', label: 'Admin' },
]

const demo: Record<LoginRole, { email: string; institution: string }> = {
  customer: { email: 'aryan.20224031@mnnit.ac.in', institution: 'mnnit' },
  manager: { email: 'priya.nair@unikart.in', institution: '' },
  admin: { email: 'rahul.verma@unikart.in', institution: '' },
}

interface Errors {
  institution?: string
  email?: string
  password?: string
}

export function LoginForm() {
  const router = useRouter()
  const [role, setRole] = React.useState<LoginRole>('customer')
  const [institution, setInstitution] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [errors, setErrors] = React.useState<Errors>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const validate = (): Errors => {
    const next: Errors = {}
    if (role === 'customer') {
      if (!institution) next.institution = 'Select the institution you belong to.'
      next.email = validateInstitutionalEmail(email, institution)
    } else {
      next.email = validateStaffEmail(email)
    }
    if (!password) next.password = 'Enter your password.'
    else if (password.length < 8) next.password = 'Passwords are at least 8 characters.'
    return next
  }

  React.useEffect(() => {
    if (submitted) setErrors(validate())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institution, email, password, role, submitted])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const next = validate()
    setErrors(next)
    if (Object.values(next).some(Boolean)) {
      const firstInvalid = (['institution', 'email', 'password'] as const).find((k) => next[k])
      if (firstInvalid) document.getElementById(`login-${firstInvalid}`)?.focus()
      return
    }
    setSubmitting(true)
    setTimeout(() => router.push(`/${role}`), 700)
  }

  const fillDemo = () => {
    setEmail(demo[role].email)
    setInstitution(demo[role].institution)
    setPassword('Unikart@2026')
  }

  const selectedInst = institutions.find((i) => i.id === institution)

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div role="tablist" aria-label="Account type" className="grid grid-cols-3 rounded-[10px] bg-muted p-0.5">
        {roleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={role === t.id}
            onClick={() => {
              setRole(t.id)
              setErrors({})
              setSubmitted(false)
            }}
            className={cn(
              'h-8 rounded-lg px-1 text-[13px] font-medium transition-[background-color,color,box-shadow]',
              role === t.id ? 'bg-card text-foreground shadow-[var(--shadow-card)]' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {role === 'customer' && (
        <Field id="login-institution" label="Institution" error={errors.institution}>
          {(a11y) => (
            <Select {...a11y} value={institution} onChange={(e) => setInstitution(e.target.value)}>
              <option value="" disabled>
                Select your institution
              </option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.shortName}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field
        id="login-email"
        label={role === 'customer' ? 'Institutional email' : 'Staff email'}
        error={errors.email}
        hint={role === 'customer' && selectedInst ? `Ends with @${selectedInst.domain}` : undefined}
      >
        {(a11y) => (
          <Input
            {...a11y}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={role === 'customer' ? `name@${selectedInst?.domain ?? 'college.ac.in'}` : 'name@unikart.in'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      <Field
        id="login-password"
        label="Password"
        error={errors.password}
        trailing={
          <Link href="/forgot-password" className="rounded-sm text-[13px] font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        }
      >
        {(a11y) => (
          <PasswordInput
            {...a11y}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted-foreground">
        <Checkbox defaultChecked />
        Keep me signed in on this device
      </label>

      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {submitting ? 'Signing in…' : 'Sign in'}
        {!submitting && <ArrowRight aria-hidden="true" />}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        Prototype
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="secondary" onClick={fillDemo} className="w-full">
        <Sparkles aria-hidden="true" />
        Fill demo {role === 'customer' ? 'student' : role === 'manager' ? 'store manager' : 'admin'} credentials
      </Button>
    </form>
  )
}
