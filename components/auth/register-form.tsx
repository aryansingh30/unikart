'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, MailCheck, ShieldCheck } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox, Field, Input, PasswordInput, Select } from '@/components/ui/field'
import { institutions } from '@/lib/data'
import { cn } from '@/lib/utils'
import { passwordStrength, validateInstitutionalEmail } from '@/lib/validation'
import { authApi, setAuthToken } from '@/lib/api-client'

type MemberType = 'student' | 'faculty'

interface Values {
  memberType: MemberType
  institution: string
  name: string
  email: string
  memberId: string
  phone: string
  password: string
  confirm: string
  terms: boolean
}

type Errors = Partial<Record<keyof Values, string>>

const initial: Values = {
  memberType: 'student',
  institution: '',
  name: '',
  email: '',
  memberId: '',
  phone: '',
  password: '',
  confirm: '',
  terms: false,
}

function validate(v: Values): Errors {
  const e: Errors = {}
  if (!v.institution) e.institution = 'Select your institution.'
  if (v.name.trim().length < 2) e.name = 'Enter your full name as on your college ID.'
  e.email = validateInstitutionalEmail(v.email, v.institution)
  if (!v.memberId.trim())
    e.memberId = v.memberType === 'student' ? 'Enter your enrolment or roll number.' : 'Enter your employee ID.'
  if (!/^[6-9]\d{9}$/.test(v.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid 10-digit Indian mobile number.'
  if (passwordStrength(v.password).level < 2) e.password = 'Use 8+ characters with a mix of letters, numbers and symbols.'
  if (!v.confirm) e.confirm = 'Re-enter your password.'
  else if (v.confirm !== v.password) e.confirm = 'Passwords don’t match.'
  if (!v.terms) e.terms = 'Accept the terms to create your account.'
  return Object.fromEntries(Object.entries(e).filter(([, val]) => val)) as Errors
}

const strengthColor = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success']

export function RegisterForm() {
  const router = useRouter()
  const [values, setValues] = React.useState<Values>(initial)
  const [touched, setTouched] = React.useState<Partial<Record<keyof Values, boolean>>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [generalError, setGeneralError] = React.useState<string | null>(null)

  const errors = validate(values)
  const show = (k: keyof Values) => (touched[k] ? errors[k] : undefined)
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setValues((v) => ({ ...v, [k]: val }))
  const blur = (k: keyof Values) => () => setTouched((t) => ({ ...t, [k]: true }))
  const strength = passwordStrength(values.password)
  const inst = institutions.find((i) => i.id === values.institution)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)
    const all = Object.keys(initial).reduce((acc, k) => ({ ...acc, [k]: true }), {})
    setTouched(all)
    const firstInvalid = (Object.keys(initial) as (keyof Values)[]).find((k) => errors[k])
    if (firstInvalid) {
      document.getElementById(`reg-${firstInvalid}`)?.focus()
      return
    }
    setSubmitting(true)
    try {
      const institutionCodeMap: Record<string, string> = {
        mnnit: 'MNNIT',
        iiita: 'IIITA',
        iitbhu: 'IIT-BHU',
        'iit-bhu': 'IIT-BHU',
        allduniv: 'UOA',
        uoa: 'UOA',
      }
      const targetCode = institutionCodeMap[values.institution.toLowerCase()] || values.institution.toUpperCase()

      const regRes = await authApi.register({
        institutionCode: targetCode,
        institutionalId: values.memberId.trim(),
        fullName: values.name.trim(),
        email: values.email.toLowerCase().trim(),
        phone: values.phone.replace(/\s/g, ''),
        password: values.password,
        designation: values.memberType === 'student' ? 'Student' : 'Faculty',
      })
      if (regRes?.token) {
        setAuthToken(regRes.token)
      }
      try {
        const parts = values.name.trim().split(' ')
        const instResolved = institutions.find((i) => i.id === values.institution)
        const session = {
          userId: regRes?.user?.userId,
          name: values.name.trim(),
          firstName: parts[0] || 'User',
          initials: instResolved?.shortName.slice(0, 2).toUpperCase() || parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2) || 'UK',
          email: values.email.toLowerCase().trim(),
          role: 'customer',
          institutionId: values.institution.toLowerCase(),
          contextTitle: instResolved?.name || instResolved?.shortName || 'Your Institution',
          contextSubtitle: values.memberType === 'student' ? 'Student' : 'Faculty',
          searchPlaceholder: 'Search books, authors, ISBN…',
        }
        localStorage.setItem('unikart_session', JSON.stringify(session))
        localStorage.removeItem('unikart_cart')
        localStorage.removeItem('unikart_store')
      } catch {}
      setDone(true)
    } catch (err: any) {
      console.error('Registration failed:', err)
      setGeneralError(err.message || 'Registration failed. Please verify your details.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="animate-in fade-in-0 slide-in-from-bottom-2">
        <span className="flex size-11 items-center justify-center rounded-xl border border-success/20 bg-success-soft text-success">
          <MailCheck className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[26px] font-semibold leading-8 tracking-[-0.025em]">Verify your email</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We sent a verification link to <span className="font-medium text-foreground">{values.email}</span>. It expires in 30
          minutes.
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[13px] leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">{values.memberId}</span> was matched against the authorised member
            list for {inst?.shortName}. Your account activates as soon as you confirm your email.
          </p>
        </div>
        <Link href="/login" className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-full')}>
          Continue to sign in
        </Link>
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          Wrong address?{' '}
          <button type="button" onClick={() => setDone(false)} className="font-medium text-foreground hover:underline">
            Edit details
          </button>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {generalError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive-soft p-3 text-xs leading-5 text-destructive animate-in fade-in-0 duration-200">
          {generalError}
        </div>
      )}
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium">I am a</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['student', 'faculty'] as const).map((t) => (
            <label
              key={t}
              className={cn(
                'flex h-10 cursor-pointer items-center justify-center rounded-[10px] border text-[13px] font-medium capitalize transition-[border-color,background-color,box-shadow] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                values.memberType === t
                  ? 'border-primary bg-primary-soft/60 text-primary-soft-foreground shadow-[0_0_0_1px_var(--primary)]'
                  : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
              )}
            >
              <input type="radio" name="memberType" value={t} checked={values.memberType === t} onChange={() => set('memberType', t)} className="sr-only" />
              {t === 'student' ? 'Student' : 'Faculty member'}
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="reg-institution" label="Institution" error={show('institution')}>
        {(a) => (
          <Select {...a} value={values.institution} onChange={(e) => set('institution', e.target.value)} onBlur={blur('institution')}>
            <option value="" disabled>
              Select your institution
            </option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.shortName} — {i.city}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field id="reg-name" label="Full name" error={show('name')}>
        {(a) => <Input {...a} autoComplete="name" placeholder="As printed on your college ID" value={values.name} onChange={(e) => set('name', e.target.value)} onBlur={blur('name')} />}
      </Field>

      <Field id="reg-email" label="Institutional email" error={show('email')} hint="We verify membership against your institution’s authorised list.">
        {(a) => (
          <Input
            {...a}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={`name@${inst?.domain ?? 'college.ac.in'}`}
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={blur('email')}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="reg-memberId" label={values.memberType === 'student' ? 'Enrolment no.' : 'Employee ID'} error={show('memberId')}>
          {(a) => (
            <Input
              {...a}
              placeholder={values.memberType === 'student' ? '20224031' : 'FAC-1187'}
              value={values.memberId}
              onChange={(e) => set('memberId', e.target.value.toUpperCase())}
              onBlur={blur('memberId')}
            />
          )}
        </Field>
        <Field id="reg-phone" label="Mobile number" error={show('phone')}>
          {(a) => (
            <Input {...a} type="tel" autoComplete="tel-national" inputMode="numeric" placeholder="98765 43210" value={values.phone} onChange={(e) => set('phone', e.target.value)} onBlur={blur('phone')} />
          )}
        </Field>
      </div>

      <Field id="reg-password" label="Password" error={show('password')}>
        {(a) => (
          <div>
            <PasswordInput {...a} autoComplete="new-password" placeholder="Create a password" value={values.password} onChange={(e) => set('password', e.target.value)} onBlur={blur('password')} />
            {values.password && (
              <div className="mt-2 flex items-center gap-2.5" aria-live="polite">
                <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={cn('h-1 rounded-full transition-colors', i <= strength.level ? strengthColor[strength.level] : 'bg-muted')} />
                  ))}
                </div>
                <span className="w-16 text-right text-xs text-muted-foreground">{strength.label}</span>
              </div>
            )}
          </div>
        )}
      </Field>

      <Field id="reg-confirm" label="Confirm password" error={show('confirm')}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" placeholder="Re-enter your password" value={values.confirm} onChange={(e) => set('confirm', e.target.value)} onBlur={blur('confirm')} />}
      </Field>

      <div>
        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-5 text-muted-foreground">
          <Checkbox
            id="reg-terms"
            checked={values.terms}
            onChange={(e) => {
              set('terms', e.target.checked)
              setTouched((t) => ({ ...t, terms: true }))
            }}
            aria-invalid={Boolean(show('terms'))}
            className="mt-0.5"
          />
          <span>
            I agree to Unikart’s <Link href="#" className="font-medium text-foreground hover:underline">Terms</Link>, including deposit,
            late-return fine and inspection policies.
          </span>
        </label>
        {show('terms') && (
          <p className="mt-1.5 pl-6.5 text-[13px] text-destructive" role="alert">
            {show('terms')}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
        {submitting ? 'Creating account…' : 'Create account'}
        {!submitting && <ArrowRight aria-hidden="true" />}
      </Button>
    </form>
  )
}
