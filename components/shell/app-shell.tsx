'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronsUpDown, CircleHelp, Menu, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/brand/logo'
import { CartButton } from '@/components/customer/cart-provider'
import { Kbd } from '@/components/ui/primitives'
import { useOptionalAppStore } from '@/lib/app-store'
import { useAuth } from '@/lib/auth-context'
import { roleConfigs, type Role } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { UserMenu } from './user-menu'

export interface ShellUserIdentity {
  name: string
  email: string
  initials: string
  contextTitle: string
  contextSubtitle: string
  searchPlaceholder: string
}

export const shellIdentity: Record<Role, ShellUserIdentity> = {
  customer: {
    name: 'Aryan Mehta',
    email: 'aryan.20224031@mnnit.ac.in',
    initials: 'AM',
    contextTitle: 'MNNIT Allahabad',
    contextSubtitle: 'Student · B.Tech CSE',
    searchPlaceholder: 'Search books, authors, ISBN…',
  },
  manager: {
    name: 'Store Staff',
    email: 'store.staff@unikart.in',
    initials: 'SS',
    contextTitle: 'Unikart · MNNIT',
    contextSubtitle: 'Store Manager',
    searchPlaceholder: 'Search orders, members, ISBN…',
  },
  admin: {
    name: 'Platform Admin',
    email: 'platform.admin@unikart.in',
    initials: 'PA',
    contextTitle: 'All institutions',
    contextSubtitle: 'Platform Admin · 4 stores',
    searchPlaceholder: 'Search institutions, users, txn IDs…',
  },
}

