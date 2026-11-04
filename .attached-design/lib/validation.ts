import { institutions } from './data'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateInstitutionalEmail(email: string, institutionId: string): string | undefined {
  const value = email.trim().toLowerCase()
  if (!value) return 'Enter your institutional email address.'
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address, like name@college.ac.in.'
  const inst = institutions.find((i) => i.id === institutionId)
  if (inst && !value.endsWith(`@${inst.domain}`)) {
    return `Use the @${inst.domain} address issued by ${inst.shortName}.`
  }
  return undefined
}

export function validateStaffEmail(email: string): string | undefined {
  const value = email.trim().toLowerCase()
  if (!value) return 'Enter your Unikart staff email.'
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address.'
  if (!value.endsWith('@unikart.in')) return 'Staff consoles require an @unikart.in account.'
  return undefined
}

export function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const level = Math.min(4, Math.max(0, score - 1))
  const labels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent']
  return { level, label: labels[level] }
}
