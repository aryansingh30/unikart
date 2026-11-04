'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeftRight, LogOut, MoreHorizontal, Palette, UserRound } from 'lucide-react'
import type { Role } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const portals: { role: Role; label: string; href: string }[] = [
  { role: 'customer', label: 'Customer Portal', href: '/customer' },
  { role: 'manager', label: 'Store Manager Console', href: '/manager' },
  { role: 'admin', label: 'Platform Admin Console', href: '/admin' },
]

export function UserMenu({
  role,
  identity,
}: {
  role: Role
  identity: { name: string; email: string; initials: string }
}) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const menuId = React.useId()

  React.useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const itemClass =
    'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-foreground transition-colors hover:bg-accent focus-visible:bg-accent'

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-[10px] p-1.5 text-left transition-colors hover:bg-sidebar-accent"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
          {identity.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">{identity.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{identity.email}</span>
        </span>
        <MoreHorizontal className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-popover p-1.5 shadow-[var(--shadow-pop)] animate-in fade-in-0 slide-in-from-bottom-1"
        >
          {role === 'customer' && (
            <Link role="menuitem" href="/customer/settings" className={itemClass} onClick={() => setOpen(false)}>
              <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
              Profile & settings
            </Link>
          )}
          <Link role="menuitem" href="/design-system" className={itemClass} onClick={() => setOpen(false)}>
            <Palette className="size-4 text-muted-foreground" aria-hidden="true" />
            Design system
          </Link>
          <div className="my-1.5 h-px bg-border" role="separator" />
          <p className="px-2 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Prototype · switch portal
          </p>
          {portals.map((p) => (
            <Link
              key={p.role}
              role="menuitem"
              href={p.href}
              onClick={() => setOpen(false)}
              aria-current={p.role === role ? 'true' : undefined}
              className={cn(itemClass, p.role === role && 'text-primary')}
            >
              <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden="true" />
              {p.label}
            </Link>
          ))}
          <div className="my-1.5 h-px bg-border" role="separator" />
          <Link role="menuitem" href="/login" className={cn(itemClass, 'text-destructive hover:bg-destructive-soft')}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Link>
        </div>
      )}
    </div>
  )
}
