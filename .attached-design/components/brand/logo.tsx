import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M10 9.5v7.25a6 6 0 0 0 12 0V9.5"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="23.6" r="0" />
      <path d="M13.25 9.5v7.1a2.75 2.75 0 0 0 5.5 0V9.5" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className, tone = 'default' }: { className?: string; tone?: 'default' | 'inverse' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span
        className={cn(
          'text-[17px] font-semibold tracking-[-0.03em]',
          tone === 'inverse' ? 'text-white' : 'text-foreground',
        )}
      >
        Unikart
      </span>
    </span>
  )
}
