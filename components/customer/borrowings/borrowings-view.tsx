'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Clock,
  Lock,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Store,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge, Card, CardHeader, EmptyState, PageHeader, Progress } from '@/components/ui/primitives'
import { useAppStore } from '@/lib/app-store'
import { getBook, getStore, type Borrowing } from '@/lib/data'
import { formatINR } from '@/lib/pricing'
import { cn } from '@/lib/utils'

type FilterTab = 'All' | 'Active' | 'Due soon' | 'Overdue' | 'Closed'

const TABS: FilterTab[] = ['All', 'Active', 'Due soon', 'Overdue', 'Closed']

const borrowTone = {
  'Awaiting handover': 'neutral',
  Active: 'info',
  'Due soon': 'warning',
  Overdue: 'danger',
  'Return requested': 'neutral',
  Returned: 'success',
} as const

export function BorrowingsView() {
  const { borrowings, renewBorrow } = useAppStore()
  const [activeTab, setActiveTab] = React.useState<FilterTab>('All')

  const filteredBorrowings = React.useMemo(() => {
    return borrowings.filter((b) => {
      if (activeTab === 'All') return true
      if (activeTab === 'Active') return b.status === 'Active'
      if (activeTab === 'Due soon') return b.status === 'Due soon'
      if (activeTab === 'Overdue') return b.status === 'Overdue'
      if (activeTab === 'Closed') return b.status === 'Return requested'
      return true
    })
  }, [borrowings, activeTab])

  const counts = React.useMemo(() => {
    return {
      All: borrowings.length,
      Active: borrowings.filter((b) => b.status === 'Active').length,
      'Due soon': borrowings.filter((b) => b.status === 'Due soon').length,
      Overdue: borrowings.filter((b) => b.status === 'Overdue').length,
      Closed: borrowings.filter((b) => b.status === 'Return requested').length,
    }
  }, [borrowings])

  const handleRenew = (borrowing: Borrowing, title: string) => {
    renewBorrow(borrowing.id)
    toast.success('Renewal confirmed', {
      description: `${title} (${borrowing.id}) renewed for 30 days. One renewal used.`,
    })
  }

  const handleRequestReturn = (title: string) => {
    toast.success('Return request submitted', {
      description: `Return requested for "${title}". Drop off at your campus store desk or await courier contact.`,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Borrowings"
        description="Active, overdue and past borrowings. Borrow period starts at handover. Renewals extend loan periods by 30 days."
        breadcrumbs={[
          { label: 'Customer Portal', href: '/customer' },
          { label: 'My Borrowings' },
        ]}
        actions={
          <Link href="/customer/catalog" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            <ShoppingBag className="size-4" />
            Borrow more books
          </Link>
        }
      />

      {/* Overdue alert banner if any book is overdue */}
      {counts.Overdue > 0 && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-card text-destructive shadow-xs">
              <AlertTriangle className="size-4" />
            </span>
            <p className="text-xs leading-5 text-foreground sm:text-sm">
              You have <strong className="font-semibold text-destructive">{counts.Overdue} overdue item</strong>.
              Late fines accrue at ₹10/day and are deducted from your security deposit.
            </p>
          </div>
          <Link
            href="/customer/fines"
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-xs text-destructive hover:text-destructive' })}
          >
            View Fines & Disputes
          </Link>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div role="tablist" aria-label="Borrowing status filters" className="flex w-max gap-1.5 border-b border-border pb-3">
          {TABS.map((tab) => {
            const active = activeTab === tab
            const count = counts[tab]
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {tab}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[11px] tabular',
                    active ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Borrowing Cards List */}
      {filteredBorrowings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-card py-6">
          <EmptyState
            icon={BookOpen}
            title={activeTab === 'All' ? 'No borrowings yet' : `No borrowings in “${activeTab}”`}
            description={
              activeTab === 'All'
                ? 'Books you borrow for 14, 30, or 45 days will appear here once verified.'
                : 'There are no borrow records currently matching this filter.'
            }
            action={
              <Link href="/customer/catalog" className={buttonVariants({ variant: 'primary' })}>
                Find books to borrow
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBorrowings.map((b) => {
            const book = getBook(b.bookId)
            const store = getStore(book?.storeId ?? 'st-mnnit')
            const awaitingHandover = b.status === 'Awaiting handover'
            const elapsed = Math.min(100, Math.max(0, ((b.durationDays - b.daysLeft) / b.durationDays) * 100))
            const progressTone =
              b.status === 'Overdue' ? 'danger' : b.status === 'Due soon' ? 'warning' : 'primary'

            return (
              <Card
                key={b.id}
                className="overflow-hidden transition-[border-color,box-shadow] hover:border-border-strong"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5">
                  {/* Book Cover */}
                  <div className="relative h-28 w-20 shrink-0 self-center overflow-hidden rounded-[6px] shadow-[var(--shadow-book)] sm:self-start">
                    {book?.cover ? (
                      <Image
                        src={book.cover}
                        alt={book?.title ?? 'Book cover'}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-muted">
                        <BookOpen className="size-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Borrowing Details */}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        {book ? (
                          <Link
                            href={`/customer/catalog/${book.id}`}
                            className="text-base font-semibold text-foreground hover:text-primary transition-colors"
                          >
                            {book.title}
                          </Link>
                        ) : (
                          <h3 className="text-base font-semibold text-foreground">Book ID: {b.bookId}</h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {book?.author} {book?.edition ? `· ${book.edition}` : ''}
                        </p>
                      </div>

                      <Badge tone={borrowTone[b.status] ?? 'neutral'} dot>
                        {b.status}
                      </Badge>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-mono">{b.id}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-foreground">
                        <Store className="size-3 text-muted-foreground" />
                        {store.name}
                      </span>
                      <span>•</span>
                      <span>
                        Started: <strong className="text-foreground">{b.startedOn}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Due: <strong className="text-foreground">{b.dueOn}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Deposit held:{' '}
                        <strong className="text-foreground tabular">{formatINR(b.deposit)}</strong>
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">{awaitingHandover ? 'Borrow period:' : 'Loan period progress:'}</span>
                        <span
                          className={cn(
                            'font-semibold tabular',
                            b.daysLeft < 0
                              ? 'text-destructive'
                              : b.daysLeft <= 2
                                ? 'text-[oklch(0.5_0.12_60)]'
                                : 'text-foreground',
                          )}
                        >
                          {awaitingHandover
                            ? `${b.durationDays}-day period begins on handover`
                            : b.daysLeft < 0
                            ? `${Math.abs(b.daysLeft)} days overdue`
                            : b.daysLeft === 0
                              ? 'Due today'
                              : `${b.daysLeft} days remaining (${b.durationDays}d loan)`}
                        </span>
                      </div>
                      {!awaitingHandover && (
                        <Progress
                          value={elapsed}
                          tone={progressTone}
                          label={`Progress for ${book?.title ?? b.id}`}
                        />
                      )}
                    </div>

                    {/* Fine if overdue */}
                    {b.accruedFine > 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2 text-xs text-destructive">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>
                          Current overdue fine accrued: <strong>{formatINR(b.accruedFine)}</strong> (increases ₹10 each day until return).
                        </span>
                      </div>
                    )}

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border">
                      <div className="flex items-center gap-2">
                        {awaitingHandover ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3.5 text-muted-foreground" />
                            Renewal and return options unlock after handover
                          </span>
                        ) : b.renewable ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRenew(b, book?.title ?? 'Book')}
                            className="text-xs"
                          >
                            <RotateCcw className="size-3.5" />
                            Renew (+30 days)
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Lock className="size-3.5 text-muted-foreground" />
                            Renewal unavailable {b.daysLeft < 0 ? 'for overdue items' : '(used)'}
                          </span>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRequestReturn(book?.title ?? 'Book')}
                          className="text-xs"
                        >
                          Request return
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <ShieldCheck className="size-3.5 text-primary" />
                        Deposit refunded to wallet upon inspection
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