function SidebarContent({
  role,
  identity,
  onNavigate,
}: {
  role: Role
  identity: ShellUserIdentity
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const config = roleConfigs[role]
  const appStore = useOptionalAppStore()
  const [managerMetrics, setManagerMetrics] = React.useState<any>(null)

  React.useEffect(() => {
    if (role === 'manager') {
      import('@/lib/api-client')
        .then(({ managerApi }) => managerApi.getOverview())
        .then((res) => {
          if (res) setManagerMetrics(res)
        })
        .catch(() => {})
    }
  }, [role, pathname])

  const isActive = (href: string) =>
    href === config.home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  const getBadge = (item: (typeof config.groups)[0]['items'][0]) => {
    if (role === 'customer' && appStore) {
      if (item.href === '/customer/orders') {
        const count = appStore.orders.filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled').length
        return count > 0 ? { text: String(count), tone: 'neutral' as const } : null
      }
      if (item.href === '/customer/borrowings') {
        const overdue = appStore.borrowings.filter((b) => b.status === 'Overdue').length
        return overdue > 0 ? { text: `${overdue} overdue`, tone: 'danger' as const } : null
      }
      if (item.href === '/customer/notifications') {
        const unread = appStore.notifications.filter((n) => !n.read).length
        return unread > 0 ? { text: String(unread), tone: 'info' as const } : null
      }
    }
    if (role === 'manager') {
      if (managerMetrics) {
        if (item.href === '/manager/orders') {
          const count = managerMetrics.openOrdersCount ?? 0
          return count > 0 ? { text: String(count), tone: 'neutral' as const } : null
        }
        if (item.href === '/manager/pickup') {
          const count = managerMetrics.readyForPickupCount ?? 0
          return count > 0 ? { text: String(count), tone: 'info' as const } : null
        }
        if (item.href === '/manager/returns') {
          const count = managerMetrics.toInspectCount ?? 0
          return count > 0 ? { text: String(count), tone: 'warning' as const } : null
        }
        if (item.href === '/manager/borrowings') {
          const overdue = managerMetrics.overdueBorrowingsCount ?? 0
          if (overdue > 0) return { text: `${overdue} overdue`, tone: 'danger' as const }
          const activeOrPending = managerMetrics.activeBorrowingsCount ?? 0
          if (activeOrPending > 0) return { text: String(activeOrPending), tone: 'info' as const }
          return null
        }
      }
      // Zero dummy badges for manager
      return null
    }
    return item.badge ? { text: item.badge, tone: item.badgeTone || 'neutral' } : null
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link href={config.home} onClick={onNavigate} className="rounded-md" aria-label="Unikart home">
          <Logo />
        </Link>
      </div>

      <div className="px-3 pb-2">
        <div className="flex w-full items-center gap-2.5 rounded-[10px] border border-sidebar-border bg-card px-2.5 py-2 shadow-[var(--shadow-xs)]">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-secondary-foreground">
            {identity.contextTitle.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[13px] font-medium text-foreground">{identity.contextTitle}</span>
            <span className="block truncate text-xs text-muted-foreground">{identity.contextSubtitle}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      <nav aria-label={`${config.label} navigation`} className="flex-1 overflow-y-auto px-3 py-2">
        {config.groups.map((group, gi) => (
          <div key={group.label ?? gi} className={cn(gi > 0 && 'mt-5')}>
            {group.label && (
              <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                const badge = getBadge(item)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors',
                        active
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-4 shrink-0 transition-colors',
                          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge && (
                        <span
                          className={cn(
                            'rounded-md px-1.5 text-[11px] font-medium leading-[18px] tabular',
                            badge.tone === 'danger'
                              ? 'bg-destructive-soft text-destructive'
                              : badge.tone === 'info'
                                ? 'bg-primary-soft text-primary-soft-foreground'
                                : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {badge.text}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <UserMenu role={role} identity={identity} />
      </div>
    </div>
  )
}

function GlobalSearch({ role, placeholder }: { role: Role; placeholder: string }) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <form
      role="search"
      className="relative hidden w-full max-w-md md:block"
      onSubmit={(e) => {
        e.preventDefault()
        const q = new FormData(e.currentTarget).get('q')?.toString().trim() ?? ''
        if (role === 'customer') router.push(`/customer/catalog${q ? `?q=${encodeURIComponent(q)}` : ''}`)
        else toast('Console search arrives with the operations module', { description: `Searched for “${q}”` })
      }}
    >
      <label htmlFor="global-search" className="sr-only">
        Search
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        id="global-search"
        name="q"
        type="search"
        placeholder={placeholder}
        className="h-9 w-full rounded-[10px] border border-border bg-muted/60 pl-9 pr-14 text-sm text-foreground transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground hover:border-border-strong focus:border-primary focus:bg-card focus:outline-none focus:ring-[3px] focus:ring-primary/15"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 gap-0.5">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </form>
  )
}

export function AppShell({
  role,
  topbarActions,
  children,
}: {
  role: Role
  topbarActions?: React.ReactNode
  children: React.ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  const [sessionUser, setSessionUser] = React.useState<ShellUserIdentity | null>(null)

  React.useEffect(() => {
    try {
      const s = localStorage.getItem('unikart_session')
      if (s) setSessionUser(JSON.parse(s))
    } catch {
      // ignore
    }
  }, [user])

  const identity = React.useMemo<ShellUserIdentity>(() => {
    if (user) {
      return {
        name: user.name,
        email: user.email,
        initials: user.initials,
        contextTitle: user.contextTitle,
        contextSubtitle: user.contextSubtitle,
        searchPlaceholder: user.searchPlaceholder || shellIdentity[role].searchPlaceholder,
      }
    }
    return sessionUser ?? shellIdentity[role]
  }, [user, sessionUser, role])

  React.useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  React.useEffect(() => setDrawerOpen(false), [pathname])

  const notificationsHref =
    role === 'customer' ? '/customer/notifications' : role === 'manager' ? '/manager' : '/admin/alerts'

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-card px-3 py-2 text-sm font-medium shadow-[var(--shadow-pop)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent role={role} identity={identity} />
      </aside>

      <div
        className={cn('fixed inset-0 z-50 lg:hidden', drawerOpen ? 'pointer-events-auto' : 'pointer-events-none')}
        aria-hidden={!drawerOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-200',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={cn(
            'absolute inset-y-0 left-0 w-[min(18rem,85vw)] border-r border-sidebar-border bg-sidebar shadow-[var(--shadow-pop)] transition-transform duration-300 ease-out',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close navigation"
            tabIndex={drawerOpen ? 0 : -1}
          >
            <X className="size-4" />
          </button>
          {drawerOpen && <SidebarContent role={role} identity={identity} onNavigate={() => setDrawerOpen(false)} />}
        </div>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="-ml-1.5 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
            >
              <Menu className="size-5" />
            </button>
            <Link href={roleConfigs[role].home} className="rounded-md md:hidden lg:hidden" aria-label="Unikart home">
              <Logo />
            </Link>
            <GlobalSearch role={role} placeholder={identity.searchPlaceholder} />
            <div className="ml-auto flex items-center gap-1">
              {role === 'customer' && (
                <Link
                  href="/customer/catalog"
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
                  aria-label="Search books"
                >
                  <Search className="size-[18px]" />
                </Link>
              )}
              {role === 'customer' && <CartButton />}
              <button
                type="button"
                onClick={() =>
                  toast('Help centre', {
                    description: 'Reach your campus store desk or raise a ticket from Profile & Settings.',
                  })
                }
                className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sm:flex"
                aria-label="Help"
              >
                <CircleHelp className="size-[18px]" />
              </button>
              <Link
                href={notificationsHref}
                className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Notifications, 4 unread"
              >
                <Bell className="size-[18px]" />
                <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
              </Link>
              {topbarActions}
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1320px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
