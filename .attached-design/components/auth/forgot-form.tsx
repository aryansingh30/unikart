'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Inbox } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { institutions } from '@/lib/data'
import { cn } from '@/lib/utils'
import { validateInstitutionalEmail } from '@/lib/validation'

export function ForgotForm() {
  const [institution, setInstitution] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [errors, setErrors] = React.useState<{ institution?: string; email?: string }>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [cooldown, setCooldown] = React.useState(0)

  React.useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = {
      institution: institution ? undefined : 'Select your institution.',
      email: validateInstitutionalEmail(email, institution),
    }
    setErrors(next)
    if (next.institution || next.email) {
      document.getElementById(next.institution ? 'fp-institution' : 'fp-email')?.focus()
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSent(true)
      setCooldown(30)
    }, 800)
  }

  if (sent) {
    return (
      <div className="animate-in fade-in-0 slide-in-from-bottom-2">
        <span className="flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft text-primary">
          <Inbox className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[26px] font-semibold leading-8 tracking-[-0.025em]">Check your inbox</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, you’ll receive a reset link
          shortly. The link is valid for 30 minutes and can be used once.
        </p>
        <Link href="/login" className={cn(buttonVariants({ size: 'lg' }), 'mt-7 w-full')}>
          Back to sign in
        </Link>
        <Button
          variant="ghost"
          className="mt-2 w-full"
          disabled={cooldown > 0}
          onClick={() => setCooldown(30)}
        >
          {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend link'}
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field id="fp-institution" label="Institution" error={errors.institution}>
        {(a) => (
          <Select {...a} value={institution} onChange={(e) => setInstitution(e.target.value)}>
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
      <Field id="fp-email" label="Institutional email" error={errors.email}>
        {(a) => (
          <Input {...a} type="email" autoComplete="email" placeholder="name@college.ac.in" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
      </Field>
      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {submitting ? 'Sending link…' : 'Send reset link'}
      </Button>
      <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
        <ArrowLeft aria-hidden="true" />
        Back to sign in
      </Link>
    </form>
  )
}
