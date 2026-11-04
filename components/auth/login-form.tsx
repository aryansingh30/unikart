'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, PasswordInput, Select } from '@/components/ui/field'
import { institutions } from '@/lib/data'
import { cn } from '@/lib/utils'
import { validateInstitutionalEmail, validateStaffEmail } from '@/lib/validation'
import { useAuth } from '@/lib/auth-context'

type LoginRole = 'customer' | 'manager' | 'admin'

const roleTabs: { id: LoginRole; label: string }[] = [
  { id: 'customer', label: 'Student / Faculty' },
  { id: 'manager', label: 'Store staff' },
  { id: 'admin', label: 'Admin' },
]

interface Errors {
  institution?: string
  email?: string
  password?: string
  otp?: string
  general?: string
}

export function LoginForm() {
  const router = useRouter()
  const { login, verify2Fa } = useAuth()

  const [role, setRole] = React.useState<LoginRole>('customer')
  const [institution, setInstitution] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [errors, setErrors] = React.useState<Errors>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  // 2FA state for staff/admin roles
  const [twoFactorState, setTwoFactorState] = React.useState<{
    active: boolean
    tempToken: string
    hintMessage: string
  }>({
    active: false,
    tempToken: '',
    hintMessage: '',
  })
  const [otpValue, setOtpValue] = React.useState('')

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
    if (submitted && !twoFactorState.active) setErrors(validate())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institution, email, password, role, submitted, twoFactorState.active])

  const onSubmit = async (e: React.FormEvent) => {
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
    try {
      const res = await login(email, password)
      if (res.requires2Fa && res.tempToken) {
        setTwoFactorState({
          active: true,
          tempToken: res.tempToken,
          hintMessage: res.message || 'A 6-digit verification code has been issued for your staff account.',
        })
        setErrors({})
        return
      }

      if (res.ok) {
        // Logged in successfully, redirection handled in auth context
        return
      }

      setErrors({ general: res.error || 'Authentication failed. Please check your credentials.' })
    } catch (err: any) {
      setErrors({ general: err.message || 'Unable to sign in. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify2Fa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpValue || otpValue.trim().length < 6) {
      setErrors({ otp: 'Enter the 6-digit verification code.' })
      return
    }

    setSubmitting(true)
    setErrors({})
    try {
      const res = await verify2Fa(twoFactorState.tempToken, otpValue.trim())
      if (!res.ok) {
        setErrors({ otp: res.error || 'Invalid or expired OTP code.' })
      }
    } catch (err: any) {
      setErrors({ otp: err.message || '2FA verification failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedInst = institutions.find((i) => i.id === institution)

  // --------------------------------------------------------------------------
  // TWO-FACTOR AUTHENTICATION SCREEN (STAFF / ADMIN)
  // --------------------------------------------------------------------------
  if (twoFactorState.active) {
    return (
      <form onSubmit={handleVerify2Fa} noValidate className="flex flex-col gap-5 animate-in fade-in-0 duration-200">
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-soft/50 p-4">
          <ShieldCheck className="size-5 shrink-0 text-primary" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">Two-Factor Authentication Required</p>
            <p className="text-muted-foreground mt-0.5">{twoFactorState.hintMessage}</p>
          </div>
        </div>

        {errors.otp && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {errors.otp}
          </div>
        )}

        <Field id="login-otp" label="6-Digit Verification Code" error={errors.otp} hint="Enter the 6-digit code sent to your staff account.">
          {(a11y) => (
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                {...a11y}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="pl-9 font-mono tracking-widest text-base font-semibold"
                autoFocus
              />
            </div>
          )}
        </Field>

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Verifying OTP…' : 'Verify & Sign in'}
          {!submitting && <ArrowRight aria-hidden="true" />}
        </Button>

        <button
          type="button"
          onClick={() => {
            setTwoFactorState({ active: false, tempToken: '', hintMessage: '' })
            setErrors({})
          }}
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to credentials
        </button>
      </form>
    )
  }

  // --------------------------------------------------------------------------
  // PRIMARY LOGIN FORM
  // --------------------------------------------------------------------------
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {errors.general && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {errors.general}
        </div>
      )}

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

      {role === 'manager' && (
        <Field id="login-institution" label="Store Campus / College">
          {(a11y) => (
            <Select
              {...a11y}
              value={institution}
              onChange={(e) => {
                const val = e.target.value
                setInstitution(val)
                if (val === 'mnnit') setEmail('store.staff@unikart.in')
                else if (val === 'iiita') setEmail('store.iiita@unikart.in')
                else if (val === 'allduniv') setEmail('store.uoa@unikart.in')
              }}
            >
              <option value="">Select your campus store (or type email below)</option>
              <option value="mnnit">MNNIT Allahabad · Central Store</option>
              <option value="iiita">IIIT Allahabad · Hub Store</option>
              <option value="allduniv">University of Allahabad · Campus Store</option>
            </Select>
          )}
        </Field>
      )}

      <Field
        id="login-email"
        label={role === 'customer' ? 'Institutional email' : 'Staff email'}
        error={errors.email}
        hint={
          role === 'customer' && selectedInst
            ? `Ends with @${selectedInst.domain}`
            : role === 'manager'
              ? 'Campus staff: store.staff@unikart.in (MNNIT) · store.iiita@unikart.in (IIITA) · store.uoa@unikart.in (UOA)'
              : undefined
        }
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
    </form>
  )
}
